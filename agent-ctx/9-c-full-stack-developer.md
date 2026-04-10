# Task 9-c: Customer Statements Report & Quick Stats Widget Enhancement

## Agent: full-stack-developer

## Summary of Changes

### Feature 1: Customer Statements Report

#### New Files Created:
1. **`/src/app/api/customer-statement/route.ts`** — GET API endpoint
   - Query params: `customerId`, `startDate`, `endDate`
   - Returns: customer info, all transactions (invoices, returns, payments), opening balance (debt before startDate), closing balance, running balance per transaction
   - Opening balance computed by aggregating all sales invoices minus payments before startDate
   - Transactions sorted chronologically with recalculated running balance
   - Returns structured data: customer, period, summary, transactions array

2. **`/src/screens/customer-statement-screen.tsx`** — Full screen component
   - Customer selector dropdown (all customers with debt shown)
   - Date range picker (start/end) defaulting to current month
   - "عرض الكشف" generate button
   - 4 summary cards: Opening Balance (blue), Total Debits (red), Total Credits (green), Closing Balance (amber/emerald dynamic)
   - Stats row showing invoice count, return count, payment count, period
   - Full transactions table with: Date, Type (badge), Reference, Details, Debit, Credit, Balance (running)
   - Type badges: invoice (blue), payment (green), return (amber)
   - Opening balance row + closing balance row highlighted
   - Print button: opens new window with professional print layout (RTL, Arabic, company header)
   - Export CSV button using existing export-csv utility
   - Loading skeletons, empty states, selected customer quick info bar
   - All text in Arabic, uses animate-fade-in-up, card-hover, table-enhanced, glass-card, btn-ripple CSS classes

#### Files Modified:
3. **`/src/store/app-store.ts`** — Added `'customer-statement'` to Screen union type

4. **`/src/components/erp/app-layout.tsx`** — Navigation registration:
   - Imported `CustomerStatementScreen`
   - Added `'customer-statement': 'كشف حساب عميل'` to screenLabels
   - Added nav item with FileText icon, adminOnly: true
   - Added `case 'customer-statement': return <CustomerStatementScreen />` in renderScreen

### Feature 2: Quick Stats Widget Enhancement

#### Files Modified:
5. **`/src/app/api/quick-stats/route.ts`** — Enhanced with 5 new stats:
   - `totalProducts`: count of active products
   - `totalSuppliers`: count of active suppliers  
   - `totalDebt`: sum of all customer debts (aggregate)
   - `monthlySales`: current month total sales
   - `totalExpenses`: current month total expenses
   - All existing fields preserved for backward compatibility

6. **`/src/components/quick-stats-panel.tsx`** — Enhanced UI:
   - Added new icons: Truck, Wallet, CalendarDays, CheckCircle2
   - Added 5 new MetricRow displays:
     - "عدد المنتجات" (Products count) — cyan theme
     - "عدد الموردين" (Suppliers count) — orange theme
     - "مبيعات الشهر" (Monthly sales) — indigo theme with green trend
     - "مصروفات الشهر" (Monthly expenses) — rose theme
     - "إجمالي مديونية العملاء" (Total customer debt) — red when >0, green when 0, with dynamic icon (AlertTriangle vs CheckCircle2)

## Verification:
- `bun run lint` → 0 errors
- No prisma/schema.prisma modifications (all needed models already exist)
- All text in Arabic
- All components use 'use client' directive
- Uses existing shadcn/ui components (Button, Card, Input, Select)
- Uses existing export-csv utility
- Uses existing useCurrency hook
