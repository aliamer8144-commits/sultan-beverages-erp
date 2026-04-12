'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Wallet } from 'lucide-react'
import { useCurrency } from '@/hooks/use-currency'
import { useApi } from '@/hooks/use-api'
import type { Supplier } from './types'

interface SupplierPaymentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  supplier: Supplier | null
  onSuccess: () => void
}

export function SupplierPaymentDialog({
  open,
  onOpenChange,
  supplier,
  onSuccess,
}: SupplierPaymentDialogProps) {
  const { formatCurrency } = useCurrency()
  const { post } = useApi()
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [paymentNotes, setPaymentNotes] = useState('')
  const [paymentSubmitting, setPaymentSubmitting] = useState(false)

  const handleRecordPayment = async () => {
    if (!supplier) return
    const amount = parseFloat(paymentAmount)
    if (!amount || amount <= 0) {
      toast.error('يرجى إدخال مبلغ صحيح')
      return
    }
    if (amount > supplier.remainingBalance) {
      toast.error('المبلغ أكبر من الرصيد المتبقي')
      return
    }

    setPaymentSubmitting(true)
    try {
      const methodLabel = paymentMethod === 'cash' ? 'نقدي' : paymentMethod === 'transfer' ? 'تحويل' : 'شيك'
      const result = await post('/api/supplier-payments', {
        supplierId: supplier.id,
        amount,
        method: paymentMethod,
        notes: paymentNotes.trim() || null,
      }, {
        showSuccessToast: true,
        successMessage: `تم تسجيل دفعة ${formatCurrency(amount)} (${methodLabel}) للمورد ${supplier.name}`,
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
            تسجيل دفعة مورد
          </DialogTitle>
        </DialogHeader>
        {supplier && (
          <div className="space-y-4 py-2">
            <div className="rounded-xl bg-muted/40 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">{supplier.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">المبلغ المستحق</p>
                </div>
                <span className="text-lg font-bold text-destructive tabular-nums">
                  {formatCurrency(supplier.remainingBalance)}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>المبلغ *</Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                className="h-10 rounded-xl"
                placeholder="0.00"
                dir="ltr"
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs rounded-lg"
                  onClick={() => setPaymentAmount(String(Math.ceil(supplier.remainingBalance / 4)))}
                >
                  الربع
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs rounded-lg"
                  onClick={() => setPaymentAmount(String(Math.ceil(supplier.remainingBalance / 2)))}
                >
                  النصف
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs rounded-lg"
                  onClick={() => setPaymentAmount(String(supplier.remainingBalance))}
                >
                  الكل
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>طريقة الدفع</Label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'cash', label: 'نقدي', icon: Wallet },
                  { value: 'transfer', label: 'تحويل', icon: Wallet },
                  { value: 'check', label: 'شيك', icon: Wallet },
                ].map((m) => (
                  <Button
                    key={m.value}
                    type="button"
                    variant={paymentMethod === m.value ? 'default' : 'outline'}
                    size="sm"
                    className="rounded-lg text-xs"
                    onClick={() => setPaymentMethod(m.value)}
                  >
                    {m.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>ملاحظات</Label>
              <Textarea
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                className="rounded-xl resize-none"
                rows={2}
                placeholder="ملاحظات إضافية (اختياري)"
              />
            </div>

            <Button
              onClick={handleRecordPayment}
              disabled={paymentSubmitting || !paymentAmount}
              className="w-full gap-2 rounded-xl btn-ripple"
            >
              {paymentSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>جاري التسجيل...</span>
                </>
              ) : (
                <>
                  <Wallet className="w-4 h-4" />
                  تسجيل الدفعة
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
