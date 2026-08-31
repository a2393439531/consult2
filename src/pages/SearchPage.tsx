import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { createSearchIndex } from '../domain/search'
import type { CaseQuestion } from '../domain/types'
import { loadAllChapters } from '../data/manifest'
import { EmptyState } from '../components/EmptyState'

export function SearchPage() {
  const [query, setQuery] = useState('')
  const [questions, setQuestions] = useState<CaseQuestion[]>()
  useEffect(() => { loadAllChapters().then((chapters) => setQuestions(chapters.flatMap((chapter) => chapter.questions))).catch(() => setQuestions([])) }, [])
  const index = useMemo(() => questions ? createSearchIndex(questions) : undefined, [questions])
  const results = query.trim() && index ? index.search(query.trim()).map((result) => questions?.find((question) => question.id === result.item.id)).filter(Boolean) as CaseQuestion[] : []
  return <div className="search-page"><section className="page-intro"><p className="eyebrow">Search the bank</p><h1>从题干、解析和来源里找线索。</h1><p>支持搜索知识点、公式关键词、真题年份或网校来源。</p></section><label className="search-box"><span aria-hidden="true">⌕</span><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="例如：现金流量、SWOT、2025 真题" aria-label="搜索题库" /></label>{!query.trim() ? <div className="search-hint">输入关键词后，结果会按相关度显示。</div> : results.length ? <div className="search-results">{results.map((question) => <Link className="search-result" to={`/chapters/${question.chapter_id}`} key={question.id}><div><span className="result-meta">第 {question.chapter_id} 章 · {question.question_type}</span><h2>{question.title}</h2><p>{question.background.slice(0, 180)}{question.background.length > 180 ? '…' : ''}</p></div><span>↗</span></Link>)}</div> : <EmptyState title="没有找到匹配题目" copy="试试更短的关键词，或换一个知识点。" />}</div>
}
