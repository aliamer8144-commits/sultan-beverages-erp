# Task 12 - Add Supplier Payment Tracking to the ERP

## Agent: full-stack-developer

## Summary
Successfully added supplier payment tracking system to the ERP, mirroring the existing customer payment tracking feature.

## Files Created
1. **`/home/z/my-project/src/app/api/supplier-payments/route.ts`** — New API endpoint
   - GET: Returns all payments for a specific supplier with totalPaid sum
   - POST: Creates a supplier payment in a Prisma transaction, distributes payment across purchase invoices (oldest first)

## Files Modified
1. **`/home/z/my-project/prisma/schema.prisma`**
   - Added `SupplierPayment` model (id, supplierId, amount, method, notes, timestamps)
   - Added `supplierPayments SupplierPayment[]` relation to `Supplier` model

2. **`/home/z/my-project/src/app/api/suppliers/route.ts`**
   - Enhanced GET endpoint to compute balance fields for each supplier:
     - `totalPurchases`: sum of purchase invoice totals (minus discounts)
     - `totalPaid`: sum of supplier payment amounts
     - `remainingBalance`: totalPurchases - totalPaid

3. **`/home/z/my-project/src/screens/purchases-screen.tsx`**
   - Updated `Supplier` interface with `totalPurchases`, `totalPaid`, `remainingBalance` fields
   - Added 3 stats cards: total suppliers, total outstanding, suppliers with balance
   - Enhanced supplier table with 3 new columns (purchases, paid, remaining)
   - Added "تسجيل دفعة" (Record Payment) button for suppliers with outstanding balance
   - Added "سجل الدفعات" (Payment History) button for all suppliers
   - Created Payment Dialog with:
     - Supplier info + remaining balance display
     - Amount input with quick-fill buttons (ربع، النصف، الكل)
     - Payment method selector: نقدي, تحويل, شيك
     - Notes textarea
   - Created Payment History Dialog with styled payment cards
   - Enhanced purchase invoice tab: shows supplier remaining balance in supplier selector
   - Used CSS classes: `animate-fade-in-up`, `card-hover`, `glass-card`, `btn-ripple`, `badge-danger`, `badge-active`, `table-enhanced`, `input-glass`, `empty-state`, `stat-card-gradient`, `stat-card-red`, `number-animate-in`, `tabular-nums`, `stagger-children`

## Verification
- `bun run lint` → 0 errors
- `bun run db:push` → Schema synced successfully
- Dev server running clean on localhost:3000
