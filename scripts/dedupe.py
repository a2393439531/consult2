from __future__ import annotations

import re
from collections import defaultdict
from difflib import SequenceMatcher

from .models import CaseQuestion


def normalize_for_fingerprint(text: str) -> str:
    return re.sub(r"[^\u3400-\u9fffA-Za-z0-9]", "", text).lower()


def fingerprint(case: CaseQuestion) -> str:
    return normalize_for_fingerprint(case.background + "".join(item.prompt for item in case.subquestions))


def merge_case(primary: CaseQuestion, duplicate: CaseQuestion) -> CaseQuestion:
    known_sources = {(ref.source_id, ref.file_name, tuple(ref.pages)) for ref in primary.sources}
    primary.sources.extend(ref for ref in duplicate.sources if (ref.source_id, ref.file_name, tuple(ref.pages)) not in known_sources)
    for index, item in enumerate(primary.subquestions):
        if index >= len(duplicate.subquestions):
            continue
        candidate = duplicate.subquestions[index]
        if len(candidate.answer.reference) + len(candidate.answer.analysis) > len(item.answer.reference) + len(item.answer.analysis):
            item.answer = candidate.answer
    primary.exam_ids.extend(exam for exam in duplicate.exam_ids if exam not in primary.exam_ids)
    return primary


def merge_duplicates(cases: list[CaseQuestion], threshold: float = 94) -> tuple[list[CaseQuestion], list[dict[str, object]]]:
    kept: list[CaseQuestion] = []
    kept_fingerprints: list[str] = []
    exact_index: dict[str, int] = {}
    chapter_index: dict[str, list[int]] = defaultdict(list)
    groups: list[dict[str, object]] = []
    for case in cases:
        current_fingerprint = fingerprint(case)
        match_index = exact_index.get(current_fingerprint)
        if match_index is None:
            # Duplicate cases almost always share a chapter. Restrict fuzzy
            # comparisons to that bucket and apply cheap length/multiset
            # bounds before the expensive SequenceMatcher ratio call.
            for candidate_index in chapter_index.get(case.chapter_id, []):
                candidate_fingerprint = kept_fingerprints[candidate_index]
                max_length = max(len(candidate_fingerprint), len(current_fingerprint))
                min_length = min(len(candidate_fingerprint), len(current_fingerprint))
                if not max_length or (2 * min_length / max_length * 100) < threshold:
                    continue
                matcher = SequenceMatcher(None, candidate_fingerprint, current_fingerprint)
                if matcher.quick_ratio() * 100 < threshold:
                    continue
                if matcher.ratio() * 100 >= threshold:
                    match_index = candidate_index
                    break
        if match_index is None:
            kept.append(case)
            kept_fingerprints.append(current_fingerprint)
            match_index = len(kept) - 1
            chapter_index[case.chapter_id].append(match_index)
            exact_index[current_fingerprint] = match_index
            continue
        match = kept[match_index]
        similarity = 100.0 if kept_fingerprints[match_index] == current_fingerprint else round(SequenceMatcher(None, kept_fingerprints[match_index], current_fingerprint).ratio() * 100, 2)
        merge_case(match, case)
        exact_index[current_fingerprint] = match_index
        groups.append({"primary": match.id, "merged": case.id, "similarity": similarity})
    return kept, groups
