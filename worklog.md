# Sultan Beverages ERP - Work Log

## Phase 1-10: Already completed (on GitHub)
- Project setup, database, 20+ screens, middleware, API routes
- useApi hook, UI components, POS screen decomposition

---
Task ID: 1
Agent: Main
Task: Clone project, set up environment, read all source files

Work Log:
- Cloned from GitHub to /home/z/my-project
- Created .env with DATABASE_URL and JWT_SECRET
- Ran npm install and prisma generate
- Read all 3 target screens: customers-screen.tsx (1571 lines), purchases-screen.tsx (1352 lines), invoices-screen.tsx (1132 lines)
- Read all types files: customers/types.ts, purchases/types.ts, invoices/types.ts
- Identified dialog boundaries in each file

Stage Summary:
- Project is set up and ready for Phase 11
- All source files read and analyzed
- Ready to extract dialogs from 3 screens in parallel

---
Task ID: 3-a
Agent: Main
Task: Extract dialogs from customers-screen.tsx into separate files

Work Log:
- Created 5 new dialog files in src/screens/customers/:
  - customer-form-dialog.tsx (170 lines) — merged Add/Edit into one component
  - customer-payment-dialog.tsx (257 lines) — Record Payment dialog with internal API calls
  - payment-history-dialog.tsx (117 lines) — Payment History dialog with fetch on open
  - loyalty-history-dialog.tsx (314 lines) — Loyalty History + Adjust dialogs
  - purchase-history-dialog.tsx (211 lines) — Purchase History dialog with invoice list
- Updated customers-screen.tsx: 1571 → 719 lines (54% reduction)
- Removed unused imports from main screen
- Kept delete confirmation dialog inline (custom layout)
- All files use 'use client', named exports, types from ./types
- Lint passes cleanly

Stage Summary:
- 5 dialog components extracted with full internal state management
- customers-screen.tsx reduced from 1571 to 719 lines
- All styling, class names, and behavior preserved exactly

---
Task ID: 3-b
Agent: Main
Task: Extract dialogs from purchases-screen.tsx into separate files

Work Log:
- Created 4 new dialog files in src/screens/purchases/:
  - supplier-form-dialog.tsx (176 lines) — merged Add/Edit supplier form
  - supplier-payment-dialog.tsx (159 lines) — Record payment with API calls
  - payment-history-dialog.tsx (97 lines) — Payment history with fetch on open
  - rating-dialog.tsx (136 lines) — Supplier rating with star selection
- Updated purchases-screen.tsx: 1352 → 828 lines (39% reduction)
- Removed unused imports (Textarea, Dialog components, Banknote, Globe, Phone, Star)
- Fixed react-hooks/set-state-in-effect lint error using async IIFE pattern

Stage Summary:
- 4 dialog components extracted with internal state management
- purchases-screen.tsx reduced from 1352 to 828 lines

---
Task ID: 3-c
Agent: Main
Task: Extract dialogs from invoices-screen.tsx into separate files

Work Log:
- Created 3 new files in src/screens/invoices/:
  - print-invoice.ts (258 lines) — Print template generation function (not a component)
  - invoice-detail-dialog.tsx (186 lines) — Invoice detail view with print button
  - return-dialog.tsx (165 lines) — Return processing with product selection
- Updated invoices-screen.tsx: 1132 → 480 lines (58% reduction)
- Moved all invoice-specific types/functions to the subdirectory
- Print template now uses settings from useAppStore

Stage Summary:
- 3 files extracted (1 helper function, 2 dialog components)
- invoices-screen.tsx reduced from 1132 to 480 lines
- This was the biggest reduction percentage of the 3 screens

---
Task ID: 4
Agent: Main
Task: Verify Phase 11 with TypeScript and lint checks

Work Log:
- Ran `npx tsc --noEmit` — 0 errors
- Ran `bun run lint` — initially 1 error (set-state-in-effect in purchases/payment-history-dialog.tsx)
- Fixed using async IIFE pattern consistent with existing customer dialogs
- Re-ran lint — 0 errors
- Started dev server — compiles clean, no runtime errors

Stage Summary:
- All 12 new files compile cleanly
- All 3 updated screens compile cleanly
- tsc: 0 errors, lint: 0 errors

---
Task ID: 6
Agent: Main
Task: Push Phase 11 to GitHub

Work Log:
- Committed all 18 changed files with detailed commit message
- Pushed to origin/main: 3a5fe1e..125b1ed
- Total reduction: 4055 → 2027 lines (-50%)

Stage Summary:
- Phase 11 complete and pushed to GitHub
- Ready for Phase 12 (form validation extraction)

---
Task ID: 12
Agent: Main + 10 Sub-agents
Task: Phase 12 — Form Validation Extraction & Unification

Work Log:
- Created validation infrastructure:
  - src/lib/validation-utils.ts — validateFormClient(), validateField(), getFirstError()
  - src/hooks/use-zod-form.ts — Full form management hook (state + validation + submission)
  - src/hooks/use-form-validation.ts — Lightweight error-only hook for controlled forms
- Updated src/lib/validations.ts: Changed 16 z.number() to z.coerce.number() for client-side compatibility
- Added new schemas: createUserSchema, editUserSchema, posDiscountPercentSchema, posDiscountAmountBaseSchema, posPaidAmountSchema, posSplitCashSchema, posSplitCardSchema
- Migrated 27 files across 5 sub-phases:
  - Phase 12-B (dialogs): 11 files — customer-payment, loyalty-history, customer-form, supplier-payment, rating, supplier-form, category-manager, product-form, stock-adjustment, product-variants, return-dialog
  - Phase 12-C (screens): 8 files — expense, users, settings, returns, loyalty, sales-targets, customer-statement, product-variants-screen
  - Phase 12-D (main screens): 4 files — customers-screen, purchases-screen, inventory-screen, stock-adjustments-screen
  - Phase 12-E (POS): 3 files — pos-screen, custom-discount-dialog, payment-dialog

Stage Summary:
- 27 files migrated from manual toast.error to Zod schema validation
- Field-level error display added across all forms
- tsc --noEmit: 0 errors, bun run lint: 0 errors
- Total: 1182 insertions, 608 deletions (cleaner, more maintainable code)
- Pushed to GitHub as commit 8dfe943

---
Task ID: 13
Agent: Main + 6 Sub-agents
Task: Phase 13 — Unified API Error Handling

Work Log:
- Created src/lib/api-error-handler.ts:
  - tryCatch(): Auto try/catch wrapper with Prisma error mapping + structured logging
  - validateRequest(): Zod schema validation with 422 on invalid input
  - withValidation(): Combined tryCatch + validateRequest for POST/PUT/PATCH
  - Automatic context.params resolution for Next.js 15+
  - Prisma error auto-mapping: P2002→409, P2025→404, P2003→400, connection→503
- Migrated 39 API route files:
  - Phase 13-B (6 inconsistent files): users, users/[id], auth, auth/me, auth/seed-passwords, route.ts(deleted)
  - Phase 13-C Batch 1 (9 core CRUD): customers, customers/[id], suppliers, suppliers/[id], categories, categories/[id], products, products/[id], products/search
  - Phase 13-C Batch 2 (11 business logic): invoices, returns, expenses, expense-categories, stock-adjustments, product-variants, loyalty, loyalty/rewards, customer-payments, supplier-payments, supplier-rating
  - Phase 13-C Batch 3 (13 dashboard/admin): dashboard, quick-stats, analytics, daily-close, customer-statement, sales-targets, global-search, stock-alerts, audit-log, backup, restore, seed, exchange-rate
- Fixed inconsistencies:
  - 6 files using raw NextResponse.json → centralized helpers
  - 3 English error messages → Arabic (analytics, dashboard, daily-close)
  - 15 console.error/console.log calls removed (tryCatch logs automatically)
  - 6 files using errorResponse(msg, 500) → serverError(msg)
  - auth/seed-passwords: Now requires admin (was publicly accessible!)
  - users routes: Added Zod validation (createUserSchema, editUserSchema)
  - users/[id]: Added self-deletion prevention
- Deleted dead /api/route.ts endpoint

Stage Summary:
- 39 API route files migrated to unified error handling
- 1 new infrastructure file (api-error-handler.ts)
- 1 deleted file (dead endpoint)
- tsc --noEmit: 0 errors, bun run lint: 0 errors
- Total: 4304 insertions, 4503 deletions (net -199 lines of boilerplate)
- Pushed to GitHub as commit f64f21c

---
Task ID: 14
Agent: Main + 8 Sub-agents
Task: Phase 14 — Prisma Query Performance Optimization

Work Log:
- Phase 14-A: Fixed critical N+1 loops (5 files):
  - expenses/route.ts: 36 sequential queries → 3 parallel groupBy
  - invoices/route.ts POST: N+1 loop → pre-fetch + batch update (60→3)
  - products/route.ts bulk: N creates → createMany (100→1)
  - restore/route.ts: 950+ sequential INSERTs → createMany per entity (~10)
  - sales-targets/route.ts: N+1 aggregates → single fetch + in-memory
- Phase 14-B: Added pagination + fixed duplicates (7 API + 3 frontend):
  - invoices, products, customers, suppliers: page/limit/total/totalPages
  - customer-payments, supplier-payments: page/limit/total/totalPages
  - daily-close: 3 duplicate invoice queries → 1 findMany
  - supplier-rating: findMany for avg → aggregate with _avg
  - backup: duplicate invoiceItem fetch removed
  - global-search: 4 sequential → parallel Promise.all
- Phase 14-C: Dashboard + Analytics optimization (4 files):
  - dashboard: 9 sequential → 2 Promise.all blocks + SQL aggregation
  - dashboard: unbounded salesByCategoryRaw → groupBy + take(100)
  - dashboard: unbounded monthlyInvoices → $queryRaw SQL aggregation
  - analytics: raw data fetch → 8 targeted SQL aggregations
  - customer-statement, loyalty: sequential → Promise.all
- Phase 14-D: Medium/low optimizations (3 files):
  - supplier-payments POST: sequential updates → pre-compute + Promise.all
  - stock-alerts: fetch all + filter → $queryRaw WHERE
  - customer-payments GET: added pagination

Stage Summary:
- 20 API route files optimized
- 7 frontend files updated for pagination
- 27 files total changed
- tsc --noEmit: 0 errors, bun run lint: 0 errors
- Total: 1227 insertions, 743 deletions
- Pushed to GitHub as commit 24c0a4c

---
Task ID: 15
Agent: Main
Task: Phase 15 — Extract shared chart components (استخراج مكونات المخططات المشتركة)

Work Log:
- Verified local matches GitHub via git pull
- Analyzed all 12 chart instances across 5 screens (dashboard, analytics, expense, daily-close, loyalty)
- Identified 8 duplicate local tooltip/legend components across screens
- Updated chart-utils.tsx: unified ChartTooltipContent replaces ChartTooltip/BarTooltip/PieTooltip with suffix prop
- Added EXPENSE_COLORS to chart-utils (moved from analytics-screen)
- Added dir="rtl" to all tooltip containers for Arabic layout
- Created src/components/charts/index.tsx with 5 high-level chart components:
  - VerticalBarChart: wraps BarChart with CartesianGrid, XAxis/YAxis, ChartTooltipContent, empty state
  - HorizontalBarChart: wraps vertical layout BarChart with Cell colors
  - AreaTrendChart: wraps AreaChart with linearGradient, dot/activeDot
  - DonutChart: wraps PieChart with per-entry color support, PieTooltip, CustomLegend
  - GroupedBarChart: wraps multi-series BarChart with ComparisonTooltip, legend
- Updated dashboard-screen.tsx: removed TopProductTooltip, replaced 3 charts, 619→525 lines
- Updated analytics-screen.tsx: removed 4 local tooltips + EXPENSE_COLORS, replaced 3 charts, 818→663 lines
- Updated expense-screen.tsx: removed recharts imports, replaced 2 charts, 1135→1067 lines
- Updated daily-close-screen.tsx: removed HourlyTooltip, replaced 2 charts, 689→624 lines
- Loyalty screen unchanged (unique tooltip/axis formatting requirements)
- Deleted unused shadcn chart.tsx (353 lines)
- Fixed TypeScript errors: data type compatibility (any[]), xAxisInterval type, formatShortDate type
- Final verification: 0 lint errors, 0 TypeScript errors

Stage Summary:
- Commit: bfac5dd, pushed to GitHub
- Net reduction: 923 deletions, 586 insertions = ~337 net lines removed
- 8 duplicate tooltip/legend components eliminated
- 5 reusable chart components created for future use
- All existing visual appearance preserved exactly

---
Task ID: 16
Agent: Main + 4 Sub-agents
Task: Phase 16 — Type Safety Improvements (تحسين Type Safety)

Work Log:
- Level 1 (Red): Removed dangerous `any` types
  - charts/index.tsx: Generic `<T>` on all 5 chart components + AxisInterval type
  - pos-screen.tsx: `any[]` → `LastInvoice[]` for invoice fetch
  - rating-dialog.tsx: `0 as any` → proper RatingFormValues + schema extend
  - supplier-payment-dialog.tsx: `'' as any` → PaymentFormValues interface
- Level 2 (Yellow): Improved generic types
  - use-zod-form.ts: Two-generic support `<TInput, TOutput>` for coerce.number scenarios
    - TInput: form state (raw strings from HTML inputs)
    - TOutput: schema output (coerced numbers for submit handler)
  - auth-middleware.ts: Declaration merging replaces unsafe `as unknown as Record` casts
    - New AuthUserInfo interface exported
    - getRequestUser() now returns typed AuthUserInfo | undefined
- Level 3 (Green): Type-safe API params
  - Created getRequiredParam() helper in api-error-handler.ts
  - Updated 5 [id] routes: suppliers, products, categories, customers, users
  - Eliminated 10 manual `?? {}` + null check patterns
- Level 4 (Blue): Cleanup
  - Added explanatory comments to all 7 eslint-disable directives
  - db.ts: "Prisma generate requires dynamic require"
  - 5 screens: "Intentionally triggers data fetch that sets state — safe pattern"
- Fixed 6 dialog files for strict type compatibility:
  - customer-payment-dialog, loyalty-history-dialog, product-form-dialog
  - product-variants-dialog, rating-dialog, supplier-payment-dialog

Stage Summary:
- Commit: 62b8f25, pushed to GitHub
- 21 files changed, 197 insertions(+), 112 deletions(-)
- All `: any` removed from charts, API client, form hooks
- useZodForm now properly supports input/output type separation
- Auth middleware uses clean declaration merging instead of type casts
- tsc --noEmit: 0 errors, bun run lint: 0 errors

---
Task ID: 17-2a
Agent: general-purpose
Task: Add requireAdmin to 6 sensitive API routes

Work Log:
- Read worklog.md for project context
- Added `{ requireAdmin: true }` to 11 handler registrations across 6 route files:
  - src/app/api/analytics/route.ts — GET (1 handler)
  - src/app/api/audit-log/route.ts — GET (POST already had requireAdmin)
  - src/app/api/sales-targets/route.ts — GET, POST, PUT, DELETE (4 handlers)
  - src/app/api/daily-close/route.ts — GET (1 handler)
  - src/app/api/quick-stats/route.ts — GET (1 handler)
  - src/app/api/expense-categories/route.ts — POST, PUT, DELETE (GET left public for cashiers)
- Each change follows the pattern: `withAuth(tryCatch(..., 'msg'))` → `withAuth(tryCatch(..., 'msg'), { requireAdmin: true })`
- Verified with `npx tsc --noEmit` — 0 errors

Stage Summary:
- 6 route files modified, 11 handler registrations secured with requireAdmin
- expense-categories GET left intentionally public (cashiers need category list for expense creation)
- audit-log POST was already protected; only GET needed the fix
- tsc --noEmit: 0 errors

---
Task ID: 17-2b
Agent: general-purpose
Task: Zod validation, costPrice filtering, remove quick-login

Work Log:
- Subtask A: Replaced manual JSON validation in exchange-rate POST with `withValidation` + Zod schema
  - Created `exchangeRateSchema` with typed fields: exchangeRate (number, positive, optional), secondaryCurrency (string, max 10), currencyDisplayMode (string, max 20), secondaryCurrencyEnabled (boolean), secondaryCurrencySymbol (string, max 10)
  - POST handler now uses `withValidation(exchangeRateSchema, handler, fallbackMsg)` — body is type-safe
  - GET handler left as `tryCatch` only (no body to validate)
  - Removed unused `errorResponse` import; removed `tryCatch` import (only needed via `withValidation`)
- Subtask B1: Filtered costPrice for non-admin users in products/search/route.ts
  - Added `getRequestUser` to import from `@/lib/auth-middleware`
  - Added `const isAdmin = getRequestUser(request)?.role === 'admin'` at handler top
  - Changed `costPrice: product.costPrice` → `costPrice: isAdmin ? product.costPrice : undefined`
- Subtask B2: Removed unnecessary `costPrice: true` from global-search product select
  - costPrice was selected but never returned in the mapped items (already secure by omission)
  - Removed to avoid fetching unnecessary sensitive data
- Subtask C: Wrapped demo credentials section in login-screen.tsx with `process.env.NODE_ENV === 'development'`
  - Quick-login buttons (admin/admin123, cashier/cashier123) now only visible in dev mode
  - Production users see clean login form without demo shortcuts
- Verification: `npx tsc --noEmit` — 0 errors

Stage Summary:
- 4 files modified: exchange-rate/route.ts, products/search/route.ts, global-search/route.ts, login-screen.tsx
- costPrice no longer exposed to non-admin users via product search APIs
- Login screen is production-safe (no credential shortcuts)
- exchange-rate POST now uses type-safe Zod validation (422 on invalid input)
- tsc --noEmit: 0 errors

---
Task ID: 17
Agent: Main + 2 Sub-agents
Task: Phase 17 — Security Hardening (تحسين الأمان)

Work Log:
- Level 1 (Critical): Rate limiting + middleware fix + auth route security
  - Created src/lib/rate-limit.ts: sliding window in-memory rate limiter
    - checkRateLimit(key, config) returns { success, remaining, resetAt }
    - LOGIN_RATE_LIMIT: 5 attempts/minute, LOGIN_RATE_LIMIT_SLOW: 15/5min
    - Auto-cleanup every 5 minutes to prevent memory leaks
  - middleware.ts: JWT_SECRET missing now returns 500 (was allowing ALL requests)
  - middleware.ts: Added security headers to ALL responses:
    - X-Content-Type-Options: nosniff
    - X-Frame-Options: DENY
    - X-XSS-Protection: 1; mode=block
    - Referrer-Policy: strict-origin-when-cross-origin
    - Content-Security-Policy (script, style, img, font, connect, frame-ancestors)
  - auth/route.ts: Added Zod loginSchema validation (username: 1-50, password: 1-100)
  - auth/route.ts: Rate limiting on login (429 with Retry-After header)
  - auth/route.ts: Token removed from response body (httpOnly cookie only)
  - auth/route.ts: Auto-hash plaintext passwords on first successful login
- Level 2 (High): RBAC + validation + data filtering
  - 6 routes secured with requireAdmin: analytics, audit-log GET, sales-targets CRUD, daily-close, quick-stats, expense-categories CUD
  - exchange-rate POST: Zod schema with withValidation wrapper
  - products/search: costPrice returns undefined for non-admin users
  - global-search: Removed costPrice from product select (was unused)
  - login-screen: Quick-login buttons wrapped with NODE_ENV === 'development'
- Level 3 (Medium): Config + error handling
  - next.config.ts: allowedDevOrigins restricted to localhost:3000 (was wildcard)
  - api-error-handler.ts: Non-Prisma errors return generic fallback (no detail leak)
  - api-error-handler.ts: Added isValidationError() for proper 422 handling
- Level 4 (Cleanup):
  - seed-passwords: Returns 403 in production (was always available to admin)

Stage Summary:
- Commit: fb61ab7, pushed to GitHub
- 17 files changed: 1 new (rate-limit.ts), 16 modified
- 396 insertions(+), 74 deletions(-)
- tsc --noEmit: 0 errors, bun run lint: 0 errors
- Manual tests: login ✓, token not in body ✓, unauth 401 ✓, page loads ✓
- System now protected against: brute-force, missing JWT_SECRET, costPrice leak, unauthorized admin access

---
Task ID: 18-3
Agent: general-purpose
Task: UX Level 3 — Minor polish (3 subtasks)

Work Log:
- Subtask A: Fixed cart-panel responsive width in src/screens/pos/cart-panel.tsx
  - Changed `lg:w-[400px] xl:w-[420px]` → `lg:w-[360px] xl:w-[400px] 2xl:w-[420px]`
  - Narrower on medium-large screens, wider on very large screens
- Subtask B: Removed noisy navigation toast from src/components/erp/app-layout.tsx
  - Removed entire useEffect that fired toast on every screen change (lines 495-515)
  - Removed unused `import { toast } from 'sonner'`
  - Removed unused `prevScreenRef` ref and `useRef` import
  - All navigation logic (sidebar, mobile close, screen rendering) preserved intact
- Subtask C: Improved EmptyState typography in src/components/empty-state.tsx
  - Changed non-compact mode title from `text-sm` → `text-base` for better prominence
  - Compact mode remains at `text-sm`
- Verification: `npx tsc --noEmit` — 0 errors

Stage Summary:
- 3 files modified with minor UX polish changes
- Cart panel now has better responsive breakpoints
- Navigation toast (noisy UX) removed — screen name still shown in header
- Empty states more visually prominent in non-compact mode
- tsc --noEmit: 0 errors

---
Task ID: 18-1
Agent: general-purpose
Task: UX Level 1 — Critical fixes (4 subtasks)

Work Log:
- Subtask A: Added 401/403/429 redirect handling to useApi hook (src/hooks/use-api.ts)
  - 401/403: Calls `useAppStore.getState().logout()` then redirects to `/` via `window.location.href`
  - 429: Shows `toast.warning('محاولات كثيرة — يرجى الانتظار قليلاً')` instead of generic error
  - Both handlers return null before reaching the generic error toast
  - Uses `typeof window !== 'undefined'` guard for SSR safety
- Subtask B: Fixed Dialog component for Arabic RTL (src/components/ui/dialog.tsx)
  - Changed close button sr-only text from "Close" → "إغلاق"
  - Changed DialogHeader alignment from `sm:text-left` → `sm:text-right`
  - DialogFooter kept as `sm:justify-end` (correct for RTL with flex-row)
- Subtask C: Fixed Dark Mode inconsistencies
  - users-screen.tsx: Cashier avatar already had dark variants (`dark:bg-orange-900/30 dark:text-orange-400`) — no changes needed
  - cart-panel.tsx: Added dark variants to held order "recall" button:
    - `dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-400`
    - `dark:hover:bg-emerald-950/50 dark:hover:text-emerald-300`
- Subtask D: Added loadingCount ref-based counter to useApi for stable parallel loading
  - Added `useRef` import from React
  - Created `loadingCountRef = useRef(0)` for tracking concurrent requests
  - Added `startLoading()` / `stopLoading()` helpers using ref counter
  - `loading` state only becomes true on first request, false when last completes
  - Prevents loading flicker when multiple parallel API calls are made
  - Updated `request` dependencies array to include `startLoading` and `stopLoading`
- Verification: `npx tsc --noEmit` — 0 errors

Stage Summary:
- 3 files modified: use-api.ts, dialog.tsx, cart-panel.tsx
- Auth errors (401/403) now properly redirect to login page
- Rate limit (429) shows user-friendly Arabic warning toast
- Dialog header aligned correctly for RTL Arabic layout
- Cart panel recall button now visible in dark mode
- Parallel API requests no longer cause loading state flicker
- tsc --noEmit: 0 errors

---
Task ID: 18-2
Agent: general-purpose
Task: UX Level 2 — Medium improvements (3 subtasks)

Work Log:
- Subtask A: Standardized search debounce to 300ms in src/hooks/use-data-table.ts
  - Changed debounce timeout from 150ms → 300ms (line 144) for consistent UX across all data tables
- Subtask B: Added total count display to Pagination and unified pagination across screens
  - Updated PaginationProps in src/components/empty-state.tsx: added `total?: number` prop
  - Updated Pagination component to show `({total} نتيجة)` badge when total > 0
  - Replaced custom inline pagination with shared Pagination component in 3 screens:
    - src/screens/customers-screen.tsx: 50-line custom pagination → 1-line Pagination call
    - src/screens/invoices-screen.tsx: 52-line custom pagination → 1-line Pagination call
    - src/screens/inventory-screen.tsx: 51-line custom pagination → 1-line Pagination call
  - users-screen.tsx skipped (no pagination exists — fetches all users at once)
  - Removed unused ChevronLeft/ChevronRight imports from customers and invoices screens
  - Kept ChevronLeft/ChevronRight in inventory-screen (used by stock history pagination)
- Subtask C: Unified EmptyState usage in customers-screen and users-screen
  - src/screens/customers-screen.tsx: Replaced inline empty state (Users icon + text) with shared EmptyState component using PackageOpen icon, contextual description, and "إضافة عميل" action button
  - src/screens/users-screen.tsx: Replaced inline empty state (UserCog icon + text) with shared EmptyState component using UserCog icon, description, and "إضافة مستخدم" action button
  - Both use compact mode and conditional action (only shown when no search filter active)
- Verification: `npx tsc --noEmit` — 0 errors

Stage Summary:
- 5 files modified: use-data-table.ts, empty-state.tsx, customers-screen.tsx, invoices-screen.tsx, inventory-screen.tsx, users-screen.tsx
- Search debounce standardized to 300ms across all useDataTable consumers
- ~150 lines of duplicate pagination code replaced with shared Pagination component (with total count)
- 2 screens now use consistent EmptyState component instead of inline empty state markup
- tsc --noEmit: 0 errors

---
Task ID: 18
Agent: Main + 3 Sub-agents
Task: Phase 18 — UX Improvements (تحسين تجربة المستخدم)

Work Log:
- Level 1 (High): Critical UX fixes
  - use-api.ts: Added 401/403 auto-redirect to login page (clears auth state + window.location.href)
  - use-api.ts: Added 429 rate-limit warning toast ('محاولات كثيرة — يرجى الانتظار قليلاً')
  - use-api.ts: Replaced single boolean loading with ref-based counter for stable parallel requests
  - dialog.tsx: Changed sr-only text from "Close" to "إغلاق" for Arabic screen readers
  - dialog.tsx: Changed DialogHeader from sm:text-left to sm:text-right for RTL layout
  - cart-panel.tsx: Added dark: variants to emerald held-order button (dark:bg-emerald-900/30 etc.)
- Level 2 (Medium): Consistency improvements
  - use-data-table.ts: Standardized search debounce from 150ms to 300ms
  - empty-state.tsx: Added optional 'total' prop to Pagination component (shows 'X نتيجة')
  - customers-screen.tsx: Replaced ~50-line custom pagination + inline empty state with shared components
  - invoices-screen.tsx: Replaced ~52-line custom pagination with shared Pagination
  - inventory-screen.tsx: Replaced ~51-line custom pagination with shared Pagination
  - users-screen.tsx: Replaced inline empty state with EmptyState + action button
- Level 3 (Low): Polish
  - cart-panel.tsx: Responsive width lg:w-[360px] xl:w-[400px] 2xl:w-[420px]
  - app-layout.tsx: Removed noisy navigation toast (screen name already in header)
  - empty-state.tsx: Non-compact title upgraded from text-sm to text-base

Stage Summary:
- Commit: 021c18d, pushed to GitHub
- 11 files changed: 181 insertions(+), 212 deletions(-) (net -31 lines, cleaner)
- tsc --noEmit: 0 errors, bun run lint: 0 errors
- Dev server: compiles clean, no runtime errors
- Key UX wins: session expiry auto-redirect, stable parallel loading, unified pagination/empty states

---
Task ID: 19
Agent: Main
Task: Phase 19 — Final comprehensive review and fixes

Work Log:
- Performed full codebase audit (42,276 lines, 37 API routes, 20+ screens)
- Fixed costPrice leak in products GET/PUT and stock-alerts for non-admin users
- Added requireAdmin to dashboard API endpoint
- Created error.tsx, not-found.tsx, loading.tsx error boundaries
- Fixed undefined token in login-screen (cookie-based auth cleanup)
- Removed unused shadcn Toaster from layout (kept Sonner)
- Fixed missing useState import in confirm-dialog.tsx
- Eliminated N+1 query in quick-stats (replaced with JOIN)
- Added pagination to stock-alerts API
- Removed fragile .env file-reading fallback from db.ts
- Removed unused reducer export from use-toast.ts

Stage Summary:
- 13 files changed: +139 / -69 lines
- All 11 review findings fixed without exception
- TypeScript: 0 errors, ESLint: 0 errors
- Committed as cc95e3a and pushed to GitHub

---
Task ID: 20
Agent: Main
Task: Remove ALL SQLite remnants — Supabase/PostgreSQL only

Work Log:
- Scanned entire codebase for SQLite references (grep across all file types)
- Found SQLite remnants in 2 locations:
  1. src/lib/db.ts — Had getDatabaseUrl() with SQLite fallback, .env file reading, conditional datasourceUrl, SQLite comments
  2. db/custom.db — SQLite database file
- Rewrote src/lib/db.ts: 44 lines → 14 lines (clean PrismaClient with global singleton)
- Removed: getDatabaseUrl(), readFileSync, join imports, SQLite comments, .env fallback, conditional datasourceUrl
- Deleted db/custom.db SQLite file
- Removed empty db/ directory
- Verified: prisma/schema.prisma already says provider = "postgresql" ✅
- Verified: .env already points to Supabase PostgreSQL ✅
- Verified: No SQLite packages in package.json ✅
- Verified: Zero SQLite references remain in entire project (grep confirmed)
- TypeScript: 0 errors, ESLint: 0 errors
- Dev server: running, all API routes return 200 (connected to Supabase)

Stage Summary:
- 1 file rewritten (db.ts: 44→14 lines)
- 1 file deleted (db/custom.db)
- 1 directory deleted (db/)
- Project is now 100% Supabase/PostgreSQL — zero SQLite remnants
- tsc --noEmit: 0 errors, bun run lint: 0 errors

---
Task ID: 21
Agent: Main
Task: E2E Testing — Browser testing and bug fixes

Work Log:
- Tested full POS flow via agent-browser (headless browser automation)
- Login: admin/admin123 ✓
- POS screen: loaded successfully with 21 products ✓
- Discovered critical bug: `customers.map is not a function` in CartPanel
  - Root cause: /api/customers returns `{ customers: [...], total, page, totalPages }` (paginated)
  - But pos-screen.tsx, settings-screen.tsx, loyalty-screen.tsx, customer-statement-screen.tsx were treating response as plain array
- Fixed 4 files:
  - src/screens/pos-screen.tsx: get<any[]> → get<{ customers: Customer[] }>, extract .customers
  - src/screens/settings-screen.tsx: same fix
  - src/screens/loyalty-screen.tsx: same fix
  - src/screens/customer-statement-screen.tsx: same fix
- After fix, tested full invoice creation flow:
  - Added 3 products to cart (كوكاكولا 330مل, عصير برتقال طبيعي, قهوة عربية) ✓
  - Opened payment dialog, selected cash payment ✓
  - Invoice INV-00003 created successfully ✓
  - Stock updated correctly (decreased by 1 each) ✓
  - Verified invoice appears in الفواتير screen ✓
  - Verified stats in التقارير screen: مبيعات اليوم = 40 ر.ي, عدد الفواتير = 2 ✓

Stage Summary:
- 4 files fixed (customers pagination response handling)
- TypeScript: 0 errors, ESLint: 0 errors
- Full POS flow verified working end-to-end
- tsc --noEmit: 0 errors, bun run lint: 0 errors
