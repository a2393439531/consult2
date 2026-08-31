import { useEffect, useState } from 'react'
import { loadAllChapters } from '../data/manifest'
import type { CaseQuestion } from '../domain/types'
import { useStudyStore } from '../store/studyStore'
import { EmptyState } from '../components/EmptyState'
import { QuestionCard } from '../components/QuestionCard'

export function ReviewPage() {
  const [questions, setQuestions] = useState<CaseQuestion[]>()
  const bookmarks = useStudyStore((state) => state.bookmarks)
  const mastery = useStudyStore((state) => state.mastery)
  useEffect(() => { loadAllChapters().then((chapters) => setQuestions(chapters.flatMap((chapter) => chapter.questions))).catch(() => setQuestions([])) }, [])
  const review = (questions ?? []).filter((question) => mastery[question.id] === 'review' || bookmarks[question.id])
  if (!questions) return <div className="loading-state">正在汇总待复习题……</div>
  return <div className="review-page"><section className="page-intro"><p className="eyebrow">Review queue</p><h1>把卡住的题，留在手边。</h1><p>这里汇总你标记为待复习或收藏的题目。每次展开解析后，再决定是否改成“已掌握”。</p></section>{review.length ? <div className="question-list">{review.map((question, index) => <QuestionCard question={question} index={index + 1} key={question.id} />)}</div> : <EmptyState title="待复习列表是空的" copy="在章节题卡里收藏题目，或把掌握状态标记为待复习。" />}</div>
}
