import { useState } from 'react'
import type { CaseQuestion, Mastery } from '../domain/types'
import { useStudyStore } from '../store/studyStore'
import { SourceNote } from './SourceNote'

const masteryLabels: Record<Mastery, string> = { new: '未自评', mastered: '已掌握', review: '待复习' }

export function QuestionCard({ question, index }: { question: CaseQuestion; index?: number }) {
  const [revealed, setRevealed] = useState(false)
  const [showAllSubquestions, setShowAllSubquestions] = useState(false)
  const mastery = useStudyStore((state) => state.mastery[question.id] ?? 'new')
  const bookmarked = useStudyStore((state) => Boolean(state.bookmarks[question.id]))
  const setMastery = useStudyStore((state) => state.setMastery)
  const toggleBookmark = useStudyStore((state) => state.toggleBookmark)

  return (
    <article className="question-card" id={question.id}>
      <div className="question-card-head">
        <div>
          <p className="question-kicker">{index ? `题组 ${String(index).padStart(2, '0')}` : '案例题'} · {question.question_type}</p>
          <h2>{question.title}</h2>
        </div>
        <button className={bookmarked ? 'icon-button pressed' : 'icon-button'} aria-label={bookmarked ? '取消收藏' : '收藏题目'} aria-pressed={bookmarked} onClick={() => toggleBookmark(question.id)}>{bookmarked ? '★' : '☆'}</button>
      </div>
      <div className="tag-row">
        <span className="tag tag-teal">{question.difficulty}难度</span>
        {question.topics.slice(0, 4).map((topic) => <span className="tag" key={topic}>{topic}</span>)}
        {mastery !== 'new' && <span className={mastery === 'review' ? 'tag tag-warn' : 'tag tag-success'}>{masteryLabels[mastery]}</span>}
      </div>
      <div className="question-background"><RichText text={question.background} /></div>
      <div className="subquestion-list">
        {question.subquestions.slice(0, showAllSubquestions ? undefined : 12).map((item, itemIndex) => (
          <section className="subquestion" key={item.id}>
            <QuestionDraft questionId={question.id} subQuestionId={item.id} />
            <h3><span>{itemIndex + 1}</span><RichText text={item.prompt} /></h3>
            {revealed && <div className="answer-panel">
              <div className="answer-title"><span>参考答案</span><span className="answer-rule">按得分点组织</span></div>
              <div className="answer-reference"><RichText text={item.answer.reference} /></div>
              {item.answer.analysis && <div className="analysis-block"><strong>解题过程</strong><RichText text={item.answer.analysis} /></div>}
              {item.answer.scoring_points.length > 0 && <div className="scoring-block"><strong>评分关键词</strong><ul>{item.answer.scoring_points.map((point) => <li key={point}>{point}</li>)}</ul></div>}
              {item.answer.pitfalls.length > 0 && <div className="pitfall-block"><strong>易错点</strong>{item.answer.pitfalls.map((pitfall) => <span key={pitfall}>{pitfall}</span>)}</div>}
            </div>}
          </section>
        ))}
        {question.subquestions.length > 12 && !showAllSubquestions && <button className="subquestion-more" type="button" onClick={() => setShowAllSubquestions(true)}>显示其余 {question.subquestions.length - 12} 个小问</button>}
      </div>
      <div className="question-actions">
        <button className="button button-primary small" onClick={() => setRevealed((value) => !value)}>{revealed ? '收起解析' : '展开答案与解析'}</button>
        <div className="mastery-actions" aria-label="自评掌握状态">
          <span>自评：</span>
          <button className={mastery === 'mastered' ? 'status-button active' : 'status-button'} onClick={() => setMastery(question.id, 'mastered')}>已掌握</button>
          <button className={mastery === 'review' ? 'status-button active warn' : 'status-button'} onClick={() => setMastery(question.id, 'review')}>待复习</button>
        </div>
      </div>
      <SourceNote sources={question.sources} />
    </article>
  )
}

function QuestionDraft({ questionId, subQuestionId }: { questionId: string; subQuestionId: string }) {
  const key = `${questionId}:${subQuestionId}`
  const draft = useStudyStore((state) => state.drafts[key] ?? '')
  const setDraft = useStudyStore((state) => state.setDraft)
  return <><label className="draft-label" htmlFor={`${subQuestionId}-draft`}>你的作答草稿</label><textarea id={`${subQuestionId}-draft`} value={draft} onChange={(event) => setDraft(key, event.target.value)} placeholder="先写下判断依据、公式和计算步骤……" rows={3} /></>
}

export function RichText({ text }: { text: string }) {
  return <div className="rich-text">{text.split(/\n{2,}/).map((block, index) => {
    const lines = block.split('\n').map((line) => line.trim()).filter(Boolean)
    const isTable = lines.length >= 2 && lines.every((line) => line.includes('|'))
    if (isTable) {
      const rows = lines.filter((line) => !/^\|?\s*:?-{2,}/.test(line)).map((line) => line.split('|').map((cell) => cell.trim()).filter(Boolean))
      return <div className="table-scroll" key={`${block.slice(0, 8)}-${index}`}><table><tbody>{rows.map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, cellIndex) => rowIndex === 0 ? <th key={cellIndex}>{cell}</th> : <td key={cellIndex}>{cell}</td>)}</tr>)}</tbody></table></div>
    }
    return <p key={`${block.slice(0, 8)}-${index}`}>{block}</p>
  })}</div>
}
