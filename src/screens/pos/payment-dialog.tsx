'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import {
  CreditCard,
  Printer,
  ShoppingCart,
  Star,
  Banknote,
  ReceiptText,
} from 'lucide-react'
import { peekNextReceiptNumber } from '@/lib/receipt-utils'
import type { CartItem } from '@/types'

interface PaymentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  subtotal: number
  cartDiscount: number
  loyaltyDiscount: number
  grandTotal: number
  cart: CartItem[]
  paymentTab: 'full' | 'split'
  paidAmount: string
  processingPayment: boolean
  setPaymentTab: (tab: 'full' | 'split') => void
  setPaidAmount: (val: string) => void
  splitCash: string
  splitCard: string
  setSplitCash: (val: string) => void
  setSplitCard: (val: string) => void
  onConfirmPayment: () => void
  symbol: string
  formatDual: (amount: number) => { primary: string; secondary: string | null; display: string }
}

export function PaymentDialog({
  open,
  onOpenChange,
  subtotal,
  cartDiscount,
  loyaltyDiscount,
  grandTotal,
  cart,
  paymentTab,
  paidAmount,
  processingPayment,
  setPaymentTab,
  setPaidAmount,
  splitCash,
  splitCard,
  setSplitCash,
  setSplitCard,
  onConfirmPayment,
  symbol,
  formatDual,
}: PaymentDialogProps) {
  const change = parseFloat(paidAmount) - grandTotal

  const splitCashNum = parseFloat(splitCash) || 0
  const splitCardNum = parseFloat(splitCard) || 0
  const splitTotal = splitCashNum + splitCardNum
  const splitRemaining = Math.max(0, grandTotal - splitTotal)
  const isSplitValid = splitTotal >= grandTotal && splitCashNum >= 0 && splitCardNum >= 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg animated-border-gradient dialog-slide-up" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-right">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-primary" />
            </div>
            تأكيد الدفع
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Receipt number */}
          <div className="flex items-center gap-2 rounded-xl bg-muted/40 px-4 py-2.5">
            <ReceiptText className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">رقم الفاتورة:</span>
            <span className="text-sm font-bold font-mono text-primary">{peekNextReceiptNumber()}</span>
          </div>

          {/* Summary */}
          <div className="rounded-xl bg-muted/40 p-4 space-y-2.5">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">المجموع الفرعي</span>
              <span className="font-medium tabular-nums">{formatDual(subtotal).display}</span>
            </div>
            {cartDiscount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">الخصم</span>
                <span className="font-medium text-destructive tabular-nums">-{formatDual(cartDiscount).display}</span>
              </div>
            )}
            {loyaltyDiscount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Star className="w-3 h-3 text-amber-500" />
                  خصم النقاط
                </span>
                <span className="font-medium text-amber-600 tabular-nums">-{formatDual(loyaltyDiscount).display}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between items-center">
              <span className="font-bold">الإجمالي المطلوب</span>
              <span className="text-lg font-bold text-primary tabular-nums">{formatDual(grandTotal).display}</span>
            </div>
          </div>

          {/* Items count */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ShoppingCart className="w-4 h-4" />
            <span>
              {cart.reduce((s, i) => s + i.quantity, 0)} منتج — {cart.length} صنف
            </span>
          </div>

          {/* Payment method tabs */}
          <Tabs value={paymentTab} onValueChange={(v) => setPaymentTab(v as 'full' | 'split')} className="w-full">
            <TabsList className="w-full h-10">
              <TabsTrigger value="full" className="flex-1 gap-1.5 text-xs">
                <Banknote className="w-3.5 h-3.5" />
                دفع كامل
              </TabsTrigger>
              <TabsTrigger value="split" className="flex-1 gap-1.5 text-xs">
                <CreditCard className="w-3.5 h-3.5" />
                دفع مجزأ
              </TabsTrigger>
            </TabsList>

            {/* Full payment tab */}
            <TabsContent value="full" className="space-y-4 mt-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">المبلغ المدفوع</Label>
                <div className="relative">
                  <Input
                    type="number"
                    min={0}
                    step={0.5}
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(e.target.value)}
                    placeholder="0.00"
                    className="h-12 rounded-xl text-lg font-bold pr-4 pl-14 tabular-nums"
                    autoFocus
                  />
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">{symbol}</span>
                </div>
              </div>

              {/* Quick amount buttons */}
              <div className="flex gap-2 flex-wrap">
                {[10, 20, 50, 100, 200, 500].map((amt) => (
                  <button
                    key={amt}
                    onClick={() => setPaidAmount(amt.toString())}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                      parseFloat(paidAmount) === amt
                        ? 'bg-primary text-white shadow-sm'
                        : 'bg-muted/60 text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {amt}
                  </button>
                ))}
              </div>

              {/* Change / insufficient */}
              {paidAmount && parseFloat(paidAmount) >= grandTotal && (
                <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 flex items-center justify-between">
                  <span className="text-sm font-medium text-emerald-700">الباقي</span>
                  <span className="text-lg font-bold text-emerald-600 tabular-nums">
                    {change.toFixed(2)} {symbol}
                  </span>
                </div>
              )}
              {paidAmount && parseFloat(paidAmount) < grandTotal && parseFloat(paidAmount) > 0 && (
                <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 flex items-center justify-between">
                  <span className="text-sm font-medium text-destructive">المبلغ غير كافٍ</span>
                  <span className="text-lg font-bold text-destructive tabular-nums">
                    {(grandTotal - parseFloat(paidAmount)).toFixed(2)} {symbol} متبقي
                  </span>
                </div>
              )}
            </TabsContent>

            {/* Split payment tab */}
            <TabsContent value="split" className="space-y-4 mt-4">
              {/* Cash input */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium flex items-center gap-1.5">
                  <Banknote className="w-3.5 h-3.5 text-emerald-600" />
                  المبلغ النقدي
                </Label>
                <div className="relative">
                  <Input
                    type="number"
                    min={0}
                    step={0.5}
                    value={splitCash}
                    onChange={(e) => setSplitCash(e.target.value)}
                    placeholder="0.00"
                    className="h-11 rounded-xl text-base font-bold pr-4 pl-14 tabular-nums"
                    autoFocus
                  />
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">{symbol}</span>
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {[10, 20, 50, 100, 200, 500].filter(a => a <= grandTotal).map((amt) => (
                    <button
                      key={`cash-${amt}`}
                      onClick={() => setSplitCash(amt.toString())}
                      className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-all duration-150 ${
                        splitCashNum === amt
                          ? 'bg-emerald-500 text-white shadow-sm'
                          : 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20'
                      }`}
                    >
                      {amt}
                    </button>
                  ))}
                  <button
                    onClick={() => setSplitCash(grandTotal.toString())}
                    className="px-2.5 py-1 rounded-md text-[10px] font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-all duration-150"
                  >
                    الكامل
                  </button>
                </div>
              </div>

              {/* Card input */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-blue-600" />
                  المبلغ بالبطاقة
                </Label>
                <div className="relative">
                  <Input
                    type="number"
                    min={0}
                    step={0.5}
                    value={splitCard}
                    onChange={(e) => setSplitCard(e.target.value)}
                    placeholder="0.00"
                    className="h-11 rounded-xl text-base font-bold pr-4 pl-14 tabular-nums"
                  />
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">{symbol}</span>
                </div>
                <button
                  onClick={() => setSplitCard(splitRemaining.toFixed(2))}
                  className="px-2.5 py-1 rounded-md text-[10px] font-medium bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 transition-all duration-150"
                >
                  المتبقي ({splitRemaining.toFixed(2)})
                </button>
              </div>

              {/* Split summary */}
              <div className="rounded-xl bg-muted/40 p-3 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">نقدي + بطاقة</span>
                  <span className="font-medium tabular-nums">
                    {splitCashNum.toFixed(2)} + {splitCardNum.toFixed(2)} = {splitTotal.toFixed(2)} {symbol}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">المتبقي</span>
                  <span className={`font-bold tabular-nums ${splitRemaining > 0 ? 'text-destructive' : 'text-emerald-600'}`}>
                    {splitRemaining.toFixed(2)} {symbol}
                  </span>
                </div>
              </div>

              {/* Cash change */}
              {splitCashNum > 0 && grandTotal > splitCardNum && (
                <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 flex items-center justify-between">
                  <span className="text-sm font-medium text-emerald-700">الباقي (نقدي)</span>
                  <span className="text-lg font-bold text-emerald-600 tabular-nums">
                    {Math.max(0, splitCashNum - (grandTotal - splitCardNum)).toFixed(2)} {symbol}
                  </span>
                </div>
              )}

              {/* Validation messages */}
              {splitTotal > 0 && splitTotal < grandTotal && (
                <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 flex items-center justify-between">
                  <span className="text-sm font-medium text-destructive">المبلغ غير كافٍ</span>
                  <span className="text-base font-bold text-destructive tabular-nums">
                    {splitRemaining.toFixed(2)} {symbol} متبقي
                  </span>
                </div>
              )}
              {isSplitValid && (
                <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-center">
                  <span className="text-sm font-medium text-emerald-700">المبلغ مكتمل ✓</span>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1 h-11 rounded-xl"
            disabled={processingPayment}
          >
            إلغاء
          </Button>
          <Button
            onClick={onConfirmPayment}
            disabled={
              processingPayment ||
              (paymentTab === 'full' ? (!paidAmount || parseFloat(paidAmount) < grandTotal) : !isSplitValid)
            }
            className="flex-1 h-11 rounded-xl gap-2 shadow-lg shadow-primary/25"
          >
            {processingPayment ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>جاري المعالجة...</span>
              </>
            ) : (
              <>
                <Printer className="w-4 h-4" />
                <span>تأكيد الدفع</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
