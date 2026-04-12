// ── Print Invoice Template ─────────────────────────────────────────

import { CURRENCY_MAP } from '@/types'
import { formatWithSettings } from '@/lib/currency'
import { formatDate, formatTime } from '@/lib/date-utils'
import type { Invoice } from './types'

const printFormatCurrency = formatWithSettings

export function generateInvoicePrintHtml(invoice: Invoice, settings: {
  storeName?: string
  storePhone?: string
  storeAddress?: string
  taxNumber?: string
  receiptHeaderText?: string
  receiptFooterText?: string
  currency?: string
}): string {
  const partyName =
    invoice.type === 'sale'
      ? invoice.customer?.name || 'عميل نقدي'
      : invoice.supplier?.name || 'مورد'
  const partyLabel = invoice.type === 'sale' ? 'العميل' : 'المورد'
  const typeLabel = invoice.type === 'sale' ? 'فاتورة بيع' : 'فاتورة شراء'

  const storeName = settings.storeName || 'السلطان للمشروبات'
  const storePhone = settings.storePhone || ''
  const storeAddress = settings.storeAddress || ''
  const taxNumber = settings.taxNumber || ''
  const receiptHeader = settings.receiptHeaderText || ''
  const receiptFooter = settings.receiptFooterText || 'شكراً لتعاملكم معنا'
  const currencySymbol = CURRENCY_MAP[settings.currency || 'SAR']?.symbol || 'ر.س'

  const itemsRows = invoice.items
    .map(
      (item, i) => `
        <tr>
          <td style="border:1px solid #ddd;padding:8px;text-align:center;font-size:12px;">${i + 1}</td>
          <td style="border:1px solid #ddd;padding:8px;text-align:right;font-size:12px;">${item.product.name}</td>
          <td style="border:1px solid #ddd;padding:8px;text-align:center;font-size:12px;">${item.quantity}</td>
          <td style="border:1px solid #ddd;padding:8px;text-align:center;font-size:12px;">${printFormatCurrency(item.price)}</td>
          <td style="border:1px solid #ddd;padding:8px;text-align:center;font-size:12px;font-weight:600;">${printFormatCurrency(item.total)}</td>
        </tr>`
    )
    .join('')

  const remaining = invoice.totalAmount - invoice.discount - invoice.paidAmount
  const totalItems = invoice.items.reduce((sum, item) => sum + item.quantity, 0)

  return `
    <html dir="rtl">
    <head>
      <title>فاتورة ${invoice.invoiceNo}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@300;400;500;600;700&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Noto Sans Arabic', 'Segoe UI', Tahoma, Arial, sans-serif;
          padding: 20px;
          max-width: 80mm;
          margin: 0 auto;
          color: #1a1a2e;
          background: #fff;
          font-size: 12px;
          line-height: 1.5;
        }
        .receipt {
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0,0,0,0.08);
        }
        .header {
          text-align: center;
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          color: white;
          padding: 20px 16px 16px;
          position: relative;
        }
        .header::after {
          content: '';
          position: absolute;
          bottom: -8px;
          left: 50%;
          transform: translateX(-50%);
          width: 16px;
          height: 16px;
          background: #1a1a2e;
          clip-path: polygon(0 0, 100% 0, 50% 100%);
        }
        .store-name {
          font-size: 20px;
          font-weight: 700;
          margin-bottom: 4px;
          letter-spacing: 0.5px;
        }
        .store-subtitle {
          font-size: 10px;
          opacity: 0.7;
          margin-bottom: 8px;
        }
        .store-info {
          font-size: 9px;
          opacity: 0.8;
          line-height: 1.6;
        }
        .store-info div {
          display: flex;
          justify-content: center;
          gap: 4px;
        }
        .receipt-header-text {
          text-align: center;
          padding: 12px 16px;
          font-size: 11px;
          color: #666;
          border-bottom: 1px dashed #ddd;
          font-style: italic;
        }
        .invoice-info {
          background: #f8f9fa;
          padding: 12px 14px;
          border-bottom: 1px solid #eee;
        }
        .invoice-info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 6px;
        }
        .invoice-info-item {
          display: flex;
          flex-direction: column;
          gap: 1px;
        }
        .invoice-info-item .label {
          font-size: 9px;
          color: #888;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }
        .invoice-info-item .value {
          font-size: 12px;
          font-weight: 600;
          color: #1a1a2e;
        }
        .items-section {
          padding: 8px 0;
        }
        .items-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 14px 6px;
          border-bottom: 1px solid #eee;
          margin-bottom: 0;
        }
        .items-header span {
          font-size: 9px;
          color: #888;
          text-transform: uppercase;
          letter-spacing: 0.3px;
          flex: 1;
          text-align: center;
        }
        .items-header span:first-child { text-align: right; }
        .items-header span:last-child { text-align: center; }
        table { width: 100%; border-collapse: collapse; margin: 0; }
        tbody tr { border-bottom: 1px solid #f0f0f0; }
        tbody tr:last-child { border-bottom: none; }
        tbody tr:nth-child(even) { background: #fafafa; }
        .totals-section {
          padding: 10px 14px;
          border-top: 2px solid #1a1a2e;
          background: #f8f9fa;
        }
        .totals-row {
          display: flex;
          justify-content: space-between;
          padding: 4px 0;
          font-size: 12px;
        }
        .totals-row .label { color: #666; }
        .totals-row .value { font-weight: 600; }
        .totals-row.grand {
          font-size: 16px;
          font-weight: 700;
          color: #1a1a2e;
          border-top: 1px solid #ddd;
          padding-top: 8px;
          margin-top: 4px;
        }
        .totals-row.remaining {
          color: #dc2626;
          font-weight: 700;
        }
        .footer {
          text-align: center;
          padding: 14px 16px 16px;
          border-top: 1px dashed #ccc;
          margin-top: 8px;
        }
        .footer-text {
          font-size: 11px;
          color: #888;
          margin-bottom: 6px;
        }
        .footer-brand {
          font-size: 9px;
          color: #bbb;
        }
        .type-badge {
          display: inline-block;
          padding: 2px 12px;
          border-radius: 12px;
          font-size: 10px;
          font-weight: 600;
        }
        .type-badge-sale { background: #dbeafe; color: #1d4ed8; }
        .type-badge-purchase { background: #dcfce7; color: #15803d; }
        .barcode-area {
          text-align: center;
          padding: 8px 14px;
          border-top: 1px dashed #eee;
          border-bottom: 1px dashed #eee;
          margin: 8px 14px;
        }
        .barcode-text {
          font-family: 'Courier New', monospace;
          font-size: 14px;
          letter-spacing: 3px;
          font-weight: 700;
          color: #1a1a2e;
        }
        @media print {
          body { padding: 0; margin: 0; }
          .receipt { border: none; box-shadow: none; border-radius: 0; }
        }
      </style>
    </head>
    <body>
      <div class="receipt">
        <!-- Header -->
        <div class="header">
          <div class="store-name">🏪 ${storeName}</div>
          <div class="store-subtitle">نظام إدارة نقطة البيع</div>
          ${(storePhone || storeAddress || taxNumber) ? `
          <div class="store-info">
            ${storePhone ? `<div>📞 ${storePhone}</div>` : ''}
            ${storeAddress ? `<div>📍 ${storeAddress}</div>` : ''}
            ${taxNumber ? `<div>🏦 الرقم الضريبي: ${taxNumber}</div>` : ''}
          </div>` : ''}
        </div>

        <!-- Custom Receipt Header -->
        ${receiptHeader ? `<div class="receipt-header-text">${receiptHeader}</div>` : ''}

        <!-- Invoice Info -->
        <div class="invoice-info">
          <div class="invoice-info-grid">
            <div class="invoice-info-item">
              <span class="label">رقم الفاتورة</span>
              <span class="value">${invoice.invoiceNo}</span>
            </div>
            <div class="invoice-info-item">
              <span class="label">النوع</span>
              <span class="type-badge ${invoice.type === 'sale' ? 'type-badge-sale' : 'type-badge-purchase'}">${typeLabel}</span>
            </div>
            <div class="invoice-info-item">
              <span class="label">التاريخ</span>
              <span class="value">${formatDate(invoice.createdAt)}</span>
            </div>
            <div class="invoice-info-item">
              <span class="label">الوقت</span>
              <span class="value">${formatTime(invoice.createdAt)}</span>
            </div>
            <div class="invoice-info-item">
              <span class="label">${partyLabel}</span>
              <span class="value">${partyName}</span>
            </div>
            <div class="invoice-info-item">
              <span class="label">المستخدم</span>
              <span class="value">${invoice.user.name}</span>
            </div>
            <div class="invoice-info-item">
              <span class="label">عدد الأصناف</span>
              <span class="value">${invoice.items.length}</span>
            </div>
            <div class="invoice-info-item">
              <span class="label">عدد القطع</span>
              <span class="value">${totalItems}</span>
            </div>
          </div>
        </div>

        <!-- Items -->
        <div class="items-section">
          <div class="items-header">
            <span style="flex:2;text-align:right;">المنتج</span>
            <span style="flex:0.5;">الكمية</span>
            <span style="flex:1;">السعر</span>
            <span style="flex:1;">الإجمالي</span>
          </div>
          <table>
            <tbody>
              ${itemsRows}
            </tbody>
          </table>
        </div>

        <!-- Barcode -->
        <div class="barcode-area">
          <div class="barcode-text">${invoice.invoiceNo}</div>
        </div>

        <!-- Totals -->
        <div class="totals-section">
          <div class="totals-row">
            <span class="label">المجموع:</span>
            <span class="value">${printFormatCurrency(invoice.totalAmount)}</span>
          </div>
          ${invoice.discount > 0 ? `<div class="totals-row">
            <span class="label">الخصم:</span>
            <span class="value" style="color:#ea580c;">-${printFormatCurrency(invoice.discount)}</span>
          </div>` : ''}
          <div class="totals-row">
            <span class="label">المدفوع:</span>
            <span class="value" style="color:#16a34a;">${printFormatCurrency(invoice.paidAmount)}</span>
          </div>
          ${remaining > 0 ? `<div class="totals-row remaining">
            <span class="label">المتبقي:</span>
            <span class="value">${printFormatCurrency(remaining)}</span>
          </div>` : ''}
          <div class="totals-row grand">
            <span class="label">الصافي:</span>
            <span class="value">${printFormatCurrency(invoice.totalAmount - invoice.discount)}</span>
          </div>
        </div>

        <!-- Footer -->
        <div class="footer">
          <div class="footer-text">${receiptFooter}</div>
          <div class="footer-brand">© ${new Date().getFullYear()} ${storeName}</div>
        </div>
      </div>
    </body>
    </html>`
}
