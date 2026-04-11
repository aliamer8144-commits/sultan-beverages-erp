/**
 * Print Templates for Invoice Printing
 *
 * Generates HTML strings for three invoice template types:
 * - Classic: Standard receipt layout (current design)
 * - Professional: Modern layout with colored header, alternating rows
 * - Simple: Plain text, minimal spacing for thermal printers
 */

import { formatWithSettings } from '@/lib/currency'
import type { SettingsState } from '@/store/app-store'

// ── Types ──────────────────────────────────────────────────────────────

export interface InvoiceData {
  id: string
  invoiceNo: string
  type: 'sale' | 'purchase'
  customer: { id: string; name: string } | null
  supplier: { id: string; name: string } | null
  totalAmount: number
  discount: number
  paidAmount: number
  user: { id: string; name: string }
  items: Array<{
    id: string
    product: { id: string; name: string }
    quantity: number
    price: number
    total: number
  }>
  createdAt: string
}

export type TemplateType = 'classic' | 'professional' | 'simple'

// ── Helpers ────────────────────────────────────────────────────────────

const fmt = formatWithSettings

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('ar-SA', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getPartyInfo(invoice: InvoiceData) {
  const partyName =
    invoice.type === 'sale'
      ? invoice.customer?.name || 'عميل نقدي'
      : invoice.supplier?.name || 'مورد'
  const partyLabel = invoice.type === 'sale' ? 'العميل' : 'المورد'
  const typeLabel = invoice.type === 'sale' ? 'فاتورة بيع' : 'فاتورة شراء'
  return { partyName, partyLabel, typeLabel }
}

// ── Classic Template ──────────────────────────────────────────────────

function generateClassicHTML(invoice: InvoiceData, settings: SettingsState): string {
  const { partyName, partyLabel, typeLabel } = getPartyInfo(invoice)
  const storeName = settings.storeName || 'السلطان للمشروبات'
  const storePhone = settings.storePhone || ''
  const storeAddress = settings.storeAddress || ''
  const taxNumber = settings.taxNumber || ''
  const receiptHeader = settings.receiptHeaderText || ''
  const receiptFooter = settings.receiptFooterText || 'شكراً لتعاملكم معنا'
  const remaining = invoice.totalAmount - invoice.discount - invoice.paidAmount
  const totalItems = invoice.items.reduce((sum, item) => sum + item.quantity, 0)

  const itemsRows = invoice.items
    .map(
      (item, i) => `
        <tr>
          <td style="border:1px solid #ddd;padding:8px;text-align:center;font-size:12px;">${i + 1}</td>
          <td style="border:1px solid #ddd;padding:8px;text-align:right;font-size:12px;">${item.product.name}</td>
          <td style="border:1px solid #ddd;padding:8px;text-align:center;font-size:12px;">${item.quantity}</td>
          <td style="border:1px solid #ddd;padding:8px;text-align:center;font-size:12px;">${fmt(item.price)}</td>
          <td style="border:1px solid #ddd;padding:8px;text-align:center;font-size:12px;font-weight:600;">${fmt(item.total)}</td>
        </tr>`
    )
    .join('')

  return `<!DOCTYPE html>
<html dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>فاتورة ${invoice.invoiceNo}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@300;400;500;600;700&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Noto Sans Arabic', 'Segoe UI', Tahoma, Arial, sans-serif;
      padding: 20px; max-width: 80mm; margin: 0 auto;
      color: #1a1a2e; background: #fff; font-size: 12px; line-height: 1.5;
    }
    .receipt { border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
    .header {
      text-align: center; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      color: white; padding: 20px 16px 16px; position: relative;
    }
    .header::after {
      content: ''; position: absolute; bottom: -8px; left: 50%; transform: translateX(-50%);
      width: 16px; height: 16px; background: #1a1a2e; clip-path: polygon(0 0, 100% 0, 50% 100%);
    }
    .store-name { font-size: 20px; font-weight: 700; margin-bottom: 4px; letter-spacing: 0.5px; }
    .store-subtitle { font-size: 10px; opacity: 0.7; margin-bottom: 8px; }
    .store-info { font-size: 9px; opacity: 0.8; line-height: 1.6; }
    .store-info div { display: flex; justify-content: center; gap: 4px; }
    .receipt-header-text { text-align: center; padding: 12px 16px; font-size: 11px; color: #666; border-bottom: 1px dashed #ddd; font-style: italic; }
    .invoice-info { background: #f8f9fa; padding: 12px 14px; border-bottom: 1px solid #eee; }
    .invoice-info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
    .invoice-info-item { display: flex; flex-direction: column; gap: 1px; }
    .invoice-info-item .label { font-size: 9px; color: #888; text-transform: uppercase; letter-spacing: 0.3px; }
    .invoice-info-item .value { font-size: 12px; font-weight: 600; color: #1a1a2e; }
    .items-section { padding: 8px 0; }
    .items-header { display: flex; align-items: center; justify-content: space-between; padding: 0 14px 6px; border-bottom: 1px solid #eee; }
    .items-header span { font-size: 9px; color: #888; text-transform: uppercase; letter-spacing: 0.3px; flex: 1; text-align: center; }
    .items-header span:first-child { text-align: right; }
    table { width: 100%; border-collapse: collapse; margin: 0; }
    tbody tr { border-bottom: 1px solid #f0f0f0; }
    tbody tr:last-child { border-bottom: none; }
    tbody tr:nth-child(even) { background: #fafafa; }
    .totals-section { padding: 10px 14px; border-top: 2px solid #1a1a2e; background: #f8f9fa; }
    .totals-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 12px; }
    .totals-row .label { color: #666; }
    .totals-row .value { font-weight: 600; }
    .totals-row.grand { font-size: 16px; font-weight: 700; color: #1a1a2e; border-top: 1px solid #ddd; padding-top: 8px; margin-top: 4px; }
    .totals-row.remaining { color: #dc2626; font-weight: 700; }
    .footer { text-align: center; padding: 14px 16px 16px; border-top: 1px dashed #ccc; margin-top: 8px; }
    .footer-text { font-size: 11px; color: #888; margin-bottom: 6px; }
    .footer-brand { font-size: 9px; color: #bbb; }
    .type-badge { display: inline-block; padding: 2px 12px; border-radius: 12px; font-size: 10px; font-weight: 600; }
    .type-badge-sale { background: #dbeafe; color: #1d4ed8; }
    .type-badge-purchase { background: #dcfce7; color: #15803d; }
    .barcode-area { text-align: center; padding: 8px 14px; border-top: 1px dashed #eee; border-bottom: 1px dashed #eee; margin: 8px 14px; }
    .barcode-text { font-family: 'Courier New', monospace; font-size: 14px; letter-spacing: 3px; font-weight: 700; color: #1a1a2e; }
    @media print { body { padding: 0; margin: 0; } .receipt { border: none; box-shadow: none; border-radius: 0; } }
  </style>
</head>
<body>
  <div class="receipt">
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
    ${receiptHeader ? `<div class="receipt-header-text">${receiptHeader}</div>` : ''}
    <div class="invoice-info">
      <div class="invoice-info-grid">
        <div class="invoice-info-item"><span class="label">رقم الفاتورة</span><span class="value">${invoice.invoiceNo}</span></div>
        <div class="invoice-info-item"><span class="label">النوع</span><span class="type-badge ${invoice.type === 'sale' ? 'type-badge-sale' : 'type-badge-purchase'}">${typeLabel}</span></div>
        <div class="invoice-info-item"><span class="label">التاريخ</span><span class="value">${formatDate(invoice.createdAt)}</span></div>
        <div class="invoice-info-item"><span class="label">الوقت</span><span class="value">${formatTime(invoice.createdAt)}</span></div>
        <div class="invoice-info-item"><span class="label">${partyLabel}</span><span class="value">${partyName}</span></div>
        <div class="invoice-info-item"><span class="label">المستخدم</span><span class="value">${invoice.user.name}</span></div>
        <div class="invoice-info-item"><span class="label">عدد الأصناف</span><span class="value">${invoice.items.length}</span></div>
        <div class="invoice-info-item"><span class="label">عدد القطع</span><span class="value">${totalItems}</span></div>
      </div>
    </div>
    <div class="items-section">
      <div class="items-header">
        <span style="flex:2;text-align:right;">المنتج</span>
        <span style="flex:0.5;">الكمية</span>
        <span style="flex:1;">السعر</span>
        <span style="flex:1;">الإجمالي</span>
      </div>
      <table><tbody>${itemsRows}</tbody></table>
    </div>
    <div class="barcode-area"><div class="barcode-text">${invoice.invoiceNo}</div></div>
    <div class="totals-section">
      <div class="totals-row"><span class="label">المجموع:</span><span class="value">${fmt(invoice.totalAmount)}</span></div>
      ${invoice.discount > 0 ? `<div class="totals-row"><span class="label">الخصم:</span><span class="value" style="color:#ea580c;">-${fmt(invoice.discount)}</span></div>` : ''}
      <div class="totals-row"><span class="label">المدفوع:</span><span class="value" style="color:#16a34a;">${fmt(invoice.paidAmount)}</span></div>
      ${remaining > 0 ? `<div class="totals-row remaining"><span class="label">المتبقي:</span><span class="value">${fmt(remaining)}</span></div>` : ''}
      <div class="totals-row grand"><span class="label">الصافي:</span><span class="value">${fmt(invoice.totalAmount - invoice.discount)}</span></div>
    </div>
    <div class="footer">
      <div class="footer-text">${receiptFooter}</div>
      <div class="footer-brand">© ${new Date().getFullYear()} ${storeName}</div>
    </div>
  </div>
</body>
</html>`
}

// ── Professional Template ─────────────────────────────────────────────

function generateProfessionalHTML(invoice: InvoiceData, settings: SettingsState): string {
  const { partyName, partyLabel, typeLabel } = getPartyInfo(invoice)
  const storeName = settings.storeName || 'السلطان للمشروبات'
  const storePhone = settings.storePhone || ''
  const storeAddress = settings.storeAddress || ''
  const taxNumber = settings.taxNumber || ''
  const storeLogoUrl = settings.storeLogoUrl || ''
  const receiptHeader = settings.receiptHeaderText || ''
  const receiptFooter = settings.receiptFooterText || 'شكراً لتعاملكم معنا'
  const remaining = invoice.totalAmount - invoice.discount - invoice.paidAmount
  const totalItems = invoice.items.reduce((sum, item) => sum + item.quantity, 0)

  const itemsRows = invoice.items
    .map(
      (item, i) => `
        <tr style="background: ${i % 2 === 0 ? '#ffffff' : '#f0f7ff'};">
          <td style="padding:10px 12px;text-align:center;font-size:12px;border-bottom:1px solid #e8edf2;color:#64748b;font-weight:500;">${i + 1}</td>
          <td style="padding:10px 12px;text-align:right;font-size:13px;border-bottom:1px solid #e8edf2;color:#1e293b;font-weight:500;">${item.product.name}</td>
          <td style="padding:10px 12px;text-align:center;font-size:12px;border-bottom:1px solid #e8edf2;color:#475569;">${item.quantity}</td>
          <td style="padding:10px 12px;text-align:center;font-size:12px;border-bottom:1px solid #e8edf2;color:#475569;">${fmt(item.price)}</td>
          <td style="padding:10px 12px;text-align:center;font-size:12px;border-bottom:1px solid #e8edf2;color:#0f172a;font-weight:700;">${fmt(item.total)}</td>
        </tr>`
    )
    .join('')

  return `<!DOCTYPE html>
<html dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>فاتورة ${invoice.invoiceNo}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@300;400;500;600;700;800&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Noto Sans Arabic', 'Segoe UI', Tahoma, Arial, sans-serif;
      padding: 20px; max-width: 80mm; margin: 0 auto;
      color: #1e293b; background: #fff; font-size: 12px; line-height: 1.5;
    }
    .invoice {
      border: 2px solid #e2e8f0; border-radius: 12px; overflow: hidden;
      box-shadow: 0 4px 12px rgba(0,0,0,0.06);
    }
    /* Colored header bar */
    .pro-header {
      background: linear-gradient(135deg, #1e40af 0%, #3b82f6 50%, #2563eb 100%);
      color: white; padding: 0; position: relative;
    }
    .logo-area {
      display: flex; align-items: center; justify-content: center;
      padding: 20px 16px 12px; gap: 12px;
    }
    .logo-placeholder {
      width: 52px; height: 52px; border-radius: 12px; background: rgba(255,255,255,0.15);
      display: flex; align-items: center; justify-content: center; font-size: 28px;
      border: 2px solid rgba(255,255,255,0.3); backdrop-filter: blur(4px);
    }
    .logo-placeholder img { width: 48px; height: 48px; border-radius: 10px; object-fit: cover; }
    .store-info-header { text-align: center; }
    .pro-store-name { font-size: 22px; font-weight: 800; letter-spacing: 0.5px; text-shadow: 0 1px 2px rgba(0,0,0,0.2); }
    .pro-store-subtitle { font-size: 10px; opacity: 0.8; margin-top: 2px; }
    .pro-store-details {
      display: flex; justify-content: center; gap: 16px; padding: 8px 16px 14px;
      font-size: 9px; opacity: 0.9; flex-wrap: wrap;
    }
    .pro-store-details span { display: flex; align-items: center; gap: 3px; }
    /* Invoice meta bar */
    .invoice-meta {
      display: flex; justify-content: space-between; align-items: center;
      padding: 10px 16px; background: #f8fafc; border-bottom: 1px solid #e2e8f0;
      border-top: 3px solid #1e40af;
    }
    .meta-item { text-align: center; flex: 1; }
    .meta-label { font-size: 8px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; }
    .meta-value { font-size: 12px; font-weight: 700; color: #0f172a; margin-top: 1px; }
    .meta-badge {
      display: inline-block; padding: 3px 10px; border-radius: 8px; font-size: 9px;
      font-weight: 700; letter-spacing: 0.3px;
    }
    .meta-badge-sale { background: #dbeafe; color: #1d4ed8; }
    .meta-badge-purchase { background: #dcfce7; color: #15803d; }
    /* Party info */
    .party-section {
      display: flex; justify-content: space-between; padding: 10px 16px;
      border-bottom: 1px solid #f1f5f9; background: #fafbfc;
    }
    .party-item { font-size: 11px; }
    .party-item .label { color: #94a3b8; font-size: 9px; }
    .party-item .value { font-weight: 600; color: #334155; }
    /* Custom header text */
    .pro-receipt-header {
      text-align: center; padding: 10px 16px; font-size: 11px;
      color: #64748b; border-bottom: 1px dashed #e2e8f0; font-style: italic;
    }
    /* Items table */
    .pro-items-section { padding: 0; }
    .pro-items-header {
      display: grid; grid-template-columns: 0.5fr 2.5fr 0.7fr 1fr 1.2fr;
      background: #1e40af; color: white; padding: 8px 12px;
      font-size: 10px; font-weight: 700; letter-spacing: 0.3px;
    }
    .pro-items-header span { text-align: center; }
    .pro-items-header span:nth-child(2) { text-align: right; }
    .pro-items-body { margin: 0; }
    .pro-items-body tr:hover { background: #eff6ff !important; }
    /* Totals */
    .pro-totals { padding: 12px 16px; background: #f8fafc; border-top: 2px solid #1e40af; }
    .pro-totals-row {
      display: flex; justify-content: space-between; padding: 5px 0;
      font-size: 12px; color: #475569;
    }
    .pro-totals-row .value { font-weight: 600; color: #0f172a; }
    .pro-totals-row.grand {
      font-size: 18px; font-weight: 800; color: #1e40af;
      border-top: 2px solid #e2e8f0; padding-top: 10px; margin-top: 6px;
    }
    .pro-totals-row.remaining { color: #dc2626; font-weight: 700; }
    /* Badges row */
    .badges-row {
      display: flex; justify-content: center; gap: 8px; padding: 10px 16px;
      border-top: 1px dashed #e2e8f0;
    }
    .info-badge {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 3px 10px; border-radius: 6px; font-size: 9px;
      font-weight: 600; background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0;
    }
    /* QR decorative border */
    .qr-border {
      margin: 0 16px 10px; padding: 8px;
      border: 2px solid #e2e8f0; border-radius: 8px;
      text-align: center; position: relative;
    }
    .qr-border::before, .qr-border::after {
      content: ''; position: absolute; width: 10px; height: 10px;
      border: 2px solid #1e40af;
    }
    .qr-border::before { top: -1px; right: -1px; border-left: none; border-bottom: none; border-radius: 0 6px 0 0; }
    .qr-border::after { bottom: -1px; left: -1px; border-right: none; border-top: none; border-radius: 0 0 0 6px; }
    .qr-no {
      font-family: 'Courier New', monospace; font-size: 16px;
      letter-spacing: 4px; font-weight: 700; color: #1e40af;
    }
    /* Footer */
    .pro-footer {
      text-align: center; padding: 14px 16px 16px;
      border-top: 1px solid #e2e8f0; background: #f8fafc;
    }
    .pro-footer-text { font-size: 13px; font-weight: 600; color: #1e40af; margin-bottom: 4px; }
    .pro-footer-brand { font-size: 9px; color: #94a3b8; }

    @media print {
      body { padding: 0; margin: 0; }
      .invoice { border: none; box-shadow: none; border-radius: 0; }
    }
  </style>
</head>
<body>
  <div class="invoice">
    <!-- Colored Header -->
    <div class="pro-header">
      <div class="logo-area">
        <div class="logo-placeholder">
          ${storeLogoUrl ? `<img src="${storeLogoUrl}" alt="Logo" />` : '🏪'}
        </div>
        <div class="store-info-header">
          <div class="pro-store-name">${storeName}</div>
          <div class="pro-store-subtitle">نظام إدارة نقطة البيع</div>
        </div>
      </div>
      <div class="pro-store-details">
        ${storePhone ? `<span>📞 ${storePhone}</span>` : ''}
        ${storeAddress ? `<span>📍 ${storeAddress}</span>` : ''}
        ${taxNumber ? `<span>🏦 ض.ض: ${taxNumber}</span>` : ''}
      </div>
    </div>

    <!-- Invoice Meta Bar -->
    <div class="invoice-meta">
      <div class="meta-item">
        <div class="meta-label">رقم الفاتورة</div>
        <div class="meta-value">${invoice.invoiceNo}</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">النوع</div>
        <div class="meta-badge ${invoice.type === 'sale' ? 'meta-badge-sale' : 'meta-badge-purchase'}">${typeLabel}</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">التاريخ</div>
        <div class="meta-value">${formatDate(invoice.createdAt)}</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">الوقت</div>
        <div class="meta-value">${formatTime(invoice.createdAt)}</div>
      </div>
    </div>

    <!-- Party Info -->
    <div class="party-section">
      <div class="party-item">
        <div class="label">${partyLabel}</div>
        <div class="value">${partyName}</div>
      </div>
      <div class="party-item">
        <div class="label">المستخدم</div>
        <div class="value">${invoice.user.name}</div>
      </div>
      <div class="party-item">
        <div class="label">عدد الأصناف / القطع</div>
        <div class="value">${invoice.items.length} / ${totalItems}</div>
      </div>
    </div>

    ${receiptHeader ? `<div class="pro-receipt-header">${receiptHeader}</div>` : ''}

    <!-- Items Table -->
    <div class="pro-items-section">
      <div class="pro-items-header">
        <span>#</span>
        <span>المنتج</span>
        <span>الكمية</span>
        <span>السعر</span>
        <span>الإجمالي</span>
      </div>
      <table class="pro-items-body">
        <tbody>${itemsRows}</tbody>
      </table>
    </div>

    <!-- QR Border -->
    <div class="qr-border">
      <div class="qr-no">${invoice.invoiceNo}</div>
    </div>

    <!-- Totals -->
    <div class="pro-totals">
      <div class="pro-totals-row"><span>المجموع:</span><span class="value">${fmt(invoice.totalAmount)}</span></div>
      ${invoice.discount > 0 ? `<div class="pro-totals-row"><span>الخصم:</span><span class="value" style="color:#ea580c;">-${fmt(invoice.discount)}</span></div>` : ''}
      <div class="pro-totals-row"><span>المدفوع:</span><span class="value" style="color:#16a34a;">${fmt(invoice.paidAmount)}</span></div>
      ${remaining > 0 ? `<div class="pro-totals-row remaining"><span>المتبقي:</span><span class="value">${fmt(remaining)}</span></div>` : ''}
      <div class="pro-totals-row grand"><span>الصافي:</span><span class="value">${fmt(invoice.totalAmount - invoice.discount)}</span></div>
    </div>

    <!-- Badges -->
    <div class="badges-row">
      ${taxNumber ? `<span class="info-badge">🏦 الرقم الضريبي: ${taxNumber}</span>` : ''}
      <span class="info-badge">💳 ${invoice.type === 'sale' ? 'بيع' : 'شراء'}</span>
      <span class="info-badge">👤 ${invoice.user.name}</span>
    </div>

    <!-- Footer -->
    <div class="pro-footer">
      <div class="pro-footer-text">${receiptFooter}</div>
      <div class="pro-footer-brand">© ${new Date().getFullYear()} ${storeName}</div>
    </div>
  </div>
</body>
</html>`
}

// ── Simple Template ───────────────────────────────────────────────────

function generateSimpleHTML(invoice: InvoiceData, settings: SettingsState): string {
  const { partyName, typeLabel } = getPartyInfo(invoice)
  const storeName = settings.storeName || 'السلطان للمشروبات'
  const receiptFooter = settings.receiptFooterText || 'شكراً لتعاملكم معنا'
  const remaining = invoice.totalAmount - invoice.discount - invoice.paidAmount

  const itemsList = invoice.items
    .map((item) => `  ${item.product.name} × ${item.quantity} = ${fmt(item.total)}`)
    .join('\n')

  const net = invoice.totalAmount - invoice.discount

  return `<!DOCTYPE html>
<html dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>فاتورة ${invoice.invoiceNo}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;500;600&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Noto Sans Arabic', 'Courier New', monospace;
      padding: 8px; max-width: 58mm; margin: 0 auto;
      color: #000; background: #fff; font-size: 11px; line-height: 1.4;
    }
    .simple { padding: 4px 0; }
    .center { text-align: center; }
    .bold { font-weight: 700; }
    .sep { border-top: 1px dashed #999; margin: 6px 0; }
    .sep-double { border-top: 2px solid #000; margin: 8px 0; }
    .row { display: flex; justify-content: space-between; padding: 1px 0; font-size: 11px; }
    .item-line { font-size: 10px; padding: 1px 0; }
    .total-line { font-size: 14px; font-weight: 800; padding: 3px 0; }
    @media print { body { padding: 0; margin: 0; } }
  </style>
</head>
<body>
  <div class="simple">
    <div class="center bold" style="font-size:14px;">${storeName}</div>
    <div class="center" style="font-size:9px;color:#666;">${typeLabel}</div>
    <div class="sep"></div>

    <div class="row"><span>رقم: ${invoice.invoiceNo}</span><span>${formatDate(invoice.createdAt)} ${formatTime(invoice.createdAt)}</span></div>
    <div class="row"><span>${partyName}</span><span>${invoice.user.name}</span></div>
    <div class="sep"></div>

    <div class="item-line">${itemsList}</div>
    <div class="sep"></div>

    <div class="row"><span>المجموع:</span><span>${fmt(invoice.totalAmount)}</span></div>
    ${invoice.discount > 0 ? `<div class="row"><span>الخصم:</span><span>-${fmt(invoice.discount)}</span></div>` : ''}
    <div class="row"><span>المدفوع:</span><span>${fmt(invoice.paidAmount)}</span></div>
    ${remaining > 0 ? `<div class="row" style="color:#c00;font-weight:700;"><span>المتبقي:</span><span>${fmt(remaining)}</span></div>` : ''}
    <div class="sep-double"></div>
    <div class="row total-line"><span>الصافي:</span><span>${fmt(net)}</span></div>
    <div class="sep"></div>
    <div class="center" style="font-size:10px;color:#666;">${receiptFooter}</div>
  </div>
</body>
</html>`
}

// ── Main Export ───────────────────────────────────────────────────────

/**
 * Generate a full HTML page for printing an invoice.
 *
 * @param invoice      - The invoice data object
 * @param settings     - The app settings (from Zustand store)
 * @param templateType - 'classic' | 'professional' | 'simple'
 * @returns Complete HTML string ready for window.open/print
 */
export function generateInvoiceHTML(
  invoice: InvoiceData,
  settings: SettingsState,
  templateType: TemplateType = 'classic'
): string {
  switch (templateType) {
    case 'professional':
      return generateProfessionalHTML(invoice, settings)
    case 'simple':
      return generateSimpleHTML(invoice, settings)
    case 'classic':
    default:
      return generateClassicHTML(invoice, settings)
  }
}

/**
 * Generate a multi-invoice HTML for bulk printing (one per page).
 */
export function generateBulkInvoiceHTML(
  invoices: InvoiceData[],
  settings: SettingsState,
  templateType: TemplateType = 'classic'
): string {
  const pages = invoices.map((inv) => {
    const html = generateInvoiceHTML(inv, settings, templateType)
    // Extract the <body> content from each generated HTML
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i)
    return bodyMatch ? bodyMatch[1] : ''
  }).join('<div style="page-break-after:always;"></div>')

  // Build a single page with page breaks
  const firstTemplate = generateInvoiceHTML(invoices[0], settings, templateType)
  const headMatch = firstTemplate.match(/<head[^>]*>([\s\S]*)<\/head>/i)
  const headContent = headMatch ? headMatch[1] : ''

  // Add page-break CSS
  const extraCSS = `
    @media print {
      .page-break { page-break-after: always; }
      .page-break:last-child { page-break-after: auto; }
    }
  `

  const styledHead = headContent.replace('</style>', `${extraCSS}</style>`)

  return `<!DOCTYPE html>
<html dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>طباعة فواتير</title>
  ${styledHead}
</head>
<body>
  ${pages}
  <div class="page-break"></div>
</body>
</html>`
}
