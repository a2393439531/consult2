import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { DashboardPage } from './pages/DashboardPage'
import { ChapterPage } from './pages/ChapterPage'
import { ReviewPage } from './pages/ReviewPage'
import { SearchPage } from './pages/SearchPage'
import { ExamListPage } from './pages/ExamListPage'
import { ExamRunnerPage } from './pages/ExamRunnerPage'
import { AuthGate } from './auth/AuthGate'

export function App() {
  return <AuthGate><HashRouter><AppShell><Routes><Route path="/" element={<DashboardPage />} /><Route path="/chapters/:chapterId" element={<ChapterPage />} /><Route path="/review" element={<ReviewPage />} /><Route path="/search" element={<SearchPage />} /><Route path="/exams" element={<ExamListPage />} /><Route path="/exams/:examId" element={<ExamRunnerPage />} /><Route path="*" element={<Navigate to="/" replace />} /></Routes></AppShell></HashRouter></AuthGate>
}
