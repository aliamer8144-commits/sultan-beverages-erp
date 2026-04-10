# Task 5-c: Hold/Recall Orders for POS

## Files Modified

### 1. `/src/store/app-store.ts`
- Added `HeldOrder` interface (id, cart, discount, customerId, customerName, heldAt, heldBy, note)
- Added to `AppState`: `heldOrders`, `holdCurrentOrder()`, `recallOrder()`, `deleteHeldOrder()`
- Implemented store actions with proper cart clearing on hold and cart merging on recall
- Added `heldOrders` to persist `partialize` config

### 2. `/src/screens/pos-screen.tsx`
- Added imports: `PauseCircle`, `Clock`, `Play` from lucide-react
- Destructured new store properties from `useAppStore`
- Added state: `holdDialogOpen`, `holdNote`, `deleteHeldOrderId`
- Added handlers: `handleHoldOrder`, `confirmHoldOrder`, `handleRecallOrder`, `confirmDeleteHeldOrder`
- Added utilities: `formatRelativeTime` (Arabic relative time), `getHeldOrderTotal`, `getHeldCustomerName`
- Updated keyboard shortcuts to handle Escape for new dialogs
- Modified cart panel header to include:
  - Held Orders Popover (Clock icon with amber badge count)
  - Hold Order button (PauseCircle icon, visible when cart has items)
- Added Hold Order Dialog with note input and quick suggestions
- Added Delete Held Order Confirmation Dialog

## Key Design Decisions
- Used amber color theme consistently for hold/recall UI (warm, "paused" feeling)
- Recall merges held order items into existing cart (does not replace)
- Held orders persist across page refreshes via Zustand persist
- Quick note suggestions reduce friction for common hold reasons
- Relative time formatting in Arabic for natural UX
