import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { loadManifest } from '../data/manifest'
import type { ContentManifest } from '../domain/types'
import { useStudyStore } from '../store/studyStore'
import { EmptyState } from '../components/EmptyState'
import { ProgressRing } from '../components/ProgressRing'

export function DashboardPage() {
  const [manifest, setManifest] = useState<ContentManifest>()
  const [error, setError] = useState<string>()
  const mastery = useStudyStore((state) => state.mastery)
  const lastLocation = useStudyStore((state) => state.lastLocation)
  useEffect(() => { loadManifest().then(setManifest).catch((reason: Error) => setError(reason.message)) }, [])
  const masteredCount = useMemo(() => Object.values(mastery).filter((value) => value === 'mastered').length, [mastery])

  if (error) return <EmptyState title="题库暂时无法加载" copy={`${error} 请刷新页面重试。`} />
  if (!manifest) return <div className="loading-state">正在打开你的复习工作台……</div>
  return (
    <div className="dashboard-page">
      <section className="dashboard-intro">
        <div><p className="eyebrow">2026 备考 · 实务</p><h1>今天，从一个章节开始。</h1><p>题卡默认收起答案。写完思路后再展开，用“已掌握 / 待复习”给自己一个诚实反馈。</p></div>
        <div className="continue-card"><span className="continue-label">继续上次复习</span><strong>{lastLocation ? '回到上次位置' : '第一章 · 现代工程咨询方法'}</strong><Link to={lastLocation || '/chapters/01'} className="text-link">打开题卡 →</Link></div>
      </section>
      <section className="overview-strip" aria-label="学习概览"><div><span>已掌握</span><strong>{masteredCount}</strong><small>道题</small></div><div><span>待复习</span><strong>{Object.values(mastery).filter((value) => value === 'review').length}</strong><small>道题</small></div><div><span>资料覆盖</span><strong>{manifest.totals.source_count}</strong><small>份 PDF</small></div><div><span>可用模考</span><strong>{manifest.exams.length}</strong><small>套整卷</small></div></section>
      <section className="section-heading"><div><p className="eyebrow">Chapter map</p><h2>按章节复习</h2></div><Link className="text-link" to="/search">搜索全站题目 →</Link></section>
      <div className="chapter-grid">
        {manifest.chapters.map((chapter) => {
          const count = chapter.count || 0
          const chapterQuestionIds = new Set(chapter.question_ids ?? [])
          const mastered = Object.entries(mastery).filter(([id, value]) => value === 'mastered' && chapterQuestionIds.has(id)).length
          const progress = count ? Math.round((mastered / count) * 100) : 0
          return <Link className="chapter-card" to={`/chapters/${chapter.id.padStart(2, '0')}`} key={chapter.id}><div className="chapter-card-top"><span className="chapter-number">{String(chapter.number).padStart(2, '0')}</span><ProgressRing value={progress} label={chapter.title} /></div><h3>{chapter.title}</h3><p>{count} 个案例题组 <span>·</span> {progress ? `${progress}% 已掌握` : '尚未开始'}</p><span className="chapter-arrow">↗</span></Link>
        })}
      </div>
    </div>
  )
}
