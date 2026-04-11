# Task 8b-1: Migrate audit-log-screen.tsx and daily-close-screen.tsx to use useApi hook

## Status: ✅ Complete

## Changes Made

### 1. src/screens/audit-log-screen.tsx
- Added `import { useApi } from '@/hooks/use-api'`
- Added `AuditLogResponse` interface: `{ logs: AuditLogEntry[], total: number, page: number, totalPages: number }`
- Added `const { get } = useApi()` at top of component
- Replaced `fetchLogs` function:
  - **Before**: raw `fetch('/api/audit-log?...')` with manual `URLSearchParams`, `res.ok` check, `res.json()`, `data.data` access
  - **After**: `get<AuditLogResponse>('/api/audit-log', { page, limit, search, action, entity, startDate, endDate })` with `if (result)` null check
- Removed manual `toast.error()` in catch (hook handles it); moved `setLogs([])` to else branch
- Added `get` to `useCallback` dependency array
- Kept `toast` import (still used by `handleExport`)

### 2. src/screens/daily-close-screen.tsx
- Added `import { useApi } from '@/hooks/use-api'`
- Added `const { get } = useApi()` at top of component
- Replaced `fetchData` function:
  - **Before**: raw `fetch('/api/daily-close')` with `json.success` check and empty catch
  - **After**: `get<DailyCloseData>('/api/daily-close', undefined, { showErrorToast: false })` with `if (result)` null check
- Used `{ showErrorToast: false }` to preserve silent failure behavior
- Removed empty catch block
- Added `get` to `useCallback` dependency array

## Verification
- TypeScript: 0 errors (`npx tsc --noEmit`)
- ESLint: pre-existing errors in other files (analytics-screen.tsx, dashboard-screen.tsx) unrelated to this change
