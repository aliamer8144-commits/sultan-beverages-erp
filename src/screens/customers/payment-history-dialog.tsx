'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { History, Banknote } from 'lucide-react'
import { formatShortDate } from '@/lib/date-utils'
import { useApi } from '@/hooks/use-api'

import type { Customer, Payment } from './types'

interface PaymentHistoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  customer: Customer | null
  formatCurrency: (amount: number) => string
}

export function PaymentHistoryDialog({
  open,
  onOpenChange,
  customer,
  formatCurrency,
}: PaymentHistoryDialogProps) {
  const { get } = useApi()
  const [paymentHistory, setPaymentHistory] = useState<Payment[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  useEffect(() => {
    if (open && customer) {
      setPaymentHistory([])
      setHistoryLoading(true)
      ;(async () => {
        try {
          const result = await get<{ payments: Payment[] }>('/api/customer-payments', { customerId: customer.id }, { showErrorToast: false })
          if (result) {
            setPaymentHistory(result.payments)
          }
        } finally {
          setHistoryLoading(false)
        }
      })()
    }
  }, [open, customer, get])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10">
              <History className="h-5 w-5 text-blue-500" />
            </div>
            سجل الدفعات
            {customer && (
              <span className="text-sm font-normal text-muted-foreground">
                — {customer.name}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-96">
          {historyLoading ? (
            <div className="flex flex-col gap-3 p-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-16 rounded-lg bg-muted/50 animate-pulse" />
              ))}
            </div>
          ) : paymentHistory.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
              <History className="h-10 w-10 opacity-40" />
              <p className="font-medium">لا توجد دفعات مسجلة</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2 p-2">
              {paymentHistory.map((payment) => (
                <div
                  key={payment.id}
                  className="rounded-lg border bg-card p-3 card-hover"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10">
                        <Banknote className="h-4 w-4 text-emerald-500" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-emerald-600">
                          {formatCurrency(payment.amount)}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {payment.method === 'cash' ? 'نقدي' : 'تحويل'}
                        </p>
                      </div>
                    </div>
                    <div className="text-left">
                      <p className="text-[11px] text-muted-foreground">
                        {formatShortDate(payment.createdAt)}
                      </p>
                      {payment.notes && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">{payment.notes}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
