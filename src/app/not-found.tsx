import { Button } from '@/components/ui/button'
import { FileQuestion } from 'lucide-react'
import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4" dir="rtl">
      <div className="text-center space-y-4 max-w-md">
        <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center">
          <FileQuestion className="w-8 h-8 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">الصفحة غير موجودة</h2>
        <p className="text-muted-foreground text-sm">
          الصفحة التي تبحث عنها غير موجودة أو تم نقلها.
        </p>
        <Button asChild className="mt-2">
          <Link href="/">العودة للرئيسية</Link>
        </Button>
      </div>
    </div>
  )
}
