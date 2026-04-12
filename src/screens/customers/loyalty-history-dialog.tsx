'use client'

import { useState, useEffect } from 'react'
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
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'
import { Star, Plus, Minus } from 'lucide-react'
import { formatShortDate } from '@/lib/date-utils'
import { useApi } from '@/hooks/use-api'
import { useZodForm } from '@/hooks/use-zod-form'
import { createLoyaltyTransactionSchema } from '@/lib/validations'
import { validateFormClient } from '@/lib/validation-utils'

import type { Customer, LoyaltyTransaction } from './types'

interface LoyaltyHistoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  customer: Customer | null
  formatCurrency: (amount: number) => string
  onSuccess: () => void
}

/** Stable defaults so useZodForm.reset reference stays constant */
const ADJUST_DEFAULTS = {
  customerId: '',
  points: '',
  transactionType: 'adjusted',
  description: '',
}

export function LoyaltyHistoryDialog({
  open,
  onOpenChange,
  customer,
  onSuccess,
}: LoyaltyHistoryDialogProps) {
  const { get, post } = useApi()

  // ── History state ──
  const [loyaltyHistory, setLoyaltyHistory] = useState<LoyaltyTransaction[]>([])
  const [loyaltyLoading, setLoyaltyLoading] = useState(false)

  // ── Adjust state ──
  const [loyaltyMode, setLoyaltyMode] = useState<'grant' | 'deduct'>('grant')
  const [loyaltySubmitting, setLoyaltySubmitting] = useState(false)
  const [openAdjustDialog, setOpenAdjustDialog] = useState(false)
  const [adjustCustomer, setAdjustCustomer] = useState<Customer | null>(null)

  // ── Adjust form (self-contained, useZodForm) ──
  const adjustForm = useZodForm({
    schema: createLoyaltyTransactionSchema,
    defaultValues: ADJUST_DEFAULTS,
  })

  // ── Fetch loyalty history when dialog opens ──
  useEffect(() => {
    if (open && customer) {
      setLoyaltyHistory([])
      setLoyaltyLoading(true)
      ;(async () => {
        try {
          const result = await get<LoyaltyTransaction[]>('/api/loyalty', { customerId: customer.id }, { showErrorToast: false })
          if (result) {
            setLoyaltyHistory(result)
          }
        } finally {
          setLoyaltyLoading(false)
        }
      })()
    }
  }, [open, customer, get])

  // ── Open adjust dialog ──
  const openLoyaltyAdjust = (c: Customer, mode: 'grant' | 'deduct') => {
    setAdjustCustomer(c)
    setLoyaltyMode(mode)
    adjustForm.reset({ ...ADJUST_DEFAULTS, customerId: c.id })
    setOpenAdjustDialog(true)
  }

  // ── Submit loyalty adjustment ──
  const handleLoyaltyAdjust = async () => {
    if (!adjustCustomer) return

    // Build payload with description default (schema requires non-empty description)
    const defaultDesc = loyaltyMode === 'grant' ? 'منح نقاط يدوي' : 'خصم نقاط يدوي'
    const desc = adjustForm.values.description.trim() || defaultDesc

    // Validate against schema (points will be coerced from string to int)
    const dataToValidate = {
      customerId: adjustCustomer.id,
      points: adjustForm.values.points,
      transactionType: 'adjusted' as const,
      description: desc,
    }

    const fieldErrors = validateFormClient(createLoyaltyTransactionSchema, dataToValidate)
    if (fieldErrors) {
      adjustForm.setErrorMap(fieldErrors)
      return
    }

    // Cross-field: deduct must not exceed balance
    const points = parseInt(String(adjustForm.values.points))
    if (loyaltyMode === 'deduct' && points > adjustCustomer.loyaltyPoints) {
      adjustForm.setError('points', 'النقاط المطلوبة أكبر من رصيد العميل')
      return
    }

    adjustForm.clearErrors()
    setLoyaltySubmitting(true)
    try {
      const action = loyaltyMode === 'grant' ? 'منح' : 'خصم'
      const result = await post('/api/loyalty', {
        customerId: adjustCustomer.id,
        points: loyaltyMode === 'grant' ? points : -points,
        transactionType: 'adjusted',
        description: desc,
      }, {
        showSuccessToast: true,
        successMessage: `تم ${action} ${points} نقطة ${loyaltyMode === 'grant' ? 'لـ' : 'من'} ${adjustCustomer.name}`,
      })
      if (result) {
        setOpenAdjustDialog(false)
        setAdjustCustomer(null)
        onSuccess()
        // Re-fetch history
        const updated = await get<LoyaltyTransaction[]>('/api/loyalty', { customerId: adjustCustomer.id }, { showErrorToast: false })
        if (updated) {
          setLoyaltyHistory(updated)
        }
      }
    } finally {
      setLoyaltySubmitting(false)
    }
  }

  return (
    <>
      {/* ── Loyalty History Dialog ── */}
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10">
                <Star className="h-5 w-5 text-amber-500" />
              </div>
              سجل النقاط
              {customer && (
                <span className="text-sm font-normal text-muted-foreground">
                  — {customer.name}
                  <span className="mr-2 chip chip-warning text-[11px] py-0 px-1.5">
                    {customer.loyaltyPoints} نقطة
                  </span>
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-96">
            {loyaltyLoading ? (
              <div className="flex flex-col gap-3 p-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-16 rounded-lg bg-muted/50 animate-pulse" />
                ))}
              </div>
            ) : loyaltyHistory.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
                <Star className="h-10 w-10 opacity-40" />
                <p className="font-medium">لا توجد نقاط مسجلة</p>
                {customer && (
                  <div className="flex gap-2 mt-2">
                    <Button
                      size="sm"
                      onClick={() => openLoyaltyAdjust(customer, 'grant')}
                      className="gap-1"
                    >
                      <Plus className="h-3 w-3" />
                      منح نقاط
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-2 p-2">
                {loyaltyHistory.map((tx) => (
                  <div
                    key={tx.id}
                    className="rounded-lg border bg-card p-3 card-hover"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
                          tx.points > 0 ? 'bg-emerald-500/10' : 'bg-red-500/10'
                        }`}>
                          {tx.points > 0 ? (
                            <Plus className="h-4 w-4 text-emerald-500" />
                          ) : (
                            <Minus className="h-4 w-4 text-red-500" />
                          )}
                        </div>
                        <div>
                          <p className={`text-sm font-bold ${tx.points > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                            {tx.points > 0 ? '+' : ''}{tx.points} نقطة
                          </p>
                          <p className="text-[11px] text-muted-foreground">{tx.description}</p>
                        </div>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {formatShortDate(tx.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
          {customer && (
            <DialogFooter className="flex gap-2 sm:justify-start">
              <Button
                size="sm"
                onClick={() => openLoyaltyAdjust(customer, 'grant')}
                className="gap-1"
              >
                <Plus className="h-3 w-3" />
                منح نقاط
              </Button>
              {customer.loyaltyPoints > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openLoyaltyAdjust(customer, 'deduct')}
                  className="gap-1"
                >
                  <Minus className="h-3 w-3" />
                  خصم نقاط
                </Button>
              )}
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Loyalty Adjust Dialog ── */}
      <Dialog open={openAdjustDialog} onOpenChange={setOpenAdjustDialog}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                loyaltyMode === 'grant' ? 'bg-emerald-500/10' : 'bg-orange-500/10'
              }`}>
                {loyaltyMode === 'grant' ? (
                  <Plus className="h-5 w-5 text-emerald-500" />
                ) : (
                  <Minus className="h-5 w-5 text-orange-500" />
                )}
              </div>
              {loyaltyMode === 'grant' ? 'منح نقاط' : 'خصم نقاط'}
            </DialogTitle>
          </DialogHeader>
          {adjustCustomer && (
            <div className="space-y-4 py-2">
              <div className="rounded-xl bg-muted/40 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold">{adjustCustomer.name}</p>
                    <p className="text-[11px] text-muted-foreground">الرصيد الحالي</p>
                  </div>
                  <div className="text-left">
                    <p className="text-lg font-bold text-amber-600">{adjustCustomer.loyaltyPoints}</p>
                    <p className="text-[10px] text-muted-foreground">نقطة</p>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>
                  عدد النقاط <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="number"
                  min={1}
                  max={loyaltyMode === 'deduct' ? adjustCustomer.loyaltyPoints : undefined}
                  value={adjustForm.values.points || ''}
                  onChange={(e) => adjustForm.setValue('points', e.target.value)}
                  placeholder="أدخل عدد النقاط"
                  className={`tabular-nums${
                    adjustForm.errors.points
                      ? ' border-destructive focus-visible:ring-destructive'
                      : ''
                  }`}
                  dir="ltr"
                  autoFocus
                />
                {adjustForm.errors.points && (
                  <p className="text-sm text-destructive">{adjustForm.errors.points}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="loyalty-desc">
                  الوصف
                  <span className="mr-1 text-muted-foreground text-xs">(اختياري)</span>
                </Label>
                <Textarea
                  id="loyalty-desc"
                  placeholder={
                    loyaltyMode === 'grant'
                      ? 'سبب منح النقاط...'
                      : 'سبب الخصم...'
                  }
                  value={adjustForm.values.description || ''}
                  onChange={(e) => adjustForm.setValue('description', e.target.value)}
                  rows={2}
                  className="resize-none"
                />
              </div>
            </div>
          )}
          <DialogFooter className="flex gap-2 sm:justify-start">
            <Button
              onClick={handleLoyaltyAdjust}
              disabled={loyaltySubmitting || !adjustForm.values.points}
              className={`btn-ripple ${loyaltyMode === 'grant' ? '' : 'bg-orange-500 hover:bg-orange-600'}`}
            >
              {loyaltySubmitting ? 'جارٍ التنفيذ...' : loyaltyMode === 'grant' ? 'منح' : 'خصم'}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setAdjustCustomer(null)
                setOpenAdjustDialog(false)
              }}
            >
              إلغاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
