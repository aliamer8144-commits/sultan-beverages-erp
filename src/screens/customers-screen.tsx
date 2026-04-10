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
} from 'lucide-react'
import { exportToCSV } from '@/lib/export-csv'

interface Customer {
  id: string
  name: string
  phone: string | null
  debt: number
  isActive: boolean
}

interface CustomerFormData {
  name: string
  phone: string
  debt: string
}

interface Payment {
  id: string
  customerId: string
  amount: number
  method: string
  notes: string | null
  createdAt: string
}

const emptyForm: CustomerFormData = { name: '', phone: '', debt: '0' }

export function CustomersScreen() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [search, setSearch] = useState('')
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

  // ─── Fetch Customers ───────────────────────────────────────────────
  const fetchCustomers = async (query = '') => {
    try {
      setLoading(true)
      const res = await fetch(`/api/customers?search=${encodeURIComponent(query)}`)
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
      fetchCustomers(search)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  // ─── Helpers ──────────────────────────────────────────────────────
  const resetForm = () => {
    setForm(emptyForm)
    setSelectedCustomer(null)
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
        }),
      })
      if (!res.ok) throw new Error('فشل في إنشاء العميل')
      toast.success('تم إضافة العميل بنجاح')
      setOpenAddDialog(false)
      resetForm()
      fetchCustomers(search)
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
        }),
      })
      if (!res.ok) throw new Error('فشل في تحديث العميل')
      toast.success('تم تحديث بيانات العميل بنجاح')
      setOpenEditDialog(false)
      resetForm()
      fetchCustomers(search)
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
      fetchCustomers(search)
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
        toast.success(`تم تسجيل دفعة ${amount.toFixed(2)} ر.س (${methodLabel}) للعميل ${paymentCustomer.name}`)
        setOpenPaymentDialog(false)
        setPaymentCustomer(null)
        fetchCustomers(search)
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

  // ─── Stats ────────────────────────────────────────────────────────
  const totalCustomers = customers.length
  const totalDebt = customers.reduce((sum, c) => sum + c.debt, 0)
  const debtorsCount = customers.filter((c) => c.debt > 0).length

  // ─── Render ───────────────────────────────────────────────────────
  return (
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
                'المديونية': c.debt,
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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 stagger-children">
        <div className="rounded-xl border bg-card p-4 shadow-sm card-hover">
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

        <div className="rounded-xl border bg-card p-4 shadow-sm card-hover">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-500/10">
              <AlertCircle className="h-4 w-4 text-red-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">إجمالي المديونية</p>
              <p className="text-lg font-bold text-destructive">
                {totalDebt.toFixed(2)} ر.س
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-sm card-hover">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10">
              <Phone className="h-4 w-4 text-amber-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">عملاء بديون</p>
              <p className="text-lg font-bold">{debtorsCount}</p>
            </div>
          </div>
        </div>
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
      <div className="rounded-xl border bg-card shadow-sm card-hover">
        <ScrollArea className="max-h-[480px]">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-12 text-center">#</TableHead>
                <TableHead>اسم العميل</TableHead>
                <TableHead>رقم الهاتف</TableHead>
                <TableHead className="text-center">المديونية</TableHead>
                <TableHead className="text-center">الحالة</TableHead>
                <TableHead className="text-center">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="stagger-children">
              {loading ? (
                // ── Skeleton rows ──
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <TableCell key={j}>
                        <div className="h-4 w-full animate-pulse rounded bg-muted" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : customers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-48 text-center">
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
                customers.map((customer, index) => (
                  <TableRow
                    key={customer.id}
                    className="group transition-colors hover:bg-muted/50"
                  >
                    <TableCell className="text-center text-muted-foreground">
                      {index + 1}
                    </TableCell>
                    <TableCell className="font-medium">{customer.name}</TableCell>
                    <TableCell className="font-mono text-sm" dir="ltr">
                      {customer.phone || (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {customer.debt > 0 ? (
                        <span className="badge-danger font-bold text-xs px-2.5 py-0.5 rounded-full">
                          {customer.debt.toFixed(2)} ر.س
                        </span>
                      ) : (
                        <span className="text-muted-foreground">0.00 ر.س</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {customer.isActive ? (
                        <span className="badge-active text-xs px-2.5 py-0.5 rounded-full">نشط</span>
                      ) : (
                        <span className="badge-inactive text-xs px-2.5 py-0.5 rounded-full">غير نشط</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        {customer.debt > 0 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-600"
                            onClick={() => openPaymentDialogForCustomer(customer)}
                            title="تسجيل دفعة"
                          >
                            <Wallet className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openPaymentHistory(customer)}
                          title="سجل الدفعات"
                        >
                          <History className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEdit(customer)}
                          title="تعديل"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => openDelete(customer)}
                          title="حذف"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
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
            <div className="flex flex-col gap-2">
              <Label htmlFor="add-name">
                اسم العميل <span className="text-destructive">*</span>
              </Label>
              <Input
                id="add-name"
                placeholder="أدخل اسم العميل"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="add-phone">رقم الهاتف</Label>
              <Input
                id="add-phone"
                placeholder="أدخل رقم الهاتف (اختياري)"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                dir="ltr"
              />
            </div>
          </div>
          <DialogFooter className="flex gap-2 sm:justify-start">
            <Button onClick={handleCreate} disabled={submitting}>
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
              <Label htmlFor="edit-debt">المديونية (ر.س)</Label>
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
          </div>
          <DialogFooter className="flex gap-2 sm:justify-start">
            <Button onClick={handleUpdate} disabled={submitting}>
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
                        (ولديه مديونية {selectedCustomer.debt.toFixed(2)} ر.س)
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
              {/* Customer info */}
              <div className="rounded-xl bg-muted/40 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold">{paymentCustomer.name}</p>
                    {paymentCustomer.phone && (
                      <p className="text-xs text-muted-foreground" dir="ltr">{paymentCustomer.phone}</p>
                    )}
                  </div>
                  <div className="text-left">
                    <p className="text-[10px] text-muted-foreground">المديونية الحالية</p>
                    <p className="text-base font-bold text-destructive tabular-nums">
                      {paymentCustomer.debt.toFixed(2)} ر.س
                    </p>
                  </div>
                </div>
              </div>

              {/* Amount */}
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
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">ر.س</span>
                </div>
                {paymentAmount && parseFloat(paymentAmount) > paymentCustomer.debt && (
                  <p className="text-[11px] text-destructive">المبلغ يتجاوز المديونية الحالية</p>
                )}
              </div>

              {/* Quick amount buttons */}
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
                  تسديد الكامل ({paymentCustomer.debt.toFixed(2)})
                </button>
              </div>

              {/* Payment method */}
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

              {/* Notes */}
              <div className="space-y-1.5">
                <Label>ملاحظات (اختياري)</Label>
                <Textarea
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="أضف ملاحظات حول الدفعة..."
                  className="h-16 rounded-xl bg-muted/30 border-0 text-sm resize-none"
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => setOpenPaymentDialog(false)}
              className="flex-1 h-10 rounded-xl"
              disabled={paymentSubmitting}
            >
              إلغاء
            </Button>
            <Button
              onClick={handleRecordPayment}
              disabled={paymentSubmitting || !paymentAmount || parseFloat(paymentAmount) <= 0 || parseFloat(paymentAmount) > (paymentCustomer?.debt || 0)}
              className="flex-1 h-10 rounded-xl gap-2 shadow-lg shadow-emerald-500/25"
            >
              {paymentSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>جاري التسجيل...</span>
                </>
              ) : (
                <>
                  <Wallet className="w-4 h-4" />
                  تسجيل الدفعة
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Payment History Dialog ─────────────────────────────── */}
      <Dialog open={openHistoryDialog} onOpenChange={setOpenHistoryDialog}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-hidden flex flex-col glass-card" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <History className="h-5 w-5 text-primary" />
              </div>
              سجل الدفعات — {historyCustomer?.name}
            </DialogTitle>
          </DialogHeader>
          {historyCustomer && (
            <div className="flex-1 overflow-hidden flex flex-col">
              <div className="mb-3 rounded-xl bg-muted/40 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">المديونية الحالية</p>
                  <p className={`text-sm font-bold tabular-nums ${historyCustomer.debt > 0 ? 'text-destructive' : 'text-emerald-600'}`}>
                    {historyCustomer.debt.toFixed(2)} ر.س
                  </p>
                </div>
              </div>
              {historyLoading ? (
                <div className="flex-1 flex items-center justify-center py-8">
                  <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                </div>
              ) : paymentHistory.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-8 text-center">
                  <History className="w-10 h-10 text-muted-foreground/30 mb-2" />
                  <p className="text-sm text-muted-foreground">لا توجد دفعات مسجلة</p>
                </div>
              ) : (
                <ScrollArea className="flex-1">
                  <div className="space-y-2 pb-2">
                    {paymentHistory.map((payment) => (
                      <div
                        key={payment.id}
                        className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/40 hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 flex-shrink-0">
                          {payment.method === 'cash' ? (
                            <Banknote className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <Wallet className="w-4 h-4 text-emerald-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-emerald-600 tabular-nums">
                            -{payment.amount.toFixed(2)} ر.س
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {payment.method === 'cash' ? 'نقدي' : 'تحويل'}
                            {payment.notes && ` • ${payment.notes}`}
                          </p>
                        </div>
                        <p className="text-[10px] text-muted-foreground flex-shrink-0">
                          {new Date(payment.createdAt).toLocaleDateString('ar-SA', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
