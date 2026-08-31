import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import { App } from './App'
import type { ReactNode } from 'react'

vi.mock('./data/manifest', () => ({ loadManifest: vi.fn().mockResolvedValue({ version: 1, chapters: [], exams: [], totals: { source_count: 0 } }) }))
vi.mock('./auth/AuthGate', () => ({ AuthGate: ({ children }: { children: ReactNode }) => children, useAuth: () => ({ logout: vi.fn() }) }))

test('renders the study-site identity', async () => {
  render(<App />)
  expect(await screen.findByText('2026 咨询实务·全量题库', { selector: 'strong' })).toBeInTheDocument()
})
