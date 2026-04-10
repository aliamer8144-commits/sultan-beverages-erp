# Task: Feature-BatchOperations

## Files Modified:

### 1. `src/app/api/products/route.ts`
- **Added PATCH endpoint** for batch product operations
- Accepts `{ ids, priceChangeType, priceChangeValue, categoryId, isActive }`
- Supports two price modes: `fixed` (set all to one price) and `percentage` (increase/decrease by %)
- For percentage mode, fetches current prices, calculates new prices, and updates via Promise.all
- For fixed/category/status, uses `db.product.updateMany` for efficiency
- Logs all batch operations to audit log via `logAction()` with action type `batch_update`
- Returns `{ success: true, data: { count } }` with number of updated products

### 2. `src/screens/inventory-screen.tsx`
- **Added imports**: `Checkbox` from shadcn/ui, `CheckSquare`, `DollarSign`, `TagToggle`, `ListFilter` from lucide-react
- **Added state**:
  - `selectedIds: Set<string>` - tracks selected product IDs
  - `batchSubmitting` - loading state for batch operations
  - `batchPriceOpen/Type/Value/Dir` - price change dialog state
  - `batchCategoryOpen/NewCategoryId` - category change dialog state
  - `batchStatusOpen/NewStatus` - status toggle dialog state
  - `batchDeleteOpen` - batch delete confirmation state
- **Added handlers**:
  - `toggleSelectProduct(id)` - toggle individual product selection
  - `toggleSelectAll()` - toggle all visible products (with indeterminate support)
  - `clearSelection()` - clear all selections
  - `handleBatchPriceChange()` - PATCH with fixed or percentage price
  - `handleBatchCategoryChange()` - PATCH with new categoryId
  - `handleBatchStatusToggle()` - PATCH with isActive flag
  - `handleBatchDelete()` - DELETE each selected product via Promise.all
- **Added UI elements**:
  - Checkbox column in table header with "تحديد الكل" (Select All)
  - Checkbox on each row with `bg-primary/5` highlight when selected
  - Floating action bar (fixed bottom, z-50, glass-card styling) with:
    - Count badge showing number of selected products
    - "تغيير السعر" button (Change Price)
    - "تغيير التصنيف" button (Change Category)
    - "تعديل الحالة" button (Toggle Status)
    - "حذف المحدد" button (Delete Selected) in destructive styling
    - "إلغاء التحديد" button (Clear selection)
    - Horizontally scrollable on mobile with `scrollbar-none`
  - **Batch Price Change Dialog**: Two modes (سعر ثابت/نسبة مئوية), percentage mode has +/- toggle, shows preview of new prices in a scrollable glass-card, fixed mode shows summary text
  - **Batch Category Change Dialog**: Shows selected products as badges, category dropdown selector
  - **Batch Status Toggle Dialog**: AlertDialog with activate/deactivate radio options, color-coded (green for activate, red for deactivate)
  - **Batch Delete Dialog**: AlertDialog with destructive styling, shows product names as badges

### 3. `src/screens/settings-screen.tsx` (pre-existing fix)
- Added missing `Badge` import that was causing lint error

## Verification:
- `bun run lint` → 0 errors
- All text in Arabic (RTL)
- Responsive: floating bar scrollable on mobile
- Uses glass-card, btn-ripple, card-hover CSS classes as specified
