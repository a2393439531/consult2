from __future__ import annotations

import argparse
import json
import re
from collections import Counter, defaultdict
from pathlib import Path

from jsonschema import validate

from .classify import CHAPTERS, classify_case
from .dedupe import merge_duplicates
from .models import CaseQuestion, ExamShard, SourceDocument, SourceRef
from .parse import parse_document


def _is_exam(source: SourceDocument) -> bool:
    path = source.relative_path.lower()
    if "空白卷" in path:
        return False
    return any(token in path for token in ("模考", "模拟", "真题", "试卷", "点睛卷", "揭秘卷"))


def _exam_title(source: SourceDocument) -> str:
    return Path(source.relative_path).stem.replace(".mp4", "")[:100]


def _duration(source: SourceDocument) -> int:
    path = source.relative_path
    return 180 if any(token in path for token in ("真题", "模拟", "试卷", "点睛卷", "揭秘卷")) else 120


def build_content(manifest_path: Path, raw_dir: Path, output_dir: Path) -> dict[str, object]:
    sources = [SourceDocument.model_validate(item) for item in json.loads(manifest_path.read_text(encoding="utf-8"))]
    cases: list[CaseQuestion] = []
    source_failures: list[dict[str, str]] = []
    source_case_counts: dict[str, int] = {}

    for source in sources:
        raw_path = raw_dir / f"{source.id}.md"
        if not raw_path.exists():
            source_failures.append({"source_id": source.id, "reason": "missing extracted markdown"})
            continue
        try:
            parsed = [classify_case(case) for case in parse_document(source, raw_path.read_text(encoding="utf-8", errors="replace"))]
            cases.extend(parsed)
            source_case_counts[source.id] = len(parsed)
        except Exception as exc:  # noqa: BLE001 - retain a source-level failure report
            source_failures.append({"source_id": source.id, "reason": str(exc)})

    deduped, duplicate_groups = merge_duplicates(cases)
    source_to_cases: dict[str, list[str]] = defaultdict(list)
    for case in deduped:
        for ref in case.sources:
            source_to_cases[ref.source_id].append(case.id)

    output_dir.mkdir(parents=True, exist_ok=True)
    chapter_dir = output_dir / "chapters"
    exam_dir = output_dir / "exams"
    chapter_dir.mkdir(exist_ok=True)
    exam_dir.mkdir(exist_ok=True)

    chapter_counts: Counter[str] = Counter()
    for case in deduped:
        chapter_counts[case.chapter_id] += 1
    for chapter in CHAPTERS:
        payload = {
            "id": chapter["id"],
            "number": chapter["number"],
            "title": chapter["title"],
            "questions": [case.model_dump(mode="json") for case in deduped if case.chapter_id == chapter["id"]],
        }
        (chapter_dir / f"chapter-{int(chapter['id']):02d}.json").write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

    exams: list[ExamShard] = []
    for source in sources:
        if not _is_exam(source):
            continue
        question_ids = list(dict.fromkeys(source_to_cases.get(source.id, [])))
        if not question_ids:
            continue
        exam = ExamShard(
            id=f"exam-{source.id}",
            title=_exam_title(source),
            duration_minutes=_duration(source),
            question_ids=question_ids,
            source=SourceRef(source_id=source.id, file_name=Path(source.relative_path).name, pages=list(range(1, source.pages + 1))),
        )
        exams.append(exam)
        (exam_dir / f"{exam.id}.json").write_text(json.dumps(exam.model_dump(mode="json"), ensure_ascii=False, indent=2), encoding="utf-8")

    review_queue = [case.model_dump(mode="json") for case in deduped if case.needs_review]
    (output_dir.parent / "reports").mkdir(parents=True, exist_ok=True)
    (output_dir.parent / "reports" / "review-queue.json").write_text(json.dumps(review_queue, ensure_ascii=False, indent=2), encoding="utf-8")
    (output_dir.parent / "reports" / "deduplication.json").write_text(json.dumps(duplicate_groups, ensure_ascii=False, indent=2), encoding="utf-8")

    coverage = {
        "source_count": len(sources),
        "source_pages": sum(source.pages for source in sources),
        "processed_source_count": len(source_case_counts),
        "parsed_case_count": len(cases),
        "published_case_count": len(deduped),
        "subquestion_count": sum(len(case.subquestions) for case in deduped),
        "duplicate_group_count": len(duplicate_groups),
        "review_item_count": len(review_queue),
        "source_failures": source_failures,
        "chapter_counts": {str(key): chapter_counts.get(str(key), 0) for key in range(1, 12)},
        "exam_count": len(exams),
    }
    (output_dir / "coverage.json").write_text(json.dumps(coverage, ensure_ascii=False, indent=2), encoding="utf-8")
    manifest = {
        "version": 1,
        "chapters": [{"id": item["id"], "number": item["number"], "title": item["title"], "count": chapter_counts.get(item["id"], 0)} for item in CHAPTERS],
        "exams": [exam.model_dump(mode="json") for exam in exams],
        "totals": coverage,
    }
    (output_dir / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    return manifest


def main() -> None:
    parser = argparse.ArgumentParser(description="Build validated chapter and exam JSON shards")
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--raw-dir", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    manifest = build_content(args.manifest, args.raw_dir, args.output)
    print(json.dumps(manifest["totals"], ensure_ascii=False))
    if manifest["totals"]["source_failures"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
