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

  const [returnProductId, setReturnProductId] = useState('')
  const [returnProductItem, setReturnProductItem] = useState<InvoiceItem | null>(null)
  const [returnQuantity, setReturnQuantity] = useState(1)
  const [returnReason, setReturnReason] = useState('')
  const [returnSubmitting, setReturnSubmitting] = useState(false)

  const handleReturnProductSelect = (productId: string) => {
    setReturnProductId(productId)
    setReturnQuantity(1)
    if (invoice) {
      const item = invoice.items.find((i) => i.productId === productId)
      setReturnProductItem(item || null)
    }
  }

  const handleSubmitReturn = async () => {
    if (!invoice || !returnProductId || !returnQuantity || returnQuantity <= 0) {
      toast.error('يرجى اختيار المنتج والكمية')
      return
    }
    if (!returnProductItem || returnQuantity > returnProductItem.quantity) {
      toast.error('الكمية غير صالحة')
      return
    }
    const user = useAppStore.getState().user
    if (!user) {
      toast.error('يرجى تسجيل الدخول')
      return
    }

    setReturnSubmitting(true)
    try {
      const result = await post('/api/returns', {
        invoiceId: invoice.id,
        productId: returnProductId,
        quantity: returnQuantity,
        reason: returnReason,
        userId: user.id,
        userName: user.name,
      }, { showSuccessToast: true, successMessage: 'تم إنشاء المرتجع بنجاح' })
      if (result) {
        setReturnProductId('')
        setReturnProductItem(null)
        setReturnQuantity(1)
        setReturnReason('')
        onOpenChange(false)
        onSuccess()
      }
    } finally {
      setReturnSubmitting(false)
    }
  }

  // Reset state when dialog opens
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setReturnProductId('')
      setReturnProductItem(null)
      setReturnQuantity(1)
      setReturnReason('')
      setReturnSubmitting(false)
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
                  <Select value={returnProductId} onValueChange={handleReturnProductSelect}>
                    <SelectTrigger className="w-full h-10">
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
                        value={returnQuantity}
                        onChange={(e) => setReturnQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                        className="h-10 text-sm input-glass"
                      />
                    </div>

                    <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">سعر الوحدة</span>
                        <span className="font-medium">{formatDual(returnProductItem.price).display}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">الكمية</span>
                        <span className="font-medium">{returnQuantity}</span>
                      </div>
                      <div className="border-t border-border/50 pt-1 flex justify-between text-sm">
                        <span className="font-semibold">إجمالي الإرجاع</span>
                        <span className="font-bold text-amber-600">
                          {formatDual(returnProductItem.price * returnQuantity).display}
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
                    value={returnReason}
                    onChange={(e) => setReturnReason(e.target.value)}
                    className="text-sm min-h-[80px] input-glass"
                  />
                </div>
              </div>
            </ScrollArea>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/50 flex-shrink-0">
              <Button
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={returnSubmitting}
                className="text-sm"
              >
                إلغاء
              </Button>
              <Button
                onClick={handleSubmitReturn}
                disabled={returnSubmitting || !returnProductId}
                className="gap-2 text-sm btn-ripple shimmer"
              >
                {returnSubmitting ? (
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
