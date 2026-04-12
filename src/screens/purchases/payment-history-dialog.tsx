'use client'

import { useState, useEffect } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { History } from 'lucide-react'
import { useCurrency } from '@/hooks/use-currency'
import { useApi } from '@/hooks/use-api'
import { formatShortDate } from '@/lib/date-utils'
import type { Supplier, SupplierPayment } from './types'

interface PaymentHistoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  supplier: Supplier | null
}

export function PaymentHistoryDialog({
  open,
  onOpenChange,
  supplier,
}: PaymentHistoryDialogProps) {
  const { formatCurrency } = useCurrency()
  const { get } = useApi()
  const [paymentHistory, setPaymentHistory] = useState<SupplierPayment[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  useEffect(() => {
    if (!open || !supplier) return
    ;(async () => {
      try {
        setHistoryLoading(true)
        const result = await get<SupplierPayment[]>('/api/supplier-payments', { supplierId: supplier.id }, { showErrorToast: false })
        if (result) {
          setPaymentHistory(result)
        }
      } finally {
        setHistoryLoading(false)
      }
    })()
  }, [open, supplier, get])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10">
              <History className="h-5 w-5 text-blue-600" />
            </div>
            سجل الدفعات
          </DialogTitle>
        </DialogHeader>
        {supplier && (
          <div className="space-y-3 py-2">
            <div className="rounded-xl bg-muted/40 p-3">
              <p className="text-sm font-semibold">{supplier.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                إجمالي المدفوع: <span className="text-emerald-600 font-bold">{formatCurrency(supplier.totalPaid)}</span>
              </p>
            </div>

            <ScrollArea className="max-h-[300px]">
              {historyLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                </div>
              ) : paymentHistory.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="w-8 h-8 mx-auto opacity-30 mb-2" />
                  <p className="text-sm">لا توجد دفعات سابقة</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {paymentHistory.map((payment) => (
                    <div key={payment.id} className="rounded-lg border p-3 bg-card/50">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-bold text-emerald-600 tabular-nums">
                            {formatCurrency(payment.amount)}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {payment.method === 'cash' ? 'نقدي' : payment.method === 'transfer' ? 'تحويل' : 'شيك'}
                          </p>
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          {formatShortDate(payment.createdAt)}
                        </p>
                      </div>
                      {payment.notes && (
                        <p className="text-xs text-muted-foreground mt-1.5 border-t border-border/30 pt-1.5">
                          {payment.notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
