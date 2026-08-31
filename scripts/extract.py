from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import UTC, datetime
from pathlib import Path

try:
    from .models import ExtractionResult, SourceDocument
except ImportError:  # pragma: no cover - supports direct script invocation
    from models import ExtractionResult, SourceDocument


def text_density(text: str) -> int:
    return len(re.findall(r"[\u3400-\u9fffA-Za-z0-9]", text))


def run_command(command: list[str]) -> subprocess.CompletedProcess[str]:
    return subprocess.run(command, capture_output=True, text=True, encoding="utf-8", errors="replace")


def extract_document(source_root: Path, source: SourceDocument, raw_dir: Path) -> ExtractionResult:
    pdf_path = source_root / Path(source.relative_path)
    output_path = raw_dir / f"{source.id}.md"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    warnings: list[str] = []

    markitdown = run_command(["markitdown", str(pdf_path), "-o", str(output_path)])
    extractor = "markitdown"
    extracted = output_path.read_text(encoding="utf-8", errors="replace") if output_path.exists() else ""
    if markitdown.returncode != 0:
        warnings.append(markitdown.stderr.strip() or "MarkItDown returned a non-zero exit code")

    if text_density(extracted) < max(30, source.pages * 30):
        fallback = run_command(["pdftotext", "-layout", str(pdf_path), str(output_path)])
        if fallback.returncode != 0:
            raise RuntimeError(f"{source.id}: pdftotext failed: {fallback.stderr.strip()}")
        extractor = "pdftotext"
        extracted = output_path.read_text(encoding="utf-8", errors="replace")
        warnings.append("fallback to pdftotext -layout")

    header = (
        f"<!-- source_id: {source.id} -->\n"
        f"<!-- relative_path: {source.relative_path} -->\n"
        f"<!-- pages: {source.pages} -->\n\n"
    )
    output_path.write_text(header + extracted, encoding="utf-8")
    return ExtractionResult(
        source_id=source.id,
        raw_path=str(output_path),
        extractor=extractor,
        pages=source.pages,
        characters=len(extracted),
        warnings=warnings,
        extracted_at=datetime.now(UTC),
    )


def main() -> None:
    # Source paths contain symbols (for example ✿) that are not representable
    # by the default Windows console code page. Keep progress logging from
    # aborting an otherwise successful extraction run.
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except AttributeError:  # pragma: no cover - older Python runtimes
        pass
    parser = argparse.ArgumentParser(description="Extract PDF text with MarkItDown first")
    parser.add_argument("--source-root", type=Path, required=True)
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--raw-dir", type=Path, required=True)
    parser.add_argument(
        "--workers",
        type=int,
        default=6,
        help="number of PDFs to extract concurrently (default: 6)",
    )
    args = parser.parse_args()
    sources = [SourceDocument.model_validate(item) for item in json.loads(args.manifest.read_text(encoding="utf-8"))]
    results: list[ExtractionResult] = []
    failures: list[str] = []
    workers = max(1, args.workers)
    with ThreadPoolExecutor(max_workers=workers) as executor:
        pending = {
            executor.submit(extract_document, args.source_root, source, args.raw_dir): source
            for source in sources
        }
        for future in as_completed(pending):
            source = pending[future]
            try:
                results.append(future.result())
                print(f"processed {source.relative_path}")
            except Exception as exc:  # noqa: BLE001 - preserve per-file failure in report
                failures.append(str(exc))
                print(f"FAILED {source.relative_path}: {exc}")
    results.sort(key=lambda item: item.source_id)
    failures.sort()
    (args.raw_dir / "extraction-report.json").write_text(
        json.dumps(
            {"results": [item.model_dump(mode="json") for item in results], "failures": failures},
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )
    if failures:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
