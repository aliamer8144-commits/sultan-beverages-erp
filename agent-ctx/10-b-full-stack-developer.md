# Task 10-b: Stock Alert Notifications & Product Search API

**Agent:** full-stack-developer
**Status:** ✅ Completed
**Lint:** 0 errors

---

## Summary of Changes

### Feature 1: Stock Alert Notifications System

#### 1. API: `/src/app/api/stock-alerts/route.ts`
- **GET endpoint** that returns stock alerts for all active products
- Fetches all active products and filters where `quantity <= minQuantity`
- Classifies each product as:
  - `"out"` — quantity is 0 (out of stock)
  - `"low"` — quantity > 0 but <= minQuantity (low stock)
- Returns: product id, name, quantity, minQuantity, price, category name, status, deficit
- Includes a `summary` object with `total`, `outOfStock`, and `lowStock` counts
- Results sorted by quantity ascending (most critical first)
- Used application-level filtering since Prisma doesn't natively support field-to-field comparison

#### 2. Component: `/src/components/stock-alerts-widget.tsx`
- `'use client'` component with a compact bell-button design
- **Color-coded alerts**: Red (`destructive`) for out-of-stock, Amber for low stock
- **Auto-refresh** every 60 seconds using `setInterval`
- **Badge system**: Shows "نفذت" (out) count and "منخفضة" (low) count in the header
- **Loading state**: Spinner animation while fetching
- **Empty state**: Green Package icon with "جميع المنتجات بمخزون كافٍ" message
- **Staggered animations**: Each alert item fades in with a 50ms delay using `animate-fade-in-up`
- **Deficit display**: Shows how many units are needed (e.g., "تحتاج 5 وحدة")
- **"عرض الكل في المخزون"** button navigates to the inventory screen
- Uses CSS classes: `badge-ping`, `badge-danger`, `badge-warning`, `animate-fade-in-up`
- Closes popover on item click before navigation

#### 3. Integration: `/src/components/erp/app-layout.tsx`
- **Replaced** the legacy `NotificationBell` component (which used `/api/products?lowStock=true` with hardcoded `lte: 5`) with the new `StockAlertsWidget`
- Removed unused imports: `Badge`, `ScrollArea`, `Popover*`, `Bell`, `AlertTriangle`, `PackageSearch`, `useCallback`, `LowStockProduct` interface
- Widget placed in the header bar between LiveClock and ThemeToggle

---

### Feature 2: Product Search Advanced API

#### API: `/src/app/api/products/search/route.ts`
- **GET endpoint** at `/api/products/search` with comprehensive query parameters:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `q` | string | "" | Full-text search (case-insensitive, partial match on name) |
| `categoryId` | string | "" | Filter by category ID |
| `minPrice` | number | - | Minimum price filter |
| `maxPrice` | number | - | Maximum price filter |
| `inStock` | "true"/"false" | - | Filter stock availability |
| `sortBy` | string | "newest" | Sort: `price_asc`, `price_desc`, `name_asc`, `name_desc`, `quantity_asc`, `quantity_desc`, `newest` |
| `page` | number | 1 | Page number (min 1) |
| `limit` | number | 20 | Items per page (1-100) |

- **Response format**:
  ```json
  {
    "success": true,
    "data": [...products],
    "pagination": {
      "total": 50,
      "page": 1,
      "limit": 20,
      "totalPages": 3,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
  ```
- Each product includes: id, name, price, costPrice, quantity, minQuantity, barcode, image, category object, variantCount, createdAt, updatedAt
- Uses `Prisma.ProductWhereInput` and `Prisma.ProductOrderByWithRelationInput` for type-safe queries
- Parallel execution of `findMany` + `count` using `Promise.all`

---

### Files Modified/Created

| File | Action |
|------|--------|
| `src/app/api/stock-alerts/route.ts` | **Created** — Stock alerts GET endpoint |
| `src/components/stock-alerts-widget.tsx` | **Created** — Stock alerts widget component |
| `src/app/api/products/search/route.ts` | **Created** — Advanced product search API |
| `src/components/erp/app-layout.tsx` | **Modified** — Replaced NotificationBell with StockAlertsWidget, cleaned unused imports |

### Schema Changes
- ✅ **No changes** to `prisma/schema.prisma`
