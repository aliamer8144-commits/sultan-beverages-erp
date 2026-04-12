# Task 3-b: Migrate 3 Main Screen Files to Use Validation Hooks

## Agent: full-stack-developer

## Summary

Migrated form validation in 3 screen files from manual toast-based checks to use the `useFormValidation` hook with Zod schemas, providing field-level error display instead of generic toast messages.

## Files Modified

### 1. `src/screens/returns-screen.tsx`

**Imports added:**
- `useFormValidation` from `@/hooks/use-form-validation`
- `createReturnSchema` from `@/lib/validations`

**Hook added:**
- `const returnValidation = useFormValidation({ schema: createReturnSchema })` — validates `{ invoiceId, productId, quantity, reason }`

**Validation changes in `handleSubmitReturn`:**
- **Before:** Manual check `!selectedInvoiceId || !selectedProductId || !returnQuantity || returnQuantity <= 0` → `toast.error('يرجى اختيار الفاتورة والمنتج والكمية')`
- **After:** `returnValidation.validate({ invoiceId, productId, quantity, reason })` — schema validates each field individually and sets field-level errors
- **Cross-field check:** `returnQuantity > selectedProductItem.quantity` now sets `returnValidation.setErrorMap({ quantity: '...' })` instead of `toast.error`
- **Kept as toast:** `!user` check → `toast.error('يرجى تسجيل الدخول أولاً')`

**UI changes (dialog form):**
- Invoice `SelectTrigger`: conditional `border-destructive` class + `returnValidation.clearFieldError('invoiceId')` on change
- Added `<p className="text-sm text-destructive">` error message below invoice select
- Quantity `Input`: conditional `border-destructive` + `clearFieldError('quantity')` on change; error message shows schema error OR inline overflow check
- Reason `Textarea`: conditional `border-destructive` + `clearFieldError('reason')` on change + error message
- `handleSelectInvoice` clears `productId` and `quantity` field errors
- `handleSelectProduct` clears `productId` and `quantity` field errors
- `openNewReturnDialog` calls `returnValidation.clearAllErrors()`

---

### 2. `src/screens/loyalty-screen.tsx`

**Imports added:**
- `useFormValidation` from `@/hooks/use-form-validation`
- `createLoyaltyTransactionSchema` from `@/lib/validations`

**Hook added:**
- `const adjustValidation = useFormValidation({ schema: createLoyaltyTransactionSchema })` — validates `{ customerId, points, transactionType, description }`

**Validation changes in `handleSubmitAdjust`:**
- **Before:** Two manual checks — `!adjustCustomerId || !adjustPoints || !adjustReason` and `isNaN(pointsValue) || pointsValue <= 0` → both `toast.error(t('common.required'))`
- **After:** `adjustValidation.validate({ customerId, points: finalPoints, transactionType: 'adjusted', description: adjustReason })` — schema validates all fields with Arabic error messages
- Moved `finalPoints` computation before validation so the signed value is checked by the schema

**UI changes (adjust dialog):**
- Customer `SelectTrigger`: conditional `border-destructive` + `clearFieldError('customerId')` on change + error message below
- Points `Input`: conditional `border-destructive` + `clearFieldError('points')` on change + error message
- Reason `Input`: conditional `border-destructive` + `clearFieldError('description')` on change + error message
- `openAdjustDialog` calls `adjustValidation.clearAllErrors()`

---

### 3. `src/screens/sales-targets-screen.tsx`

**Imports added:**
- `useFormValidation` from `@/hooks/use-form-validation`
- `createSalesTargetSchema` from `@/lib/validations`

**Imports removed:**
- `toast` from `sonner` (no longer used — validation toast was the only usage)

**Hook added:**
- `const targetValidation = useFormValidation({ schema: createSalesTargetSchema })` — validates `{ type, targetAmount, startDate, endDate }`

**Validation changes in `handleSubmit`:**
- **Before:** Manual check `!formType || !formAmount || parseFloat(formAmount) <= 0` → `toast.error('الرجاء اختيار نوع الهدف وإدخال مبلغ صحيح')`
- **After:** `targetValidation.validate({ type, targetAmount, startDate, endDate })` — schema validates each field individually

**UI changes (create/edit dialog):**
- Type toggle buttons: `clearFieldError('type')` on click; inactive buttons get conditional `border-destructive` + error message below the grid
- Amount `Input`: conditional `border-destructive` + `clearFieldError('targetAmount')` on change + error message
- End Date `Input`: conditional `border-destructive` + `clearFieldError('endDate')` on change
- `openCreateDialog` and `openEditDialog` call `targetValidation.clearAllErrors()`

---

## Verification

- `npx tsc --noEmit` → 0 errors
- `bun run lint` → 0 errors
- Dev server running cleanly on localhost:3000
