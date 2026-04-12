'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ShoppingBag, Crown, StickyNote } from 'lucide-react'
import { formatShortDate, formatDateShortMonth } from '@/lib/date-utils'
import { useApi } from '@/hooks/use-api'

import type { Customer, CustomerInvoice } from './types'

interface PurchaseHistoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  customer: Customer | null
  formatCurrency: (amount: number) => string
}

export function PurchaseHistoryDialog({
  open,
  onOpenChange,
  customer,
  formatCurrency,
}: PurchaseHistoryDialogProps) {
  const { get } = useApi()
  const [customerInvoices, setCustomerInvoices] = useState<CustomerInvoice[]>([])
  const [purchaseLoading, setPurchaseLoading] = useState(false)
  const [expandedNotes, setExpandedNotes] = useState<string | null>(null)

  useEffect(() => {
    if (open && customer) {
      setCustomerInvoices([])
      setPurchaseLoading(true)
      ;(async () => {
        try {
          const result = await get<CustomerInvoice[]>('/api/invoices', { customerId: customer.id, type: 'sale' }, { showErrorToast: false })
          if (result) {
            setCustomerInvoices(result.slice(0, 10))
          }
        } finally {
          setPurchaseLoading(false)
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
              <ShoppingBag className="h-5 w-5 text-blue-500" />
            </div>
            سجل المشتريات
            {customer && (
              <span className="text-sm font-normal text-muted-foreground">
                — {customer.name}
                {customer.category === 'VIP' && (
                  <Crown className="inline h-3.5 w-3.5 text-amber-500 mr-1" />
                )}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {customer && (
          <div>
            {/* ── Summary Cards ── */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="rounded-lg bg-muted/40 p-3 text-center">
                <p className="text-[10px] text-muted-foreground">إجمالي المشتريات</p>
                <p className="text-sm font-bold text-primary">
                  {formatCurrency(customer.totalPurchases)}
                </p>
              </div>
              <div className="rounded-lg bg-muted/40 p-3 text-center">
                <p className="text-[10px] text-muted-foreground">عدد الزيارات</p>
                <p className="text-sm font-bold">{customer.visitCount}</p>
              </div>
              <div className="rounded-lg bg-muted/40 p-3 text-center">
                <p className="text-[10px] text-muted-foreground">آخر زيارة</p>
                <p className="text-sm font-bold">
                  {customer.lastVisit
                    ? formatShortDate(customer.lastVisit)
                    : '—'}
                </p>
              </div>
            </div>

            {/* ── Notes Section ── */}
            {customer.notes && (
              <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50/50 dark:border-amber-800/50 dark:bg-amber-950/20 p-3">
                <div className="flex items-start gap-2">
                  <StickyNote className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-amber-700 dark:text-amber-400">ملاحظات</p>
                    {customer.notes.length > 100 ? (
                      <>
                        <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">
                          {expandedNotes === customer.id
                            ? customer.notes
                            : customer.notes.slice(0, 100) + '...'}
                        </p>
                        <button
                          onClick={() => setExpandedNotes(
                            expandedNotes === customer.id ? null : customer.id
                          )}
                          className="text-[11px] text-amber-600 hover:underline mt-1"
                        >
                          {expandedNotes === customer.id ? 'عرض أقل' : 'عرض المزيد'}
                        </button>
                      </>
                    ) : (
                      <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">
                        {customer.notes}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── Invoices List ── */}
            <ScrollArea className="max-h-72">
              {purchaseLoading ? (
                <div className="flex flex-col gap-3 p-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-16 rounded-lg bg-muted/50 animate-pulse" />
                  ))}
                </div>
              ) : customerInvoices.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
                  <ShoppingBag className="h-10 w-10 opacity-40" />
                  <p className="font-medium">لا توجد مشتريات سابقة</p>
                  <p className="text-xs">لم يتم تسجيل أي فواتير بيع لهذا العميل</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2 p-2">
                  {customerInvoices.map((invoice) => {
                    const remaining = invoice.totalAmount - invoice.discount - invoice.paidAmount
                    const isPaid = remaining <= 0
                    const isPartial = invoice.paidAmount > 0 && remaining > 0
                    return (
                      <div
                        key={invoice.id}
                        className="rounded-lg border bg-card p-3 card-hover"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/10">
                              <ShoppingBag className="h-4 w-4 text-blue-500" />
                            </div>
                            <div>
                              <p className="text-sm font-bold font-mono" dir="ltr">
                                {invoice.invoiceNo}
                              </p>
                              <p className="text-[11px] text-muted-foreground">
                                {formatDateShortMonth(invoice.createdAt)}
                              </p>
                            </div>
                          </div>
                          <div className="text-left">
                            <p className="text-sm font-bold">
                              {formatCurrency(invoice.totalAmount)}
                            </p>
                            {isPaid ? (
                              <span className="chip chip-success text-[10px] py-0 px-1.5">مدفوعة</span>
                            ) : isPartial ? (
                              <span className="chip chip-warning text-[10px] py-0 px-1.5">جزئي</span>
                            ) : (
                              <span className="chip chip-danger text-[10px] py-0 px-1.5">غير مدفوعة</span>
                            )}
                          </div>
                        </div>
                        {invoice.discount > 0 && (
                          <div className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
                            <span>خصم: {formatCurrency(invoice.discount)}</span>
                            <span className="mx-1">|</span>
                            <span>المدفوع: {formatCurrency(invoice.paidAmount)}</span>
                            {remaining > 0 && (
                              <>
                                <span className="mx-1">|</span>
                                <span className="text-destructive">المتبقي: {formatCurrency(remaining)}</span>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </ScrollArea>

            {customerInvoices.length > 0 && (
              <p className="text-[11px] text-muted-foreground text-center mt-2">
                عرض آخر {customerInvoices.length} فواتير
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
