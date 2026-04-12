# Task 2-a: Customer Dialog Validation Migration

## Summary

Migrated 3 customer dialog files from manual `if (...) { toast.error(...); return }` validation patterns to Zod schema validation with field-level error display.

## Files Modified

### 1. `src/hooks/use-zod-form.ts` — Added 2 new methods
- **`setError(field, message)`** — Set error for a single field (used for cross-field validation)
- **`setErrorMap(errors)`** — Replace all errors at once (used for bulk validation error display)
- Both added to the interface, implementation, and return object

### 2. `src/screens/customers/customer-payment-dialog.tsx` — Full useZodForm migration
- **Replaced**: `useState` for `paymentAmount`, `paymentMethod`, `paymentNotes`, `paymentSubmitting`
- **With**: `useZodForm` hook with `createCustomerPaymentSchema`
- **Schema validation**: `amount` must be positive (`z.coerce.number().positive()`)
- **Cross-field validation**: `amount > customer.debt` checked after schema passes, sets error on `amount` field via `form.setError()`
- **Error display**: Destructive border on amount Input when `form.errors.amount` or real-time `exceedsDebt`; error message shown inline below the field
- **Auto-reset**: `form.reset()` called on successful payment submission
- **Form reset on open**: `useEffect` resets form when dialog opens or customer changes (stable `PAYMENT_DEFAULTS` reference prevents infinite re-triggers)
- **Kept**: All existing UI (quick amount buttons, payment method select, notes textarea, customer info card, toast.error for auth failure)

### 3. `src/screens/customers/loyalty-history-dialog.tsx` — useZodForm for adjust dialog
- **Replaced**: `useState` for `loyaltyPointsInput`, `loyaltyDescription`
- **With**: `adjustForm` using `useZodForm` with `createLoyaltyTransactionSchema`
- **Schema validation**: `points` validated as positive integer via `z.coerce.number().int()`
- **Description handling**: Schema requires non-empty description; since the UI shows it as optional, the default description (`'منح نقاط يدوي'` / `'خصم نقاط يدوي'`) is applied before validation via `validateFormClient()` directly (not `form.validate()` to avoid modifying the displayed value)
- **Cross-field validation**: Deduct mode checks `points > adjustCustomer.loyaltyPoints`, sets error on `points` field
- **Error display**: Destructive border on points Input when `adjustForm.errors.points`; error message shown inline
- **Kept**: All history display UI, grant/deduct buttons, loading skeletons, empty state, re-fetch after submit

### 4. `src/screens/customers/customer-form-dialog.tsx` — useFormValidation migration
- **Added**: `useFormValidation` hook with `createCustomerSchema` (since parent manages form state)
- **Submit handler**: Wrapped `onSubmit()` with `if (!v.validate(form)) return` for schema-gated submission
- **Field error clearing**: Each field's `onChange` calls `v.clearFieldError('fieldName')` alongside `setForm()`
- **Error display**: Added `border-destructive focus-visible:ring-destructive` className on name/phone inputs when errors exist; inline `<p className="text-sm text-destructive">` messages below name, phone, and notes fields
- **Kept**: All existing UI (add/edit mode differences, form-label-enhanced in add mode, debt field with existing `border-destructive/50` in edit mode, category select, all classNames)
- **Not modified**: Debt field validation (edit mode) — no Zod schema for debt, existing visual indicator preserved

## Validation Flow Summary

| Dialog | Hook | Schema | Cross-field | Error Display |
|---|---|---|---|---|
| CustomerPaymentDialog | `useZodForm` | `createCustomerPaymentSchema` | `amount > debt` → `setError('amount')` | Inline + destructive border |
| LoyaltyHistoryDialog (adjust) | `useZodForm` | `createLoyaltyTransactionSchema` | `deduct > balance` → `setError('points')` | Inline + destructive border |
| CustomerFormDialog | `useFormValidation` | `createCustomerSchema` | None | Inline + destructive border |

## Verification
- ✅ TypeScript: zero errors (`tsc --noEmit`)
- ✅ Dev server: running without issues
- ✅ ESLint: only pre-existing error in `product-form-dialog.tsx` (unrelated)
