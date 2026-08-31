export type Mastery = 'new' | 'mastered' | 'review'

export interface Answer {
  reference: string
  analysis: string
  scoring_points: string[]
  pitfalls: string[]
}

export interface SubQuestion {
  id: string
  prompt: string
  answer: Answer
}

export interface SourceRef {
  source_id: string
  file_name: string
  pages: number[]
}

export interface CaseQuestion {
  id: string
  title: string
  chapter_id: string
  topics: string[]
  question_type: string
  difficulty: string
  background: string
  subquestions: SubQuestion[]
  sources: SourceRef[]
  exam_ids: string[]
  needs_review: boolean
  review_notes: string[]
}

export interface ChapterSummary {
  id: string
  number: number
  title: string
  count: number
  question_ids?: string[]
}

export interface ChapterShard extends Omit<ChapterSummary, 'count'> {
  questions: CaseQuestion[]
}

export interface ExamShard {
  id: string
  title: string
  duration_minutes: number
  question_ids: string[]
  source: SourceRef
}

export interface CoverageTotals {
  source_count: number
  source_pages: number
  processed_source_count: number
  parsed_case_count: number
  published_case_count: number
  subquestion_count: number
  duplicate_group_count: number
  review_item_count: number
  source_failures: { source_id: string; reason: string }[]
  chapter_counts: Record<string, number>
  exam_count: number
}

export interface ContentManifest {
  version: number
  chapters: ChapterSummary[]
  exams: ExamShard[]
  totals: CoverageTotals
}

export interface SearchDocument {
  id: string
  title: string
  background: string
  prompts: string
  answers: string
  topics: string
  source: string
  year: string
  chapterId: string
}

export interface ExamSession {
  examId: string
  startedAt: number
  submittedAt?: number
  status: 'active' | 'submitted'
  currentIndex: number
  drafts: Record<string, string>
  mastery: Record<string, Mastery>
}
