---
Task ID: expense-enhance
Agent: Main Agent
Task: Enhance Expense tracking screen with category icons, better UX, and visual improvements

Work Log:
- Read existing files: expense-screen.tsx (1133 lines), expenses/route.ts (301 lines), use-currency.ts
- Verified API already provides: dailyTrend (30-day), recurringSummary, thisWeekExpenses, averageDailyExpense
- Completely rewrote expense-screen.tsx with all requested enhancements

### Changes Made:

#### 1. Category Icon Mapping (6 categories → icon + color)
- "مصروفات تشغيلية" → `Settings` icon, `text-blue-500`, `bg-blue-500/10`
- "صيانة" → `Wrench` icon, `text-amber-500`, `bg-amber-500/10`
- "إيجار" → `Building2` icon, `text-purple-500`, `bg-purple-500/10`
- "رواتب" → `Users` icon, `text-green-500`, `bg-green-500/10`
- "نقل" → `Truck` icon, `text-orange-500`, `bg-orange-500/10`
- "متنوع" → `MoreHorizontal` icon, `text-gray-500`, `bg-gray-500/10`
- Each category has: icon, color, bgClass, borderClass, badgeClass, hexColor

#### 2. Category Summary Cards Section
- New section below summary stats showing all expense categories
- Each card: icon in colored rounded box, category name, total amount, percentage badge, progress bar, transaction count
- Uses `card-hover`, `stagger-children` styling
- Responsive grid: 1 col mobile, 2 col tablet, 3 col desktop
- Only shown when category data exists

#### 3. Monthly Trend Chart (Area Chart)
- Replaced BarChart with Recharts `AreaChart` showing daily expense trend
- Gradient fill from blue to transparent
- Last 30 days data from API `dailyTrend`
- Active dot on hover with white stroke
- Smooth monotone interpolation
- Empty state when no data

#### 4. Recurring Expenses Section
- New `glass-card` section showing recurring expenses
- Each recurring item: category icon, description, category badge, period badge, amount
- Shows "next due" date calculation with days remaining
- Overdue items highlighted with red border/bg
- Responsive grid: 1/2/3 columns

#### 5. Enhanced Summary Stats (5 cards)
- Total Expenses (blue), Today (green), This Week (amber), This Month (red), Average Daily (purple)
- New icons: Wallet, CalendarDays, CalendarRange, BarChart3, ArrowDownUp
- Responsive grid: 2 cols mobile, 3 tablet, 5 desktop

#### 6. Enhanced Add Dialog
- Category selector as 3-column grid of icon cards (click to select)
- Selected state: colored border + background + scale effect
- Amount input with LTR direction
- Date picker (defaults to today)
- Notes textarea (replaces single-line Input)
- Recurring toggle with animated switch
- Period selector as 3-column icon cards (daily/weekly/monthly) with labels
- Submit button with `shimmer` + `btn-primary-gradient`

#### 7. Enhanced Table
- Category column now shows icon + category name (icon in colored rounded box)
- Delete dialog shows category icon instead of generic Receipt icon
- Consistent styling maintained

#### 8. CSS Utility Classes Used
- `animate-fade-in-up`, `card-hover`, `glass-card`, `stagger-children`
- `stat-card-gradient`, `data-card-micro`, `stat-card-blue/green/red`
- `btn-ripple`, `shimmer`, `btn-primary-gradient`, `skeleton-shimmer`
- `badge-active`, `empty-state`, `empty-state-icon`, `empty-state-title`

#### 9. API (no changes needed)
- API already provided all required fields: dailyTrend, recurringSummary, thisWeekExpenses, averageDailyExpense, totalByCategory

### Verification:
- `bun run lint` → 0 errors, 0 warnings
- Dev server → Running clean on localhost:3000
- All existing functionality preserved (CRUD, filters, pagination, export)

Stage Summary:
- Expense screen fully enhanced with 7 major new visual/UX features
- Category icons mapped with consistent color system throughout
- Area chart replaces bar chart for daily trend visualization
- Recurring expenses get dedicated section with due-date tracking
- Add dialog upgraded with icon grid selector and notes textarea
- Zero lint errors, zero breaking changes
