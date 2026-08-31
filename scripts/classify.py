from __future__ import annotations

import re

from .models import CaseQuestion


CHAPTERS = [
    {"id": "1", "number": 1, "title": "现代工程咨询方法", "keywords": ["逻辑框架", "SWOT", "PEST", "德尔菲", "头脑风暴", "工程咨询"]},
    {"id": "2", "number": 2, "title": "规划咨询的主要理论与方法", "keywords": ["规划", "宏观", "产业", "区域", "可持续"]},
    {"id": "3", "number": 3, "title": "能源资源环境分析", "keywords": ["能源", "资源", "环境", "生态", "承载力"]},
    {"id": "4", "number": 4, "title": "战略分析", "keywords": ["战略", "波士顿", "生命周期", "竞争态势", "SWOT"]},
    {"id": "5", "number": 5, "title": "市场分析", "keywords": ["市场", "需求预测", "市场调查", "价格", "销售"]},
    {"id": "6", "number": 6, "title": "重大项目谋划", "keywords": ["项目谋划", "重大项目", "投资机会", "项目储备"]},
    {"id": "7", "number": 7, "title": "现金流量分析", "keywords": ["现金流量", "现金流", "经营成本", "净现金流"]},
    {"id": "8", "number": 8, "title": "工程项目投资估算", "keywords": ["投资估算", "建设投资", "工程费", "预备费"]},
    {"id": "9", "number": 9, "title": "融资方案分析", "keywords": ["融资", "资本金", "债务", "融资方案", "资金成本"]},
    {"id": "10", "number": 10, "title": "工程项目财务分析", "keywords": ["财务分析", "财务评价", "财务净现值", "财务内部收益率", "IRR"]},
    {"id": "11", "number": 11, "title": "工程项目经济分析", "keywords": ["经济分析", "经济净现值", "经济内部收益率", "影子价格", "社会折现率"]},
    {"id": "12", "number": 12, "title": "“十五五”专题", "keywords": ["十五五", "规划建议", "高质量发展", "现代化", "宏观"]},
]

CN_NUMBERS = {"一": 1, "二": 2, "三": 3, "四": 4, "五": 5, "六": 6, "七": 7, "八": 8, "九": 9, "十": 10, "十一": 11, "十二": 12}


def chapter_from_text(text: str) -> str | None:
    match = re.search(r"第\s*([一二三四五六七八九十]{1,3})\s*章", text)
    if not match:
        return None
    number = CN_NUMBERS.get(match.group(1))
    return str(number) if number else None


def classify_case(case: CaseQuestion) -> CaseQuestion:
    source_path = case.sources[0].file_name + " " + case.background
    explicit = chapter_from_text(source_path)
    if explicit:
        case.chapter_id = explicit
    else:
        scores = {chapter["id"]: sum(source_path.lower().count(keyword.lower()) for keyword in chapter["keywords"]) for chapter in CHAPTERS}
        best_id, best_score = max(scores.items(), key=lambda pair: pair[1])
        case.chapter_id = best_id if best_score else "1"
    chapter = next(item for item in CHAPTERS if item["id"] == case.chapter_id)
    case.topics = [keyword for keyword in chapter["keywords"] if keyword.lower() in source_path.lower()][:6]
    case.needs_review = not bool(case.background.strip()) or any(not item.answer.reference.strip() for item in case.subquestions)
    if case.needs_review:
        case.review_notes.append("题干或答案标记需要人工复核")
    return case
