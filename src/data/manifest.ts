import type { ChapterShard, ContentManifest, ExamShard } from '../domain/types'

const dataUrl = (path: string) => {
  const origin = typeof window === 'undefined' ? 'http://localhost/' : window.location.origin
  const base = new URL(import.meta.env.BASE_URL || '/', origin)
  return new URL(`data/${path}`, base).toString()
}

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(dataUrl(path))
  if (!response.ok) throw new Error(`题库数据加载失败：${path}`)
  return response.json() as Promise<T>
}

let manifestPromise: Promise<ContentManifest> | undefined
const chapterCache = new Map<string, Promise<ChapterShard>>()
const examCache = new Map<string, Promise<ExamShard>>()

export function loadManifest(): Promise<ContentManifest> {
  manifestPromise ??= fetchJson<ContentManifest>('manifest.json')
  return manifestPromise
}

export function loadChapter(id: string): Promise<ChapterShard> {
  const cached = chapterCache.get(id)
  if (cached) return cached
  const request = fetchJson<ChapterShard>(`chapters/chapter-${id.padStart(2, '0')}.json`)
  chapterCache.set(id, request)
  return request
}

export function loadAllChapters(): Promise<ChapterShard[]> {
  return loadManifest().then((manifest) => Promise.all(manifest.chapters.map((chapter) => loadChapter(chapter.id))))
}

export function loadExam(id: string): Promise<ExamShard> {
  const cached = examCache.get(id)
  if (cached) return cached
  const request = fetchJson<ExamShard>(`exams/${id}.json`)
  examCache.set(id, request)
  return request
}

export function clearDataCache() {
  manifestPromise = undefined
  chapterCache.clear()
  examCache.clear()
}
