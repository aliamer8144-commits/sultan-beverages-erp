# Task 4-b: Form Validation Migration to Zod + useFormValidation

## Status: Complete

## Files Modified
1. `src/screens/inventory-screen.tsx`
2. `src/screens/stock-adjustments-screen.tsx`

---

## inventory-screen.tsx Changes

### New Imports
- `z` from `zod`
- `useFormValidation` from `@/hooks/use-form-validation`

### Inline Schemas Created
- `batchPriceSchema` — validates `priceChangeValue` is a positive number
- `batchCategorySchema` — validates `categoryId` is a non-empty string

### Validation Hooks Added
- `batchPriceValidation = useFormValidation({ schema: batchPriceSchema })`
- `batchCategoryValidation = useFormValidation({ schema: batchCategorySchema })`

### Handlers Migrated
| Handler | Before | After |
|---|---|---|
| `handleBatchPriceChange` | `toast.error('يرجى إدخال قيمة صحيحة')` | `batchPriceValidation.validate()` |
| `handleBatchCategoryChange` | `toast.error('يرجى اختيار التصنيف')` | `batchCategoryValidation.validate()` |

### Field-Level Error Display Added
- **Batch Price Dialog**: Error message with AlertTriangle icon below value input, `border-destructive` on invalid input
- **Batch Category Dialog**: Error message with AlertTriangle icon below select, `border-destructive` on invalid select

### Error Clearing
- `clearFieldError` called on input `onChange` handlers
- `clearAllErrors` called when dialogs open/close and on successful submit

### Toast Errors Kept (non-field)
- `toast.error('لا توجد بيانات للتصدير')` — export validation, not form field

---

## stock-adjustments-screen.tsx Changes

### New Imports
- `z` from `zod`
- `useFormValidation` from `@/hooks/use-form-validation`
- `createStockAdjustmentSchema` from `@/lib/validations`

### Inline Schema Created
- `createAdjustmentFormSchema = createStockAdjustmentSchema.extend({ quantity: ... })` — extends the shared schema with `positive()` instead of `min(0)` for stricter validation

### Validation Hook Added
- `adjValidation = useFormValidation({ schema: createAdjustmentFormSchema })`

### Handler Migrated (`handleSubmitAdjustment`)
| Check | Before | After |
|---|---|---|
| `!selectedProductId \|\| !adjType \|\| !adjQuantity \|\| adjQuantity <= 0` | `toast.error(...)` | `adjValidation.validate()` |
| `adjType === 'adjustment' && adjQuantity < 0` | `toast.error(...)` | `adjValidation.setErrorMap({ quantity: ... })` |
| `adjType === 'out' && adjQuantity > selectedProduct.quantity` | `toast.error(...)` | `adjValidation.setErrorMap({ quantity: ... })` |

### Field-Level Error Display Added
- **Product Select**: `border-destructive` on trigger + error message below
- **Quantity Input**: `border-destructive` on input + error message below (supersedes inline preview warning when validation error is active)

### Error Clearing
- `clearFieldError('productId')` + `clearFieldError('quantity')` on product select change
- `clearFieldError('quantity')` on quantity input change
- `clearAllErrors()` on dialog open/close and successful submit

### Toast Errors Kept (non-field)
- `toast.error('يرجى تسجيل الدخول أولاً')` — user auth check
- `toast.error('حدث خطأ أثناء تحميل تعديلات المخزون')` — API/network error
- `toast.error('لا توجد بيانات للتصدير')` — export validation

---

## Validation Summary

| Screen | Schema Validations Migrated | Cross-Field Checks | Toast Errors Kept |
|---|---|---|---|
| inventory-screen | 2 (batch price, batch category) | 0 | 1 |
| stock-adjustments-screen | 1 (productId, type, quantity) | 2 (adjustment type, stock availability) | 3 |

## Checks
- `npx tsc --noEmit` — passed (no errors)
- `bun run lint` — passed (no errors)
- All existing UI preserved unchanged
- No test files created (per instructions)
