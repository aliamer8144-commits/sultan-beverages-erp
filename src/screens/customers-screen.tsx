'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
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
import { Skeleton } from '@/components/ui/skeleton'
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
  StickyNote,
  ShoppingBag,
  Crown,
} from 'lucide-react'
import { exportToCSV } from '@/lib/export-csv'
import { useCurrency } from '@/hooks/use-currency'
import { useApi } from '@/hooks/use-api'

import type { Customer, CustomerFormData } from './customers/types'
import { CUSTOMER_CATEGORIES, emptyForm } from './customers/types'
import { CustomerFormDialog } from './customers/customer-form-dialog'
import { CustomerPaymentDialog } from './customers/customer-payment-dialog'
import { PaymentHistoryDialog } from './customers/payment-history-dialog'
import { LoyaltyHistoryDialog } from './customers/loyalty-history-dialog'
import { PurchaseHistoryDialog } from './customers/purchase-history-dialog'

export function CustomersScreen() {
  const { formatCurrency, symbol } = useCurrency()
  const { get, post, put, del } = useApi()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')
  const [loading, setLoading] = useState(true)

  // ── Form dialog state (shared for add/edit) ──
  const [openAddDialog, setOpenAddDialog] = useState(false)
  const [openEditDialog, setOpenEditDialog] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [form, setForm] = useState<CustomerFormData>(emptyForm)
  const [submitting, setSubmitting] = useState(false)

  // ── Delete dialog state ──
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // ── Payment dialog state ──
  const [openPaymentDialog, setOpenPaymentDialog] = useState(false)
  const [paymentCustomer, setPaymentCustomer] = useState<Customer | null>(null)

  // ── Payment history dialog state ──
  const [openHistoryDialog, setOpenHistoryDialog] = useState(false)
  const [historyCustomer, setHistoryCustomer] = useState<Customer | null>(null)

  // ── Loyalty dialog state ──
  const [openLoyaltyDialog, setOpenLoyaltyDialog] = useState(false)
  const [loyaltyCustomer, setLoyaltyCustomer] = useState<Customer | null>(null)

  // ── Purchase history dialog state ──
  const [openPurchaseDialog, setOpenPurchaseDialog] = useState(false)
  const [purchaseCustomer, setPurchaseCustomer] = useState<Customer | null>(null)

  // ─── Fetch Customers ───────────────────────────────────────────────
  const fetchCustomers = async (query = '', category = 'all') => {
    setLoading(true)
    try {
      const result = await get<Customer[]>('/api/customers', {
        search: query || undefined,
        category: category !== 'all' ? category : undefined,
      }, { showErrorToast: false })
      setCustomers(result || [])
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
    return CUSTOMER_CATEGORIES.find((c) => c.value === category)?.icon || Users
  }

  const getCategoryChipClass = (category: string) => {
    return CUSTOMER_CATEGORIES.find((c) => c.value === category)?.chipClass || 'chip-outline'
  }

  // ─── Create Customer ──────────────────────────────────────────────
  const handleCreate = async () => {
    if (!form.name.trim()) {
      toast.error('يرجى إدخال اسم العميل')
      return
    }
    try {
      setSubmitting(true)
      const result = await post('/api/customers', {
        name: form.name.trim(),
        phone: form.phone.trim() || null,
        category: form.category,
        notes: form.notes.trim() || null,
      }, {
        showSuccessToast: true,
        successMessage: 'تم إضافة العميل بنجاح',
      })
      if (result) {
        setOpenAddDialog(false)
        resetForm()
        fetchCustomers(search, activeCategory)
      }
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
      const result = await put(`/api/customers/${selectedCustomer.id}`, {
        name: form.name.trim(),
        phone: form.phone.trim() || null,
        debt: parseFloat(form.debt) || 0,
        category: form.category,
        notes: form.notes.trim() || null,
      }, {
        showSuccessToast: true,
        successMessage: 'تم تحديث بيانات العميل بنجاح',
      })
      if (result) {
        setOpenEditDialog(false)
        resetForm()
        fetchCustomers(search, activeCategory)
      }
    } finally {
      setSubmitting(false)
    }
  }

  // ─── Delete Customer ──────────────────────────────────────────────
  const handleDelete = async () => {
    if (!selectedCustomer) return
    setDeleting(true)
    try {
      await del(`/api/customers/${selectedCustomer.id}`)
      setOpenDeleteDialog(false)
      resetForm()
      fetchCustomers(search, activeCategory)
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
    setOpenPaymentDialog(true)
  }

  // ─── Open Payment History ─────────────────────────────────────────
  const openPaymentHistory = (customer: Customer) => {
    setHistoryCustomer(customer)
    setOpenHistoryDialog(true)
  }

  // ─── Open Loyalty History ─────────────────────────────────────────
  const openLoyaltyHistory = (customer: Customer) => {
    setLoyaltyCustomer(customer)
    setOpenLoyaltyDialog(true)
  }

  // ─── Open Purchase History ────────────────────────────────────────
  const openPurchaseHistory = (customer: Customer) => {
    setPurchaseCustomer(customer)
    setOpenPurchaseDialog(true)
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
                          <Skeleton className="h-4 w-full bg-muted" />
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

        {/* ── Extracted Dialogs ─────────────────────────────────── */}
        <CustomerFormDialog
          open={openAddDialog}
          onOpenChange={(open) => {
            setOpenAddDialog(open)
            if (!open) resetForm()
          }}
          mode="add"
          form={form}
          setForm={setForm}
          onSubmit={handleCreate}
          submitting={submitting}
          symbol={symbol}
        />

        <CustomerFormDialog
          open={openEditDialog}
          onOpenChange={(open) => {
            setOpenEditDialog(open)
            if (!open) resetForm()
          }}
          mode="edit"
          form={form}
          setForm={setForm}
          onSubmit={handleUpdate}
          submitting={submitting}
          symbol={symbol}
        />

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

        <CustomerPaymentDialog
          open={openPaymentDialog}
          onOpenChange={setOpenPaymentDialog}
          customer={paymentCustomer}
          formatCurrency={formatCurrency}
          symbol={symbol}
          onSuccess={() => fetchCustomers(search, activeCategory)}
        />

        <PaymentHistoryDialog
          open={openHistoryDialog}
          onOpenChange={setOpenHistoryDialog}
          customer={historyCustomer}
          formatCurrency={formatCurrency}
        />

        <LoyaltyHistoryDialog
          open={openLoyaltyDialog}
          onOpenChange={setOpenLoyaltyDialog}
          customer={loyaltyCustomer}
          formatCurrency={formatCurrency}
          onSuccess={() => fetchCustomers(search, activeCategory)}
        />

        <PurchaseHistoryDialog
          open={openPurchaseDialog}
          onOpenChange={setOpenPurchaseDialog}
          customer={purchaseCustomer}
          formatCurrency={formatCurrency}
        />

      </div>
    </TooltipProvider>
  )
}
