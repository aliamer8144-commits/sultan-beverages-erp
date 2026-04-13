'use client'

import { useState, useCallback } from 'react'
import { useAppStore } from '@/store/app-store'
import { useTranslation } from '@/lib/translations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

// ─── Login Particles ──────────────────────────────────────────────────

const LOGIN_PARTICLES = [
  { size: 8, alpha: 0.12, duration: 10, delay: 0, top: '10%', left: '15%', tx: '30px', ty: '-40px' },
  { size: 5, alpha: 0.18, duration: 8, delay: 1, top: '25%', left: '80%', tx: '-20px', ty: '25px' },
  { size: 10, alpha: 0.08, duration: 12, delay: 2, top: '60%', left: '10%', tx: '40px', ty: '-20px' },
  { size: 6, alpha: 0.15, duration: 9, delay: 0.5, top: '80%', left: '70%', tx: '-30px', ty: '-35px' },
  { size: 12, alpha: 0.06, duration: 14, delay: 3, top: '45%', left: '90%', tx: '-25px', ty: '30px' },
  { size: 4, alpha: 0.2, duration: 7, delay: 1.5, top: '15%', left: '50%', tx: '20px', ty: '20px' },
  { size: 7, alpha: 0.1, duration: 11, delay: 2.5, top: '70%', left: '40%', tx: '-15px', ty: '-25px' },
  { size: 9, alpha: 0.09, duration: 13, delay: 4, top: '35%', left: '25%', tx: '35px', ty: '15px' },
  { size: 5, alpha: 0.16, duration: 9.5, delay: 0.8, top: '90%', left: '55%', tx: '-20px', ty: '-30px' },
  { size: 11, alpha: 0.07, duration: 15, delay: 3.5, top: '5%', left: '65%', tx: '25px', ty: '40px' },
  { size: 3, alpha: 0.22, duration: 6, delay: 0.3, top: '50%', left: '30%', tx: '15px', ty: '-15px' },
  { size: 6, alpha: 0.13, duration: 10.5, delay: 2.2, top: '20%', left: '85%', tx: '-10px', ty: '20px' },
]

export function LoginScreen() {
  const { login } = useAppStore()
  const { t } = useTranslation()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const performLogin = useCallback(async (uname: string, pwd: string) => {
    if (!uname || !pwd) {
      toast.error(t('login.errorEmpty'))
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: uname, password: pwd }),
      })
      const data = await res.json()

      if (data.success) {
        login(data.user, data.token || '')
        toast.success(`${t('login.welcomeMsg')} ${data.user.name}!`)
      } else {
        toast.error(data.error || t('login.errorFailed'))
        // Clear on failure
        setUsername('')
        setPassword('')
      }
    } catch {
      toast.error(t('login.errorConnection'))
    } finally {
      setLoading(false)
    }
  }, [login, t])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    await performLogin(username, password)
  }

  const quickLogin = useCallback((uname: string, pwd: string) => {
    setUsername(uname)
    setPassword(pwd)
    performLogin(uname, pwd)
  }, [performLogin])

  return (
    <div className="min-h-screen flex items-center justify-center login-gradient relative overflow-hidden">
      {/* Floating particles */}
      <div className="login-particles">
        {LOGIN_PARTICLES.map((p, i) => (
          <div
            key={i}
            className="login-particle"
            style={{
              '--size': `${p.size}px`,
              '--alpha': p.alpha,
              '--duration': `${p.duration}s`,
              '--delay': `${p.delay}s`,
              '--top': p.top,
              '--left': p.left,
              '--tx': p.tx,
              '--ty': p.ty,
            } as React.CSSProperties}
          />
        ))}
      </div>

      {/* Decorative circles */}
      <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-white/5 blur-3xl" />
      <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] rounded-full bg-white/5 blur-3xl" />
      <div className="absolute top-[20%] left-[10%] w-[200px] h-[200px] rounded-full bg-white/3 blur-2xl" />

      <div className="w-full max-w-md px-6 relative z-10">
        <div className="glass-card-v2 gradient-border-animated rounded-3xl p-8 md:p-10 animate-scale-fade noise-overlay relative overflow-hidden">
          {/* Logo & Title */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-20 h-20 rounded-2xl bg-primary flex items-center justify-center mb-4 shadow-lg shadow-primary/30 logo-glow">
              <svg className="w-10 h-10 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 2h8l4 10H4L8 2z" />
                <path d="M4 12h16v2H4z" />
                <path d="M6 14v6a2 2 0 002 2h8a2 2 0 002-2v-6" />
                <circle cx="12" cy="8" r="1" fill="currentColor" />
                <circle cx="9" cy="9" r="0.5" fill="currentColor" />
                <circle cx="15" cy="9" r="0.5" fill="currentColor" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gradient">{t('login.title')}</h1>
            <p className="text-sm text-muted-foreground mt-1">{t('login.subtitle')}</p>
          </div>

          {/* Login Form */}
          <form id="login-form" onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-medium">{t('login.usernameLabel')}</Label>
              <Input
                id="username"
                type="text"
                placeholder={t('login.usernamePlaceholder')}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="h-12 rounded-xl bg-muted/50 border-0 focus-visible:ring-2 focus-visible:ring-primary/30 text-base px-4 input-focus-glow input-glass"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">{t('login.passwordLabel')}</Label>
              <Input
                id="password"
                type="password"
                placeholder={t('login.passwordPlaceholder')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 rounded-xl bg-muted/50 border-0 focus-visible:ring-2 focus-visible:ring-primary/30 text-base px-4 input-focus-glow input-glass"
              />
            </div>

            <Button
              type="submit"
              className="w-full h-12 rounded-xl text-base font-semibold shadow-lg shadow-primary/30 hover:shadow-primary/40 transition-all duration-200 btn-ripple btn-primary-gradient shimmer"
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center gap-2 relative z-10">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>{t('login.loggingIn')}</span>
                </div>
              ) : (
                <span className="relative z-10">{t('login.loginButton')}</span>
              )}
            </Button>
          </form>

          {/* Demo credentials — only shown in development */}
          {process.env.NODE_ENV === 'development' && (
          <div className="mt-6 pt-6 border-t border-border/50">
            <p className="text-xs text-center text-muted-foreground mb-3">{t('login.demoCredentials')}</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => quickLogin('admin', 'admin123')}
                disabled={loading}
                className="p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors text-center btn-ripple credential-card-blue disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <p className="text-xs font-semibold text-primary">{t('login.admin')}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">admin / admin123</p>
              </button>
              <button
                type="button"
                onClick={() => quickLogin('cashier', 'cashier123')}
                disabled={loading}
                className="p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors text-center btn-ripple credential-card-green disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <p className="text-xs font-semibold text-green-600">{t('login.cashier')}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">cashier / cashier123</p>
              </button>
            </div>
          </div>
          )}
        </div>

        {/* Decorative security indicator */}
        <div className="flex justify-center mt-6">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-[10px] text-white/60 link-animated">{t('login.copyright')}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
