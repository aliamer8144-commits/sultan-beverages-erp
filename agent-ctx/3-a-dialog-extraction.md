# Task 3-a: Extract Dialogs from customers-screen.tsx

## Summary
Extracted 5 dialog components from `customers-screen.tsx` (1571 lines) into separate files in `src/screens/customers/`.

## Files Created
1. **`customer-form-dialog.tsx`** (170 lines) — Merged Add + Edit into one `CustomerFormDialog` component with `mode: 'add' | 'edit'` prop. Preserves different id prefixes (`add-*` vs `edit-*`), different styling for labels (`form-label-enhanced` vs `Label`), and the edit-only debt field.

2. **`customer-payment-dialog.tsx`** (257 lines) — `CustomerPaymentDialog` manages internal state for `paymentAmount`, `paymentMethod`, `paymentNotes`, `paymentSubmitting`. Uses `useApi()` internally for POST to `/api/customer-payments`.

3. **`payment-history-dialog.tsx`** (117 lines) — `PaymentHistoryDialog` fetches payment history via `useApi().get()` in a `useEffect` when dialog opens. Displays loading skeletons and empty state.

4. **`loyalty-history-dialog.tsx`** (314 lines) — `LoyaltyHistoryDialog` contains both the Loyalty History dialog and the Loyalty Adjust dialog (rendered as a fragment with two `Dialog` components). Uses internal state for adjust mode, points, description. Re-fetches history after successful adjustment.

5. **`purchase-history-dialog.tsx`** (211 lines) — `PurchaseHistoryDialog` manages internal state for invoices, loading, and expanded notes. Fetches invoices via `useApi().get()` on open.

## Changes to customers-screen.tsx
- Reduced from **1571 → 719 lines** (54% reduction, exceeding the 48% target)
- Removed all extracted dialog JSX and their associated local state variables
- Removed unused imports: `Label`, `Textarea`, `Select`/`SelectContent`/`SelectItem`/`SelectTrigger`/`SelectValue`, `Banknote`, `Star`, `Minus`, `formatShortDate`, `formatDateShortMonth`, `ConfirmDialog`, `BadgeCheck`, `UserCheck`, `Store`
- Kept the delete confirmation dialog inline (uses custom styling not matching `ConfirmDialog` shared component)
- Added imports for all 5 new dialog components
- Simplified open functions (e.g., `openPaymentDialogForCustomer` now just sets customer and opens dialog)

## Lint
- `bun run lint` passes with no errors

## Notes
- Delete dialog kept inline because it uses custom layout (centered icon, destructive styling) that doesn't map cleanly to the `ConfirmDialog` shared component's simpler API
- All new files start with `'use client'` and use named exports
- All files import types from `./types`
- All class names, styling, and behavior preserved exactly
