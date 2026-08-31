import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import { App } from './App'

vi.mock('./data/manifest', () => ({ loadManifest: vi.fn().mockResolvedValue({ version: 1, chapters: [], exams: [], totals: { source_count: 0 } }) }))

test('renders the study-site identity', async () => {
  render(<App />)
  expect(await screen.findByText('2026 咨询实务·全量题库', { selector: 'strong' })).toBeInTheDocument()
})
