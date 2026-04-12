'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { useAppStore } from '@/store/app-store'
import { useCurrency } from '@/hooks/use-currency'
import { useApi } from '@/hooks/use-api'
import { useZodForm } from '@/hooks/use-zod-form'
import { createReturnSchema } from '@/lib/validations'
import type { Invoice, InvoiceItem } from './types'

interface ReturnDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  invoice: Invoice | null
  onSuccess: () => void
}

export function ReturnDialog({
  open,
  onOpenChange,
  invoice,
  onSuccess,
}: ReturnDialogProps) {
  const { formatCurrency, formatDual } = useCurrency()
  const { post } = useApi()

  const [returnProductItem, setReturnProductItem] = useState<InvoiceItem | null>(null)
  const [crossFieldError, setCrossFieldError] = useState('')

  const form = useZodForm({
    schema: createReturnSchema,
    defaultValues: {
      invoiceId: '',
      productId: '',
      quantity: 1,
      reason: '',
    },
  })

  const handleReturnProductSelect = (productId: string) => {
    form.setValue('productId', productId)
    form.setValue('quantity', 1)
    setCrossFieldError('')
    if (invoice) {
      const item = invoice.items.find((i) => i.productId === productId)
      setReturnProductItem(item || null)
    }
  }

  const onSubmit = form.handleSubmit(async (values) => {
    // Cross-field validation: quantity must not exceed available quantity
    if (returnProductItem && values.quantity > returnProductItem.quantity) {
      setCrossFieldError(`الكمية تتجاوز الحد الأقصى (${returnProductItem.quantity})`)
      return
    }

    const user = useAppStore.getState().user
    if (!user) {
      toast.error('يرجى تسجيل الدخول')
      return
    }

    const result = await post('/api/returns', {
      invoiceId: invoice!.id,
      productId: values.productId,
      quantity: values.quantity,
      reason: values.reason,
      userId: user.id,
      userName: user.name,
    }, { showSuccessToast: true, successMessage: 'تم إنشاء المرتجع بنجاح' })
    if (result) {
      form.reset({ invoiceId: invoice?.id || '' })
      setReturnProductItem(null)
      setCrossFieldError('')
      onOpenChange(false)
      onSuccess()
    }
  })

  const handleSubmitReturn = () => {
    if (!invoice) return
    onSubmit()
  }

  // Reset state when dialog opens
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      form.reset({ invoiceId: invoice?.id || '' })
      setReturnProductItem(null)
      setCrossFieldError('')
    }
    onOpenChange(newOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col glass-card" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-amber-600" />
            إرجاع من فاتورة {invoice?.invoiceNo}
          </DialogTitle>
          <DialogDescription>
            اختر المنتج المراد إرجاعه وحدد الكمية
          </DialogDescription>
        </DialogHeader>

        {invoice && (
          <div className="flex-1 overflow-hidden flex flex-col">
            <ScrollArea className="flex-1">
              <div className="space-y-4 pb-4">
                {/* Select Product */}
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">اختر المنتج</Label>
                  <Select value={form.values.productId} onValueChange={handleReturnProductSelect}>
                    <SelectTrigger className={`w-full h-10${form.errors.productId ? ' border-destructive' : ''}`}>
                      <SelectValue placeholder="اختر منتجاً..." />
                    </SelectTrigger>
                    <SelectContent>
                      {invoice.items.map((item) => (
                        <SelectItem key={item.id} value={item.productId}>
                          <div className="flex items-center gap-2">
                            <span>{item.product.name}</span>
                            <span className="text-xs text-muted-foreground">({item.quantity} × {formatCurrency(item.price)})</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.errors.productId && (
                    <p className="text-sm text-destructive">{form.errors.productId}</p>
                  )}
                </div>

                {/* Quantity and Summary */}
                {returnProductItem && (
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">
                        كمية الإرجاع (الحد الأقصى: {returnProductItem.quantity})
                      </Label>
                      <Input
                        type="number"
                        min={1}
                        max={returnProductItem.quantity}
                        value={form.values.quantity}
                        onChange={(e) => {
                          const val = Math.max(1, parseInt(e.target.value) || 1)
                          form.setValue('quantity', val)
                          setCrossFieldError('')
                        }}
                        className={`h-10 text-sm input-glass${form.errors.quantity || crossFieldError ? ' border-destructive' : ''}`}
                      />
                      {(form.errors.quantity || crossFieldError) && (
                        <p className="text-sm text-destructive">{form.errors.quantity || crossFieldError}</p>
                      )}
                    </div>

                    <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">سعر الوحدة</span>
                        <span className="font-medium">{formatDual(returnProductItem.price).display}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">الكمية</span>
                        <span className="font-medium">{form.values.quantity}</span>
                      </div>
                      <div className="border-t border-border/50 pt-1 flex justify-between text-sm">
                        <span className="font-semibold">إجمالي الإرجاع</span>
                        <span className="font-bold text-amber-600">
                          {formatDual(returnProductItem.price * form.values.quantity).display}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Reason */}
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">سبب الإرجاع (اختياري)</Label>
                  <Textarea
                    placeholder="أدخل سبب الإرجاع..."
                    value={form.values.reason}
                    onChange={(e) => form.setValue('reason', e.target.value)}
                    className={`text-sm min-h-[80px] input-glass${form.errors.reason ? ' border-destructive' : ''}`}
                  />
                  {form.errors.reason && (
                    <p className="text-sm text-destructive">{form.errors.reason}</p>
                  )}
                </div>
              </div>
            </ScrollArea>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/50 flex-shrink-0">
              <Button
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={form.isSubmitting}
                className="text-sm"
              >
                إلغاء
              </Button>
              <Button
                onClick={handleSubmitReturn}
                disabled={form.isSubmitting || !form.values.productId}
                className="gap-2 text-sm btn-ripple shimmer"
              >
                {form.isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RotateCcw className="w-4 h-4" />
                )}
                تأكيد الإرجاع
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
