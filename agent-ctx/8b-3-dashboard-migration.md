# Task 8b-3: Migrate dashboard-screen.tsx to use useApi hook

## Status: Completed

## Changes Made

### File: `src/screens/dashboard-screen.tsx`

1. **Added import**: `import { useApi } from '@/hooks/use-api'`

2. **SalesTargetWidget** (sub-component):
   - Added `const { get } = useApi()` at top of component
   - Replaced `fetch('/api/sales-targets')` + manual `json.success` / `json.data` with:
     ```ts
     const result = await get<SalesTargetData>('/api/sales-targets', undefined, { showErrorToast: false })
     if (result) setTarget(result)
     ```
   - Added `get` to useCallback dependency array
   - Removed try/catch (useApi handles errors internally)
   - Kept `setLoading(false)` outside the conditional

3. **DashboardScreen** (main component):
   - Added `const { get } = useApi()` at top of component
   - Replaced `fetch('/api/dashboard')` + manual `json.success` / `json.data` with:
     ```ts
     const result = await get<DashboardData>('/api/dashboard', undefined, { showErrorToast: false })
     if (result) setData(result)
     ```
   - Removed try/catch/finally (useApi handles errors internally)
   - Kept manual `setLoading(false)` / `setRefreshing(false)` after the call

4. Both GET calls use `{ showErrorToast: false }` to maintain the original silent error behavior.

## Verification
- `npx tsc --noEmit` → 0 errors
