import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { loadAllChapters, loadExam } from '../data/manifest'
import type { CaseQuestion, ExamShard, Mastery } from '../domain/types'
import { elapsedSeconds } from '../domain/exam'
import { useStudyStore } from '../store/studyStore'
import { EmptyState } from '../components/EmptyState'
import { ExamNavigator } from '../components/ExamNavigator'
import { ExamTimer } from '../components/ExamTimer'
import { RichText } from '../components/QuestionCard'

export function ExamRunnerPage() {
  const { examId = '' } = useParams()
  const [exam, setExam] = useState<ExamShard>()
  const [questions, setQuestions] = useState<CaseQuestion[]>()
  const [error, setError] = useState<string>()
  const [now, setNow] = useState(Date.now())
  const session = useStudyStore((state) => state.exams[examId])
  const startExam = useStudyStore((state) => state.startExam)
  const setExamDraft = useStudyStore((state) => state.setExamDraft)
  const setExamIndex = useStudyStore((state) => state.setExamIndex)
  const submitExam = useStudyStore((state) => state.submitExam)
  const setExamMastery = useStudyStore((state) => state.setExamMastery)
  useEffect(() => { loadExam(examId).then(setExam).catch((reason: Error) => setError(reason.message)) }, [examId])
  useEffect(() => { loadAllChapters().then((chapters) => setQuestions(chapters.flatMap((chapter) => chapter.questions))).catch((reason: Error) => setError(reason.message)) }, [])
  useEffect(() => { if (session?.status !== 'active') return; const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(timer) }, [session?.status])
  const orderedQuestions = useMemo(() => exam && questions ? exam.question_ids.map((id) => questions.find((question) => question.id === id)).filter(Boolean) as CaseQuestion[] : [], [exam, questions])
  if (error) return <EmptyState title="模考试卷加载失败" copy={error} />
  if (!exam || !questions) return <div className="loading-state">正在准备试卷题卡……</div>
  if (!session) return <section className="exam-start"><p className="eyebrow">{exam.title}</p><h1>准备好开始了吗？</h1><p>本卷 {orderedQuestions.length} 个题组，建议用时 {exam.duration_minutes} 分钟。开始后计时，刷新页面可恢复草稿。</p><button className="button button-primary" onClick={() => startExam(exam.id)}>开始计时</button><Link className="text-link" to="/exams">返回试卷列表</Link></section>
  const currentIndex = Math.min(session.currentIndex, Math.max(0, orderedQuestions.length - 1))
  const question = orderedQuestions[currentIndex]
  const submitted = session.status === 'submitted'
  const answered = orderedQuestions.map((item) => item.subquestions.some((sub) => Boolean(session.drafts[`${item.id}:${sub.id}`]?.trim())))
  const finish = () => { if (window.confirm('确定交卷吗？交卷后将显示答案，计时不能继续。')) submitExam(exam.id, now) }
  return <div className="exam-runner"><div className="exam-runner-head"><div><Link className="breadcrumb-link" to="/exams">← 试卷列表</Link><p className="eyebrow">{submitted ? 'Review mode' : 'Exam mode'}</p><h1>{exam.title}</h1></div><ExamTimer session={session} durationMinutes={exam.duration_minutes} /></div><div className="exam-progress-row"><span>第 {currentIndex + 1} / {orderedQuestions.length} 题组</span><ExamNavigator count={orderedQuestions.length} current={currentIndex} answered={answered} onSelect={(index) => setExamIndex(exam.id, index)} /></div>{question ? <ExamQuestion question={question} session={session} submitted={submitted} onDraft={(key, value) => setExamDraft(exam.id, key, value)} onMastery={(key, value) => setExamMastery(exam.id, key, value)} /> : <EmptyState title="本卷题目映射为空" copy="请检查内容构建报告。" />}<div className="exam-bottom-actions"><button className="button button-secondary" disabled={currentIndex === 0} onClick={() => setExamIndex(exam.id, currentIndex - 1)}>上一题</button>{submitted ? <span className="submitted-note">已交卷 · 用时 {Math.floor(elapsedSeconds(session, now) / 60)} 分钟</span> : <button className="button button-danger" onClick={finish}>交卷并查看解析</button>}{currentIndex < orderedQuestions.length - 1 && <button className="button button-primary" onClick={() => setExamIndex(exam.id, currentIndex + 1)}>下一题</button>}</div></div>
}

function ExamQuestion({ question, session, submitted, onDraft, onMastery }: { question: CaseQuestion; session: NonNullable<ReturnType<typeof useStudyStore.getState>['exams'][string]>; submitted: boolean; onDraft: (key: string, value: string) => void; onMastery: (key: string, value: Mastery) => void }) {
  return <article className="exam-question"><div className="question-kicker">{question.question_type}</div><h2>{question.title}</h2><div className="question-background"><RichText text={question.background} /></div>{question.subquestions.map((sub, index) => { const key = `${question.id}:${sub.id}`; const mastery = session.mastery[key] ?? 'new'; return <section className="exam-subquestion" key={sub.id}><h3><span>{index + 1}</span><RichText text={sub.prompt} /></h3><textarea disabled={submitted} rows={5} value={session.drafts[key] ?? ''} onChange={(event) => onDraft(key, event.target.value)} placeholder={submitted ? '本小问未填写作答。' : '写下你的答案、公式和计算过程……'} />{submitted && <div className="answer-panel"><div className="answer-title">参考答案</div><div className="answer-reference"><RichText text={sub.answer.reference} /></div>{sub.answer.analysis && <div className="analysis-block"><strong>解题过程</strong><RichText text={sub.answer.analysis} /></div>}<div className="mastery-actions exam-self-review"><span>自评：</span>{(['mastered', 'review'] as Mastery[]).map((value) => <button className={mastery === value ? 'status-button active' : 'status-button'} key={value} onClick={() => onMastery(key, value)}>{value === 'mastered' ? '已掌握' : '待复习'}</button>)}</div></div>}</section> })}</article>
}
