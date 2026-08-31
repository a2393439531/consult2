import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import { ExamRunnerPage } from './ExamRunnerPage'

vi.mock('../data/manifest', () => ({
  loadExam: vi.fn().mockResolvedValue({ id: 'exam-1', title: '测试模考', duration_minutes: 120, question_ids: ['case-1'], source: { source_id: 's', file_name: '模考.pdf', pages: [1] } }),
  loadAllChapters: vi.fn().mockResolvedValue([{ id: '1', number: 1, title: '第一章', questions: [{ id: 'case-1', title: '测试题', chapter_id: '1', topics: [], question_type: '案例题', difficulty: '中', background: '背景', subquestions: [{ id: 'q1', prompt: '问题', answer: { reference: '答案', analysis: '', scoring_points: [], pitfalls: [] } }], sources: [{ source_id: 's', file_name: '模考.pdf', pages: [1] }], exam_ids: [], needs_review: false, review_notes: [] }] }])
}))

test('shows a start action before a mock session begins', async () => {
  render(<MemoryRouter initialEntries={['/exams/exam-1']}><ExamRunnerPage /></MemoryRouter>)
  expect(await screen.findByRole('button', { name: '开始计时' })).toBeInTheDocument()
})
