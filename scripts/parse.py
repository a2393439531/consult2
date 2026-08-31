from __future__ import annotations

import re
from pathlib import Path

from .clean import clean_text
from .models import Answer, CaseQuestion, SourceDocument, SourceRef, SubQuestion


CASE_START = re.compile(
    r"(?m)^(?:【?例题[^\n]*】?|案例[一二三四五六七八九十百]+|(?:练习|习题)[（(]\s*\d+[）)]|第\s*\d+\s*题)"
)
QUESTION_MARK = re.compile(r"(?m)^\s*(?:【问题】|问题\s*[：:]?)")
ANSWER_MARK = re.compile(r"(?m)^\s*(?:【参考答案】|【答案】|『正确答案』|参考答案|正确答案)")
ANALYSIS_MARK = re.compile(r"(?m)^\s*(?:【解析】|解析\s*[：:]?)")
NUMBERED_ITEM = re.compile(r"(?m)^\s*(\d{1,2})[\.、)）]\s*")


def _blocks(text: str) -> list[tuple[str, int]]:
    starts = list(CASE_START.finditer(text))
    if not starts:
        return [(text, 0)]
    blocks: list[tuple[str, int]] = []
    if starts[0].start() > 0 and text[: starts[0].start()].strip() and (QUESTION_MARK.search(text[: starts[0].start()]) or ANSWER_MARK.search(text[: starts[0].start()])):
        blocks.append((text[: starts[0].start()], 0))
    for index, match in enumerate(starts):
        end = starts[index + 1].start() if index + 1 < len(starts) else len(text)
        blocks.append((text[match.start() : end], match.start()))
    return blocks


def _answer(reference: str, analysis: str = "") -> Answer:
    reference = reference.strip()
    analysis = analysis.strip()
    if not reference and analysis:
        reference, analysis = analysis, ""
    scoring = [line.strip(" -·") for line in re.split(r"[\n；;]", reference) if len(line.strip()) >= 4][:8]
    return Answer(reference=reference or "本题答案详见完整解析。", analysis=analysis, scoring_points=scoring)


def _split_items(text: str) -> list[str]:
    matches = list(NUMBERED_ITEM.finditer(text))
    if not matches:
        return [text.strip()] if text.strip() else []
    return [text[m.start() : (matches[i + 1].start() if i + 1 < len(matches) else len(text))].strip() for i, m in enumerate(matches)]


def _parse_block(source: SourceDocument, block: str, offset: int, index: int) -> CaseQuestion:
    question_matches = list(QUESTION_MARK.finditer(block))
    answer_matches = list(ANSWER_MARK.finditer(block))
    analysis_matches = list(ANALYSIS_MARK.finditer(block))
    question_texts: list[str] = []
    inline_answers: list[Answer] = []

    if question_matches:
        first_answer = answer_matches[0].start() if answer_matches else len(block)
        for q_index, q_match in enumerate(question_matches):
            next_question = question_matches[q_index + 1].start() if q_index + 1 < len(question_matches) else len(block)
            question_end = min(next_question, first_answer if first_answer > q_match.start() else next_question)
            question_texts.append(block[q_match.end() : question_end].strip())
            next_answer = next((item for item in answer_matches if q_match.start() < item.start() < next_question), None)
            if next_answer:
                end_candidates = [item.start() for item in answer_matches if item.start() > next_answer.start()]
                end_candidates += [item.start() for item in analysis_matches if item.start() > next_answer.start()]
                end_candidates += [next_question]
                answer_end = min(end_candidates)
                inline_answers.append(_answer(block[next_answer.end() : answer_end]))

    answer_text = ""
    if answer_matches:
        start = answer_matches[0].end()
        end = analysis_matches[0].start() if analysis_matches and analysis_matches[0].start() > start else len(block)
        answer_text = block[start:end].strip()
    analysis_text = block[analysis_matches[0].end() :].strip() if analysis_matches else ""
    answer_items = _split_items(answer_text + ("\n" + analysis_text if analysis_text else ""))
    analysis_items = _split_items(analysis_text) if analysis_text else []

    if not question_texts:
        before_answer = block[: answer_matches[0].start()] if answer_matches else block
        question_texts = [before_answer.strip()]
    if not question_texts:
        question_texts = ["未识别题干，请查看来源页。"]

    subquestions: list[SubQuestion] = []
    for q_index, prompt in enumerate(question_texts):
        if not prompt:
            prompt = f"第 {q_index + 1} 小问"
        if q_index < len(inline_answers):
            ans = inline_answers[q_index]
        elif q_index < len(answer_items):
            ans = _answer(answer_items[q_index])
        elif answer_items:
            ans = _answer("\n".join(answer_items))
        else:
            ans = _answer("本题答案详见完整解析。", analysis_text)
        if analysis_text and not ans.analysis:
            if len(analysis_items) == len(question_texts) and q_index < len(analysis_items):
                ans.analysis = analysis_items[q_index]
            elif q_index == 0:
                # When a long teaching handout has one global "解析" section
                # for many questions, do not duplicate that entire section on
                # every subquestion. Keep it on the first item while the
                # original source/page reference remains available for all.
                ans.analysis = analysis_text
        subquestions.append(SubQuestion(id=f"{source.id}-{index:03d}-{q_index + 1}", prompt=prompt, answer=ans))

    title_line = next((line.strip() for line in block.splitlines() if line.strip()), f"资料 {source.id} 题目 {index + 1}")
    page_start = 1 + offset
    page_end = page_start + block.count("\f")
    ref = SourceRef(source_id=source.id, file_name=Path(source.relative_path).name, pages=list(range(page_start, page_end + 1)))
    return CaseQuestion(
        id=f"case-{source.id}-{index:03d}",
        title=title_line[:120],
        chapter_id="1",
        topics=[],
        question_type="案例题",
        difficulty="中",
        background=block[: (question_matches[0].start() if question_matches else (answer_matches[0].start() if answer_matches else len(block)))].strip(),
        subquestions=subquestions,
        sources=[ref],
    )


def parse_document(source: SourceDocument, text: str) -> list[CaseQuestion]:
    cleaned = clean_text(text)
    return [_parse_block(source, block, cleaned[:offset].count("\f"), index) for index, (block, offset) in enumerate(_blocks(cleaned), start=1) if block.strip()]
