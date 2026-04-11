'use client'

import { useAppStore, type Screen } from '@/store/app-store'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { POSScreen } from '@/screens/pos-screen'
import { InventoryScreen } from '@/screens/inventory-screen'
import { PurchasesScreen } from '@/screens/purchases-screen'
import { CustomersScreen } from '@/screens/customers-screen'
import { InvoicesScreen } from '@/screens/invoices-screen'
import { DashboardScreen } from '@/screens/dashboard-screen'
import { UsersScreen } from '@/screens/users-screen'
import { SettingsScreen } from '@/screens/settings-screen'
import { DailyCloseScreen } from '@/screens/daily-close-screen'
import { AuditLogScreen } from '@/screens/audit-log-screen'
import { BackupScreen } from '@/screens/backup-screen'
import { ReturnsScreen } from '@/screens/returns-screen'
import { AnalyticsScreen } from '@/screens/analytics-screen'
import { ExpenseScreen } from '@/screens/expense-screen'
import { StockAdjustmentsScreen } from '@/screens/stock-adjustments-screen'
import { SalesTargetsScreen } from '@/screens/sales-targets-screen'
import { CustomerStatementScreen } from '@/screens/customer-statement-screen'
import { LoyaltyScreen } from '@/screens/loyalty-screen'
import { ProductVariantsScreen } from '@/screens/product-variants-screen'
import { QuickStatsPanel } from '@/components/quick-stats-panel'
import { StockAlertsWidget } from '@/components/stock-alerts-widget'
import { GlobalSearchDialog } from '@/components/global-search-dialog'
import { toast } from 'sonner'
import {
  ShoppingCart,
  Package,
  Truck,
  Users,
  FileText,
  BarChart3,
  TrendingUp,
  UserCog,
  LogOut,
  Target,
  ChevronRight,
  ChevronLeft,
  Menu,
  X,
  Clock,
  Keyboard,
  Settings,
  Sun,
  Moon,
  CalendarCheck,
  ClipboardList,
  DatabaseBackup,
  RotateCcw,
  Receipt,
  SlidersHorizontal,
  Search,
  Languages,
  Gift,
  Layers,
} from 'lucide-react'
import { useTranslation } from '@/lib/translations'
import { useTheme } from 'next-themes'
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'

// ─── Hydration-safe mounted hook ─────────────────────────────────
const emptySubscribe = () => () => {}
function useHasMounted() {
  return useSyncExternalStore(emptySubscribe, () => true, () => false)
}

// ─── Screen Labels Map ─────────────────────────────────────────────
const screenLabels: Record<Screen, string> = {
  pos: 'نقطة البيع',
  inventory: 'المخزون',
  'stock-adjustments': 'تعديلات المخزون',
  purchases: 'المشتريات',
  customers: 'العملاء',
  invoices: 'الفواتير',
  returns: 'المرتجعات',
  dashboard: 'التقارير',
  users: 'المستخدمين',
  settings: 'الإعدادات',
  'daily-close': 'إغلاق اليوم',
  'audit-log': 'سجل العمليات',
  backup: 'النسخ الاحتياطي',
  analytics: 'التحليلات المتقدمة',
  expenses: 'المصروفات',
  'sales-targets': 'أهداف المبيعات',
  'customer-statement': 'كشف حساب عميل',
  loyalty: 'برنامج النقاط',
  'product-variants': 'متغيرات المنتجات',
}

// ─── Keyboard Shortcuts Definition (uses translation keys) ──────
const keyboardShortcutKeys = [
  { keys: ['/', 'Ctrl+K'], descriptionKey: 'searchProducts' },
  { keys: ['F2'], descriptionKey: 'scanBarcode' },
  { keys: ['F9'], descriptionKey: 'completePayment' },
  { keys: ['F1'], descriptionKey: 'showShortcuts' },
  { keys: ['Escape'], descriptionKey: 'closeWindow' },
] as const

// ─── Navigation Items ──────────────────────────────────────────────
const navItems: { id: Screen; label: string; icon: React.ElementType; adminOnly?: boolean }[] = [
  { id: 'pos', label: 'نقطة البيع', icon: ShoppingCart },
  { id: 'inventory', label: 'المخزون', icon: Package },
  { id: 'stock-adjustments', label: 'تعديلات المخزون', icon: SlidersHorizontal, adminOnly: true },
  { id: 'purchases', label: 'المشتريات', icon: Truck, adminOnly: true },
  { id: 'customers', label: 'العملاء', icon: Users },
  { id: 'loyalty', label: 'برنامج النقاط', icon: Gift },
  { id: 'invoices', label: 'الفواتير', icon: FileText },
  { id: 'returns', label: 'المرتجعات', icon: RotateCcw, adminOnly: true },
  { id: 'dashboard', label: 'التقارير', icon: BarChart3, adminOnly: true },
  { id: 'users', label: 'المستخدمين', icon: UserCog, adminOnly: true },
  { id: 'settings', label: 'الإعدادات', icon: Settings },
  { id: 'daily-close', label: 'إغلاق اليوم', icon: CalendarCheck, adminOnly: true },
  { id: 'audit-log', label: 'سجل العمليات', icon: ClipboardList, adminOnly: true },
  { id: 'backup', label: 'النسخ الاحتياطي', icon: DatabaseBackup, adminOnly: true },
  { id: 'expenses', label: 'المصروفات', icon: Receipt, adminOnly: true },
  { id: 'analytics', label: 'التحليلات المتقدمة', icon: TrendingUp },
  { id: 'sales-targets', label: 'أهداف المبيعات', icon: Target, adminOnly: true },
  { id: 'customer-statement', label: 'كشف حساب عميل', icon: FileText, adminOnly: true },
  { id: 'product-variants', label: 'متغيرات المنتجات', icon: Layers, adminOnly: true },
]

// ─── Theme Toggle Component ────────────────────────────────────────
function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const { t } = useTranslation()
  const mounted = useHasMounted()

  if (!mounted) {
    return (
      <div className="p-2 rounded-xl" aria-hidden="true">
        <div className="w-5 h-5" />
      </div>
    )
  }

  const isDark = theme === 'dark'

  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className="relative p-2 rounded-xl hover:bg-muted transition-all duration-300"
            aria-label={isDark ? t('theme.light') : t('theme.dark')}
          >
            <div className="relative w-5 h-5">
              <Sun
                className={`w-5 h-5 absolute inset-0 transition-all duration-300 ${
                  isDark
                    ? 'opacity-0 rotate-90 scale-0'
                    : 'opacity-100 rotate-0 scale-100 text-foreground/70'
                }`}
              />
              <Moon
                className={`w-5 h-5 absolute inset-0 transition-all duration-300 ${
                  isDark
                    ? 'opacity-100 rotate-0 scale-100 text-foreground/70'
                    : 'opacity-0 -rotate-90 scale-0'
                }`}
              />
            </div>
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="font-medium">
          {isDark ? t('theme.light') : t('theme.dark')}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// ─── Language Toggle Component ─────────────────────────────────────
function LanguageToggle() {
  const { t, lang, setLang } = useTranslation()
  const mounted = useHasMounted()

  if (!mounted) {
    return (
      <div className="p-2 rounded-xl" aria-hidden="true">
        <div className="w-5 h-5" />
      </div>
    )
  }

  const toggleLang = () => setLang(lang === 'ar' ? 'en' : 'ar')

  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={toggleLang}
            className="p-2 rounded-xl hover:bg-muted transition-all duration-300 flex items-center gap-1"
            aria-label={lang === 'ar' ? 'English' : 'عربي'}
          >
            <Languages className="w-4 h-4 text-foreground/70" />
            <span className="text-[10px] font-semibold text-foreground/70 hidden sm:inline">
              {lang === 'ar' ? 'EN' : 'عربي'}
            </span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="font-medium">
          {lang === 'ar' ? 'English' : 'عربي'}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// ─── Live Clock Component ──────────────────────────────────────────
function LiveClock() {
  const [dateTime, setDateTime] = useState('')
  const { locale } = useTranslation()

  useEffect(() => {
    const updateClock = () => {
      const now = new Date()
      try {
        const formatted = now.toLocaleDateString(locale, {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
        const timeFormatted = now.toLocaleTimeString(locale, {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        })
        setDateTime(`${formatted} - ${timeFormatted}`)
      } catch {
        setDateTime(now.toLocaleString())
      }
    }

    updateClock()
    const interval = setInterval(updateClock, 1000)
    return () => clearInterval(interval)
  }, [locale])

  if (!dateTime) return null

  return (
    <div className="hidden lg:flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium">
      <Clock className="w-3.5 h-3.5 opacity-70" />
      <span>{dateTime}</span>
    </div>
  )
}

// ─── Notification Bell (replaced by StockAlertsWidget) ─────────────
// Legacy NotificationBell removed — now using StockAlertsWidget component
// which has enhanced color-coded alerts, summary badges, and auto-refresh

// ─── Keyboard Shortcuts Dialog Component ───────────────────────────
function ShortcutsDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t, isRTL } = useTranslation()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" dir={isRTL ? 'rtl' : 'ltr'}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-primary" />
            {t('shortcuts.title')}
          </DialogTitle>
          <DialogDescription>
            {t('shortcuts.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 mt-2">
          {keyboardShortcutKeys.map((shortcut) => (
            <div
              key={shortcut.descriptionKey}
              className="flex items-center justify-between p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
            >
              <span className="text-sm font-medium text-foreground">
                {t(`shortcuts.${shortcut.descriptionKey}` as keyof ReturnType<typeof t>)}
              </span>
              <div className="flex items-center gap-1.5">
                {shortcut.keys.map((key) => (
                  <span key={key} className="kbd">
                    {key}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Sidebar Content ───────────────────────────────────────────────
function SidebarContent({ collapsed }: { collapsed: boolean }) {
  const { user, currentScreen, setScreen, logout, sidebarOpen, setSidebarOpen } = useAppStore()
  const { t, isRTL } = useTranslation()
  const isAdmin = user?.role === 'admin'

  // Navigation key mapping
  const navKeyMap: Record<Screen, string> = {
    pos: 'nav.pos',
    inventory: 'nav.inventory',
    'stock-adjustments': 'nav.stock-adjustments',
    purchases: 'nav.purchases',
    customers: 'nav.customers',
    invoices: 'nav.invoices',
    returns: 'nav.returns',
    dashboard: 'nav.dashboard',
    users: 'nav.users',
    settings: 'nav.settings',
    'daily-close': 'nav.daily-close',
    'audit-log': 'nav.audit-log',
    backup: 'nav.backup',
    analytics: 'nav.analytics',
    expenses: 'nav.expenses',
    'sales-targets': 'nav.sales-targets',
    'customer-statement': 'nav.customer-statement',
    loyalty: 'nav.loyalty',
    'product-variants': 'nav.product-variants',
  }

  const handleNav = (screen: Screen) => {
    setScreen(screen)
    // Close sidebar on mobile
    if (window.innerWidth < 768) {
      setSidebarOpen(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center flex-shrink-0 logo-breath">
          <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M8 2h8l4 10H4L8 2z" />
            <path d="M4 12h16v2H4z" />
            <path d="M6 14v6a2 2 0 002 2h8a2 2 0 002-2v-6" />
          </svg>
        </div>
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-bold text-foreground truncate">السلطان</h2>
            <p className="text-[10px] text-muted-foreground truncate">للمشروبات</p>
          </div>
        )}
        {/* Mobile close button */}
        {sidebarOpen && (
          <button onClick={() => setSidebarOpen(false)} className="md:hidden p-1 rounded-lg hover:bg-muted">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <Separator className="opacity-60" />

      {/* Navigation */}
      <TooltipProvider delayDuration={0}>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          <div className="sidebar-section-title">القائمة الرئيسية</div>
          {navItems.map((item) => {
            if (item.adminOnly && !isAdmin) return null
            const isActive = currentScreen === item.id
            const Icon = item.icon

            const button = (
              <button
                key={item.id}
                onClick={() => handleNav(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
                  isActive
                    ? 'bg-primary text-white shadow-md shadow-primary/25 sidebar-item-indicator'
                    : 'text-foreground/70 hover:bg-muted hover:text-foreground'
                } ${collapsed ? 'justify-center' : ''}`}
              >
                <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-white' : 'text-foreground/50 group-hover:text-primary'}`} />
                {!collapsed && <span>{t(navKeyMap[item.id] as keyof ReturnType<typeof t>)}</span>}
                {isActive && !collapsed && (
                  (isRTL ? <ChevronLeft className="w-3.5 h-3.5 mr-auto text-white/70" /> : <ChevronRight className="w-3.5 h-3.5 ml-auto text-white/70" />)
                )}
              </button>
            )

            if (collapsed) {
              return (
                <Tooltip key={item.id}>
                  <TooltipTrigger asChild>{button}</TooltipTrigger>
                  <TooltipContent side={isRTL ? 'right' : 'left'} className="font-medium">
                    {t(navKeyMap[item.id] as keyof ReturnType<typeof t>)}
                  </TooltipContent>
                </Tooltip>
              )
            }

            return button
          })}
        </nav>
      </TooltipProvider>

      <Separator className="opacity-60" />
      <div className="sidebar-section-title px-3">الحساب</div>

      {/* User & Logout */}
      <div className="p-3">
        {!collapsed && user && (
          <div className="mb-2 px-3 py-2 rounded-xl bg-muted/50 sidebar-user-card">
            <div className="flex items-center gap-2">
              <span className="badge-dot bg-primary mt-0.5" aria-hidden="true"></span>
              <p className="text-xs font-semibold text-foreground truncate">{user.name}</p>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              <span className={`badge-status ${user.role === 'admin' ? 'badge-status-success' : 'badge-status-info'}`}>
                {user.role === 'admin' ? t('common.admin') : t('common.cashier')}
              </span>
            </p>
          </div>
        )}
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={logout}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-destructive/80 hover:bg-destructive/10 hover:text-destructive transition-all duration-200 ${collapsed ? 'justify-center' : ''}`}
              >
                <LogOut className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span>{t('common.logout')}</span>}
              </button>
            </TooltipTrigger>
            {collapsed && (
              <TooltipContent side={isRTL ? 'right' : 'left'} className="font-medium">
                {t('common.logout')}
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  )
}

// ─── Main AppLayout ────────────────────────────────────────────────
export function AppLayout() {
  const { currentScreen, sidebarOpen, setSidebarOpen, toggleSidebar } = useAppStore()
  const { t, isRTL } = useTranslation()
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const prevScreenRef = useRef<Screen>(currentScreen)

  // Navigation key mapping
  const navKeyMap: Record<Screen, string> = {
    pos: 'nav.pos',
    inventory: 'nav.inventory',
    'stock-adjustments': 'nav.stock-adjustments',
    purchases: 'nav.purchases',
    customers: 'nav.customers',
    invoices: 'nav.invoices',
    returns: 'nav.returns',
    dashboard: 'nav.dashboard',
    users: 'nav.users',
    settings: 'nav.settings',
    'daily-close': 'nav.daily-close',
    'audit-log': 'nav.audit-log',
    backup: 'nav.backup',
    analytics: 'nav.analytics',
    expenses: 'nav.expenses',
    'sales-targets': 'nav.sales-targets',
    'customer-statement': 'nav.customer-statement',
    loyalty: 'nav.loyalty',
    'product-variants': 'nav.product-variants',
  }

  // ── Screen navigation toast ───────────────────────────────────────
  useEffect(() => {
    if (prevScreenRef.current !== currentScreen) {
      const label = t(navKeyMap[currentScreen] as keyof ReturnType<typeof t>)
      if (label) {
        toast(label, {
          description: `${t('toast.navigatedTo')} ${label}`,
          duration: 1500,
          icon: (() => {
            const item = navItems.find(n => n.id === currentScreen)
            if (item) {
              const Icon = item.icon
              return <Icon className="w-4 h-4 text-primary" />
            }
            return null
          })(),
        })
      }
      prevScreenRef.current = currentScreen
    }
  }, [currentScreen, t])

  // ── Keyboard shortcuts listener ───────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+K or / → Global search dialog
      if ((e.ctrlKey && e.key === 'k') || (e.key === '/' && !e.ctrlKey && !e.metaKey)) {
        const target = e.target as HTMLElement
        // Don't trigger if user is typing in an input/textarea
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return
        e.preventDefault()
        e.stopPropagation()
        setSearchOpen(true)
      }

      // F1 → Shortcuts dialog
      if (e.key === 'F1') {
        e.preventDefault()
        e.stopPropagation()
        setShortcutsOpen(true)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  const renderScreen = () => {
    switch (currentScreen) {
      case 'pos': return <POSScreen />
      case 'inventory': return <InventoryScreen />
      case 'stock-adjustments': return <StockAdjustmentsScreen />
      case 'purchases': return <PurchasesScreen />
      case 'customers': return <CustomersScreen />
      case 'invoices': return <InvoicesScreen />
      case 'returns': return <ReturnsScreen />
      case 'dashboard': return <DashboardScreen />
      case 'users': return <UsersScreen />
      case 'settings': return <SettingsScreen />
      case 'daily-close': return <DailyCloseScreen />
      case 'audit-log': return <AuditLogScreen />
      case 'backup': return <BackupScreen />
      case 'analytics': return <AnalyticsScreen />
      case 'expenses': return <ExpenseScreen />
      case 'sales-targets': return <SalesTargetsScreen />
      case 'customer-statement': return <CustomerStatementScreen />
      case 'loyalty': return <LoyaltyScreen />
      case 'product-variants': return <ProductVariantsScreen />
      default: return <POSScreen />
    }
  }

  return (
    <div className="h-screen flex overflow-hidden bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`sidebar-glass fixed md:relative z-50 md:z-auto h-full flex-shrink-0 transition-all duration-300 ease-in-out ${
          sidebarOpen ? 'w-56 translate-x-0' : 'w-0 -translate-x-full md:translate-x-0 md:w-16'
        }`}
      >
        <div className="h-full w-56 md:w-auto overflow-hidden">
          <SidebarContent collapsed={!sidebarOpen || false} />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Bar */}
        <header className="h-14 header-glass header-gradient-border border-b-0 flex items-center px-4 gap-3 flex-shrink-0">
          <button
            onClick={toggleSidebar}
            className="header-action-btn p-2 rounded-xl hover:bg-muted transition-colors"
          >
            <div className={`sidebar-collapse-indicator ${sidebarOpen ? '' : 'collapsed'}`}>
              {sidebarOpen ? <ChevronRight className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </div>
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-semibold text-foreground truncate">
              {t(navKeyMap[currentScreen] as keyof ReturnType<typeof t>)}
            </h1>
          </div>

          {/* Right side items in RTL: clock → bell → theme → search hint → shortcut hint */}
          <div className="flex items-center gap-1.5">
            {/* Live Clock */}
            <LiveClock />

            {/* Stock Alert Notifications Widget */}
            <StockAlertsWidget />

            {/* Global Search Button */}
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-1.5 p-2 rounded-xl hover:bg-muted transition-colors"
              aria-label="البحث في المنتجات"
            >
              <kbd className="kbd hidden md:inline-flex">Ctrl+K</kbd>
              <Search className="w-4 h-4 text-muted-foreground md:hidden" />
              <span className="text-[10px] text-muted-foreground hidden md:inline">{t('common.search')}</span>
              <span className="header-notification-dot" aria-hidden="true"></span>
            </button>

            {/* Language Toggle */}
            <LanguageToggle />

            {/* Dark Mode Toggle */}
            <ThemeToggle />

            {/* Keyboard shortcut hint */}
            <button
              onClick={() => setShortcutsOpen(true)}
              className="flex items-center gap-1.5 p-2 rounded-xl hover:bg-muted transition-colors"
              aria-label={t('shortcuts.title')}
            >
              <kbd className="kbd hidden md:inline-flex">F1</kbd>
              <span className="text-[10px] text-muted-foreground hidden md:inline">{t('common.help')}</span>
              <Keyboard className="w-4 h-4 text-muted-foreground md:hidden" />
            </button>
          </div>
        </header>

        {/* Screen Content */}
        <div key={currentScreen} className="flex-1 overflow-hidden animate-fade-in-up">
          {renderScreen()}
        </div>
      </main>

      {/* Keyboard Shortcuts Dialog */}
      <ShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />

      {/* Global Search Dialog */}
      <GlobalSearchDialog open={searchOpen} onOpenChange={setSearchOpen} />

      {/* Floating Quick Stats Panel */}
      <QuickStatsPanel />
    </div>
  )
}
