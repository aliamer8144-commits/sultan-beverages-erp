# Task 5 — POS Screen Zod Validation Migration

## Agent: full-stack-developer
## Status: ✅ Complete

---

## Summary

Migrated the Point of Sale screen's form validation from `toast.error()` to Zod schema-based field-level errors for dialog-based form inputs. Kept all action-based toast notifications intact. TypeScript and ESLint pass cleanly.

---

## Files Modified

### 1. `src/lib/validations.ts` — Added 5 POS-specific Zod schemas

Added under a new `// ── POS Screen (client-side field validation)` section:

| Schema | Purpose | Validates |
|--------|---------|-----------|
| `posDiscountPercentSchema` | Custom discount % mode | `value` is a valid number > 0 and ≤ 100 |
| `posDiscountAmountBaseSchema` | Custom discount fixed mode (base) | `value` is a valid number > 0 |
| `posPaidAmountSchema` | Full payment amount | `paidAmount` is a valid number ≥ 0 |
| `posSplitCashSchema` | Split payment cash field | `splitCash` is a valid number ≥ 0 |
| `posSplitCardSchema` | Split payment card field | `splitCard` is a valid number ≥ 0 |

All schemas use `z.coerce.number({ message: '...' })` for Zod v4 compatibility, with Arabic error messages matching the existing toast messages.

The `posDiscountAmountBaseSchema` is extended with `.refine()` in the dialog component to add the dynamic `max(subtotal)` check, since subtotal is a runtime value.

---

### 2. `src/screens/pos/custom-discount-dialog.tsx` — Field-level validation

**What changed:**
- Added imports: `useMemo`, `useEffect`, `useFormValidation`, `posDiscountPercentSchema`, `posDiscountAmountBaseSchema`, `z`
- Created a **dynamic schema** via `useMemo` that switches between percent and amount mode:
  - Percent mode: uses `posDiscountPercentSchema` directly
  - Amount mode: extends `posDiscountAmountBaseSchema` with `.refine(data => data.value <= subtotal, { message: 'مبلغ الخصم لا يمكن أن يتجاوز المجموع الفرعي', path: ['value'] })`
- Added `useFormValidation` hook with the dynamic schema
- Created local `handleApply()` that validates via Zod before calling `onApplyDiscount()`
- **Error display**: Added `border-destructive focus-visible:ring-destructive` to the Input when `v.errors.value` exists
- **Error message**: Added `<p className="text-sm text-destructive">` below the input
- **Error clearing**: `v.clearFieldError('value')` on input change, `v.clearAllErrors()` on dialog open and tab change
- **Preserved**: All existing UI (tabs, preview, quick buttons, layout, icons)

**Before:** Invalid values showed `toast.error()` popups
**After:** Invalid values show inline error text under the input with red border

---

### 3. `src/screens/pos/payment-dialog.tsx` — Field-level validation

**What changed:**
- Added imports: `useMemo`, `useEffect`, `useFormValidation`, `posPaidAmountSchema`, `posSplitCashSchema`, `posSplitCardSchema`
- Created a **dynamic schema** via `useMemo` based on active tab:
  - Full payment: `posPaidAmountSchema`
  - Split payment: `posSplitCashSchema.merge(posSplitCardSchema)`
- Added `useFormValidation` hook with the dynamic schema
- Created local `handleConfirm()` that validates via Zod before calling `onConfirmPayment()`
- **Error display on full payment input**: Added `border-destructive` class and error paragraph for `v.errors.paidAmount`
- **Error display on split cash input**: Added `border-destructive` class and error paragraph for `v.errors.splitCash`
- **Error display on split card input**: Added `border-destructive` class and error paragraph for `v.errors.splitCard`
- **Error clearing**: `v.clearFieldError(...)` on each input's onChange, `v.clearAllErrors()` on dialog open and tab change
- **Preserved**: All existing inline feedback (green "الباقي" box, red "المبلغ غير كافٍ" box, split summary, quick amount buttons)

---

### 4. `src/screens/pos-screen.tsx` — Removed redundant toast.error calls

**`handleConfirmPayment`** (3 toast.error → 0 toast.error):
| Validation | Before | After |
|---|---|---|
| `isNaN(paid) \|\| paid < 0` | `toast.error('يرجى إدخال مبلغ صحيح')` | Silent `return` (field error shown in dialog) |
| `paid < grandTotal` | `toast.error('المبلغ المدفوع أقل من الإجمالي')` | Silent `return` (inline feedback in dialog + button disabled) |
| `!isSplitValid` | `toast.error('المبلغ غير كافٍ لتغطية الإجمالي')` | Silent `return` (inline feedback in dialog + button disabled) |

**`handleApplyCustomDiscount`** (3 toast.error → 0 toast.error):
| Validation | Before | After |
|---|---|---|
| `isNaN(val) \|\| val <= 0` | `toast.error('يرجى إدخال قيمة صحيحة')` | Silent `return` (field error shown in dialog) |
| `val > 100` (percent) | `toast.error('نسبة الخصم لا يمكن أن تتجاوز 100%')` | Silent `return` (field error shown in dialog) |
| `val > subtotal` (amount) | `toast.error('مبلغ الخصم لا يمكن أن يتجاوز المجموع الفرعي')` | Silent `return` (field error shown in dialog) |

**Kept as safety guards:** All validation checks are kept as `return` statements in the parent handlers (without toast), so they act as defense-in-depth in case the dialog validation is somehow bypassed.

---

## What Was Kept as toast.error (Action-Based Validations)

These are instant feedback on user actions, not form submissions — they remain as toast notifications:

| # | Location | Message | Reason |
|---|----------|---------|--------|
| 1 | `handleAddToCart` | 'المنتج غير متوفر في المخزون' | Out-of-stock check when adding to cart |
| 2 | `handleVariantSelect` | 'هذا المتغير غير متوفر في المخزون' | Variant out-of-stock when selecting |
| 3 | `handleConfirmLoyaltyRedeem` | 'الحد الأدنى للاستبدال X نقطة' | Loyalty minimum points check |
| 4 | `handleConfirmLoyaltyRedeem` | 'النقاط المطلوبة أكبر من رصيد العميل' | Exceeds loyalty balance |
| 5 | `handleConfirmLoyaltyRedeem` | 'حدث خطأ أثناء استبدال النقاط' | API error |
| 6 | `handleConfirmPayment` | 'يرجى تسجيل الدخول أولاً' | Auth check (exceptional case) |
| 7 | `handleConfirmPayment` | 'حدث خطأ في إنشاء الفاتورة' | API error |
| 8 | `handleBarcodeScan` | 'المنتج غير موجود' | Product not found |
| 9 | `handleProductClick` | 'فشل في تحميل المتغيرات' | API error |
| 10 | `handleProductClick` | 'حدث خطأ في تحميل المتغيرات' | API error (catch) |
| 11 | Various | `toast.success(...)` | All success toasts unchanged |

---

## Verification

- `npx tsc --noEmit` → 0 errors
- `bun run lint` → 0 errors, 0 warnings
- Dev server running clean on localhost:3000
