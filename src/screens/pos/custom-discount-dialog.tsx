'use client'

import { useMemo, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import { Percent } from 'lucide-react'
import { useFormValidation } from '@/hooks/use-form-validation'
import {
  posDiscountPercentSchema,
  posDiscountAmountBaseSchema,
} from '@/lib/validations'
import { z } from 'zod'

interface CustomDiscountDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  customDiscountValue: string
  setCustomDiscountValue: (val: string) => void
  customDiscountType: 'percent' | 'amount'
  setCustomDiscountType: (val: 'percent' | 'amount') => void
  subtotal: number
  symbol: string
  formatDual: (amount: number) => { primary: string; secondary: string | null; display: string }
  onApplyDiscount: () => void
}

export function CustomDiscountDialog({
  open,
  onOpenChange,
  customDiscountValue,
  setCustomDiscountValue,
  customDiscountType,
  setCustomDiscountType,
  subtotal,
  symbol,
  formatDual,
  onApplyDiscount,
}: CustomDiscountDialogProps) {
  // Dynamic schema based on discount type
  const discountSchema = useMemo(() => {
    if (customDiscountType === 'percent') {
      return posDiscountPercentSchema
    }
    return posDiscountAmountBaseSchema.refine(
      (data) => data.value <= subtotal,
      { message: 'مبلغ الخصم لا يمكن أن يتجاوز المجموع الفرعي', path: ['value'] }
    )
  }, [customDiscountType, subtotal])

  const v = useFormValidation({ schema: discountSchema })

  // Clear all errors when dialog opens or discount type changes
  useEffect(() => {
    if (open) v.clearAllErrors()
  }, [open, v.clearAllErrors])

  useEffect(() => {
    v.clearAllErrors()
  }, [customDiscountType, v.clearAllErrors])

  const handleApply = () => {
    if (!v.validate({ value: customDiscountValue })) return
    onApplyDiscount()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-right">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Percent className="w-5 h-5 text-primary" />
            </div>
            خصم مخصص
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {/* Discount type tabs */}
          <Tabs value={customDiscountType} onValueChange={(t) => setCustomDiscountType(t as 'percent' | 'amount')} className="w-full">
            <TabsList className="w-full h-9">
              <TabsTrigger value="percent" className="flex-1 text-xs">
                نسبة مئوية %
              </TabsTrigger>
              <TabsTrigger value="amount" className="flex-1 text-xs">
                مبلغ ثابت
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Value input */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">
              {customDiscountType === 'percent' ? 'نسبة الخصم' : 'مبلغ الخصم'}
            </Label>
            <div className="relative">
              <Input
                type="number"
                min={0}
                max={customDiscountType === 'percent' ? 100 : subtotal}
                step={0.5}
                value={customDiscountValue}
                onChange={(e) => {
                  setCustomDiscountValue(e.target.value)
                  v.clearFieldError('value')
                }}
                placeholder={customDiscountType === 'percent' ? '0' : '0.00'}
                className={`h-12 rounded-xl text-lg font-bold pr-4 pl-14 tabular-nums ${v.errors.value ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                autoFocus
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">
                {customDiscountType === 'percent' ? '%' : symbol}
              </span>
            </div>
            {v.errors.value && (
              <p className="text-sm text-destructive">{v.errors.value}</p>
            )}
          </div>

          {/* Discount preview */}
          {customDiscountValue && parseFloat(customDiscountValue) > 0 && (
            <div className="rounded-xl bg-muted/40 p-3 space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>المجموع الفرعي</span>
                <span className="font-medium tabular-nums">{formatDual(subtotal).display}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-destructive">الخصم</span>
                <span className="font-bold text-destructive tabular-nums">
                  -{customDiscountType === 'percent'
                    ? formatDual((subtotal * parseFloat(customDiscountValue)) / 100).display
                    : formatDual(parseFloat(customDiscountValue)).display
                  }
                </span>
              </div>
              <Separator />
              <div className="flex justify-between text-sm font-bold">
                <span>الإجمالي بعد الخصم</span>
                <span className="text-primary tabular-nums">
                  {customDiscountType === 'percent'
                    ? formatDual(subtotal - (subtotal * parseFloat(customDiscountValue)) / 100).display
                    : formatDual(subtotal - parseFloat(customDiscountValue)).display
                  }
                </span>
              </div>
            </div>
          )}
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
            onClick={handleApply}
            disabled={!customDiscountValue || parseFloat(customDiscountValue) <= 0}
            className="flex-1 h-10 rounded-xl gap-2 shadow-lg shadow-primary/25"
          >
            <Percent className="w-4 h-4" />
            تطبيق الخصم
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
