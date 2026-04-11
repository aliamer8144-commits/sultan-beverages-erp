# Task ID: 9-A
# Agent: full-stack-developer
# Status: COMPLETED

## Summary
Enhanced POS receipt and payment workflow with 4 major features:

1. **Split Payment Support**: Payment dialog now has tabs for "دفع كامل" (full) and "دفع مجزأ" (split). Split mode allows dividing payment between cash and card with auto-calculation, quick-fill buttons, and change calculation.

2. **Hold/Recall Orders Enhancement**: Updated store to limit held orders to 5 (oldest removed first). Customer name is now saved with held orders for better identification.

3. **Receipt Number Enhancement**: Added INV-YYYYMMDD-XXXX receipt number format with daily sequential counter stored in localStorage. Preview shown in payment dialog.

4. **Quick Discount Buttons**: Added 5%, 10%, 15%, 20% quick discount buttons and "مخصص" (custom) button. Custom discount dialog supports percentage and fixed amount modes with live preview.

## Files Modified
- `src/screens/pos-screen.tsx` — Major enhancements to payment dialog, cart footer, new custom discount dialog
- `src/store/app-store.ts` — Updated holdCurrentOrder with customerName param and max 5 limit

## Lint Result
- `bun run lint` → 0 errors

## Key Decisions
- Used Tabs/TabsList/TabsTrigger/TabsContent from shadcn/ui for payment mode tabs
- Receipt number stored in localStorage with date-based key for daily reset
- Custom discount dialog reuses Tabs component for percent/amount toggle
- All UI text in Arabic RTL, consistent with existing design system
