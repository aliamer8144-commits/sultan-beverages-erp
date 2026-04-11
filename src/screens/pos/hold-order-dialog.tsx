'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { PauseCircle } from 'lucide-react'

interface HoldOrderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  holdNote: string
  setHoldNote: (val: string) => void
  grandTotal: number
  formatDual: (amount: number) => { primary: string; secondary: string | null; display: string }
  cartItemCount: number
  onConfirmHold: () => void
}

export function HoldOrderDialog({
  open,
  onOpenChange,
  holdNote,
  setHoldNote,
  grandTotal,
  formatDual,
  cartItemCount,
  onConfirmHold,
}: HoldOrderDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-right">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <PauseCircle className="w-5 h-5 text-amber-500" />
            </div>
            تجميد الطلب
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {/* Summary */}
          <div className="rounded-xl bg-muted/40 p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">عدد المنتجات</span>
              <span className="font-medium">{cartItemCount} منتج</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">الإجمالي</span>
              <span className="font-bold text-primary tabular-nums">{formatDual(grandTotal).display}</span>
            </div>
          </div>
          {/* Note */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">ملاحظة (اختياري)</label>
            <Input
              type="text"
              value={holdNote}
              onChange={(e) => setHoldNote(e.target.value)}
              placeholder="مثال: ينتظر العميل"
              className="h-10 rounded-xl text-sm"
              autoFocus
            />
            <div className="flex gap-1.5 flex-wrap">
              {['ينتظر العميل', 'سيكمل لاحقاً', 'استفسار عن السعر'].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => setHoldNote(suggestion)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all duration-150 ${
                    holdNote === suggestion
                      ? 'bg-amber-500 text-white shadow-sm'
                      : 'bg-muted/60 text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1 h-10 rounded-xl"
          >
            إلغاء
          </Button>
          <Button
            onClick={onConfirmHold}
            className="flex-1 h-10 rounded-xl gap-2 shadow-lg shadow-amber-500/25 bg-amber-500 hover:bg-amber-600 text-white"
          >
            <PauseCircle className="w-4 h-4" />
            تجميد الطلب
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
