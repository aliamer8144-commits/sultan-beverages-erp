'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { exportToCSV } from '@/lib/export-csv'
import {
  ClipboardList,
  Search,
  Download,
  RefreshCw,
  X,
  Loader2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  Monitor,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  PlusCircle,
  Edit3,
  Trash2,
  LogIn,
  LogOut,
  CreditCard,
  Database,
  RotateCcw,
  Info,
  Filter,
} from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────

interface AuditLogEntry {
  id: string
  action: string
  entity: string
  entityId: string | null
  details: Record<string, unknown> | null
  userName: string | null
  ipAddress: string | null
  createdAt: string
  createdAtRaw: string
}

// ── Constants ──────────────────────────────────────────────────────

const actionLabels: Record<string, string> = {
  create: 'إنشاء',
  update: 'تعديل',
  delete: 'حذف',
  login: 'تسجيل دخول',
  logout: 'تسجيل خروج',
  payment: 'دفع',
  backup: 'نسخ احتياطي',
  restore: 'استعادة',
}

const entityLabels: Record<string, string> = {
  User: 'المستخدمين',
  Product: 'المنتجات',
  Customer: 'العملاء',
  Invoice: 'الفواتير',
  Category: 'الفئات',
  Supplier: 'الموردين',
  Payment: 'المدفوعات',
  System: 'النظام',
}

const actionColors: Record<string, string> = {
  create: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  update: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  delete: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  login: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  logout: 'bg-gray-100 text-gray-600 dark:bg-gray-800/50 dark:text-gray-400',
  payment: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  backup: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  restore: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
}

const actionIconColors: Record<string, string> = {
  create: 'text-emerald-600 dark:text-emerald-400',
  update: 'text-blue-600 dark:text-blue-400',
  delete: 'text-red-600 dark:text-red-400',
  login: 'text-purple-600 dark:text-purple-400',
  logout: 'text-gray-500 dark:text-gray-400',
  payment: 'text-amber-600 dark:text-amber-400',
  backup: 'text-cyan-600 dark:text-cyan-400',
  restore: 'text-teal-600 dark:text-teal-400',
}

function getActionIcon(action: string) {
  switch (action) {
    case 'create': return PlusCircle
    case 'update': return Edit3
    case 'delete': return Trash2
    case 'login': return LogIn
    case 'logout': return LogOut
    case 'payment': return CreditCard
    case 'backup': return Database
    case 'restore': return RotateCcw
    default: return Info
  }
}

function getRelativeTime(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHour = Math.floor(diffMs / 3600000)
  const diffDay = Math.floor(diffMs / 86400000)

  if (diffMin < 1) return 'الآن'
  if (diffMin < 60) return `منذ ${diffMin} دقيقة`
  if (diffHour < 24) return `منذ ${diffHour} ساعة`
  if (diffDay < 7) return `منذ ${diffDay} يوم`
  return date.toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

// ── Component ──────────────────────────────────────────────────────

export function AuditLogScreen() {
  // Filters
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [entityFilter, setEntityFilter] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  // Data
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [currentPage, setCurrentPage] = useState(1)
  const limit = 20

  // Auto-refresh
  const [autoRefresh, setAutoRefresh] = useState(false)
  const autoRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Expanded log
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // ── Fetch Logs ─────────────────────────────────────────────────

  const fetchLogs = useCallback(async (page = 1) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('limit', String(limit))
      if (search.trim()) params.set('search', search.trim())
      if (actionFilter) params.set('action', actionFilter)
      if (entityFilter) params.set('entity', entityFilter)
      if (startDate) params.set('startDate', startDate)
      if (endDate) params.set('endDate', endDate)

      const res = await fetch(`/api/audit-log?${params.toString()}`)
      if (!res.ok) throw new Error('فشل في تحميل سجل العمليات')
      const data = await res.json()
      setLogs(data.data || [])
      setTotal(data.total || 0)
      setTotalPages(data.totalPages || 1)
      setCurrentPage(data.page || 1)
    } catch {
      toast.error('حدث خطأ أثناء تحميل سجل العمليات')
      setLogs([])
    } finally {
      setLoading(false)
    }
  }, [search, actionFilter, entityFilter, startDate, endDate])

  useEffect(() => {
    fetchLogs(1)
  }, [fetchLogs])

  // ── Auto-refresh ───────────────────────────────────────────────

  useEffect(() => {
    if (autoRefresh) {
      autoRefreshRef.current = setInterval(() => {
        fetchLogs(currentPage)
      }, 30000)
    }
    return () => {
      if (autoRefreshRef.current) {
        clearInterval(autoRefreshRef.current)
        autoRefreshRef.current = null
      }
    }
  }, [autoRefresh, currentPage, fetchLogs])

  // ── Handlers ───────────────────────────────────────────────────

  const clearFilters = () => {
    setSearch('')
    setActionFilter('')
    setEntityFilter('')
    setStartDate('')
    setEndDate('')
  }

  const handleExport = () => {
    if (logs.length === 0) {
      toast.error('لا توجد بيانات للتصدير')
      return
    }

    const exportData = logs.map((log) => ({
      'العملية': actionLabels[log.action] || log.action,
      'الكيان': entityLabels[log.entity] || log.entity,
      'المستخدم': log.userName || '—',
      'التفاصيل': log.details ? Object.entries(log.details).map(([k, v]) => `${k}: ${v}`).join(' | ') : '—',
      'التاريخ': log.createdAt,
    }))

    exportToCSV(exportData, `سجل-العمليات-${new Date().toLocaleDateString('ar-SA')}`)
    toast.success('تم تصدير السجل بنجاح')
  }

  const hasActiveFilters = search.trim() || actionFilter || entityFilter || startDate || endDate

  // ── Pagination ─────────────────────────────────────────────────

  const getPageNumbers = () => {
    const pages: (number | string)[] = []
    const maxVisible = 5

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages)
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages)
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages)
      }
    }

    return pages
  }

  // ── Render ─────────────────────────────────────────────────────

  return (
    <div className="h-full flex flex-col animate-fade-in-up">
      {/* Header */}
      <div className="px-4 md:px-6 pt-4 pb-2 flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground heading-decoration">سجل العمليات</h2>
              <p className="text-xs text-muted-foreground">تتبع جميع العمليات في النظام</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Auto-refresh toggle */}
            <Button
              variant={autoRefresh ? 'default' : 'outline'}
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`gap-2 btn-ripple ${autoRefresh ? 'animate-pulse-glow' : ''}`}
            >
              <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''} ${autoRefresh ? 'animation-duration-[3s]' : ''}`} />
              <span className="hidden sm:inline">{autoRefresh ? 'تحديث تلقائي' : 'تحديث تلقائي'}</span>
            </Button>
            {/* Export CSV */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={logs.length === 0}
              className="gap-2 btn-ripple"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">تصدير السجل</span>
            </Button>
            {/* Filter toggle */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="gap-2"
            >
              <Filter className="w-4 h-4" />
              <span className="hidden sm:inline">تصفية</span>
              {hasActiveFilters && (
                <Badge variant="secondary" className="h-5 w-5 p-0 flex items-center justify-center text-[10px]">
                  !
                </Badge>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="px-4 md:px-6 pb-3 flex-shrink-0">
          <div className="bg-muted/50 rounded-xl p-4 border border-border/50 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground">خيارات التصفية</p>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-xs gap-1 text-destructive hover:text-destructive">
                  <X className="w-3 h-3" />
                  مسح الفلاتر
                </Button>
              )}
            </div>

            {/* Search */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">بحث بالاسم أو التفاصيل</Label>
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="ابحث في السجل..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pr-9 h-9 text-sm input-glass"
                />
              </div>
            </div>

            {/* Dropdowns Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">نوع العملية</Label>
                <Select value={actionFilter} onValueChange={(v) => setActionFilter(v === 'all' ? '' : v)}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="جميع العمليات" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع العمليات</SelectItem>
                    {Object.entries(actionLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">نوع الكيان</Label>
                <Select value={entityFilter} onValueChange={(v) => setEntityFilter(v === 'all' ? '' : v)}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="جميع الكيانات" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الكيانات</SelectItem>
                    {Object.entries(entityLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Date range */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  من تاريخ
                </Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  إلى تاريخ
                </Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Bar */}
      <div className="px-4 md:px-6 pb-2 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <p className="text-xs text-muted-foreground">
              {loading ? 'جاري التحميل...' : `${total} عملية مسجلة`}
            </p>
            {autoRefresh && (
              <Badge variant="outline" className="text-[10px] h-5 animate-pulse-glow gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                مباشر
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fetchLogs(currentPage)}
            className="h-7 text-xs gap-1"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            تحديث
          </Button>
        </div>
      </div>

      {/* Log List */}
      <div className="flex-1 overflow-hidden">
        {loading && logs.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground">جاري تحميل سجل العمليات...</p>
            </div>
          </div>
        ) : logs.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="empty-state">
              <div className="empty-state-icon">
                <ShieldCheck className="w-10 h-10 text-muted-foreground/40" />
              </div>
              <div className="empty-state-title">
                {hasActiveFilters ? 'لا توجد نتائج' : 'السجل فارغ'}
              </div>
              <div className="empty-state-description">
                {hasActiveFilters
                  ? 'لم يتم العثور على عمليات تطابق معايير البحث. حاول تغيير الفلاتر.'
                  : 'لم يتم تسجيل أي عمليات بعد. ستظهر العمليات هنا تلقائياً.'}
              </div>
            </div>
          </div>
        ) : (
          <ScrollArea className="h-full px-4 md:px-6 pb-4">
            <div className="space-y-2 stagger-children">
              {logs.map((log) => {
                const isExpanded = expandedId === log.id
                const ActionIcon = getActionIcon(log.action)
                const iconColor = actionIconColors[log.action] || 'text-muted-foreground'
                const badgeColor = actionColors[log.action] || 'bg-muted text-muted-foreground'

                return (
                  <div
                    key={log.id}
                    className="bg-card border border-border/60 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 card-hover"
                  >
                    {/* Main Row */}
                    <div className="flex items-center gap-3 p-3 md:p-4">
                      {/* Action Icon */}
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        log.action === 'create' ? 'bg-emerald-50 dark:bg-emerald-900/20' :
                        log.action === 'update' ? 'bg-blue-50 dark:bg-blue-900/20' :
                        log.action === 'delete' ? 'bg-red-50 dark:bg-red-900/20' :
                        log.action === 'login' ? 'bg-purple-50 dark:bg-purple-900/20' :
                        log.action === 'payment' ? 'bg-amber-50 dark:bg-amber-900/20' :
                        log.action === 'backup' ? 'bg-cyan-50 dark:bg-cyan-900/20' :
                        log.action === 'restore' ? 'bg-teal-50 dark:bg-teal-900/20' :
                        'bg-muted'
                      }`}>
                        <ActionIcon className={`w-4 h-4 ${iconColor}`} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge
                            variant="secondary"
                            className={`text-[10px] px-2 py-0 h-5 font-semibold flex-shrink-0 ${badgeColor}`}
                          >
                            {actionLabels[log.action] || log.action}
                          </Badge>
                          <Badge variant="outline" className="text-[10px] px-2 py-0 h-5 flex-shrink-0">
                            {entityLabels[log.entity] || log.entity}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          {log.userName && (
                            <span className="flex items-center gap-1 truncate">
                              <User className="w-3 h-3 flex-shrink-0" />
                              {log.userName}
                            </span>
                          )}
                          <span className="flex items-center gap-1 flex-shrink-0">
                            <Clock className="w-3 h-3" />
                            {getRelativeTime(log.createdAtRaw)}
                          </span>
                        </div>
                      </div>

                      {/* Right side: IP + expand */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {log.ipAddress && (
                          <span className="hidden md:flex items-center gap-1 text-[10px] text-muted-foreground">
                            <Monitor className="w-3 h-3" />
                            {log.ipAddress}
                          </span>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => setExpandedId(isExpanded ? null : log.id)}
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="border-t border-border/50">
                        <div className="p-3 md:p-4 bg-muted/30">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {/* Timestamp */}
                            <div className="space-y-1">
                              <p className="text-[10px] text-muted-foreground font-medium">التاريخ والوقت</p>
                              <p className="text-xs font-medium text-foreground">{log.createdAt}</p>
                            </div>
                            {/* User */}
                            <div className="space-y-1">
                              <p className="text-[10px] text-muted-foreground font-medium">المستخدم</p>
                              <p className="text-xs font-medium text-foreground">{log.userName || 'غير محدد'}</p>
                            </div>
                            {/* IP */}
                            <div className="space-y-1">
                              <p className="text-[10px] text-muted-foreground font-medium">عنوان IP</p>
                              <p className="text-xs font-medium text-foreground font-mono">{log.ipAddress || 'غير محدد'}</p>
                            </div>
                          </div>

                          {/* Details JSON */}
                          {log.details && Object.keys(log.details).length > 0 && (
                            <div className="mt-3">
                              <p className="text-[10px] text-muted-foreground font-medium mb-1.5">تفاصيل العملية</p>
                              <div className="bg-background rounded-lg border border-border/50 p-3 space-y-1.5">
                                {Object.entries(log.details).map(([key, value]) => (
                                  <div key={key} className="flex items-start gap-2 text-xs">
                                    <span className="text-muted-foreground font-medium flex-shrink-0 min-w-[80px]">
                                      {key}:
                                    </span>
                                    <span className="text-foreground break-all">
                                      {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Entity ID */}
                          {log.entityId && (
                            <div className="mt-2">
                              <p className="text-[10px] text-muted-foreground font-medium">
                                معرف الكيان: <span className="font-mono text-foreground">{log.entityId}</span>
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-4 md:px-6 py-3 flex-shrink-0 border-t border-border/50 bg-card/50">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              صفحة {currentPage} من {totalPages} ({total} نتيجة)
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={currentPage <= 1}
                onClick={() => fetchLogs(currentPage - 1)}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
              {getPageNumbers().map((p, i) =>
                typeof p === 'string' ? (
                  <span key={`dots-${i}`} className="px-1 text-xs text-muted-foreground">...</span>
                ) : (
                  <Button
                    key={p}
                    variant={currentPage === p ? 'default' : 'outline'}
                    size="icon"
                    className="h-8 w-8 text-xs"
                    onClick={() => fetchLogs(p)}
                  >
                    {p}
                  </Button>
                )
              )}
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={currentPage >= totalPages}
                onClick={() => fetchLogs(currentPage + 1)}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
