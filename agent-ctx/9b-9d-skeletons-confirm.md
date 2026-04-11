---
Task ID: 9b-9d
Agent: Sub-agent (skeletons + confirm dialogs)
Task: Replace duplicate skeletons and inline confirm dialogs with shared components

Work Log:
- Read worklog.md for full project context
- Read chart-utils.tsx to understand exported skeletons: SummaryCardSkeleton, ChartSkeleton, TableSkeleton
- Read confirm-dialog.tsx to understand useConfirm() hook and ConfirmDialog component API
- Fixed confirm-dialog.tsx: changed `isOpen` to `open` in useConfirm() return value to match ConfirmDialog's `open` prop

### Task 1: Skeleton Deduplication in analytics-screen.tsx
- Analyzed local skeleton components: KPICardSkeleton, ChartSkeleton, TableSkeleton
- Added aliased imports: `SummaryCardSkeleton as KPICardSkeleton`, `ChartSkeleton as AnalyticsChartSkeleton`, `TableSkeleton as AnalyticsTableSkeleton`
- Removed 48 lines of local skeleton definitions
- Updated all JSX usages: ChartSkeleton → AnalyticsChartSkeleton, TableSkeleton → AnalyticsTableSkeleton
- KPICardSkeleton kept as alias name since it's used in 6 places

### Task 2a: backup-screen.tsx
- Replaced Dialog import with useConfirm/ConfirmDialog import
- Replaced `confirmDialogOpen` state with `restoreConfirm = useConfirm()`
- Replaced Dialog trigger (onClick → restoreConfirm.confirm())
- Replaced Dialog JSX with ConfirmDialog component
- Removed setConfirmDialogOpen(false) from handleRestore (hook handles closing)
- ConfirmText="استعادة", variant="destructive"

### Task 2b: daily-close-screen.tsx
- Replaced AlertDialog imports with useConfirm/ConfirmDialog
- Added `closeConfirm = useConfirm()` hook
- Replaced AlertDialog/AlertDialogTrigger pattern with Button + closeConfirm.confirm()
- Added ConfirmDialog component at end of JSX
- Kept AlertDialog imports removed, Button still imported

### Task 2c: expense-screen.tsx
- Added useConfirm/ConfirmDialog import alongside existing Dialog imports (Add dialog still uses Dialog)
- Replaced deleteDialogOpen/deleting state with deleteConfirm = useConfirm()
- Simplified handleDeleteExpense (removed setDeleting/setDeleteDialogOpen — hook manages both)
- Replaced Dialog trigger with deleteConfirm.confirm()
- Replaced Dialog JSX with ConfirmDialog + children (expense detail card preserved)
- Added missing EmptyState/Pagination import from @/components/empty-state (pre-existing bug)

Stage Summary:
- 4 files modified: analytics-screen.tsx, backup-screen.tsx, daily-close-screen.tsx, expense-screen.tsx
- 1 shared component fixed: confirm-dialog.tsx (isOpen → open)
- ~100 lines of duplicate code removed
- TypeScript: 0 errors (npx tsc --noEmit)
- ESLint: 0 errors (bun run lint)
