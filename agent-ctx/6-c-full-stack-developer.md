# Task 6-c: Inventory Adjustments & Stock History

## Files Modified
1. **prisma/schema.prisma** — Added `StockAdjustment` model and `stockAdjustments` relation on `Product`
2. **src/app/api/stock-adjustments/route.ts** — New API endpoint (GET/POST)
3. **src/screens/inventory-screen.tsx** — Enhanced with adjustment dialog, history panel, quick-adjust buttons

## Summary
- Added `StockAdjustment` model to track all inventory changes (addition, subtraction, correction, return, initial)
- Created API with GET (filtered/paginated) and POST (transactional stock update)
- Inventory screen now has: "سجل التعديلات" button, Stock Adjustment Dialog (per-product), Stock History Dialog (with filters, pagination, CSV export), quick-adjust PackagePlus button on each product row
- All text Arabic, RTL layout, shadcn/ui components, zero lint errors
