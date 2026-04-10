'use client'

import { useSyncExternalStore } from 'react'
import { useAppStore } from '@/store/app-store'
import { LoginScreen } from '@/screens/login-screen'
import { AppLayout } from '@/components/erp/app-layout'

const emptySubscribe = () => () => {}

export default function Home() {
  const isAuthenticated = useAppStore((s) => s.isAuthenticated)

  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false)

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-pulse flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-primary animate-bounce" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 2h8l4 10H4L8 2z" />
              <path d="M4 12h16v2H4z" />
              <path d="M6 14v6a2 2 0 002 2h8a2 2 0 002-2v-6" />
            </svg>
          </div>
          <p className="text-sm text-muted-foreground">جاري التحميل...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <LoginScreen />
  }

  return <AppLayout />
}
