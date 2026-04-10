'use client'

import { useAppStore, type Screen } from '@/store/app-store'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
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
import { QuickStatsPanel } from '@/components/quick-stats-panel'
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
  Bell,
  AlertTriangle,
  Clock,
  Keyboard,
  PackageSearch,
  Settings,
  Sun,
  Moon,
  CalendarCheck,
  ClipboardList,
  DatabaseBackup,
  RotateCcw,
  Receipt,
  SlidersHorizontal,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'

// ─── Hydration-safe mounted hook ─────────────────────────────────
const emptySubscribe = () => () => {}
function useHasMounted() {
  return useSyncExternalStore(emptySubscribe, () => true, () => false)
}

// ─── Low Stock Product Type ────────────────────────────────────────
interface LowStockProduct {
  id: string
  name: string
  quantity: number
  minQuantity: number
  price: number
  category?: { name: string }
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
}

// ─── Keyboard Shortcuts Definition ─────────────────────────────────
const keyboardShortcuts = [
  { keys: ['/', 'Ctrl+K'], description: 'البحث في المنتجات' },
  { keys: ['F2'], description: 'مسح الباركود' },
  { keys: ['F9'], description: 'إتمام عملية الدفع' },
  { keys: ['F1'], description: 'عرض اختصارات لوحة المفاتيح' },
  { keys: ['Escape'], description: 'إغلاق النافذة/مسح البحث' },
]

// ─── Navigation Items ──────────────────────────────────────────────
const navItems: { id: Screen; label: string; icon: React.ElementType; adminOnly?: boolean }[] = [
  { id: 'pos', label: 'نقطة البيع', icon: ShoppingCart },
  { id: 'inventory', label: 'المخزون', icon: Package },
  { id: 'stock-adjustments', label: 'تعديلات المخزون', icon: SlidersHorizontal, adminOnly: true },
  { id: 'purchases', label: 'المشتريات', icon: Truck, adminOnly: true },
  { id: 'customers', label: 'العملاء', icon: Users },
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
]

// ─── Theme Toggle Component ────────────────────────────────────────
function ThemeToggle() {
  const { theme, setTheme } = useTheme()
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
            aria-label={isDark ? 'الوضع الفاتح' : 'الوضع الداكن'}
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
          {isDark ? 'الوضع الفاتح' : 'الوضع الداكن'}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// ─── Live Clock Component ──────────────────────────────────────────
function LiveClock() {
  const [dateTime, setDateTime] = useState('')

  useEffect(() => {
    const updateClock = () => {
      const now = new Date()
      try {
        const formatted = now.toLocaleDateString('ar-SA', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
        const timeFormatted = now.toLocaleTimeString('ar-SA', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        })
        setDateTime(`${formatted} - ${timeFormatted}`)
      } catch {
        setDateTime(now.toLocaleString('ar'))
      }
    }

    updateClock()
    const interval = setInterval(updateClock, 1000)
    return () => clearInterval(interval)
  }, [])

  if (!dateTime) return null

  return (
    <div className="hidden lg:flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium">
      <Clock className="w-3.5 h-3.5 opacity-70" />
      <span>{dateTime}</span>
    </div>
  )
}

// ─── Notification Bell Component ───────────────────────────────────
function NotificationBell() {
  const [lowStockItems, setLowStockItems] = useState<LowStockProduct[]>([])
  const [loading, setLoading] = useState(true)
  const { setScreen } = useAppStore()

  const fetchLowStock = useCallback(async () => {
    try {
      const res = await fetch('/api/products?lowStock=true')
      const json = await res.json()
      if (json.success) {
        setLowStockItems(json.data)
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLowStock()
    // Refresh every 60 seconds
    const interval = setInterval(fetchLowStock, 60000)
    return () => clearInterval(interval)
  }, [fetchLowStock])

  const count = lowStockItems.length

  return (
    <Popover>
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <button className="relative p-2 rounded-xl hover:bg-muted transition-colors badge-ping" aria-label="تنبيهات المخزون">
                <Bell className="w-5 h-5 text-foreground/70" />
                {count > 0 && (
                  <span className="absolute -top-0.5 -left-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-white text-[10px] font-bold leading-none">
                    {count > 99 ? '٩٩+' : count}
                  </span>
                )}
              </button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="font-medium">
            تنبيهات المخزون
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <PopoverContent align="start" side="bottom" className="w-80 p-0" dir="rtl">
        <div className="p-3 border-b border-border/50 flex items-center gap-2">
          <Bell className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold">تنبيهات المخزون المنخفض</h3>
          {count > 0 && (
            <Badge variant="destructive" className="mr-auto text-[10px] px-1.5">
              {count}
            </Badge>
          )}
        </div>

        <ScrollArea className="max-h-72">
          {loading ? (
            <div className="p-6 text-center text-muted-foreground text-xs">
              جاري التحميل...
            </div>
          ) : count === 0 ? (
            <div className="p-6 text-center">
              <Package className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">لا توجد منتجات بمخزون منخفض</p>
            </div>
          ) : (
            <div className="divide-y divide-border/30">
              {lowStockItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-3 p-3 hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => {
                    setScreen('inventory')
                  }}
                >
                  <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <AlertTriangle className="w-4 h-4 text-destructive" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-destructive font-semibold">
                        الكمية: {item.quantity}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        الحد الأدنى: {item.minQuantity}
                      </span>
                    </div>
                    {item.category && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">{item.category.name}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {count > 0 && (
          <div className="p-2 border-t border-border/50">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs font-medium text-primary hover:text-primary hover:bg-primary/5"
              onClick={() => {
                setScreen('inventory')
              }}
            >
              <PackageSearch className="w-3.5 h-3.5 ml-1.5" />
              عرض المخزون
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}

// ─── Keyboard Shortcuts Dialog Component ───────────────────────────
function ShortcutsDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-primary" />
            اختصارات لوحة المفاتيح
          </DialogTitle>
          <DialogDescription>
            استخدام الاختصارات لتسريع العمل في النظام
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 mt-2">
          {keyboardShortcuts.map((shortcut) => (
            <div
              key={shortcut.description}
              className="flex items-center justify-between p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
            >
              <span className="text-sm font-medium text-foreground">
                {shortcut.description}
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
  const isAdmin = user?.role === 'admin'

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
                    ? 'bg-primary text-white shadow-md shadow-primary/25'
                    : 'text-foreground/70 hover:bg-muted hover:text-foreground'
                } ${collapsed ? 'justify-center' : ''}`}
              >
                <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-white' : 'text-foreground/50 group-hover:text-primary'}`} />
                {!collapsed && <span>{item.label}</span>}
                {isActive && !collapsed && (
                  <ChevronLeft className="w-3.5 h-3.5 mr-auto text-white/70" />
                )}
              </button>
            )

            if (collapsed) {
              return (
                <Tooltip key={item.id}>
                  <TooltipTrigger asChild>{button}</TooltipTrigger>
                  <TooltipContent side="right" className="font-medium">
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              )
            }

            return button
          })}
        </nav>
      </TooltipProvider>

      <Separator className="opacity-60" />

      {/* User & Logout */}
      <div className="p-3">
        {!collapsed && user && (
          <div className="mb-2 px-3 py-2 rounded-xl bg-muted/50">
            <p className="text-xs font-semibold text-foreground truncate">{user.name}</p>
            <p className="text-[10px] text-muted-foreground">
              {user.role === 'admin' ? 'مدير النظام' : 'كاشير'}
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
                {!collapsed && <span>تسجيل الخروج</span>}
              </button>
            </TooltipTrigger>
            {collapsed && (
              <TooltipContent side="right" className="font-medium">
                تسجيل الخروج
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
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const prevScreenRef = useRef<Screen>(currentScreen)

  // ── Screen navigation toast ───────────────────────────────────────
  useEffect(() => {
    if (prevScreenRef.current !== currentScreen) {
      const label = screenLabels[currentScreen]
      if (label) {
        toast(label, {
          description: `تم الانتقال إلى ${label}`,
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
  }, [currentScreen])

  // ── Keyboard shortcuts listener ───────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
            className="p-2 rounded-xl hover:bg-muted transition-colors"
          >
            {sidebarOpen ? <ChevronRight className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-semibold text-foreground truncate">
              {navItems.find(n => n.id === currentScreen)?.label || ''}
            </h1>
          </div>

          {/* Right side items in RTL: clock → bell → theme → shortcut hint */}
          <div className="flex items-center gap-1.5">
            {/* Live Clock */}
            <LiveClock />

            {/* Notification Bell */}
            <NotificationBell />

            {/* Dark Mode Toggle */}
            <ThemeToggle />

            {/* Keyboard shortcut hint */}
            <button
              onClick={() => setShortcutsOpen(true)}
              className="flex items-center gap-1.5 p-2 rounded-xl hover:bg-muted transition-colors"
              aria-label="اختصارات لوحة المفاتيح"
            >
              <kbd className="kbd hidden md:inline-flex">F1</kbd>
              <span className="text-[10px] text-muted-foreground hidden md:inline">مساعدة</span>
              <Keyboard className="w-4 h-4 text-muted-foreground md:hidden" />
            </button>
          </div>
        </header>

        {/* Screen Content */}
        <div className="flex-1 overflow-hidden">
          {renderScreen()}
        </div>
      </main>

      {/* Keyboard Shortcuts Dialog */}
      <ShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />

      {/* Floating Quick Stats Panel */}
      <QuickStatsPanel />
    </div>
  )
}
