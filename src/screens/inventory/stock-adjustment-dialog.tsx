'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Loader2, PackagePlus, Package, ArrowLeft, ArrowUpDown } from 'lucide-react'
import { toast } from 'sonner'
import { useApi } from '@/hooks/use-api'
import { useAppStore } from '@/store/app-store'

import type { Product, StockAdjustment, AdjustmentFormData } from './types'
import { emptyAdjustmentForm } from './types'
import { adjustmentTypeConfig } from './constants'

export interface StockAdjustmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  product: Product | null
  onSaved: () => void
}

export function StockAdjustmentDialog({ open, onOpenChange, product, onSaved }: StockAdjustmentDialogProps) {
  const { post } = useApi()
  const user = useAppStore((s) => s.user)

  const [adjustForm, setAdjustForm] = useState<AdjustmentFormData>(emptyAdjustmentForm)
  const [adjustSubmitting, setAdjustSubmitting] = useState(false)

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setAdjustForm(emptyAdjustmentForm)
    }
  }, [open])

  const handleAdjustSubmit = async () => {
    if (!product) return
    if (!adjustForm.quantity || Number(adjustForm.quantity) <= 0) {
      toast.error('يرجى إدخال الكمية')
      return
    }
    if (!adjustForm.reason.trim()) {
      toast.error('يرجى إدخال سبب التعديل')
      return
    }

    setAdjustSubmitting(true)
    try {
      const result = await post<StockAdjustment & { message?: string }>(
        '/api/stock-adjustments',
        {
          productId: product.id,
          type: adjustForm.type,
          quantity: Number(adjustForm.quantity),
          reason: adjustForm.reason.trim(),
          userId: user?.id || 'unknown',
          userName: user?.name || null,
          reference: adjustForm.reference.trim() || null,
        },
        { showSuccessToast: true, successMessage: 'تم تعديل المخزون بنجاح' },
      )
      if (!result) return

      onOpenChange(false)
      onSaved()
    } catch {
      // handled by useApi
    } finally {
      setAdjustSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <PackagePlus className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
            </div>
            تعديل المخزون
          </DialogTitle>
          <DialogDescription>
            قم بتعديل كمية المنتج في المخزون
          </DialogDescription>
        </DialogHeader>

        {product && (
          <div className="space-y-5 mt-2">
            {/* Product Info */}
            <div className="glass-card rounded-xl p-4">
              <div className="flex items-center gap-3">
                {product.image ? (
                  <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
                    <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Package className="w-5 h-5 text-primary" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground truncate">{product.name}</p>
                  <p className="text-xs text-muted-foreground">{product.category.name}</p>
                </div>
                <div className="text-left flex-shrink-0">
                  <p className="text-xs text-muted-foreground">المخزون الحالي</p>
                  <p className={`text-lg font-bold tabular-nums ${product.quantity <= product.minQuantity ? 'text-destructive' : 'text-foreground'}`}>
                    {product.quantity}
                  </p>
                </div>
              </div>
            </div>

            {/* Adjustment Type */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">نوع التعديل</Label>
              <RadioGroup
                value={adjustForm.type}
                onValueChange={(val) => setAdjustForm({ ...adjustForm, type: val as AdjustmentFormData['type'] })}
                className="grid grid-cols-3 gap-2"
              >
                {(['addition', 'subtraction', 'correction'] as const).map((type) => {
                  const config = adjustmentTypeConfig[type]
                  const Icon = config.icon
                  return (
                    <label
                      key={type}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                        adjustForm.type === type
                          ? `${config.bgColor} ${config.color} border-current`
                          : 'border-border hover:border-muted-foreground/30'
                      }`}
                    >
                      <RadioGroupItem value={type} className="sr-only" />
                      <Icon className="w-5 h-5" />
                      <span className="text-xs font-semibold">{config.label}</span>
                    </label>
                  )
                })}
              </RadioGroup>
              {adjustForm.type === 'correction' && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <ArrowUpDown className="w-3 h-3" />
                  عند اختيار التصحيح، سيتم تعيين الكمية المدخلة كرصيد جديد
                </p>
              )}
            </div>

            {/* Quantity */}
            <div className="space-y-2">
              <Label htmlFor="adjust-qty" className="text-sm font-medium">
                الكمية <span className="text-destructive">*</span>
              </Label>
              <Input
                id="adjust-qty"
                type="number"
                min="1"
                placeholder={adjustForm.type === 'correction' ? 'الكمية الجديدة المطلوبة' : 'عدد الوحدات'}
                value={adjustForm.quantity}
                onChange={(e) => setAdjustForm({ ...adjustForm, quantity: e.target.value })}
                className="h-10 rounded-lg text-left tabular-nums"
                dir="ltr"
              />
              {/* Preview */}
              {adjustForm.quantity && Number(adjustForm.quantity) > 0 && (
                <div className="flex items-center justify-center gap-2 p-2 rounded-lg bg-muted/50 text-xs">
                  <span className="text-muted-foreground">النتيجة:</span>
                  <span className="font-semibold tabular-nums">{product.quantity}</span>
                  <ArrowLeft className="w-3 h-3 text-muted-foreground" />
                  <span className="font-bold tabular-nums text-primary">
                    {adjustForm.type === 'addition'
                      ? product.quantity + Number(adjustForm.quantity)
                      : adjustForm.type === 'subtraction'
                        ? Math.max(0, product.quantity - Number(adjustForm.quantity))
                        : Number(adjustForm.quantity)}
                  </span>
                </div>
              )}
            </div>

            {/* Reason */}
            <div className="space-y-2">
              <Label htmlFor="adjust-reason" className="text-sm font-medium">
                سبب التعديل <span className="text-destructive">*</span>
              </Label>
              <Input
                id="adjust-reason"
                placeholder="مثال: تزويد مخزون جديد، تالف، جرد..."
                value={adjustForm.reason}
                onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                className="h-10 rounded-lg"
              />
            </div>

            {/* Reference */}
            <div className="space-y-2">
              <Label htmlFor="adjust-ref" className="text-sm font-medium">
                رقم المرجع <span className="text-muted-foreground text-xs">(اختياري)</span>
              </Label>
              <Input
                id="adjust-ref"
                placeholder="مثال: رقم فاتورة الشراء"
                value={adjustForm.reference}
                onChange={(e) => setAdjustForm({ ...adjustForm, reference: e.target.value })}
                className="h-10 rounded-lg"
                dir="ltr"
              />
            </div>
          </div>
        )}

        <DialogFooter className="pt-4 border-t gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={adjustSubmitting}
            className="rounded-lg"
          >
            إلغاء
          </Button>
          <Button
            onClick={handleAdjustSubmit}
            disabled={adjustSubmitting || !product}
            className="gap-2 rounded-lg shadow-md shadow-emerald-500/20 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {adjustSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            <PackagePlus className="w-4 h-4" />
            تطبيق التعديل
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
