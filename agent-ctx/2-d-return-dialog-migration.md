# Task 2-d: Migrate Invoices Return Dialog to Zod Validation

## Summary

Migrated `src/screens/invoices/return-dialog.tsx` from manual toast-based validation to use the `useZodForm` hook with `createReturnSchema` for field-level error handling.

## Changes Made

### File: `src/screens/invoices/return-dialog.tsx`

**Replaced:**
- Individual `useState` calls for form fields (`returnProductId`, `returnQuantity`, `returnReason`) with `useZodForm` hook managing `{ invoiceId, productId, quantity, reason }` via `createReturnSchema`
- Manual `returnSubmitting` state → `form.isSubmitting` (managed by `useZodForm`)
- Toast-based validation errors → field-level error display

**Added:**
- `useZodForm` hook with `createReturnSchema` for schema-based validation
- `crossFieldError` state for the cross-field check (`quantity > returnProductItem.quantity`) — set as error on the 'quantity' field
- Field-level `<p className="text-sm text-destructive">` error messages below: product select, quantity input, reason textarea
- Dynamic `border-destructive` class on SelectTrigger, Input, and Textarea when errors are present

**Kept unchanged:**
- All existing UI layout, styling, icons, and structure
- `returnProductItem` as separate state (not part of schema, needed for UI display)
- `!user` check as `toast.error('يرجى تسجيل الدخول')` (exceptional case)
- Product select, quantity input with min/max, reason textarea, summary section
- `handleOpenChange` resets form via `form.reset()`
- Success flow: reset form → close dialog → call `onSuccess`

**Validation flow:**
1. `form.handleSubmit` validates against `createReturnSchema` (productId required, quantity positive int, reason max 500)
2. Inside the callback: cross-field check `quantity > returnProductItem.quantity` → sets `crossFieldError` on quantity field
3. `!user` check → toast error
4. On success: `form.reset()` + clear cross-field error + close dialog

## Validation

- ESLint: passed (no errors)
- Dev server: running normally, no compilation errors
