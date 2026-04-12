'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { Wallet, Crown, Banknote } from 'lucide-react'
import { useApi } from '@/hooks/use-api'

import type { Customer } from './types'

interface CustomerPaymentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  customer: Customer | null
  formatCurrency: (amount: number) => string
  symbol: string
  onSuccess: () => void
}

export function CustomerPaymentDialog({
  open,
  onOpenChange,
  customer,
  formatCurrency,
  symbol,
  onSuccess,
}: CustomerPaymentDialogProps) {
  const { post } = useApi()
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [paymentNotes, setPaymentNotes] = useState('')
  const [paymentSubmitting, setPaymentSubmitting] = useState(false)

  const handleRecordPayment = async () => {
    if (!customer) return
    const amount = parseFloat(paymentAmount)
    if (!amount || amount <= 0) {
      toast.error('يرجى إدخال مبلغ صحيح')
      return
    }
    if (amount > customer.debt) {
      toast.error('المبلغ أكبر من المديونية الحالية')
      return
    }

    setPaymentSubmitting(true)
    try {
      const result = await post('/api/customer-payments', {
        customerId: customer.id,
        amount,
        method: paymentMethod,
        notes: paymentNotes.trim() || null,
      }, {
        showSuccessToast: true,
        successMessage: `تم تسجيل دفعة ${formatCurrency(amount)} (${paymentMethod === 'cash' ? 'نقدي' : 'تحويل'}) للعميل ${customer.name}`,
      })
      if (result) {
        setPaymentAmount('')
        setPaymentMethod('cash')
        setPaymentNotes('')
        onOpenChange(false)
        onSuccess()
      }
    } finally {
      setPaymentSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10">
              <Wallet className="h-5 w-5 text-emerald-600" />
            </div>
            تسجيل دفعة
          </DialogTitle>
        </DialogHeader>
        {customer && (
          <div className="space-y-4 py-2">
            <div className="rounded-xl bg-muted/40 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold">{customer.name}</p>
                    {customer.category === 'VIP' && (
                      <Crown className="h-3.5 w-3.5 text-amber-500" />
                    )}
                  </div>
                  {customer.phone && (
                    <p className="text-xs text-muted-foreground" dir="ltr">{customer.phone}</p>
                  )}
                </div>
                <div className="text-left">
                  <p className="text-[10px] text-muted-foreground">المديونية الحالية</p>
                  <p className="text-base font-bold text-destructive tabular-nums">
                    {formatCurrency(customer.debt)}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>مبلغ الدفعة <span className="text-destructive">*</span></Label>
              <div className="relative">
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="أدخل المبلغ"
                  className="h-11 text-base font-bold pr-4 pl-14 tabular-nums"
                  dir="ltr"
                  autoFocus
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">{symbol}</span>
              </div>
              {paymentAmount && parseFloat(paymentAmount) > customer.debt && (
                <p className="text-[11px] text-destructive">المبلغ يتجاوز المديونية الحالية</p>
              )}
            </div>

            <div className="flex gap-2 flex-wrap">
              {customer.debt >= 50 && (
                <button
                  onClick={() => setPaymentAmount(String(Math.min(50, customer.debt)))}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                    parseFloat(paymentAmount) === Math.min(50, customer.debt)
                      ? 'bg-primary text-white shadow-sm'
                      : 'bg-muted/60 text-muted-foreground hover:bg-muted'
                  }`}
                >
                  50
                </button>
              )}
              {customer.debt >= 100 && (
                <button
                  onClick={() => setPaymentAmount(String(Math.min(100, customer.debt)))}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                    parseFloat(paymentAmount) === Math.min(100, customer.debt)
                      ? 'bg-primary text-white shadow-sm'
                      : 'bg-muted/60 text-muted-foreground hover:bg-muted'
                  }`}
                >
                  100
                </button>
              )}
              {customer.debt >= 200 && (
                <button
                  onClick={() => setPaymentAmount(String(Math.min(200, customer.debt)))}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                    parseFloat(paymentAmount) === Math.min(200, customer.debt)
                      ? 'bg-primary text-white shadow-sm'
                      : 'bg-muted/60 text-muted-foreground hover:bg-muted'
                  }`}
                >
                  200
                </button>
              )}
              {customer.debt >= 500 && (
                <button
                  onClick={() => setPaymentAmount(String(Math.min(500, customer.debt)))}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                    parseFloat(paymentAmount) === Math.min(500, customer.debt)
                      ? 'bg-primary text-white shadow-sm'
                      : 'bg-muted/60 text-muted-foreground hover:bg-muted'
                  }`}
                >
                  500
                </button>
              )}
              <button
                onClick={() => setPaymentAmount(String(customer.debt))}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                  parseFloat(paymentAmount) === customer.debt
                    ? 'bg-emerald-500 text-white shadow-sm'
                    : 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20'
                }`}
              >
                تسديد الكامل ({formatCurrency(customer.debt)})
              </button>
            </div>

            <div className="space-y-1.5">
              <Label>طريقة الدفع</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger className="h-10 rounded-xl bg-muted/30 border-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash" className="gap-2">
                    <span className="flex items-center gap-2">
                      <Banknote className="w-4 h-4" />
                      نقدي
                    </span>
                  </SelectItem>
                  <SelectItem value="transfer" className="gap-2">
                    <span className="flex items-center gap-2">
                      <Wallet className="w-4 h-4" />
                      تحويل
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="payment-notes">
                ملاحظات
                <span className="mr-1 text-muted-foreground text-xs">(اختياري)</span>
              </Label>
              <Textarea
                id="payment-notes"
                placeholder="أضف ملاحظة للدفعة..."
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                rows={2}
                className="resize-none"
              />
            </div>
          </div>
        )}
        <DialogFooter className="flex gap-2 sm:justify-start">
          <Button
            onClick={handleRecordPayment}
            disabled={paymentSubmitting || !paymentAmount || parseFloat(paymentAmount) <= 0}
            className="btn-ripple"
          >
            {paymentSubmitting ? 'جارٍ التسجيل...' : 'تسجيل الدفعة'}
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
