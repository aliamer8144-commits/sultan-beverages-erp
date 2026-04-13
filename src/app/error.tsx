'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Application error:', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4" dir="rtl">
      <div className="text-center space-y-4 max-w-md">
        <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
          <AlertTriangle className="w-8 h-8 text-destructive" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">حدث خطأ غير متوقع</h2>
        <p className="text-muted-foreground text-sm">
          عذراً، حدث خطأ أثناء تحميل الصفحة. يرجى المحاولة مرة أخرى.
        </p>
        {error.digest && (
          <p className="text-xs text-muted-foreground/60 font-mono">رمز الخطأ: {error.digest}</p>
        )}
        <Button onClick={reset} variant="outline" className="mt-2">
          إعادة المحاولة
        </Button>
      </div>
    </div>
  )
}
