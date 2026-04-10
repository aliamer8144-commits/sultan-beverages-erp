# Task ID: 11 - Return/Refund System Implementation

## Agent: full-stack-developer

## Work Log

### Step 1: Prisma Schema Update
- Added `Return` model with fields: id, returnNo (unique), invoiceId, productId, quantity, unitPrice, totalAmount, reason, status (pending/approved/rejected), userId, userName, timestamps
- Added `returns Return[]` relation to `Invoice` model
- Added `returns Return[]` relation to `Product` model
- Ran `bunx prisma db push --force-reset` to apply schema

### Step 2: API Route `/api/returns/route.ts`
- **GET**: Paginated returns with filters (status, date range, search by return number). Returns `{ success, data, total, page, totalPages }`
- **POST**: Creates new return with Prisma transaction:
  1. Validates invoice exists and is a sale type
  2. Generates unique return number (format: `RET-YYYYMMDD-XXX`)
  3. Creates Return record (auto-approved)
  4. Restores product stock (increment quantity)
  5. Reduces customer debt if applicable
- **PATCH**: Updates return status (approve/reject). When approved: restores stock + reduces customer debt. When rejected: no action.

### Step 3: Returns Screen (`/src/screens/returns-screen.tsx`)
- **Header**: RotateCcw icon, title "المرتجعات", subtitle "إدارة عمليات إرجاع المنتجات"
- **Stats Bar**: 4 stat cards (today total, pending count, approved count, today amount)
- **Filter Bar**: Search input, status dropdown (all/pending/approved/rejected), date range pickers, clear filters button
- **Returns Table**: table-enhanced class with columns: return number, invoice number, product, quantity, amount, reason, status badge, actions (approve/reject)
- **New Return Dialog**: Select invoice → show items → select product → enter quantity (max validated) → enter reason → submit
- **Empty State**: Arabic text with PackageOpen icon
- **Pagination**: Page navigation for large result sets
- CSS classes used: animate-fade-in-up, card-hover, glass-card, btn-ripple, shimmer, input-glass, empty-state, stat-card-blue/green/red, number-animate-in, stagger-children

### Step 4: Screen Registration
- Added `'returns'` to `Screen` type union in `app-store.ts`
- Imported `ReturnsScreen` and `RotateCcw` in `app-layout.tsx`
- Added `'returns': 'المرتجعات'` to `screenLabels` map
- Added nav item: `{ id: 'returns', label: 'المرتجعات', icon: RotateCcw, adminOnly: true }` (after invoices)
- Added `case 'returns': return <ReturnsScreen />` in renderScreen switch

### Step 5: Return Button on Invoices Screen
- Added "إرجاع" (return) button next to each sale invoice in the actions row
- Button only shows for `type === 'sale'` invoices
- Clicking opens a return dialog showing:
  - Product selector dropdown from invoice items
  - Quantity input with max validation
  - Running total display
  - Optional reason textarea
  - Submit button calling Returns API
- Added imports: RotateCcw, Textarea, Select components, DialogDescription
- Added state: returnOpen, returnInvoice, returnProductId, returnProductItem, returnQuantity, returnReason, returnSubmitting

## Files Created
- `/home/z/my-project/src/app/api/returns/route.ts` - Returns API (GET/POST/PATCH)
- `/home/z/my-project/src/screens/returns-screen.tsx` - Returns management screen

## Files Modified
- `/home/z/my-project/prisma/schema.prisma` - Added Return model + relations
- `/home/z/my-project/src/store/app-store.ts` - Added 'returns' to Screen type
- `/home/z/my-project/src/components/erp/app-layout.tsx` - Registered screen + nav item
- `/home/z/my-project/src/screens/invoices-screen.tsx` - Added return button + dialog

## Verification
- `bun run lint` → 0 errors
- `bun run db:push` → Schema applied successfully
- Dev server running clean on localhost:3000
- All existing functionality preserved
