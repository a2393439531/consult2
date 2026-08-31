import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { loadChapter, loadManifest } from '../data/manifest'
import type { ChapterShard, ChapterSummary } from '../domain/types'
import { useStudyStore } from '../store/studyStore'
import { EmptyState } from '../components/EmptyState'
import { FilterBar } from '../components/FilterBar'
import { QuestionCard } from '../components/QuestionCard'

export function ChapterPage() {
  const { chapterId = '01' } = useParams()
  const normalizedId = String(Number(chapterId)).padStart(2, '0')
  const [chapter, setChapter] = useState<ChapterShard>()
  const [chapters, setChapters] = useState<ChapterSummary[]>([])
  const [error, setError] = useState<string>()
  const [topic, setTopic] = useState('全部')
  const [status, setStatus] = useState('全部')
  const mastery = useStudyStore((state) => state.mastery)
  useEffect(() => { loadChapter(String(Number(chapterId))).then(setChapter).catch((reason: Error) => setError(reason.message)) }, [chapterId])
  useEffect(() => { loadManifest().then((manifest) => setChapters(manifest.chapters)).catch(() => setChapters([])) }, [])
  const topics = useMemo(() => Array.from(new Set(chapter?.questions.flatMap((question) => question.topics) ?? [])).slice(0, 12), [chapter])
  const questions = useMemo(() => (chapter?.questions ?? []).filter((question) => (topic === '全部' || question.topics.includes(topic)) && (status === '全部' || (status === '待复习' ? mastery[question.id] === 'review' : status === '未作答' ? !mastery[question.id] : mastery[question.id] === 'mastered'))), [chapter, mastery, status, topic])
  if (error) return <EmptyState title="章节加载失败" copy={error} />
  if (!chapter) return <div className="loading-state">正在整理本章题卡……</div>
  return <div className="chapter-page"><div className="breadcrumb"><Link to="/">章节复习</Link><span>/</span><span>第 {chapter.number} 章</span></div><section className="chapter-hero"><div><p className="eyebrow">Chapter {String(chapter.number).padStart(2, '0')}</p><h1>第{chapter.number}章 · {chapter.title}</h1><p>本章共 {chapter.questions.length} 个题组。先遮住解析，按自己的步骤完成计算或判断。</p></div><div className="chapter-count"><strong>{chapter.questions.length}</strong><span>个题组</span></div></section><div className="study-layout"><aside className="chapter-sidebar"><strong>章节导航</strong><Link to="/">返回章节总览</Link>{chapters.map((item) => <Link className={item.id.padStart(2, '0') === normalizedId ? 'active' : ''} key={item.id} to={`/chapters/${item.id.padStart(2, '0')}`}>第{item.number}章</Link>)}</aside><main className="chapter-content"><div className="filter-stack"><FilterBar label="知识点" value={topic} onChange={setTopic} options={topics} /><FilterBar label="状态" value={status} onChange={setStatus} options={['未作答', '待复习', '已掌握']} /></div><div className="question-list-heading"><span>显示 {questions.length} / {chapter.questions.length} 个题组</span><span>答案默认收起</span></div>{questions.length ? questions.map((question, index) => <QuestionCard question={question} index={index + 1} key={question.id} />) : <EmptyState title="这个筛选下还没有题目" copy="换一个知识点或状态试试看。" />}</main></div></div>
}
