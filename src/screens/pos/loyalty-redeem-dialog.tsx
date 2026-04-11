'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Star } from 'lucide-react'
import type { Customer } from './types'

interface LoyaltyRedeemDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedCustomer: Customer | null
  customerPoints: number
  redeemPoints: string
  setRedeemPoints: (val: string) => void
  redeemingPoints: boolean
  loyaltySettings: {
    loyaltyEnabled: boolean
    loyaltyMinPointsToRedeem?: number
    loyaltyRedemptionValue?: number
  }
  onConfirmRedeem: () => void
  formatDual: (amount: number) => { primary: string; secondary: string | null; display: string }
  symbol: string
}

export function LoyaltyRedeemDialog({
  open,
  onOpenChange,
  selectedCustomer,
  customerPoints,
  redeemPoints,
  setRedeemPoints,
  redeemingPoints,
  loyaltySettings,
  onConfirmRedeem,
  formatDual,
  symbol,
}: LoyaltyRedeemDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-right">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <Star className="w-5 h-5 text-amber-500" />
            </div>
            استبدال النقاط
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {/* Customer info */}
          {selectedCustomer && (
            <div className="rounded-xl bg-amber-500/5 border border-amber-500/20 p-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold">{selectedCustomer.name}</p>
                <p className="text-[10px] text-muted-foreground">رصيد النقاط</p>
              </div>
              <div className="text-left">
                <p className="text-xl font-bold text-amber-600 tabular-nums">{customerPoints}</p>
                <p className="text-[10px] text-muted-foreground">نقطة</p>
              </div>
            </div>
          )}

          {/* Points input */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">عدد النقاط للاستبدال</label>
            <div className="relative">
              <Input
                type="number"
                min={loyaltySettings.loyaltyMinPointsToRedeem || 0}
                max={customerPoints}
                value={redeemPoints}
                onChange={(e) => setRedeemPoints(e.target.value)}
                placeholder="0"
                className="h-11 rounded-xl text-base font-bold pr-4 pl-14 tabular-nums"
                autoFocus
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">نقطة</span>
            </div>
            {redeemPoints && parseInt(redeemPoints) > customerPoints && (
              <p className="text-[11px] text-destructive">النقاط المطلوبة أكبر من المتاح ({customerPoints})</p>
            )}
          </div>

          {/* Quick points buttons */}
          <div className="flex gap-2 flex-wrap">
            {(() => {
              const minPts = loyaltySettings.loyaltyMinPointsToRedeem || 100
              const quarterPts = Math.floor(customerPoints / 4)
              const halfPts = Math.floor(customerPoints / 2)
              const buttons: Array<{ label: string; value: number }> = []
              if (quarterPts >= minPts) buttons.push({ label: `١/٤ (${quarterPts})`, value: quarterPts })
              if (halfPts >= minPts) buttons.push({ label: `نصف (${halfPts})`, value: halfPts })
              buttons.push({ label: `الكل (${customerPoints})`, value: customerPoints })
              return buttons.map((btn) => (
                <button
                  key={btn.value}
                  onClick={() => setRedeemPoints(String(btn.value))}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                    parseInt(redeemPoints) === btn.value
                      ? 'bg-amber-500 text-white shadow-sm'
                      : 'bg-amber-500/10 text-amber-600 hover:bg-amber-500/20'
                  }`}
                >
                  {btn.label}
                </button>
              ))
            })()}
          </div>

          {/* Discount preview */}
          {redeemPoints && parseInt(redeemPoints) > 0 && parseInt(redeemPoints) <= customerPoints && (
            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">قيمة الخصم</p>
              <p className="text-lg font-bold text-emerald-600 tabular-nums">
                {formatDual(parseInt(redeemPoints) * (loyaltySettings.loyaltyRedemptionValue || 0)).display}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {redeemPoints} نقطة × {loyaltySettings.loyaltyRedemptionValue || 0} {symbol} = {formatDual(parseInt(redeemPoints) * (loyaltySettings.loyaltyRedemptionValue || 0)).display}
              </p>
            </div>
          )}
        </div>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1 h-10 rounded-xl"
            disabled={redeemingPoints}
          >
            إلغاء
          </Button>
          <Button
            onClick={onConfirmRedeem}
            disabled={redeemingPoints || !redeemPoints || parseInt(redeemPoints) <= 0 || parseInt(redeemPoints) > customerPoints}
            className="flex-1 h-10 rounded-xl gap-2 shadow-lg shadow-amber-500/25 bg-amber-500 hover:bg-amber-600 text-white"
          >
            {redeemingPoints ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>جاري المعالجة...</span>
              </>
            ) : (
              <>
                <Star className="w-4 h-4" />
                <span>تأكيد الاستبدال</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
