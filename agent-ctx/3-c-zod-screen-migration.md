# Task 3-c: Migrate customer-statement-screen & product-variants-screen to Zod Validation

## Summary

Successfully migrated 2 main screen files from manual `toast.error()` validation to Zod schema-based validation with field-level error display. TypeScript and ESLint pass cleanly, dev server running with no errors.

---

## 1. `customer-statement-screen.tsx`

### What changed:
- **Added imports**: `z` from `zod` and `useFormValidation` from hooks
- **Created schema**: `statementFormSchema` — `z.object({ customerId: z.string().min(1, 'يرجى اختيار عميل') })`
- **Added hook**: `useFormValidation({ schema: statementFormSchema })` for the "generate statement" form
- **Replaced** manual `if (!selectedCustomerId) { toast.error('يرجى اختيار عميل'); return }` with `statementValidation.validate({ customerId: selectedCustomerId })`
- **Added** error border on `SelectTrigger`: `border-destructive focus:ring-destructive` when error present
- **Added** `statementValidation.clearFieldError('customerId')` on Select `onValueChange`
- **Added** error paragraph `<p className="text-xs text-destructive">` under the customer selector
- **Preserved**: All toast.error calls for non-field errors (network failures, export errors), all existing UI

---

## 2. `product-variants-screen.tsx`

### What changed:
- **Added imports**: `z` from `zod` and `useFormValidation` from hooks
- **Removed** `import { toast } from 'sonner'` (no longer needed after removing all manual toast.error calls)
- **Created 2 inline schemas**:
  - `variantFormSchema`: validates `name` (min 1 char) and `sellPrice` (non-empty, numeric, > 0)
  - `stockAdjustSchema`: validates `adjustment` (non-empty, numeric, ≠ 0) via `.refine()`
- **Added 2 hooks**: `variantValidation` and `quickAdjustValidation`
- **Variant form (`handleSubmit`)**:
  - Replaced 2 manual `toast.error` checks (name required + sellPrice > 0) with `variantValidation.validate({ name, sellPrice })`
  - Added `variantValidation.clearFieldError('name')` on name input onChange
  - Added `variantValidation.clearFieldError('sellPrice')` on sellPrice input onChange
  - Added error border on both inputs when errors present
  - Added error paragraphs under both fields
  - Added `variantValidation.clearAllErrors()` in `openAddVariant`, `openEditVariant`, and dialog `onOpenChange`
- **Stock adjustment (`handleQuickAdjust`)**:
  - Replaced 2 manual `toast.error` checks (valid number + non-zero) with `quickAdjustValidation.validate({ adjustment })`
  - Cross-field check (`newStock >= 0`) now sets error via `quickAdjustValidation.setErrorMap()` instead of toast
  - Added `quickAdjustValidation.clearFieldError('adjustment')` on input onChange
  - Added error border on adjustment input when error present
  - Added error paragraph under the field
  - Added `quickAdjustValidation.clearAllErrors()` in `openQuickAdjust` and dialog `onOpenChange`
- **Preserved**: All API error handling (via `useApi`), all existing UI elements, quick stock buttons (-10 to +10), variant data table

---

## Design Decisions

1. **Inline schemas for string-coerced fields** — Since form inputs store values as strings (e.g., `sellPrice: ''`, `quickAdjustValue: ''`), used `z.string().refine()` with `Number()` conversion instead of `z.coerce.number()` to ensure Arabic error messages for all failure cases (empty, non-numeric, zero, negative).

2. **Cross-field validation via `setErrorMap`** — The `newStock >= 0` check in stock adjustment depends on the variant's current stock (component state). Used `setErrorMap` after schema validation passes, keeping the error on the `adjustment` field.

3. **Error clearing strategy** — Errors are cleared on: (a) field onChange, (b) dialog open, (c) dialog close. This prevents stale errors from appearing.

4. **Toast removal in product-variants** — All 4 `toast.error` calls were validation-related. Removed the `toast` import entirely since `useApi` handles its own success/error toasts internally.
