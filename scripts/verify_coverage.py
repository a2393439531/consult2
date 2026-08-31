from __future__ import annotations

import argparse
import json
from pathlib import Path


def verify(
    manifest_path: Path,
    coverage_path: Path,
    data_dir: Path,
    expected_sources: int | None = None,
    expected_pages: int | None = None,
) -> list[str]:
    source_manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    coverage = json.loads(coverage_path.read_text(encoding="utf-8"))
    errors: list[str] = []
    source_count = len(source_manifest)
    source_pages = sum(item.get("pages", 0) for item in source_manifest)
    if expected_sources is not None and source_count != expected_sources:
        errors.append(f"expected {expected_sources} PDF sources, got {source_count}")
    if expected_pages is not None and source_pages != expected_pages:
        errors.append(f"expected {expected_pages} source pages, got {source_pages}")
    if coverage.get("source_count") != source_count:
        errors.append(f"coverage source_count is {coverage.get('source_count')}, manifest has {source_count}")
    if coverage.get("source_pages") != source_pages:
        errors.append(f"coverage source_pages is {coverage.get('source_pages')}, manifest has {source_pages}")
    if coverage.get("processed_source_count") != source_count:
        errors.append(f"only {coverage.get('processed_source_count')} sources processed")
    if coverage.get("source_failures"):
        errors.append(f"source failures: {len(coverage['source_failures'])}")
    if coverage.get("review_item_count"):
        errors.append(f"review queue contains {coverage['review_item_count']} items")
    counts = coverage.get("chapter_counts", {})
    manifest_file = data_dir / "manifest.json"
    chapter_summaries = json.loads(manifest_file.read_text(encoding="utf-8")).get("chapters", []) if manifest_file.exists() else []
    for chapter in chapter_summaries:
        chapter_id = str(chapter.get("id", ""))
        if counts.get(chapter_id, 0) < 1:
            errors.append(f"chapter {chapter_id} has no published cases")
        if not (data_dir / "chapters" / f"chapter-{int(chapter_id):02d}.json").exists():
            errors.append(f"missing chapter shard {int(chapter_id):02d}")
    if coverage.get("published_case_count", 0) < 1:
        errors.append("no published cases")
    return errors


def main() -> None:
    parser = argparse.ArgumentParser(description="Verify published content coverage")
    parser.add_argument("manifest", type=Path)
    parser.add_argument("coverage", type=Path)
    parser.add_argument("data_dir", type=Path)
    parser.add_argument("--expected-sources", type=int)
    parser.add_argument("--expected-pages", type=int)
    args = parser.parse_args()
    errors = verify(args.manifest, args.coverage, args.data_dir, args.expected_sources, args.expected_pages)
    if errors:
        for error in errors:
            print(f"ERROR: {error}")
        raise SystemExit(1)
    coverage = json.loads(args.coverage.read_text(encoding="utf-8"))
    chapter_count = len(json.loads((args.data_dir / "manifest.json").read_text(encoding="utf-8")).get("chapters", []))
    print(f"{coverage['source_count']} PDFs / {coverage['source_pages']} pages / {chapter_count} chapters / {coverage['review_item_count']} review items")


if __name__ == "__main__":
    main()
