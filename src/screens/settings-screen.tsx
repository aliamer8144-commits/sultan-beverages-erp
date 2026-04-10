'use client'

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { useAppStore, type SettingsState, CURRENCY_MAP, type CurrencyCode } from '@/store/app-store'
import { formatCurrency as fc, getCurrencySymbol } from '@/lib/currency'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import {
  Store,
  Receipt,
  ShoppingCart,
  Monitor,
  Save,
  Phone,
  MapPin,
  Hash,
  ImageIcon,
  Type,
  FileText,
  DollarSign,
  User,
  CreditCard,
  Gauge,
  Sun,
  Moon,
  Target,
  Plus,
  Pencil,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Globe,
  Eye,
  ArrowLeftRight,
  Star,
} from 'lucide-react'
import { useTheme } from 'next-themes'

// ─── Hydration-safe mounted hook ─────────────────────────────────
const emptySubscribe = () => () => {}
function useHasMounted() {
  return useSyncExternalStore(emptySubscribe, () => true, () => false)
}

// ─── Customer type for default customer select ─────────────────────
interface Customer {
  id: string
  name: string
  phone: string
}

// ─── Sales Target type ──────────────────────────────────────────
interface SalesTarget {
  id: string
  type: string
  targetAmount: number
  startDate: string
  endDate: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  currentAmount: number
  progressPercent: number
  remainingAmount: number
  daysRemaining: number
  hoursRemaining: number
}

// ─── SettingsCard Component ───────────────────────────────────────
function SettingsCard({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ElementType
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <Card className="glass-card glass-card-frosted card-hover">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Icon className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold">{title}</CardTitle>
            <CardDescription className="text-xs">{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {children}
      </CardContent>
    </Card>
  )
}

// ─── SwitchRow Component ──────────────────────────────────────────
function SwitchRow({
  label,
  description,
  checked,
  onCheckedChange,
}: {
  label: string
  description: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex-1 min-w-0">
        <Label className="text-sm font-medium">{label}</Label>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  )
}

// ─── Theme Setting Row ──────────────────────────────────────────
function ThemeSettingRow() {
  const { theme, setTheme } = useTheme()
  const mounted = useHasMounted()

  if (!mounted) {
    return (
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <div className="h-4 w-24 bg-muted rounded" />
          <div className="h-3 w-48 bg-muted rounded mt-1.5" />
        </div>
        <div className="w-10 h-5 bg-muted rounded-full" />
      </div>
    )
  }

  const isDark = theme === 'dark'

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex-1 min-w-0">
        <Label className="text-sm font-medium flex items-center gap-2">
          {isDark ? (
            <Moon className="w-3.5 h-3.5 text-primary" />
          ) : (
            <Sun className="w-3.5 h-3.5 text-muted-foreground" />
          )}
          {isDark ? 'الوضع الداكن' : 'الوضع الفاتح'}
        </Label>
        <p className="text-xs text-muted-foreground mt-0.5">
          {isDark
            ? 'يتم استخدام المظهر الداكن حالياً'
            : 'يتم استخدام المظهر الفاتح حالياً'}
        </p>
      </div>
      <Switch
        checked={isDark}
        onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
      />
    </div>
  )
}

// ─── Sales Targets Section ──────────────────────────────────────
function SalesTargetsSection() {
  const [targets, setTargets] = useState<SalesTarget[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Form state
  const [formType, setFormType] = useState<'daily' | 'weekly' | 'monthly'>('daily')
  const [formAmount, setFormAmount] = useState('')
  const [formEndDate, setFormEndDate] = useState('')

  const fetchTargets = useCallback(async () => {
    try {
      const res = await fetch('/api/sales-targets?all=true')
      const json = await res.json()
      if (json.success) {
        setTargets(json.data || [])
      }
    } catch {
      // Silent
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTargets()
  }, [fetchTargets])

  const resetForm = () => {
    setFormType('daily')
    setFormAmount('')
    setFormEndDate('')
    setEditingId(null)
    setShowForm(false)
  }

  const handleCreate = async () => {
    const amount = parseFloat(formAmount)
    if (!amount || amount <= 0) {
      toast.error('يرجى إدخال مبلغ صحيح أكبر من صفر')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/sales-targets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: formType,
          targetAmount: amount,
          endDate: formEndDate || null,
        }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success('تم إنشاء هدف المبيعات بنجاح')
        resetForm()
        fetchTargets()
      } else {
        toast.error(json.error || 'حدث خطأ')
      }
    } catch {
      toast.error('خطأ في الاتصال')
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (target: SalesTarget) => {
    try {
      const res = await fetch('/api/sales-targets', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: target.id, isActive: !target.isActive }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success(target.isActive ? 'تم إلغاء تفعيل الهدف' : 'تم تفعيل الهدف')
        fetchTargets()
      }
    } catch {
      toast.error('خطأ في تحديث الهدف')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/sales-targets?id=${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (json.success) {
        toast.success('تم حذف الهدف بنجاح')
        fetchTargets()
      }
    } catch {
      toast.error('خطأ في حذف الهدف')
    }
  }

  const typeLabels: Record<string, string> = {
    daily: 'يومي',
    weekly: 'أسبوعي',
    monthly: 'شهري',
  }

  const getProgressColor = (percent: number) => {
    if (percent >= 80) return 'bg-emerald-500'
    if (percent >= 50) return 'bg-amber-500'
    return 'bg-red-500'
  }

  const getProgressTextColor = (percent: number) => {
    if (percent >= 80) return 'text-emerald-600'
    if (percent >= 50) return 'text-amber-600'
    return 'text-red-600'
  }

  return (
    <Card className="glass-card glass-card-frosted card-hover col-span-full">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Target className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">أهداف المبيعات</CardTitle>
              <CardDescription className="text-xs">تحديد ومتابعة أهداف المبيعات اليومية والأسبوعية والشهرية</CardDescription>
            </div>
          </div>
          <Button
            onClick={() => { resetForm(); setShowForm(true) }}
            size="sm"
            className="gap-1.5 btn-ripple"
          >
            <Plus className="w-4 h-4" />
            هدف جديد
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Create/Edit Form */}
        {showForm && (
          <div className="p-4 rounded-xl bg-muted/40 border border-border/50 space-y-4 animate-fade-in-up">
            <h4 className="text-sm font-bold text-foreground">
              {editingId ? 'تعديل الهدف' : 'إنشاء هدف جديد'}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium">نوع الهدف</Label>
                <Select
                  value={formType}
                  onValueChange={(v) => setFormType(v as 'daily' | 'weekly' | 'monthly')}
                >
                  <SelectTrigger className="w-full text-right">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">يومي</SelectItem>
                    <SelectItem value="weekly">أسبوعي</SelectItem>
                    <SelectItem value="monthly">شهري</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium">المبلغ المستهدف</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  placeholder="0.00"
                  className="text-left"
                  dir="ltr"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium">تاريخ الانتهاء (اختياري)</Label>
                <Input
                  type="date"
                  value={formEndDate}
                  onChange={(e) => setFormEndDate(e.target.value)}
                  className="text-right"
                  dir="ltr"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={resetForm}
                className="text-xs"
              >
                إلغاء
              </Button>
              <Button
                size="sm"
                onClick={handleCreate}
                disabled={saving || !formAmount}
                className="text-xs gap-1 btn-ripple"
              >
                {saving ? 'جاري الحفظ...' : editingId ? 'تحديث' : 'إنشاء الهدف'}
              </Button>
            </div>
          </div>
        )}

        {/* Targets List */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="skeleton-shimmer h-24 w-full rounded-xl" />
            ))}
          </div>
        ) : targets.length === 0 ? (
          <div className="text-center py-8">
            <div className="empty-state-icon mx-auto">
              <Target className="w-6 h-6 text-primary/30" />
            </div>
            <p className="empty-state-title">لا توجد أهداف حالياً</p>
            <p className="empty-state-description">أنشئ هدفاً جديداً لمتابعة أداء المبيعات</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {targets.map((target) => (
              <div
                key={target.id}
                className={`p-4 rounded-xl border transition-all ${
                  target.isActive
                    ? 'border-primary/20 bg-primary/[0.02]'
                    : 'border-border/40 bg-muted/20 opacity-70'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="secondary"
                      className={`text-[10px] font-semibold ${
                        target.isActive ? 'badge-active' : 'badge-inactive'
                      }`}
                    >
                      {typeLabels[target.type] || target.type}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(target.createdAt).toLocaleDateString('ar-SA')}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleToggle(target)}
                      className={`p-1.5 rounded-lg transition-colors ${
                        target.isActive
                          ? 'hover:bg-emerald-500/10 text-emerald-600'
                          : 'hover:bg-muted text-muted-foreground'
                      }`}
                      title={target.isActive ? 'إلغاء التفعيل' : 'تفعيل'}
                    >
                      {target.isActive ? (
                        <ToggleRight className="w-4 h-4" />
                      ) : (
                        <ToggleLeft className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => handleDelete(target.id)}
                      className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      title="حذف"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      المبيعات الحالية:{' '}
                      <span className={`font-bold tabular-nums ${getProgressTextColor(target.progressPercent)}`}>
                        {target.currentAmount.toFixed(2)}
                      </span>
                    </span>
                    <span className="text-muted-foreground">
                      الهدف:{' '}
                      <span className="font-bold text-foreground tabular-nums">
                        {target.targetAmount.toFixed(2)}
                      </span>
                    </span>
                  </div>
                  <div className="relative h-3 rounded-full bg-muted/60 overflow-hidden">
                    <div
                      className={`absolute inset-y-0 right-0 rounded-full progress-bar-animated ${getProgressColor(target.progressPercent)} ${target.progressPercent >= 100 ? 'shimmer' : ''}`}
                      style={{ width: `${Math.min(target.progressPercent, 100)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>
                      {target.progressPercent.toFixed(1)}% مكتمل
                    </span>
                    <span>
                      {target.progressPercent >= 100
                        ? '🎉 تم تحقيق الهدف!'
                        : `المتبقي: ${target.remainingAmount.toFixed(2)}`
                      }
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Main Settings Screen ────────────────────────────────────────
export function SettingsScreen() {
  const { settings, updateSettings } = useAppStore()
  const initialSettingsRef = useRef<SettingsState>(settings)
  const [localSettings, setLocalSettings] = useState<SettingsState>(settings)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [customersLoaded, setCustomersLoaded] = useState(false)

  // Fetch customers on mount
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch('/api/customers')
        const json = await res.json()
        if (!cancelled && json.success) {
          setCustomers(json.data)
          setCustomersLoaded(true)
        }
      } catch {
        // Silently fail
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  // Track changes by comparing with store
  const hasChanges = JSON.stringify(localSettings) !== JSON.stringify(settings)

  // Update local setting
  const handleChange = <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => {
    setLocalSettings((prev) => ({ ...prev, [key]: value }))
  }

  // Save settings
  const handleSave = () => {
    updateSettings(localSettings)
    initialSettingsRef.current = localSettings
    toast.success('حفظ الإعدادات', {
      description: 'تم حفظ جميع الإعدادات بنجاح',
    })
  }

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-in-up">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground">الإعدادات</h2>
            <p className="text-sm text-muted-foreground mt-1">
              تخصيص إعدادات النظام حسب احتياجاتك
            </p>
          </div>
          <Button
            onClick={handleSave}
            disabled={!hasChanges}
            className="gap-2 btn-ripple hover-glow-blue"
          >
            <Save className="w-4 h-4" />
            حفظ الإعدادات
          </Button>
        </div>

        <div className="section-divider" />

        {/* Settings Sections Grid */}
        <div className="grid gap-6 md:grid-cols-2 stagger-children">
          {/* ─── Section 1: Store Information ──────────────────── */}
          <SettingsCard
            icon={Store}
            title="معلومات المتجر"
            description="البيانات الأساسية للمتجر"
          >
            {/* Store Name */}
            <div className="space-y-2">
              <Label htmlFor="storeName" className="text-sm font-medium flex items-center gap-2">
                <Store className="w-3.5 h-3.5 text-muted-foreground" />
                اسم المتجر
              </Label>
              <Input
                id="storeName"
                value={localSettings.storeName}
                onChange={(e) => handleChange('storeName', e.target.value)}
                placeholder="السلطان للمشروبات"
                className="text-right input-glow-ring"
              />
            </div>

            {/* Store Phone */}
            <div className="space-y-2">
              <Label htmlFor="storePhone" className="text-sm font-medium flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                رقم الهاتف
              </Label>
              <Input
                id="storePhone"
                value={localSettings.storePhone}
                onChange={(e) => handleChange('storePhone', e.target.value)}
                placeholder="05XXXXXXXX"
                className="text-right input-glow-ring"
                dir="ltr"
              />
            </div>

            {/* Store Address */}
            <div className="space-y-2">
              <Label htmlFor="storeAddress" className="text-sm font-medium flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                العنوان
              </Label>
              <Textarea
                id="storeAddress"
                value={localSettings.storeAddress}
                onChange={(e) => handleChange('storeAddress', e.target.value)}
                placeholder="عنوان المتجر"
                className="text-right min-h-[80px]"
                rows={3}
              />
            </div>

            {/* Tax Number */}
            <div className="space-y-2">
              <Label htmlFor="taxNumber" className="text-sm font-medium flex items-center gap-2">
                <Hash className="w-3.5 h-3.5 text-muted-foreground" />
                الرقم الضريبي
                <span className="text-[10px] text-muted-foreground">(اختياري)</span>
              </Label>
              <Input
                id="taxNumber"
                value={localSettings.taxNumber}
                onChange={(e) => handleChange('taxNumber', e.target.value)}
                placeholder="الرقم الضريبي"
                className="text-right input-glow-ring"
                dir="ltr"
              />
            </div>

            {/* Store Logo URL */}
            <div className="space-y-2">
              <Label htmlFor="storeLogoUrl" className="text-sm font-medium flex items-center gap-2">
                <ImageIcon className="w-3.5 h-3.5 text-muted-foreground" />
                رابط شعار المتجر
                <span className="text-[10px] text-muted-foreground">(اختياري)</span>
              </Label>
              <Input
                id="storeLogoUrl"
                value={localSettings.storeLogoUrl}
                onChange={(e) => handleChange('storeLogoUrl', e.target.value)}
                placeholder="https://example.com/logo.png"
                className="text-right input-glow-ring"
                dir="ltr"
              />
            </div>
          </SettingsCard>

          {/* ─── Section 2: Receipt Settings ───────────────────── */}
          <SettingsCard
            icon={Receipt}
            title="إعدادات الفاتورة"
            description="تخصيص مظهر ومحتوى الفواتير"
          >
            {/* Receipt Header Text */}
            <div className="space-y-2">
              <Label htmlFor="receiptHeader" className="text-sm font-medium flex items-center gap-2">
                <Type className="w-3.5 h-3.5 text-muted-foreground" />
                نص رأس الفاتورة
              </Label>
              <Textarea
                id="receiptHeader"
                value={localSettings.receiptHeaderText}
                onChange={(e) => handleChange('receiptHeaderText', e.target.value)}
                placeholder="نص يظهر في أعلى الفاتورة"
                className="text-right min-h-[60px]"
                rows={2}
              />
            </div>

            {/* Receipt Footer Text */}
            <div className="space-y-2">
              <Label htmlFor="receiptFooter" className="text-sm font-medium flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                نص ذيل الفاتورة
              </Label>
              <Textarea
                id="receiptFooter"
                value={localSettings.receiptFooterText}
                onChange={(e) => handleChange('receiptFooterText', e.target.value)}
                placeholder="نص يظهر في أسفل الفاتورة"
                className="text-right min-h-[60px]"
                rows={2}
              />
            </div>

            {/* Show Tax on Receipt */}
            <SwitchRow
              label="إظهار الضريبة في الفاتورة"
              description="عرض إجمالي الضريبة مفصلاً في الفاتورة"
              checked={localSettings.showTaxOnReceipt}
              onCheckedChange={(v) => handleChange('showTaxOnReceipt', v)}
            />

            <Separator className="opacity-40" />

            {/* Currency Selector */}
            <div className="space-y-2">
              <Label htmlFor="currency" className="text-sm font-medium flex items-center gap-2">
                <Globe className="w-3.5 h-3.5 text-muted-foreground" />
                العملة
              </Label>
              <Select
                value={localSettings.currency}
                onValueChange={(v) => {
                  handleChange('currency', v as CurrencyCode)
                  // Auto-set decimal places from CURRENCY_MAP
                  const meta = CURRENCY_MAP[v as CurrencyCode]
                  if (meta) {
                    handleChange('decimalPlaces', meta.decimalPlaces)
                    handleChange('currencySymbol', '')
                  }
                }}
              >
                <SelectTrigger id="currency" className="w-full text-right">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(CURRENCY_MAP) as [CurrencyCode, { symbol: string; name: string; decimalPlaces: number }][]).map(
                    ([code, { symbol, name }]) => (
                      <SelectItem key={code} value={code}>
                        <span className="flex items-center gap-2">
                          <span className="font-bold text-sm">{symbol}</span>
                          <span className="text-muted-foreground">{name}</span>
                        </span>
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Custom Symbol */}
            <div className="space-y-2">
              <Label htmlFor="currencySymbol" className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
                رمز العملة المخصص
                <span className="text-[10px] text-muted-foreground">(اختياري)</span>
              </Label>
              <Input
                id="currencySymbol"
                value={localSettings.currencySymbol}
                onChange={(e) => handleChange('currencySymbol', e.target.value)}
                placeholder={CURRENCY_MAP[localSettings.currency].symbol}
                className="text-right"
                dir="ltr"
                maxLength={10}
              />
              <p className="text-[10px] text-muted-foreground">
                اتركه فارغاً لاستخدام الرمز الافتراضي ({CURRENCY_MAP[localSettings.currency].symbol})
              </p>
            </div>

            {/* Decimal Places */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Hash className="w-3.5 h-3.5 text-muted-foreground" />
                الأرقام العشرية
              </Label>
              <Select
                value={String(localSettings.decimalPlaces)}
                onValueChange={(v) => handleChange('decimalPlaces', Number(v))}
              >
                <SelectTrigger className="w-full text-right">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">٠ — بدون كسور</SelectItem>
                  <SelectItem value="1">١ — رقم عشري واحد</SelectItem>
                  <SelectItem value="2">٢ — رقمين عشريين</SelectItem>
                  <SelectItem value="3">٣ — ثلاثة أرقام عشرية</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Currency Position */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">موقع رمز العملة</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleChange('currencyPosition', 'after')}
                  className={`p-3 rounded-xl border-2 text-center transition-all text-sm ${
                    localSettings.currencyPosition === 'after'
                      ? 'border-primary bg-primary/5 text-primary font-bold'
                      : 'border-border/50 hover:border-primary/30 text-muted-foreground'
                  }`}
                >
                  {getCurrencySymbol(localSettings.currency, localSettings.currencySymbol)}{' '}
                  ١,٥٠٠
                  <span className="block text-[10px] mt-1">بعد المبلغ</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleChange('currencyPosition', 'before')}
                  className={`p-3 rounded-xl border-2 text-center transition-all text-sm ${
                    localSettings.currencyPosition === 'before'
                      ? 'border-primary bg-primary/5 text-primary font-bold'
                      : 'border-border/50 hover:border-primary/30 text-muted-foreground'
                  }`}
                >
                  {getCurrencySymbol(localSettings.currency, localSettings.currencySymbol)}{' '}
                  ١,٥٠٠
                  <span className="block text-[10px] mt-1">قبل المبلغ</span>
                </button>
              </div>
            </div>

            {/* Live Preview */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                معاينة مباشرة
              </Label>
              <div className="p-4 rounded-xl bg-muted/40 border border-border/50 space-y-2">
                <p className="text-[10px] text-muted-foreground">مثال على تنسيق المبالغ:</p>
                <div className="space-y-1.5">
                  <p className="text-lg font-bold text-primary tabular-nums">
                    {fc(1500, localSettings.currency, localSettings.currencySymbol, localSettings.currencyPosition, localSettings.decimalPlaces)}
                  </p>
                  <p className="text-base text-foreground tabular-nums">
                    {fc(25000, localSettings.currency, localSettings.currencySymbol, localSettings.currencyPosition, localSettings.decimalPlaces)}
                  </p>
                  <p className="text-sm text-muted-foreground tabular-nums">
                    {fc(150, localSettings.currency, localSettings.currencySymbol, localSettings.currencyPosition, localSettings.decimalPlaces)}
                  </p>
                  <p className="text-sm text-emerald-600 tabular-nums">
                    {fc(1234567.89, localSettings.currency, localSettings.currencySymbol, localSettings.currencyPosition, localSettings.decimalPlaces)}
                  </p>
                </div>
              </div>
            </div>

            {/* Invoice Template Selector */}
            <div className="space-y-2">
              <Label htmlFor="invoiceTemplate" className="text-sm font-medium flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                قالب الفاتورة
              </Label>
              <Select
                value={localSettings.invoiceTemplate}
                onValueChange={(v) => handleChange('invoiceTemplate', v as SettingsState['invoiceTemplate'])}
              >
                <SelectTrigger id="invoiceTemplate" className="w-full text-right">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="classic">
                    <span className="flex items-center gap-2">
                      <span className="text-sm">📋</span>
                      <span>كلاسيك</span>
                      <span className="text-[10px] text-muted-foreground">— التخطيط القياسي</span>
                    </span>
                  </SelectItem>
                  <SelectItem value="professional">
                    <span className="flex items-center gap-2">
                      <span className="text-sm">✨</span>
                      <span>احترافي</span>
                      <span className="text-[10px] text-muted-foreground">— تصميم عصري</span>
                    </span>
                  </SelectItem>
                  <SelectItem value="simple">
                    <span className="flex items-center gap-2">
                      <span className="text-sm">📄</span>
                      <span>مبسط</span>
                      <span className="text-[10px] text-muted-foreground">— نص فقط</span>
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground">
                اختر قالب الفاتورة الذي سيتم استخدامه عند الطباعة
              </p>
            </div>

            {/* Auto-print on Payment */}
            <SwitchRow
              label="طباعة تلقائية بعد الدفع"
              description="طباعة الفاتورة تلقائياً عند إتمام عملية الدفع"
              checked={localSettings.autoPrintOnPayment}
              onCheckedChange={(v) => handleChange('autoPrintOnPayment', v)}
            />
          </SettingsCard>

          {/* ─── Section 3: POS Settings ───────────────────────── */}
          <SettingsCard
            icon={ShoppingCart}
            title="إعدادات نقطة البيع"
            description="خيارات إضافية لنقطة البيع"
          >
            {/* Default Customer */}
            <div className="space-y-2">
              <Label htmlFor="defaultCustomer" className="text-sm font-medium flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-muted-foreground" />
                العميل الافتراضي
              </Label>
              <Select
                value={localSettings.defaultCustomerId}
                onValueChange={(v) => handleChange('defaultCustomerId', v)}
              >
                <SelectTrigger id="defaultCustomer" className="w-full text-right">
                  <SelectValue placeholder={!customersLoaded ? 'جاري التحميل...' : 'اختر عميل افتراضي'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">بدون عميل افتراضي</SelectItem>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name} {customer.phone ? `(${customer.phone})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground">
                سيتم اختيار هذا العميل تلقائياً في فواتير البيع
              </p>
            </div>

            <Separator className="opacity-40" />

            {/* Allow Debt/Credit */}
            <SwitchRow
              label="السماح بالدين/التقسيط"
              description="السماح للعملاء بشراء بالأجل"
              checked={localSettings.allowDebt}
              onCheckedChange={(v) => handleChange('allowDebt', v)}
            />

            {/* Max Debt Amount */}
            {localSettings.allowDebt && (
              <div className="space-y-2">
                <Label htmlFor="maxDebt" className="text-sm font-medium flex items-center gap-2">
                  <CreditCard className="w-3.5 h-3.5 text-muted-foreground" />
                  الحد الأقصى للدين
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="maxDebt"
                    type="number"
                    min={0}
                    value={localSettings.maxDebtAmount}
                    onChange={(e) => handleChange('maxDebtAmount', Number(e.target.value) || 0)}
                    className="text-right"
                    dir="ltr"
                  />
                  <span className="text-sm text-muted-foreground whitespace-nowrap">
                    {getCurrencySymbol(localSettings.currency, localSettings.currencySymbol)}
                  </span>
                </div>
              </div>
            )}

            <Separator className="opacity-40" />

            {/* Sound on Payment */}
            <SwitchRow
              label="صوت عند الدفع"
              description="تشغيل صوت تنبيه عند إتمام عملية الدفع"
              checked={localSettings.soundOnPayment}
              onCheckedChange={(v) => handleChange('soundOnPayment', v)}
            />
          </SettingsCard>

          {/* ─── Section 4: Display Preferences ────────────────── */}
          <SettingsCard
            icon={Monitor}
            title="تفضيلات العرض"
            description="تخصيص مظهر وسلوك الواجهة"
          >
            {/* Dark Mode Toggle */}
            <ThemeSettingRow />

            <Separator className="opacity-40" />

            {/* Animation Speed */}
            <div className="space-y-2">
              <Label htmlFor="animationSpeed" className="text-sm font-medium flex items-center gap-2">
                <Gauge className="w-3.5 h-3.5 text-muted-foreground" />
                سرعة الحركات
              </Label>
              <Select
                value={localSettings.animationSpeed}
                onValueChange={(v) =>
                  handleChange('animationSpeed', v as SettingsState['animationSpeed'])
                }
              >
                <SelectTrigger id="animationSpeed" className="w-full text-right">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="slow">بطيء</SelectItem>
                  <SelectItem value="normal">عادي</SelectItem>
                  <SelectItem value="fast">سريع</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator className="opacity-40" />

            {/* Compact Mode */}
            <SwitchRow
              label="الوضع المضغوط"
              description="تقليل المسافات والأحجام لعرض بيانات أكثر"
              checked={localSettings.compactMode}
              onCheckedChange={(v) => handleChange('compactMode', v)}
            />

            <Separator className="opacity-40" />

            {/* Show Product Images */}
            <SwitchRow
              label="عرض صور المنتجات"
              description="إظهار صور المنتجات في واجهة نقطة البيع"
              checked={localSettings.showProductImages}
              onCheckedChange={(v) => handleChange('showProductImages', v)}
            />
          </SettingsCard>

          {/* ─── Section 5: Dual Currency ────────────────────── */}
          <SettingsCard
            icon={ArrowLeftRight}
            title="العملات"
            description="عرض الأسعار بعملتين مختلفات"
          >
            {/* Secondary Currency Toggle */}
            <SwitchRow
              label="تفعيل العملة الثانوية"
              description="عرض الأسعار بعملتين في وقت واحد"
              checked={localSettings.secondaryCurrencyEnabled}
              onCheckedChange={(v) => handleChange('secondaryCurrencyEnabled', v)}
            />

            {localSettings.secondaryCurrencyEnabled && (
              <>
                <Separator className="opacity-40" />

                {/* Primary Currency Info */}
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <DollarSign className="w-3.5 h-3.5 text-primary" />
                    العملة الأساسية
                  </Label>
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-primary/5 border border-primary/20">
                    <Badge variant="secondary" className="badge-active text-xs font-bold">
                      {CURRENCY_MAP[localSettings.currency].symbol}
                    </Badge>
                    <span className="text-sm font-medium">
                      {CURRENCY_MAP[localSettings.currency].name}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    لتغيير العملة الأساسية، انتقل إلى قسم إعدادات الفاتورة
                  </p>
                </div>

                <Separator className="opacity-40" />

                {/* Secondary Currency Selector */}
                <div className="space-y-2">
                  <Label htmlFor="secondaryCurrency" className="text-sm font-medium flex items-center gap-2">
                    <Globe className="w-3.5 h-3.5 text-muted-foreground" />
                    العملة الثانوية
                  </Label>
                  <Select
                    value={localSettings.secondaryCurrency}
                    onValueChange={(v) => {
                      handleChange('secondaryCurrency', v as CurrencyCode)
                      const meta = CURRENCY_MAP[v as CurrencyCode]
                      if (meta) {
                        handleChange('secondaryCurrencySymbol', '')
                      }
                    }}
                  >
                    <SelectTrigger id="secondaryCurrency" className="w-full text-right">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.entries(CURRENCY_MAP) as [CurrencyCode, { symbol: string; name: string; decimalPlaces: number }][]).map(
                        ([code, { symbol, name }]) => (
                          <SelectItem key={code} value={code}>
                            <span className="flex items-center gap-2">
                              <span className="font-bold text-sm">{symbol}</span>
                              <span className="text-muted-foreground">{name}</span>
                            </span>
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Secondary Custom Symbol */}
                <div className="space-y-2">
                  <Label htmlFor="secondarySymbol" className="text-sm font-medium flex items-center gap-2">
                    <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
                    رمز العملة الثانوية المخصص
                    <span className="text-[10px] text-muted-foreground">(اختياري)</span>
                  </Label>
                  <Input
                    id="secondarySymbol"
                    value={localSettings.secondaryCurrencySymbol}
                    onChange={(e) => handleChange('secondaryCurrencySymbol', e.target.value)}
                    placeholder={CURRENCY_MAP[localSettings.secondaryCurrency].symbol}
                    className="text-right"
                    dir="ltr"
                    maxLength={10}
                  />
                </div>

                <Separator className="opacity-40" />

                {/* Exchange Rate */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <ArrowLeftRight className="w-3.5 h-3.5 text-muted-foreground" />
                    سعر الصرف
                  </Label>
                  <div className="p-3 rounded-xl bg-muted/40 border border-border/50">
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <p className="text-[10px] text-muted-foreground mb-1">
                          ١ {CURRENCY_MAP[localSettings.currency].symbol} =
                        </p>
                        <Input
                          type="number"
                          min={0.0001}
                          step={0.001}
                          value={localSettings.exchangeRate || ''}
                          onChange={(e) => handleChange('exchangeRate', parseFloat(e.target.value) || 0)}
                          placeholder="0.00"
                          className="h-10 text-right text-lg font-bold tabular-nums"
                          dir="ltr"
                        />
                      </div>
                      <div className="flex items-center pt-4">
                        <span className="text-lg font-bold text-primary">
                          {getCurrencySymbol(localSettings.secondaryCurrency, localSettings.secondaryCurrencySymbol)}
                        </span>
                      </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-2">
                      مثال: إذا كان ١ ريال = ١.٤٨ دولار، أدخل ١.٤٨
                    </p>
                  </div>
                </div>

                <Separator className="opacity-40" />

                {/* Display Mode */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                    طريقة العرض
                  </Label>
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => handleChange('currencyDisplayMode', 'primary-only')}
                      className={`w-full p-3 rounded-xl border-2 text-right transition-all text-sm ${
                        localSettings.currencyDisplayMode === 'primary-only'
                          ? 'border-primary bg-primary/5 text-primary font-bold'
                          : 'border-border/50 hover:border-primary/30 text-muted-foreground'
                      }`}
                    >
                      <span className="block">العملة الأساسية فقط</span>
                      <span className="block text-[10px] mt-1 font-normal opacity-70">مثال: ١,٥٠٠ {CURRENCY_MAP[localSettings.currency].symbol}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleChange('currencyDisplayMode', 'secondary-parentheses')}
                      className={`w-full p-3 rounded-xl border-2 text-right transition-all text-sm ${
                        localSettings.currencyDisplayMode === 'secondary-parentheses'
                          ? 'border-primary bg-primary/5 text-primary font-bold'
                          : 'border-border/50 hover:border-primary/30 text-muted-foreground'
                      }`}
                    >
                      <span className="block">العملة الثانوية بين أقواس</span>
                      <span className="block text-[10px] mt-1 font-normal opacity-70">
                        مثال: ١,٥٠٠ {CURRENCY_MAP[localSettings.currency].symbol}{' '}
                        ({(1500 * (localSettings.exchangeRate || 1)).toLocaleString('ar-SA', { maximumFractionDigits: 2 })}{' '}
                        {getCurrencySymbol(localSettings.secondaryCurrency, localSettings.secondaryCurrencySymbol)})
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleChange('currencyDisplayMode', 'secondary-main')}
                      className={`w-full p-3 rounded-xl border-2 text-right transition-all text-sm ${
                        localSettings.currencyDisplayMode === 'secondary-main'
                          ? 'border-primary bg-primary/5 text-primary font-bold'
                          : 'border-border/50 hover:border-primary/30 text-muted-foreground'
                      }`}
                    >
                      <span className="block">العملة الثانوية كأساسية</span>
                      <span className="block text-[10px] mt-1 font-normal opacity-70">
                        مثال: {(1500 * (localSettings.exchangeRate || 1)).toLocaleString('ar-SA', { maximumFractionDigits: 2 })}{' '}
                        {getCurrencySymbol(localSettings.secondaryCurrency, localSettings.secondaryCurrencySymbol)}{' '}
                        (١,٥٠٠ {CURRENCY_MAP[localSettings.currency].symbol})
                      </span>
                    </button>
                  </div>
                </div>

                <Separator className="opacity-40" />

                {/* Live Preview */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                    معاينة مباشرة
                  </Label>
                  <div className="p-4 rounded-xl bg-muted/40 border border-border/50 space-y-2">
                    <p className="text-[10px] text-muted-foreground">مثال على تنسيق المبالغ:</p>
                    <div className="space-y-1.5">
                      {[1500, 25000, 150, 1234567.89].map((amt) => (
                        <p key={amt} className="text-sm font-bold text-primary tabular-nums">
                          {fc(amt, localSettings.currency, localSettings.currencySymbol, localSettings.currencyPosition, localSettings.decimalPlaces)}
                          {localSettings.exchangeRate > 0 && (
                            <span className="text-xs text-muted-foreground font-medium">{' '}({fc(amt * localSettings.exchangeRate, localSettings.secondaryCurrency, localSettings.secondaryCurrencySymbol, localSettings.currencyPosition, CURRENCY_MAP[localSettings.secondaryCurrency]?.decimalPlaces ?? 2)})</span>
                          )}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </SettingsCard>

          {/* ─── Section 6: Loyalty Settings ───────────────────── */}
          <SettingsCard
            icon={Star}
            title="برنامج الولاء"
            description="إدارة نقاط المكافآت للعملاء"
          >
            {/* Enable Loyalty */}
            <SwitchRow
              label="تفعيل برنامج الولاء"
              description="منح العملاء نقاط على مشترياتهم"
              checked={localSettings.loyaltyEnabled}
              onCheckedChange={(v) => handleChange('loyaltyEnabled', v)}
            />

            {localSettings.loyaltyEnabled && (
              <>
                <Separator className="opacity-40" />

                {/* Points per Currency Unit */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Star className="w-3.5 h-3.5 text-muted-foreground" />
                    نقاط لكل وحدة عملة
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={localSettings.loyaltyPointsPerUnit}
                      onChange={(e) => handleChange('loyaltyPointsPerUnit', Number(e.target.value) || 0)}
                      className="text-right"
                      dir="ltr"
                    />
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      نقطة / {getCurrencySymbol(localSettings.currency, localSettings.currencySymbol)}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    مثال: إذا كان 1 نقطة لكل 1000 {getCurrencySymbol(localSettings.currency, localSettings.currencySymbol)}، اكتب 0.001
                  </p>
                </div>

                <Separator className="opacity-40" />

                {/* Redemption Value */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
                    قيمة استبدال النقطة
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={localSettings.loyaltyRedemptionValue}
                      onChange={(e) => handleChange('loyaltyRedemptionValue', Number(e.target.value) || 0)}
                      className="text-right"
                      dir="ltr"
                    />
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {getCurrencySymbol(localSettings.currency, localSettings.currencySymbol)} / نقطة
                    </span>
                  </div>
                </div>

                <Separator className="opacity-40" />

                {/* Minimum Points to Redeem */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Hash className="w-3.5 h-3.5 text-muted-foreground" />
                    الحد الأدنى لاستبدال النقاط
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      value={localSettings.loyaltyMinPointsToRedeem}
                      onChange={(e) => handleChange('loyaltyMinPointsToRedeem', Number(e.target.value) || 0)}
                      className="text-right"
                      dir="ltr"
                    />
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      نقطة
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    أقل عدد نقاط يسمح للعميل بتحويلها إلى خصم
                  </p>
                </div>

                {/* Summary */}
                <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 space-y-1">
                  <p className="text-[11px] font-bold text-primary">ملخص البرنامج:</p>
                  <p className="text-[10px] text-muted-foreground">
                    كل {getCurrencySymbol(localSettings.currency, localSettings.currencySymbol)}1,000 = {localSettings.loyaltyPointsPerUnit * 1000} نقطة
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    كل {localSettings.loyaltyMinPointsToRedeem} نقطة = {getCurrencySymbol(localSettings.currency, localSettings.currencySymbol)}{(localSettings.loyaltyMinPointsToRedeem * localSettings.loyaltyRedemptionValue).toFixed(0)} خصم
                  </p>
                </div>
              </>
            )}
          </SettingsCard>
        </div>

        {/* ─── Section 7: Sales Targets (Full Width) ────────── */}
        <SalesTargetsSection />

        {/* Bottom Save Bar (Mobile) */}
        <div className="md:hidden sticky bottom-0 bg-background/80 backdrop-blur-sm pt-4 pb-2 -mx-4 px-4 border-t border-border/50 glass-card-colored" style={{ '--glass-accent': 'oklch(0.6 0.2 260)' } as React.CSSProperties}>
          <Button
            onClick={handleSave}
            disabled={!hasChanges}
            className="w-full gap-2 btn-ripple"
            size="lg"
          >
            <Save className="w-4 h-4" />
            حفظ الإعدادات
          </Button>
        </div>
      </div>
    </div>
  )
}
