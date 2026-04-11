'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { toast } from 'sonner'
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  Users,
  Phone,
  AlertCircle,
  Download,
  Wallet,
  History,
  Banknote,
  Star,
  Minus,
  StickyNote,
  ShoppingBag,
  Crown,
  BadgeCheck,
  UserCheck,
  Store,
} from 'lucide-react'
import { exportToCSV } from '@/lib/export-csv'
import { useCurrency } from '@/hooks/use-currency'

// ─── Types ──────────────────────────────────────────────────────
interface Customer {
  id: string
  name: string
  phone: string | null
  debt: number
  loyaltyPoints: number
  isActive: boolean
  category: string
  notes: string | null
  totalPurchases: number
  visitCount: number
  lastVisit: string | null
}

interface CustomerFormData {
  name: string
  phone: string
  debt: string
  category: string
  notes: string
}

interface Payment {
  id: string
  customerId: string
  amount: number
  method: string
  notes: string | null
  createdAt: string
}

interface LoyaltyTransaction {
  id: string
  customerId: string
  points: number
  transactionType: string
  description: string
  createdAt: string
}

interface CustomerInvoice {
  id: string
  invoiceNo: string
  type: string
  totalAmount: number
  discount: number
  paidAmount: number
  createdAt: string
}

// ─── Constants ──────────────────────────────────────────────────
const CUSTOMER_CATEGORIES = [
  { value: 'عادي', label: 'عادي', icon: Users, chipClass: 'chip-outline' },
  { value: 'VIP', label: 'VIP', icon: Crown, chipClass: 'chip-warning' },
  { value: 'موظف', label: 'موظف', icon: BadgeCheck, chipClass: 'chip-info' },
  { value: 'تاجر', label: 'تاجر', icon: Store, chipClass: 'chip-primary' },
]

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  'عادي': Users,
  'VIP': Crown,
  'موظف': BadgeCheck,
  'تاجر': Store,
}

const CATEGORY_CHIP_CLASSES: Record<string, string> = {
  'عادي': 'chip-outline',
  'VIP': 'chip-warning',
  'موظف': 'chip-info',
  'تاجر': 'chip-primary',
}

const emptyForm: CustomerFormData = { name: '', phone: '', debt: '0', category: 'عادي', notes: '' }

export function CustomersScreen() {
  const { formatCurrency, symbol } = useCurrency()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')
  const [loading, setLoading] = useState(true)
  const [openAddDialog, setOpenAddDialog] = useState(false)
  const [openEditDialog, setOpenEditDialog] = useState(false)
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [form, setForm] = useState<CustomerFormData>(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // ── Payment dialog state ──
  const [openPaymentDialog, setOpenPaymentDialog] = useState(false)
  const [paymentCustomer, setPaymentCustomer] = useState<Customer | null>(null)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [paymentNotes, setPaymentNotes] = useState('')
  const [paymentSubmitting, setPaymentSubmitting] = useState(false)

  // ── Payment history dialog state ──
  const [openHistoryDialog, setOpenHistoryDialog] = useState(false)
  const [historyCustomer, setHistoryCustomer] = useState<Customer | null>(null)
  const [paymentHistory, setPaymentHistory] = useState<Payment[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  // ── Loyalty state ──
  const [openLoyaltyDialog, setOpenLoyaltyDialog] = useState(false)
  const [loyaltyCustomer, setLoyaltyCustomer] = useState<Customer | null>(null)
  const [loyaltyHistory, setLoyaltyHistory] = useState<LoyaltyTransaction[]>([])
  const [loyaltyLoading, setLoyaltyLoading] = useState(false)
  const [loyaltyPointsInput, setLoyaltyPointsInput] = useState('')
  const [loyaltyDescription, setLoyaltyDescription] = useState('')
  const [loyaltySubmitting, setLoyaltySubmitting] = useState(false)
  const [loyaltyMode, setLoyaltyMode] = useState<'grant' | 'deduct'>('grant')

  // ── Purchase history dialog state ──
  const [openPurchaseDialog, setOpenPurchaseDialog] = useState(false)
  const [purchaseCustomer, setPurchaseCustomer] = useState<Customer | null>(null)
  const [customerInvoices, setCustomerInvoices] = useState<CustomerInvoice[]>([])
  const [purchaseLoading, setPurchaseLoading] = useState(false)
  const [expandedNotes, setExpandedNotes] = useState<string | null>(null)

  // ─── Fetch Customers ───────────────────────────────────────────────
  const fetchCustomers = async (query = '', category = 'all') => {
    try {
      setLoading(true)
      let url = `/api/customers?search=${encodeURIComponent(query)}`
      if (category !== 'all') {
        url += `&category=${encodeURIComponent(category)}`
      }
      const res = await fetch(url)
      if (!res.ok) throw new Error('فشل في تحميل البيانات')
      const data = await res.json()
      setCustomers(data.data || [])
    } catch {
      toast.error('حدث خطأ أثناء تحميل العملاء')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCustomers()
  }, [])

  // ─── Debounced Search ─────────────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCustomers(search, activeCategory)
    }, 300)
    return () => clearTimeout(timer)
  }, [search, activeCategory])

  // ─── Helpers ──────────────────────────────────────────────────────
  const resetForm = () => {
    setForm(emptyForm)
    setSelectedCustomer(null)
  }

  const getCategoryIcon = (category: string) => {
    return CATEGORY_ICONS[category] || Users
  }

  const getCategoryChipClass = (category: string) => {
    return CATEGORY_CHIP_CLASSES[category] || 'chip-outline'
  }

  // ─── Create Customer ──────────────────────────────────────────────
  const handleCreate = async () => {
    if (!form.name.trim()) {
      toast.error('يرجى إدخال اسم العميل')
      return
    }
    try {
      setSubmitting(true)
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          phone: form.phone.trim() || null,
          category: form.category,
          notes: form.notes.trim() || null,
        }),
      })
      if (!res.ok) throw new Error('فشل في إنشاء العميل')
      toast.success('تم إضافة العميل بنجاح')
      setOpenAddDialog(false)
      resetForm()
      fetchCustomers(search, activeCategory)
    } catch {
      toast.error('حدث خطأ أثناء إضافة العميل')
    } finally {
      setSubmitting(false)
    }
  }

  // ─── Update Customer ──────────────────────────────────────────────
  const handleUpdate = async () => {
    if (!selectedCustomer) return
    if (!form.name.trim()) {
      toast.error('يرجى إدخال اسم العميل')
      return
    }
    try {
      setSubmitting(true)
      const res = await fetch('/api/customers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedCustomer.id,
          name: form.name.trim(),
          phone: form.phone.trim() || null,
          debt: parseFloat(form.debt) || 0,
          category: form.category,
          notes: form.notes.trim() || null,
        }),
      })
      if (!res.ok) throw new Error('فشل في تحديث العميل')
      toast.success('تم تحديث بيانات العميل بنجاح')
      setOpenEditDialog(false)
      resetForm()
      fetchCustomers(search, activeCategory)
    } catch {
      toast.error('حدث خطأ أثناء تحديث العميل')
    } finally {
      setSubmitting(false)
    }
  }

  // ─── Delete Customer ──────────────────────────────────────────────
  const handleDelete = async () => {
    if (!selectedCustomer) return
    try {
      setDeleting(true)
      const res = await fetch('/api/customers', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedCustomer.id }),
      })
      if (!res.ok) throw new Error('فشل في حذف العميل')
      toast.success('تم حذف العميل بنجاح')
      setOpenDeleteDialog(false)
      resetForm()
      fetchCustomers(search, activeCategory)
    } catch {
      toast.error('حدث خطأ أثناء حذف العميل')
    } finally {
      setDeleting(false)
    }
  }

  // ─── Open Edit ────────────────────────────────────────────────────
  const openEdit = (customer: Customer) => {
    setSelectedCustomer(customer)
    setForm({
      name: customer.name,
      phone: customer.phone || '',
      debt: String(customer.debt),
      category: customer.category || 'عادي',
      notes: customer.notes || '',
    })
    setOpenEditDialog(true)
  }

  // ─── Open Delete ──────────────────────────────────────────────────
  const openDelete = (customer: Customer) => {
    setSelectedCustomer(customer)
    setOpenDeleteDialog(true)
  }

  // ─── Open Payment Dialog ──────────────────────────────────────────
  const openPaymentDialogForCustomer = (customer: Customer) => {
    setPaymentCustomer(customer)
    setPaymentAmount('')
    setPaymentMethod('cash')
    setPaymentNotes('')
    setOpenPaymentDialog(true)
  }

  // ─── Submit Payment ───────────────────────────────────────────────
  const handleRecordPayment = async () => {
    if (!paymentCustomer) return
    const amount = parseFloat(paymentAmount)
    if (!amount || amount <= 0) {
      toast.error('يرجى إدخال مبلغ صحيح')
      return
    }
    if (amount > paymentCustomer.debt) {
      toast.error('المبلغ أكبر من المديونية الحالية')
      return
    }

    setPaymentSubmitting(true)
    try {
      const res = await fetch('/api/customer-payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: paymentCustomer.id,
          amount,
          method: paymentMethod,
          notes: paymentNotes.trim() || null,
        }),
      })
      const data = await res.json()
      if (data.success) {
        const methodLabel = paymentMethod === 'cash' ? 'نقدي' : 'تحويل'
        toast.success(`تم تسجيل دفعة ${formatCurrency(amount)} (${methodLabel}) للعميل ${paymentCustomer.name}`)
        setOpenPaymentDialog(false)
        setPaymentCustomer(null)
        fetchCustomers(search, activeCategory)
      } else {
        toast.error(data.error || 'حدث خطأ أثناء تسجيل الدفعة')
      }
    } catch {
      toast.error('حدث خطأ في الاتصال بالخادم')
    } finally {
      setPaymentSubmitting(false)
    }
  }

  // ─── Open Payment History ─────────────────────────────────────────
  const openPaymentHistory = async (customer: Customer) => {
    setHistoryCustomer(customer)
    setPaymentHistory([])
    setOpenHistoryDialog(true)
    setHistoryLoading(true)
    try {
      const res = await fetch(`/api/customer-payments?customerId=${customer.id}`)
      const data = await res.json()
      if (data.success) {
        setPaymentHistory(data.data)
      }
    } catch {
      toast.error('حدث خطأ أثناء تحميل سجل الدفعات')
    } finally {
      setHistoryLoading(false)
    }
  }

  // ─── Open Loyalty History ────────────────────────────────────────
  const openLoyaltyHistory = async (customer: Customer) => {
    setLoyaltyCustomer(customer)
    setLoyaltyHistory([])
    setOpenLoyaltyDialog(true)
    setLoyaltyLoading(true)
    try {
      const res = await fetch(`/api/loyalty?customerId=${customer.id}`)
      const data = await res.json()
      if (data.success) {
        setLoyaltyHistory(data.data)
      }
    } catch {
      toast.error('حدث خطأ أثناء تحميل سجل النقاط')
    } finally {
      setLoyaltyLoading(false)
    }
  }

  // ─── Open Loyalty Adjust Dialog ──────────────────────────────────
  const openLoyaltyAdjust = (customer: Customer, mode: 'grant' | 'deduct') => {
    setLoyaltyCustomer(customer)
    setLoyaltyMode(mode)
    setLoyaltyPointsInput('')
    setLoyaltyDescription('')
    setOpenLoyaltyDialog(false)
    setTimeout(() => {
      setLoyaltyCustomer(customer)
    }, 0)
  }

  // ─── Submit Loyalty Adjustment ──────────────────────────────────
  const handleLoyaltyAdjust = async () => {
    if (!loyaltyCustomer) return
    const points = parseInt(loyaltyPointsInput)
    if (!points || points <= 0) {
      toast.error('يرجى إدخال عدد نقاط صحيح')
      return
    }
    if (loyaltyMode === 'deduct' && points > loyaltyCustomer.loyaltyPoints) {
      toast.error('النقاط المطلوبة أكبر من رصيد العميل')
      return
    }

    setLoyaltySubmitting(true)
    try {
      const res = await fetch('/api/loyalty', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: loyaltyCustomer.id,
          points: loyaltyMode === 'grant' ? points : -points,
          transactionType: 'adjusted',
          description: loyaltyDescription.trim() || (loyaltyMode === 'grant' ? 'منح نقاط يدوي' : 'خصم نقاط يدوي'),
        }),
      })
      const data = await res.json()
      if (data.success) {
        const action = loyaltyMode === 'grant' ? 'منح' : 'خصم'
        toast.success(`تم ${action} ${points} نقطة ${loyaltyMode === 'grant' ? 'لـ' : 'من'} ${loyaltyCustomer.name}`)
        setOpenLoyaltyDialog(false)
        setLoyaltyCustomer(null)
        fetchCustomers(search, activeCategory)
      } else {
        toast.error(data.error || 'حدث خطأ أثناء تحديث النقاط')
      }
    } catch {
      toast.error('حدث خطأ في الاتصال بالخادم')
    } finally {
      setLoyaltySubmitting(false)
    }
  }

  // ─── Open Purchase History ────────────────────────────────────────
  const openPurchaseHistory = async (customer: Customer) => {
    setPurchaseCustomer(customer)
    setCustomerInvoices([])
    setOpenPurchaseDialog(true)
    setPurchaseLoading(true)
    try {
      const res = await fetch(`/api/invoices?customerId=${customer.id}&type=sale`)
      const data = await res.json()
      if (data.success) {
        setCustomerInvoices(data.data.slice(0, 10))
      }
    } catch {
      toast.error('حدث خطأ أثناء تحميل سجل المشتريات')
    } finally {
      setPurchaseLoading(false)
    }
  }

  // ─── Stats ────────────────────────────────────────────────────────
  const totalCustomers = customers.length
  const totalDebt = customers.reduce((sum, c) => sum + c.debt, 0)
  const debtorsCount = customers.filter((c) => c.debt > 0).length
  const vipCount = customers.filter((c) => c.category === 'VIP').length

  // ─── Render ───────────────────────────────────────────────────────
  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex flex-col gap-6 p-4 md:p-6 animate-fade-in-up" dir="rtl">
        {/* ── Header ────────────────────────────────────────────── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold md:text-2xl">إدارة العملاء</h1>
              <p className="text-sm text-muted-foreground">
                إجمالي {totalCustomers} عميل
                {vipCount > 0 && (
                  <span className="mr-2 inline-flex items-center gap-1 text-amber-600">
                    <Crown className="h-3 w-3" />
                    {vipCount} VIP
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => {
                const exportData = customers.map((c) => ({
                  'الاسم': c.name,
                  'الهاتف': c.phone || '',
                  'التصنيف': c.category || 'عادي',
                  'المديونية': c.debt,
                  'المشتريات': c.totalPurchases,
                  'الزيارات': c.visitCount,
                  'ملاحظات': c.notes || '',
                  'الحالة': c.isActive ? 'نشط' : 'غير نشط',
                }))
                exportToCSV(exportData, 'العملاء')
              }}
              disabled={customers.length === 0}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">تصدير العملاء</span>
            </Button>
            <Button
              onClick={() => {
                resetForm()
                setOpenAddDialog(true)
              }}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              إضافة عميل
            </Button>
          </div>
        </div>

        {/* ── Stats Cards ───────────────────────────────────────── */}
        <div className="data-grid grid grid-cols-2 gap-4 sm:grid-cols-4 stagger-children">
          <div className="data-grid-item rounded-xl border bg-card p-4 shadow-sm card-hover glass-card-elevated">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10">
                <Users className="h-4 w-4 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">إجمالي العملاء</p>
                <p className="text-lg font-bold">{totalCustomers}</p>
              </div>
            </div>
          </div>

          <div className="data-grid-item rounded-xl border bg-card p-4 shadow-sm card-hover glass-card-elevated">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-500/10">
                <AlertCircle className="h-4 w-4 text-red-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">إجمالي المديونية</p>
                <p className="text-lg font-bold text-destructive">
                  {formatCurrency(totalDebt)}
                </p>
              </div>
            </div>
          </div>

          <div className="data-grid-item rounded-xl border bg-card p-4 shadow-sm card-hover glass-card-elevated">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10">
                <Crown className="h-4 w-4 text-amber-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">عملاء VIP</p>
                <p className="text-lg font-bold">{vipCount}</p>
              </div>
            </div>
          </div>

          <div className="data-grid-item rounded-xl border bg-card p-4 shadow-sm card-hover glass-card-elevated">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-500/10">
                <Phone className="h-4 w-4 text-purple-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">عملاء بديون</p>
                <p className="text-lg font-bold">{debtorsCount}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Category Filter Chips ─────────────────────────────── */}
        <div className="filter-bar flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setActiveCategory('all')}
            className={`chip ${activeCategory === 'all' ? 'chip-primary' : 'chip-outline'} transition-all`}
          >
            <Users className="w-3 h-3" />
            الكل
          </button>
          {CUSTOMER_CATEGORIES.map((cat) => {
            const CatIcon = cat.icon
            const count = customers.filter((c) => c.category === cat.value).length
            return (
              <button
                key={cat.value}
                onClick={() => setActiveCategory(cat.value)}
                className={`chip ${activeCategory === cat.value ? cat.chipClass : 'chip-outline'} transition-all`}
              >
                <CatIcon className="w-3 h-3" />
                {cat.label}
                <span className="mr-1 text-[10px] opacity-70">({count})</span>
              </button>
            )
          })}
        </div>

        {/* ── Search ─────────────────────────────────────────────── */}
        <div className="relative">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="بحث بالاسم أو رقم الهاتف..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-10"
          />
        </div>

        {/* ── Data Table ─────────────────────────────────────────── */}
        <div className="rounded-xl border bg-card shadow-sm card-hover table-modern table-hover-highlight">
          <ScrollArea className="max-h-[520px]">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-12 text-center">#</TableHead>
                  <TableHead>اسم العميل</TableHead>
                  <TableHead className="hidden sm:table-cell">رقم الهاتف</TableHead>
                  <TableHead className="text-center">التصنيف</TableHead>
                  <TableHead className="text-center hidden md:table-cell">الزيارات</TableHead>
                  <TableHead className="text-center">المديونية</TableHead>
                  <TableHead className="text-center hidden lg:table-cell">الحالة</TableHead>
                  <TableHead className="text-center">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="stagger-children">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <TableCell key={j}>
                          <div className="h-4 w-full animate-pulse rounded bg-muted" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : customers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-48 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Users className="h-10 w-10 opacity-40" />
                        <p className="font-medium">لا يوجد عملاء</p>
                        <p className="text-sm">
                          {search
                            ? 'لا توجد نتائج مطابقة للبحث'
                            : 'اضغط على "إضافة عميل" لبدء إضافة العملاء'}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  customers.map((customer, index) => {
                    const isVip = customer.category === 'VIP'
                    const CategoryIcon = getCategoryIcon(customer.category)
                    return (
                      <TableRow
                        key={customer.id}
                        className={`group transition-colors hover:bg-muted/50 list-item-hover ${isVip ? 'border-r-4 border-r-amber-400' : ''}`}
                      >
                        <TableCell className="text-center text-muted-foreground">
                          {index + 1}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{customer.name}</span>
                            {customer.debt > 0 && (
                              <span className="badge-indicator-dot" />
                            )}
                            {isVip && (
                              <Crown className="h-3.5 w-3.5 text-amber-500 animate-pulse" />
                            )}
                            {customer.notes && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <StickyNote className="h-3 w-3 text-muted-foreground/60 hover:text-amber-500 transition-colors" />
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-[200px] text-xs">
                                  <p className="whitespace-pre-wrap">{customer.notes}</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell font-mono text-sm" dir="ltr">
                          {customer.phone || (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`chip ${getCategoryChipClass(customer.category)} text-[11px]`}>
                            <CategoryIcon className="w-3 h-3" />
                            {customer.category}
                          </span>
                        </TableCell>
                        <TableCell className="text-center hidden md:table-cell">
                          {customer.visitCount > 0 ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={() => openPurchaseHistory(customer)}
                                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                                >
                                  <ShoppingBag className="w-3 h-3" />
                                  {customer.visitCount}
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>سجل المشتريات</TooltipContent>
                            </Tooltip>
                          ) : (
                            <span className="text-xs text-muted-foreground">0</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {customer.debt > 0 ? (
                            <span className="chip chip-danger font-bold">
                              {formatCurrency(customer.debt)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">{formatCurrency(0)}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center hidden lg:table-cell">
                          {customer.isActive ? (
                            <span className="chip chip-success">نشط</span>
                          ) : (
                            <span className="chip chip-neutral">غير نشط</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-blue-500 hover:bg-blue-500/10 hover:text-blue-500"
                                  onClick={() => openPurchaseHistory(customer)}
                                >
                                  <ShoppingBag className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>سجل المشتريات</TooltipContent>
                            </Tooltip>
                            {customer.debt > 0 && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-600"
                                    onClick={() => openPaymentDialogForCustomer(customer)}
                                  >
                                    <Wallet className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>تسجيل دفعة</TooltipContent>
                              </Tooltip>
                            )}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => openPaymentHistory(customer)}
                                >
                                  <History className="h-4 w-4 text-muted-foreground" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>سجل الدفعات</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => openEdit(customer)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>تعديل</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                  onClick={() => openDelete(customer)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>حذف</TooltipContent>
                            </Tooltip>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>

        {/* ── Add Customer Dialog ────────────────────────────────── */}
        <Dialog open={openAddDialog} onOpenChange={setOpenAddDialog}>
          <DialogContent className="sm:max-w-md" dir="rtl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-primary" />
                إضافة عميل جديد
              </DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4 py-4 glass-card rounded-xl p-4">
              <div className="form-group">
                <label htmlFor="add-name" className="form-label-enhanced">
                  اسم العميل <span className="required-asterisk">*</span>
                </label>
                <Input
                  id="add-name"
                  placeholder="أدخل اسم العميل"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                />
              </div>
              <div className="form-group">
                <label htmlFor="add-phone" className="form-label-enhanced">رقم الهاتف</label>
                <Input
                  id="add-phone"
                  placeholder="أدخل رقم الهاتف (اختياري)"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                  dir="ltr"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label>تصنيف العميل</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger className="h-10 rounded-xl bg-muted/30 border-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CUSTOMER_CATEGORIES.map((cat) => {
                      const CatIcon = cat.icon
                      return (
                        <SelectItem key={cat.value} value={cat.value}>
                          <span className="flex items-center gap-2">
                            <CatIcon className="w-4 h-4" />
                            {cat.label}
                          </span>
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="add-notes">
                  ملاحظات
                  <span className="mr-1 text-muted-foreground text-xs">(اختياري)</span>
                </Label>
                <Textarea
                  id="add-notes"
                  placeholder="أضف ملاحظات عن العميل..."
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                  className="resize-none"
                />
              </div>
            </div>
            <DialogFooter className="flex gap-2 sm:justify-start">
              <Button onClick={handleCreate} disabled={submitting} className="btn-ripple">
                {submitting ? 'جارٍ الإضافة...' : 'إضافة'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setOpenAddDialog(false)
                  resetForm()
                }}
              >
                إلغاء
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Edit Customer Dialog ────────────────────────────────── */}
        <Dialog open={openEditDialog} onOpenChange={setOpenEditDialog}>
          <DialogContent className="sm:max-w-md" dir="rtl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Pencil className="h-5 w-5 text-primary" />
                تعديل بيانات العميل
              </DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4 py-4 glass-card rounded-xl p-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="edit-name">
                  اسم العميل <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="edit-name"
                  placeholder="أدخل اسم العميل"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && handleUpdate()}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="edit-phone">رقم الهاتف</Label>
                <Input
                  id="edit-phone"
                  placeholder="أدخل رقم الهاتف"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && handleUpdate()}
                  dir="ltr"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="edit-debt">المديونية ({symbol})</Label>
                <Input
                  id="edit-debt"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={form.debt}
                  onChange={(e) => setForm({ ...form, debt: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && handleUpdate()}
                  dir="ltr"
                  className={parseFloat(form.debt) > 0 ? 'border-destructive/50' : ''}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label>تصنيف العميل</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger className="h-10 rounded-xl bg-muted/30 border-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CUSTOMER_CATEGORIES.map((cat) => {
                      const CatIcon = cat.icon
                      return (
                        <SelectItem key={cat.value} value={cat.value}>
                          <span className="flex items-center gap-2">
                            <CatIcon className="w-4 h-4" />
                            {cat.label}
                          </span>
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="edit-notes">
                  ملاحظات
                  <span className="mr-1 text-muted-foreground text-xs">(اختياري)</span>
                </Label>
                <Textarea
                  id="edit-notes"
                  placeholder="أضف ملاحظات عن العميل..."
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                  className="resize-none"
                />
              </div>
            </div>
            <DialogFooter className="flex gap-2 sm:justify-start">
              <Button onClick={handleUpdate} disabled={submitting} className="btn-ripple">
                {submitting ? 'جارٍ التحديث...' : 'تحديث'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setOpenEditDialog(false)
                  resetForm()
                }}
              >
                إلغاء
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Delete Confirmation Dialog ──────────────────────────── */}
        <Dialog open={openDeleteDialog} onOpenChange={setOpenDeleteDialog}>
          <DialogContent className="sm:max-w-md" dir="rtl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <Trash2 className="h-5 w-5" />
                تأكيد الحذف
              </DialogTitle>
            </DialogHeader>
            <div className="py-4 glass-card rounded-xl p-4">
              <div className="flex flex-col items-center gap-4 rounded-lg border border-destructive/20 bg-destructive/5 p-6 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
                  <AlertCircle className="h-7 w-7 text-destructive" />
                </div>
                <div>
                  <p className="text-lg font-semibold">هل أنت متأكد من حذف هذا العميل؟</p>
                  {selectedCustomer && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      سيتم حذف العميل{' '}
                      <span className="font-semibold text-foreground">
                        {selectedCustomer.name}
                      </span>
                      {selectedCustomer.debt > 0 && (
                        <span className="mr-1 text-destructive">
                          {' '}
                          (ولديه مديونية {formatCurrency(selectedCustomer.debt)})
                        </span>
                      )}
                    </p>
                  )}
                  <p className="mt-2 text-xs text-muted-foreground">
                    هذا الإجراء لا يمكن التراجع عنه
                  </p>
                </div>
              </div>
            </div>
            <DialogFooter className="flex gap-2 sm:justify-start">
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? 'جارٍ الحذف...' : 'حذف'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setOpenDeleteDialog(false)
                  resetForm()
                }}
              >
                إلغاء
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Record Payment Dialog ──────────────────────────────── */}
        <Dialog open={openPaymentDialog} onOpenChange={setOpenPaymentDialog}>
          <DialogContent className="sm:max-w-md" dir="rtl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10">
                  <Wallet className="h-5 w-5 text-emerald-600" />
                </div>
                تسجيل دفعة
              </DialogTitle>
            </DialogHeader>
            {paymentCustomer && (
              <div className="space-y-4 py-2">
                <div className="rounded-xl bg-muted/40 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold">{paymentCustomer.name}</p>
                        {paymentCustomer.category === 'VIP' && (
                          <Crown className="h-3.5 w-3.5 text-amber-500" />
                        )}
                      </div>
                      {paymentCustomer.phone && (
                        <p className="text-xs text-muted-foreground" dir="ltr">{paymentCustomer.phone}</p>
                      )}
                    </div>
                    <div className="text-left">
                      <p className="text-[10px] text-muted-foreground">المديونية الحالية</p>
                      <p className="text-base font-bold text-destructive tabular-nums">
                        {formatCurrency(paymentCustomer.debt)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>مبلغ الدفعة <span className="text-destructive">*</span></Label>
                  <div className="relative">
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      placeholder="أدخل المبلغ"
                      className="h-11 text-base font-bold pr-4 pl-14 tabular-nums"
                      dir="ltr"
                      autoFocus
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">{symbol}</span>
                  </div>
                  {paymentAmount && parseFloat(paymentAmount) > paymentCustomer.debt && (
                    <p className="text-[11px] text-destructive">المبلغ يتجاوز المديونية الحالية</p>
                  )}
                </div>

                <div className="flex gap-2 flex-wrap">
                  {paymentCustomer.debt >= 50 && (
                    <button
                      onClick={() => setPaymentAmount(String(Math.min(50, paymentCustomer.debt)))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                        parseFloat(paymentAmount) === Math.min(50, paymentCustomer.debt)
                          ? 'bg-primary text-white shadow-sm'
                          : 'bg-muted/60 text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      50
                    </button>
                  )}
                  {paymentCustomer.debt >= 100 && (
                    <button
                      onClick={() => setPaymentAmount(String(Math.min(100, paymentCustomer.debt)))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                        parseFloat(paymentAmount) === Math.min(100, paymentCustomer.debt)
                          ? 'bg-primary text-white shadow-sm'
                          : 'bg-muted/60 text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      100
                    </button>
                  )}
                  {paymentCustomer.debt >= 200 && (
                    <button
                      onClick={() => setPaymentAmount(String(Math.min(200, paymentCustomer.debt)))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                        parseFloat(paymentAmount) === Math.min(200, paymentCustomer.debt)
                          ? 'bg-primary text-white shadow-sm'
                          : 'bg-muted/60 text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      200
                    </button>
                  )}
                  {paymentCustomer.debt >= 500 && (
                    <button
                      onClick={() => setPaymentAmount(String(Math.min(500, paymentCustomer.debt)))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                        parseFloat(paymentAmount) === Math.min(500, paymentCustomer.debt)
                          ? 'bg-primary text-white shadow-sm'
                          : 'bg-muted/60 text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      500
                    </button>
                  )}
                  <button
                    onClick={() => setPaymentAmount(String(paymentCustomer.debt))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                      parseFloat(paymentAmount) === paymentCustomer.debt
                        ? 'bg-emerald-500 text-white shadow-sm'
                        : 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20'
                    }`}
                  >
                    تسديد الكامل ({formatCurrency(paymentCustomer.debt)})
                  </button>
                </div>

                <div className="space-y-1.5">
                  <Label>طريقة الدفع</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger className="h-10 rounded-xl bg-muted/30 border-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash" className="gap-2">
                        <span className="flex items-center gap-2">
                          <Banknote className="w-4 h-4" />
                          نقدي
                        </span>
                      </SelectItem>
                      <SelectItem value="transfer" className="gap-2">
                        <span className="flex items-center gap-2">
                          <Wallet className="w-4 h-4" />
                          تحويل
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="payment-notes">
                    ملاحظات
                    <span className="mr-1 text-muted-foreground text-xs">(اختياري)</span>
                  </Label>
                  <Textarea
                    id="payment-notes"
                    placeholder="أضف ملاحظة للدفعة..."
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    rows={2}
                    className="resize-none"
                  />
                </div>
              </div>
            )}
            <DialogFooter className="flex gap-2 sm:justify-start">
              <Button
                onClick={handleRecordPayment}
                disabled={paymentSubmitting || !paymentAmount || parseFloat(paymentAmount) <= 0}
                className="btn-ripple"
              >
                {paymentSubmitting ? 'جارٍ التسجيل...' : 'تسجيل الدفعة'}
              </Button>
              <Button variant="outline" onClick={() => setOpenPaymentDialog(false)}>
                إلغاء
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Payment History Dialog ──────────────────────────────── */}
        <Dialog open={openHistoryDialog} onOpenChange={setOpenHistoryDialog}>
          <DialogContent className="sm:max-w-lg" dir="rtl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10">
                  <History className="h-5 w-5 text-blue-500" />
                </div>
                سجل الدفعات
                {historyCustomer && (
                  <span className="text-sm font-normal text-muted-foreground">
                    — {historyCustomer.name}
                  </span>
                )}
              </DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-96">
              {historyLoading ? (
                <div className="flex flex-col gap-3 p-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-16 rounded-lg bg-muted/50 animate-pulse" />
                  ))}
                </div>
              ) : paymentHistory.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
                  <History className="h-10 w-10 opacity-40" />
                  <p className="font-medium">لا توجد دفعات مسجلة</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2 p-2">
                  {paymentHistory.map((payment) => (
                    <div
                      key={payment.id}
                      className="rounded-lg border bg-card p-3 card-hover"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10">
                            <Banknote className="h-4 w-4 text-emerald-500" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-emerald-600">
                              {formatCurrency(payment.amount)}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              {payment.method === 'cash' ? 'نقدي' : 'تحويل'}
                            </p>
                          </div>
                        </div>
                        <div className="text-left">
                          <p className="text-[11px] text-muted-foreground">
                            {new Date(payment.createdAt).toLocaleDateString('ar-SA')}
                          </p>
                          {payment.notes && (
                            <p className="text-[10px] text-muted-foreground mt-0.5">{payment.notes}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </DialogContent>
        </Dialog>

        {/* ── Loyalty History Dialog ─────────────────────────────── */}
        <Dialog open={openLoyaltyDialog} onOpenChange={setOpenLoyaltyDialog}>
          <DialogContent className="sm:max-w-lg" dir="rtl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10">
                  <Star className="h-5 w-5 text-amber-500" />
                </div>
                سجل النقاط
                {loyaltyCustomer && (
                  <span className="text-sm font-normal text-muted-foreground">
                    — {loyaltyCustomer.name}
                    <span className="mr-2 chip chip-warning text-[11px] py-0 px-1.5">
                      {loyaltyCustomer.loyaltyPoints} نقطة
                    </span>
                  </span>
                )}
              </DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-96">
              {loyaltyLoading ? (
                <div className="flex flex-col gap-3 p-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-16 rounded-lg bg-muted/50 animate-pulse" />
                  ))}
                </div>
              ) : loyaltyHistory.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
                  <Star className="h-10 w-10 opacity-40" />
                  <p className="font-medium">لا توجد نقاط مسجلة</p>
                  {loyaltyCustomer && (
                    <div className="flex gap-2 mt-2">
                      <Button
                        size="sm"
                        onClick={() => openLoyaltyAdjust(loyaltyCustomer, 'grant')}
                        className="gap-1"
                      >
                        <Plus className="h-3 w-3" />
                        منح نقاط
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-2 p-2">
                  {loyaltyHistory.map((tx) => (
                    <div
                      key={tx.id}
                      className="rounded-lg border bg-card p-3 card-hover"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
                            tx.points > 0 ? 'bg-emerald-500/10' : 'bg-red-500/10'
                          }`}>
                            {tx.points > 0 ? (
                              <Plus className="h-4 w-4 text-emerald-500" />
                            ) : (
                              <Minus className="h-4 w-4 text-red-500" />
                            )}
                          </div>
                          <div>
                            <p className={`text-sm font-bold ${tx.points > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                              {tx.points > 0 ? '+' : ''}{tx.points} نقطة
                            </p>
                            <p className="text-[11px] text-muted-foreground">{tx.description}</p>
                          </div>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          {new Date(tx.createdAt).toLocaleDateString('ar-SA')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
            {loyaltyCustomer && (
              <DialogFooter className="flex gap-2 sm:justify-start">
                <Button
                  size="sm"
                  onClick={() => openLoyaltyAdjust(loyaltyCustomer, 'grant')}
                  className="gap-1"
                >
                  <Plus className="h-3 w-3" />
                  منح نقاط
                </Button>
                {loyaltyCustomer.loyaltyPoints > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openLoyaltyAdjust(loyaltyCustomer, 'deduct')}
                    className="gap-1"
                  >
                    <Minus className="h-3 w-3" />
                    خصم نقاط
                  </Button>
                )}
              </DialogFooter>
            )}
          </DialogContent>
        </Dialog>

        {/* ── Loyalty Adjust Dialog ─────────────────────────────── */}
        <Dialog open={loyaltyMode !== 'grant' || !openLoyaltyDialog ? (loyaltyCustomer ? true : false) : false}>
          <DialogContent className="sm:max-w-md" dir="rtl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                  loyaltyMode === 'grant' ? 'bg-emerald-500/10' : 'bg-orange-500/10'
                }`}>
                  {loyaltyMode === 'grant' ? (
                    <Plus className="h-5 w-5 text-emerald-500" />
                  ) : (
                    <Minus className="h-5 w-5 text-orange-500" />
                  )}
                </div>
                {loyaltyMode === 'grant' ? 'منح نقاط' : 'خصم نقاط'}
              </DialogTitle>
            </DialogHeader>
            {loyaltyCustomer && (
              <div className="space-y-4 py-2">
                <div className="rounded-xl bg-muted/40 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold">{loyaltyCustomer.name}</p>
                      <p className="text-[11px] text-muted-foreground">الرصيد الحالي</p>
                    </div>
                    <div className="text-left">
                      <p className="text-lg font-bold text-amber-600">{loyaltyCustomer.loyaltyPoints}</p>
                      <p className="text-[10px] text-muted-foreground">نقطة</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>
                    عدد النقاط <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    max={loyaltyMode === 'deduct' ? loyaltyCustomer.loyaltyPoints : undefined}
                    value={loyaltyPointsInput}
                    onChange={(e) => setLoyaltyPointsInput(e.target.value)}
                    placeholder="أدخل عدد النقاط"
                    className="tabular-nums"
                    dir="ltr"
                    autoFocus
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="loyalty-desc">
                    الوصف
                    <span className="mr-1 text-muted-foreground text-xs">(اختياري)</span>
                  </Label>
                  <Textarea
                    id="loyalty-desc"
                    placeholder={
                      loyaltyMode === 'grant'
                        ? 'سبب منح النقاط...'
                        : 'سبب الخصم...'
                    }
                    value={loyaltyDescription}
                    onChange={(e) => setLoyaltyDescription(e.target.value)}
                    rows={2}
                    className="resize-none"
                  />
                </div>
              </div>
            )}
            <DialogFooter className="flex gap-2 sm:justify-start">
              <Button
                onClick={handleLoyaltyAdjust}
                disabled={loyaltySubmitting || !loyaltyPointsInput}
                className={`btn-ripple ${loyaltyMode === 'grant' ? '' : 'bg-orange-500 hover:bg-orange-600'}`}
              >
                {loyaltySubmitting ? 'جارٍ التنفيذ...' : loyaltyMode === 'grant' ? 'منح' : 'خصم'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setLoyaltyCustomer(null)
                }}
              >
                إلغاء
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Purchase History Dialog ────────────────────────────── */}
        <Dialog open={openPurchaseDialog} onOpenChange={setOpenPurchaseDialog}>
          <DialogContent className="sm:max-w-lg" dir="rtl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10">
                  <ShoppingBag className="h-5 w-5 text-blue-500" />
                </div>
                سجل المشتريات
                {purchaseCustomer && (
                  <span className="text-sm font-normal text-muted-foreground">
                    — {purchaseCustomer.name}
                    {purchaseCustomer.category === 'VIP' && (
                      <Crown className="inline h-3.5 w-3.5 text-amber-500 mr-1" />
                    )}
                  </span>
                )}
              </DialogTitle>
            </DialogHeader>

            {purchaseCustomer && (
              <div>
                {/* ── Summary Cards ── */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="rounded-lg bg-muted/40 p-3 text-center">
                    <p className="text-[10px] text-muted-foreground">إجمالي المشتريات</p>
                    <p className="text-sm font-bold text-primary">
                      {formatCurrency(purchaseCustomer.totalPurchases)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted/40 p-3 text-center">
                    <p className="text-[10px] text-muted-foreground">عدد الزيارات</p>
                    <p className="text-sm font-bold">{purchaseCustomer.visitCount}</p>
                  </div>
                  <div className="rounded-lg bg-muted/40 p-3 text-center">
                    <p className="text-[10px] text-muted-foreground">آخر زيارة</p>
                    <p className="text-sm font-bold">
                      {purchaseCustomer.lastVisit
                        ? new Date(purchaseCustomer.lastVisit).toLocaleDateString('ar-SA')
                        : '—'}
                    </p>
                  </div>
                </div>

                {/* ── Notes Section ── */}
                {purchaseCustomer.notes && (
                  <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50/50 dark:border-amber-800/50 dark:bg-amber-950/20 p-3">
                    <div className="flex items-start gap-2">
                      <StickyNote className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-amber-700 dark:text-amber-400">ملاحظات</p>
                        {purchaseCustomer.notes.length > 100 ? (
                          <>
                            <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">
                              {expandedNotes === purchaseCustomer.id
                                ? purchaseCustomer.notes
                                : purchaseCustomer.notes.slice(0, 100) + '...'}
                            </p>
                            <button
                              onClick={() => setExpandedNotes(
                                expandedNotes === purchaseCustomer.id ? null : purchaseCustomer.id
                              )}
                              className="text-[11px] text-amber-600 hover:underline mt-1"
                            >
                              {expandedNotes === purchaseCustomer.id ? 'عرض أقل' : 'عرض المزيد'}
                            </button>
                          </>
                        ) : (
                          <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">
                            {purchaseCustomer.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Invoices List ── */}
                <ScrollArea className="max-h-72">
                  {purchaseLoading ? (
                    <div className="flex flex-col gap-3 p-4">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="h-16 rounded-lg bg-muted/50 animate-pulse" />
                      ))}
                    </div>
                  ) : customerInvoices.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
                      <ShoppingBag className="h-10 w-10 opacity-40" />
                      <p className="font-medium">لا توجد مشتريات سابقة</p>
                      <p className="text-xs">لم يتم تسجيل أي فواتير بيع لهذا العميل</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2 p-2">
                      {customerInvoices.map((invoice) => {
                        const remaining = invoice.totalAmount - invoice.discount - invoice.paidAmount
                        const isPaid = remaining <= 0
                        const isPartial = invoice.paidAmount > 0 && remaining > 0
                        return (
                          <div
                            key={invoice.id}
                            className="rounded-lg border bg-card p-3 card-hover"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/10">
                                  <ShoppingBag className="h-4 w-4 text-blue-500" />
                                </div>
                                <div>
                                  <p className="text-sm font-bold font-mono" dir="ltr">
                                    {invoice.invoiceNo}
                                  </p>
                                  <p className="text-[11px] text-muted-foreground">
                                    {new Date(invoice.createdAt).toLocaleDateString('ar-SA', {
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric',
                                    })}
                                  </p>
                                </div>
                              </div>
                              <div className="text-left">
                                <p className="text-sm font-bold">
                                  {formatCurrency(invoice.totalAmount)}
                                </p>
                                {isPaid ? (
                                  <span className="chip chip-success text-[10px] py-0 px-1.5">مدفوعة</span>
                                ) : isPartial ? (
                                  <span className="chip chip-warning text-[10px] py-0 px-1.5">جزئي</span>
                                ) : (
                                  <span className="chip chip-danger text-[10px] py-0 px-1.5">غير مدفوعة</span>
                                )}
                              </div>
                            </div>
                            {invoice.discount > 0 && (
                              <div className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
                                <span>خصم: {formatCurrency(invoice.discount)}</span>
                                <span className="mx-1">|</span>
                                <span>المدفوع: {formatCurrency(invoice.paidAmount)}</span>
                                {remaining > 0 && (
                                  <>
                                    <span className="mx-1">|</span>
                                    <span className="text-destructive">المتبقي: {formatCurrency(remaining)}</span>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </ScrollArea>

                {customerInvoices.length > 0 && (
                  <p className="text-[11px] text-muted-foreground text-center mt-2">
                    عرض آخر {customerInvoices.length} فواتير
                  </p>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

      </div>
    </TooltipProvider>
  )
}
