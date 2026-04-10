---
Task ID: 9-B
Agent: full-stack-developer
Task: Add Product Variants support (size, flavor, packaging)

Work Log:
- Added `ProductVariant` model to Prisma schema with fields: id, productId, name, sku (unique), barcode, costPrice, sellPrice, stock, isActive, createdAt
- Added `variants ProductVariant[]` relation to Product model with onDelete: Cascade
- Ran `bun run db:push` — schema synced successfully
- Created `/api/product-variants/route.ts` with full CRUD:
  - GET: List variants by productId
  - POST: Create variant with SKU uniqueness check and product existence validation
  - PUT: Update variant fields (name, sku, barcode, costPrice, sellPrice, stock, isActive)
  - DELETE: Remove variant by id
- Enhanced Products API (`/api/products/route.ts`): Added `_count: { select: { variants: true } }` to GET include
- Updated Zustand store (`src/store/app-store.ts`):
  - Added `variantId?: string` field to CartItem interface
  - Updated `addToCart` to use composite key (variantId || productId) for deduplication
  - Updated `removeFromCart(productId, variantId?)` and `updateCartQuantity(productId, quantity, variantId?)` signatures
- Enhanced Inventory Screen (`src/screens/inventory-screen.tsx`):
  - Added `Layers` and `Save` icons import
  - Added `ProductVariant` and `VariantFormData` interfaces
  - Added variants dialog state (8 new state variables)
  - Added variants handlers: openVariantsDialog, openAddVariantDialog, openEditVariantDialog, handleVariantSubmit, handleDeleteVariant
  - Added "المتغيرات" button (Layers icon, violet color) to each product's action column
  - Added full Variants Dialog with:
    - Product name header with description
    - Variant list showing: name, SKU, cost price, sell price, stock (with chip-danger/chip-success)
    - Edit/delete actions per variant
    - Inline add/edit form with 6 fields (name, SKU, barcode, cost price, sell price, stock)
    - Dashed "إضافة متغير" button
- Enhanced POS Screen (`src/screens/pos-screen.tsx`):
  - Added `ProductVariant` interface and `_count?: { variants: number }` to Product type
  - Added variant selector state (4 new state variables)
  - Modified `handleProductClick` to check for variants: if product has variants (> 0), show variant selector dialog instead of quick view
  - Added `handleVariantSelect` handler: adds variant to cart with name format "المنتج (المتغير)", variantId, variant's sellPrice and stock
  - Added Variant Selector Dialog: lists active variants with name, SKU, stock, price; click to add; out-of-stock disabled state
  - Added Escape key support for variant selector dialog
  - Variant items in cart show full name "المنتج (المتغير)"

Files Modified:
- `prisma/schema.prisma` — Added ProductVariant model + relation
- `src/app/api/product-variants/route.ts` — NEW: CRUD API route
- `src/app/api/products/route.ts` — Added _count for variants
- `src/store/app-store.ts` — Updated CartItem, addToCart, removeFromCart, updateCartQuantity
- `src/screens/inventory-screen.tsx` — Added variants dialog, button, handlers
- `src/screens/pos-screen.tsx` — Added variant selector dialog, modified product click

Stage Summary:
- Product Variants fully functional across Inventory and POS screens
- API supports full CRUD with SKU uniqueness validation
- Cart system updated to track variant-based items with composite keys
- Inventory screen has dedicated variants management dialog
- POS screen shows variant selector when product has variants
- `bun run lint` → 0 errors
- `bun run db:push` → schema synced
- All existing functionality preserved, RTL layout intact
