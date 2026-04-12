# Task 2-c: Migrate inventory dialog files to use validation hooks

## Summary of Changes

### 1. `src/screens/inventory/category-manager.tsx`

**Schema used:** `createCategorySchema` (`{ name, icon }`)

**Changes:**
- Added imports: `useZodForm` from `@/hooks/use-zod-form`, `createCategorySchema` from `@/lib/validations`
- Removed imports: `toast` from `sonner` (no longer needed — validation errors are field-level now)
- Replaced `catName` (useState) and `catSubmitting` (useState) with a single `useZodForm` hook instance (`catForm`)
- `openAddCatDialog()`: calls `catForm.reset()` instead of `setCatName('')`
- `openEditCatDialog(cat)`: calls `catForm.reset({ name: cat.name, icon: cat.icon })` instead of `setCatName(cat.name)`
- `handleCatSubmit`: wrapped with `catForm.handleSubmit(async (values) => {...})` — removes manual `if (!catName.trim())` check and `setCatSubmitting` management
- Input: `value` bound to `catForm.values.name`, `onChange` uses `catForm.setValue('name', ...)`
- Added error border: `border-destructive focus-visible:ring-destructive` when `catForm.errors.name` is set
- Added error display: `<p className="text-sm text-destructive">{catForm.errors.name}</p>`
- Button disabled states: `catForm.isSubmitting` replaces `catSubmitting`
- All existing UI (list display, edit, delete, icons, classes) preserved exactly

### 2. `src/screens/inventory/product-form-dialog.tsx`

**Schema used:** `createProductSchema` (`{ name, categoryId, price, costPrice, quantity, minQuantity, barcode, image }`)

**Changes:**
- Added imports: `useZodForm` from `@/hooks/use-zod-form`, `createProductSchema` from `@/lib/validations`
- Removed imports: `useState` from react (no longer needed for form state), `ProductFormData` from types
- Replaced `useState<ProductFormData>` and `useState<boolean>` (submitting) with a single `useZodForm` hook (`form`)
- `useEffect` reset: uses `form.reset(...)` for editing values or `form.reset()` for empty form
- Removed `useCallback` wrapper from `handleImageUpload` (React Compiler handles memoization; `useCallback` conflicted with inferred deps)
- Image upload handler (`handleImageUpload`): uses `form.setValue('image', compressed)` instead of `setForm(prev => ({...prev, image: compressed}))`
- `handleSubmit`: wrapped with `form.handleSubmit(async (values) => {...})` — removes all 3 manual `toast.error` checks (name, categoryId, price)
- All inputs bound to `form.values.xxx` with `form.setValue('xxx', ...)` onChange
- Error display added under: **name**, **categoryId** (Select trigger), **price**
- Error borders added on: name Input, price Input, categoryId SelectTrigger
- Image section: `form.values.image` used for conditional rendering and img src
- Image remove button: `form.setValue('image', '')` replaces `setForm({...form, image: ''})`
- Button disabled states: `form.isSubmitting` replaces `submitting`
- Parsed values from Zod have coerced numbers for price/costPrice/quantity/minQuantity
- Image upload validation (file type, size) kept as manual `toast.error` checks
- All existing UI (image upload zone, drag-drop, compression, classes) preserved exactly

### 3. `src/screens/inventory/stock-adjustment-dialog.tsx`

**Schema used:** Inline `adjustmentFormSchema` (see note below)

**Note on schema choice:** The predefined `createStockAdjustmentSchema` uses backend type values (`in`, `out`, `adjustment`, `sale`, `purchase`, `return`), but the form UI uses different radio button values (`addition`, `subtraction`, `correction`). Since the API accepts the UI values directly, an inline schema matching the form's actual data shape was used instead.

**Changes:**
- Added imports: `z` from `zod`, `useZodForm` from `@/hooks/use-zod-form`
- Removed imports: `useState` from react, `toast` from sonner, `AdjustmentFormData` from types, `emptyAdjustmentForm` from types
- Created inline schema `adjustmentFormSchema` with fields: `productId`, `type` (enum of UI values), `quantity` (coerce.number.int.positive), `reason` (string.min(1)), `reference` (string.max(100))
- Replaced `useState<AdjustmentFormData>` and `useState<boolean>` with `useZodForm`
- `useEffect` reset: calls `adjustForm.reset({ ...defaults, productId: product?.id || '' })`
- `handleAdjustSubmit`: wrapped with `adjustForm.handleSubmit(async (values) => {...})` — removes manual checks for quantity and reason
- All inputs bound to `adjustForm.values.xxx` with `adjustForm.setValue('xxx', ...)` onChange
- Error display added under: **quantity**, **reason**
- Error borders added on: quantity Input, reason Input
- RadioGroup value/onChange bound to `adjustForm.values.type` / `adjustForm.setValue('type', ...)`
- Preview calculation uses `adjustForm.values.quantity` and `adjustForm.values.type`
- Button disabled states: `adjustForm.isSubmitting` replaces `adjustSubmitting`
- All existing UI (product info card, radio buttons with icons, preview calculation, reference field) preserved exactly

### 4. `src/screens/inventory/product-variants-dialog.tsx`

**Schema used:** `createProductVariantSchema` (`{ productId, name, sku, barcode, costPrice, sellPrice, stock }`)

**Changes:**
- Added imports: `useZodForm` from `@/hooks/use-zod-form`, `createProductVariantSchema` from `@/lib/validations`
- Removed imports: `toast` from sonner, `VariantFormData` from types (no longer needed for useState type)
- Removed: `useState<VariantFormData>` and `useState<boolean>` (variantSubmitting)
- Added `useZodForm` with `createProductVariantSchema` and default values including `productId: ''`
- `openAddVariantDialog()`: calls `variantForm.reset({ ...defaults, productId: product?.id || '' })`
- `openEditVariantDialog(variant)`: calls `variantForm.reset({ productId, name, sku, barcode, costPrice, sellPrice, stock })`
- `handleVariantSubmit`: wrapped with `variantForm.handleSubmit(async (values) => {...})` — removes manual `if (!variantForm.name.trim())` check
- All inputs bound to `variantForm.values.xxx` with `variantForm.setValue('xxx', ...)` onChange
- Error display added under: **name** field
- Error border added on: name Input
- Submit button disabled: `variantForm.isSubmitting` replaces `variantSubmitting`
- Submit button also disabled when `!variantForm.values.name.trim()` (preserves original behavior)
- All existing UI (variants list, edit/delete buttons, currency formatting, form layout) preserved exactly

## Validation Infrastructure Used

| Hook | File | Purpose |
|------|------|---------|
| `useZodForm` | category-manager.tsx | Self-contained form with `{ name, icon }` |
| `useZodForm` | product-form-dialog.tsx | Self-contained form with 8 fields |
| `useZodForm` | stock-adjustment-dialog.tsx | Self-contained form with inline schema |
| `useZodForm` | product-variants-dialog.tsx | Self-contained form with 7 fields |

## Key Design Decisions

1. **`useZodForm` chosen over `useFormValidation`** for all files since all are self-contained dialog forms that manage their own state
2. **Inline schema for stock adjustment** — `createStockAdjustmentSchema` type enum values don't match UI radio button values; using it would require complex type mapping or change the UI
3. **Image validation kept manual** — file type/size checks happen before form data, with toast messages; Zod schema validates the base64 data URL string
4. **`useCallback` removed from product form** — React Compiler detected dependency mismatch; removing manual memoization lets the compiler handle it automatically
5. **`z.coerce.number()` handles string→number** — form inputs use string values but schemas coerce to numbers for validation and API payloads
