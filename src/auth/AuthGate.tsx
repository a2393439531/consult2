import { createContext, useContext, useState, type ReactNode } from 'react'

const AUTH_STORAGE_KEY = 'consult2-authenticated-v1'
const ACCESS_CODE_HASH = '83ed758908464a0591491a488031f35536e3a07d87d954ef8fc419b3d0ff87c0'

type AuthContextValue = { logout: () => void }
const AuthContext = createContext<AuthContextValue>({ logout: () => undefined })

function hasSession() {
  try {
    return sessionStorage.getItem(AUTH_STORAGE_KEY) === 'granted'
  } catch {
    return false
  }
}

async function digest(value: string) {
  const bytes = new TextEncoder().encode(value)
  const result = await globalThis.crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(result), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

function safeEqual(left: string, right: string) {
  if (left.length !== right.length) return false
  let difference = 0
  for (let index = 0; index < left.length; index += 1) difference |= left.charCodeAt(index) ^ right.charCodeAt(index)
  return difference === 0
}

async function verifyAccessCode(value: string) {
  if (!value.trim() || !globalThis.crypto?.subtle) return false
  return safeEqual(await digest(value), ACCESS_CODE_HASH)
}

export function useAuth() {
  return useContext(AuthContext)
}

export function AuthGate({ children }: { children: ReactNode }) {
  const [authenticated, setAuthenticated] = useState(hasSession)
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState('')

  const login = async (value: string) => {
    setChecking(true)
    setError('')
    try {
      if (!await verifyAccessCode(value)) {
        setError('口令不正确，请重试。')
        return
      }
      try {
        sessionStorage.setItem(AUTH_STORAGE_KEY, 'granted')
      } catch {
        setError('当前浏览器不允许保存会话，请开启浏览器存储后重试。')
        return
      }
      setAuthenticated(true)
    } catch {
      setError('暂时无法验证口令，请刷新页面重试。')
    } finally {
      setChecking(false)
    }
  }

  const logout = () => {
    try {
      sessionStorage.removeItem(AUTH_STORAGE_KEY)
    } finally {
      setAuthenticated(false)
    }
  }

  if (!authenticated) return <AccessScreen checking={checking} error={error} onSubmit={login} />
  return <AuthContext.Provider value={{ logout }}>{children}</AuthContext.Provider>
}

function AccessScreen({ checking, error, onSubmit }: { checking: boolean; error: string; onSubmit: (value: string) => Promise<void> }) {
  const [value, setValue] = useState('')
  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void onSubmit(value)
  }

  return <main className="auth-page"><section className="auth-card" aria-labelledby="auth-title"><div className="auth-mark">实</div><p className="eyebrow">Private study room</p><h1 id="auth-title">输入访问口令</h1><p className="auth-copy">这是个人备考复习站。验证通过后，才能打开章节题库和整卷模考。</p><form onSubmit={submit}><label htmlFor="access-code">访问口令</label><input id="access-code" type="password" value={value} onChange={(event) => setValue(event.target.value)} autoComplete="current-password" autoFocus placeholder="请输入口令" /><button className="button button-primary auth-submit" type="submit" disabled={checking || !value}>{checking ? '正在验证…' : '进入复习站'}</button>{error && <p className="auth-error" role="alert">{error}</p>}</form><p className="auth-note">会话只保存在当前浏览器标签页，关闭标签页后需要重新验证。</p></section></main>
}
