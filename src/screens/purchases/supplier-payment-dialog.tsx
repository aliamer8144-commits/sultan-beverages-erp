'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Wallet } from 'lucide-react'
import { useCurrency } from '@/hooks/use-currency'
import { useApi } from '@/hooks/use-api'
import { useZodForm } from '@/hooks/use-zod-form'
import { createSupplierPaymentSchema } from '@/lib/validations'
import type { z } from 'zod'
import type { Supplier } from './types'

const paymentFormSchema = createSupplierPaymentSchema.omit({ supplierId: true })

interface PaymentFormValues {
  amount: string
  method: string
  notes: string
}

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

  const form = useZodForm<PaymentFormValues, z.infer<typeof paymentFormSchema>>({
    schema: paymentFormSchema,
    defaultValues: {
      amount: '',
      method: 'cash',
      notes: '',
    },
  })

  const [paymentSubmitting, setPaymentSubmitting] = useState(false)
  const [crossFieldError, setCrossFieldError] = useState('')

  const handleRecordPayment = async () => {
    if (!supplier) return
    setCrossFieldError('')

    if (!form.validate()) return

    const amount = parseFloat(String(form.values.amount))
    if (amount > supplier.remainingBalance) {
      setCrossFieldError('المبلغ أكبر من الرصيد المتبقي')
      return
    }

    setPaymentSubmitting(true)
    try {
      const methodLabel = form.values.method === 'cash' ? 'نقدي' : form.values.method === 'transfer' ? 'تحويل' : 'شيك'
      const result = await post('/api/supplier-payments', {
        supplierId: supplier.id,
        amount,
        method: form.values.method,
        notes: form.values.notes?.trim() || null,
      }, {
        showSuccessToast: true,
        successMessage: `تم تسجيل دفعة ${formatCurrency(amount)} (${methodLabel}) للمورد ${supplier.name}`,
      })
      if (result) {
        form.reset()
        setCrossFieldError('')
        onOpenChange(false)
        onSuccess()
      }
    } finally {
      setPaymentSubmitting(false)
    }
  }

  const amountError = form.errors.amount || crossFieldError

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      if (!newOpen) {
        form.clearErrors()
        setCrossFieldError('')
      }
      onOpenChange(newOpen)
    }}>
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
                value={form.values.amount}
                onChange={(e) => form.setValue('amount', e.target.value)}
                className={`h-10 rounded-xl${amountError ? ' border-destructive focus-visible:ring-destructive' : ''}`}
                placeholder="0.00"
                dir="ltr"
              />
              {amountError && (
                <p className="text-sm text-destructive">{amountError}</p>
              )}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs rounded-lg"
                  onClick={() => form.setValue('amount', String(Math.ceil(supplier.remainingBalance / 4)))}
                >
                  الربع
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs rounded-lg"
                  onClick={() => form.setValue('amount', String(Math.ceil(supplier.remainingBalance / 2)))}
                >
                  النصف
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs rounded-lg"
                  onClick={() => form.setValue('amount', String(supplier.remainingBalance))}
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
                    variant={form.values.method === m.value ? 'default' : 'outline'}
                    size="sm"
                    className="rounded-lg text-xs"
                    onClick={() => form.setValue('method', m.value)}
                  >
                    {m.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>ملاحظات</Label>
              <Textarea
                value={form.values.notes || ''}
                onChange={(e) => form.setValue('notes', e.target.value)}
                className={`rounded-xl resize-none${form.errors.notes ? ' border-destructive focus-visible:ring-destructive' : ''}`}
                rows={2}
                placeholder="ملاحظات إضافية (اختياري)"
              />
              {form.errors.notes && (
                <p className="text-sm text-destructive">{form.errors.notes}</p>
              )}
            </div>

            <Button
              onClick={handleRecordPayment}
              disabled={paymentSubmitting || !form.values.amount}
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
