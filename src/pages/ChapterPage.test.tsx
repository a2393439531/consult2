import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import { ChapterPage } from './ChapterPage'

vi.mock('../data/manifest', () => ({
  loadChapter: vi.fn().mockResolvedValue({ id: '1', number: 1, title: '现代工程咨询方法', questions: [] }),
  loadManifest: vi.fn().mockResolvedValue({ chapters: [{ id: '1', number: 1, title: '现代工程咨询方法', count: 0 }] }),
}))

test('renders chapter context and empty state', async () => {
  render(<MemoryRouter initialEntries={['/chapters/01']}><ChapterPage /></MemoryRouter>)
  expect(await screen.findByRole('heading', { name: /第1章/ })).toBeInTheDocument()
  expect(await screen.findByText('这个筛选下还没有题目')).toBeInTheDocument()
})
