import { render, screen } from '@testing-library/react'
import { beforeEach, expect, test } from 'vitest'
import { AuthGate } from './AuthGate'

beforeEach(() => sessionStorage.clear())

test('hides the study site until an access code is entered', () => {
  render(<AuthGate><span>受保护内容</span></AuthGate>)
  expect(screen.getByRole('heading', { name: '输入访问口令' })).toBeInTheDocument()
  expect(screen.queryByText('受保护内容')).not.toBeInTheDocument()
})
