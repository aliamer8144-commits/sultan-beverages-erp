'use client'

import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { FileText, Printer } from 'lucide-react'
import { useCurrency } from '@/hooks/use-currency'
import { useAppStore } from '@/store/app-store'
import { formatDate } from '@/lib/date-utils'
import type { Invoice } from './types'
import { generateInvoicePrintHtml } from './print-invoice'

interface InvoiceDetailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  invoice: Invoice | null
}

export function InvoiceDetailDialog({
  open,
  onOpenChange,
  invoice,
}: InvoiceDetailDialogProps) {
  const { formatCurrency, formatDual } = useCurrency()
  const settings = useAppStore((s) => s.settings)

  const handlePrint = () => {
    if (!invoice) return
    const html = generateInvoicePrintHtml(invoice, settings)
    const win = window.open('', '_blank')
    if (win) {
      win.document.write(html)
      win.document.close()
      win.print()
    }
  }

  if (!invoice) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col glass-card" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            تفاصيل الفاتورة {invoice.invoiceNo}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          <ScrollArea className="flex-1">
            <div className="space-y-4 pb-2">
              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-[10px] text-muted-foreground mb-0.5">رقم الفاتورة</p>
                  <p className="text-sm font-bold">{invoice.invoiceNo}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-[10px] text-muted-foreground mb-0.5">النوع</p>
                  <Badge
                    variant="secondary"
                    className={`text-[10px] px-2 py-0 h-5 font-semibold ${
                      invoice.type === 'sale'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-emerald-100 text-emerald-700'
                    }`}
                  >
                    {invoice.type === 'sale' ? 'فاتورة بيع' : 'فاتورة شراء'}
                  </Badge>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-[10px] text-muted-foreground mb-0.5">التاريخ</p>
                  <p className="text-sm font-medium">{formatDate(invoice.createdAt)}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-[10px] text-muted-foreground mb-0.5">
                    {invoice.type === 'sale' ? 'العميل' : 'المورد'}
                  </p>
                  <p className="text-sm font-medium">
                    {invoice.type === 'sale'
                      ? invoice.customer?.name || 'عميل نقدي'
                      : invoice.supplier?.name || 'مورد'}
                  </p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-[10px] text-muted-foreground mb-0.5">المستخدم</p>
                  <p className="text-sm font-medium">{invoice.user.name}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-[10px] text-muted-foreground mb-0.5">عدد العناصر</p>
                  <p className="text-sm font-medium">{invoice.items.length}</p>
                </div>
              </div>

              {/* Items Table */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2">
                  عناصر الفاتورة
                </p>
                <div className="rounded-lg overflow-hidden border border-border/50 receipt-preview">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="text-xs font-semibold text-right py-2 px-3">
                          المنتج
                        </TableHead>
                        <TableHead className="text-xs font-semibold text-center py-2 px-3">
                          الكمية
                        </TableHead>
                        <TableHead className="text-xs font-semibold text-center py-2 px-3">
                          السعر
                        </TableHead>
                        <TableHead className="text-xs font-semibold text-center py-2 px-3">
                          الإجمالي
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoice.items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="text-xs py-2 px-3 text-right font-medium">
                            {item.product.name}
                          </TableCell>
                          <TableCell className="text-xs py-2 px-3 text-center">
                            {item.quantity}
                          </TableCell>
                          <TableCell className="text-xs py-2 px-3 text-center">
                            {formatCurrency(item.price)}
                          </TableCell>
                          <TableCell className="text-xs py-2 px-3 text-center font-semibold">
                            {formatCurrency(item.total)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Totals */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">الإجمالي</span>
                  <span className="font-bold">{formatDual(invoice.totalAmount).display}</span>
                </div>
                {invoice.discount > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">الخصم</span>
                    <span className="font-semibold text-orange-600">
                      -{formatDual(invoice.discount).display}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">المدفوع</span>
                  <span className="font-semibold text-emerald-600 tabular-nums-enhanced">
                    {formatDual(invoice.paidAmount).display}
                  </span>
                </div>
                {invoice.totalAmount - invoice.discount - invoice.paidAmount > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">المتبقي</span>
                    <span className="font-semibold text-destructive tabular-nums-enhanced">
                      {formatDual(
                        invoice.totalAmount -
                          invoice.discount -
                          invoice.paidAmount
                      ).display}
                    </span>
                  </div>
                )}
                <div className="border-t border-border/70 pt-2 flex justify-between items-center">
                  <span className="text-sm font-bold">الصافي</span>
                  <span className="text-lg font-bold text-primary tabular-nums-enhanced">
                    {formatDual(invoice.totalAmount - invoice.discount).display}
                  </span>
                </div>
              </div>

              {/* Print Button */}
              <Button
                onClick={handlePrint}
                className="w-full gap-2 btn-ripple"
              >
                <Printer className="w-4 h-4" />
                طباعة الفاتورة
              </Button>
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  )
}
