# Task 4-a: Migrate Form Validation to Zod Schemas (Phase 12)

## Files Modified

### 1. `src/screens/customers-screen.tsx`
**Changes:** Removed redundant manual validation from parent handlers.

- **`handleCreate`**: Removed `if (!form.name.trim()) { toast.error(...); return }` guard
- **`handleUpdate`**: Removed identical `if (!form.name.trim()) { toast.error(...); return }` guard
- **Removed unused `import { toast } from 'sonner'`**

**Why:** The `CustomerFormDialog` component already uses `useFormValidation({ schema: createCustomerSchema })` with full field-level error display (name, phone, notes). It validates via `v.validate(form)` before calling `onSubmit()`, making the parent's manual toast validation redundant. The dialog already shows Arabic error messages under each field with destructive border styling.

### 2. `src/screens/purchases-screen.tsx`
**Changes:** Migrated 3 validation sites from toast-based to field-level validation.

#### a) Supplier form (`handleSaveSupplier`)
- **Removed** `if (!supplierForm.name.trim()) { toast.error('يرجى إدخال اسم المورد'); return }`
- **Reason:** `SupplierFormDialog` already validates with `useFormValidation({ schema: createSupplierSchema })` and shows field-level errors for all fields (name, phone, phone2, address, website, paymentTerms, notes)

#### b) Add purchase item (`handleAddItem`)
- **Added** `useFormValidation({ schema: invoiceItemSchema })` as `itemV`
- **Replaced** 3 separate `toast.error` guards with `itemV.validate({ productId, quantity, price })`
- **Added** field-level error display under product Select, quantity Input, and cost price Input
- **Added** `border-destructive` class to invalid fields
- **Added** `clearFieldError` on each field's change handler
- **Clears** all item errors after successful add, and clears `invoiceV.errors.items`

#### c) Submit purchase invoice (`handleSubmitInvoice`)
- **Added** `useFormValidation` instance as `invoiceV` for managing error state
- **Kept** `!user` check as `toast.error('يرجى تسجيل الدخول أولاً')` (non-field error)
- **Replaced** `!selectedSupplierId` and `purchaseItems.length === 0` toast errors with `invoiceV.setErrorMap({...})`
- **Added** `border-destructive` to supplier SelectTrigger and error message below
- **Added** `clearFieldError('supplierId')` when supplier is selected
- **Added** items error display near the submit button
- **Clears** all invoice errors after successful submission

## Schema Usage
| Handler | Schema | Fields Validated |
|---------|--------|-----------------|
| handleAddItem | `invoiceItemSchema` | productId, quantity, price |
| handleSubmitInvoice | Manual via `setErrorMap` | supplierId, items |
| handleSaveSupplier | (handled by dialog) | — |
| handleCreate/Update | (handled by dialog) | — |

## Preserved
- All `toast.error` for non-field errors (auth/network/export)
- All existing UI layout and styling
- Dialog components untouched (already migrated)
- `npx tsc --noEmit` — pass
- `bun run lint` — pass
