'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog'
import { Switch } from '@/components/ui/switch'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { toast } from 'sonner'
import {
  Search, Plus, Pencil, Trash2, AlertTriangle, Package, Filter, Loader2,
  PackageX, ImagePlus, X, History, PackagePlus, Download, ChevronLeft,
  ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, RotateCcw, PenLine,
  FileInput, ArrowLeft, CheckSquare, DollarSign, Tags, ListFilter,
  TrendingUp, TrendingDown, Clock, Activity, Layers, Save, Upload,
} from 'lucide-react'
import { CsvImportDialog } from '@/components/csv-import-dialog'
import { useCurrency } from '@/hooks/use-currency'
import { useAppStore } from '@/store/app-store'
import { compressImage } from '@/lib/image-utils'
import { format } from 'date-fns'
import { ar } from 'date-fns/locale'

// Types
interface Product {
  id: string
  name: string
  price: number
  costPrice: number
  quantity: number
  minQuantity: number
  categoryId: string
  category: { id: string; name: string; icon: string }
  image?: string
  barcode?: string
  isActive: boolean
}

interface Category {
  id: string
  name: string
  icon: string
  _count?: { products: number }
}

interface ProductFormData {
  name: string
  categoryId: string
  price: string
  costPrice: string
  quantity: string
  minQuantity: string
  barcode: string
  image: string
}

interface StockAdjustment {
  id: string
  productId: string
  type: string
  quantity: number
  previousQty: number
  newQty: number
  reason: string
  userId: string
  userName: string | null
  reference: string | null
  createdAt: string
  product: { id: string; name: string; category: { name: string } }
}

interface AdjustmentFormData {
  type: 'addition' | 'subtraction' | 'correction'
  quantity: string
  reason: string
  reference: string
}

const emptyForm: ProductFormData = {
  name: '',
  categoryId: '',
  price: '',
  costPrice: '',
  quantity: '0',
  minQuantity: '5',
  barcode: '',
  image: '',
}

const emptyAdjustmentForm: AdjustmentFormData = {
  type: 'addition',
  quantity: '',
  reason: '',
  reference: '',
}

// Variant types
interface ProductVariant {
  id: string
  productId: string
  name: string
  sku?: string
  barcode?: string
  costPrice: number
  sellPrice: number
  stock: number
  isActive: boolean
  createdAt: string
}

interface VariantFormData {
  name: string
  sku: string
  barcode: string
  costPrice: string
  sellPrice: string
  stock: string
}

const emptyVariantForm: VariantFormData = {
  name: '',
  sku: '',
  barcode: '',
  costPrice: '',
  sellPrice: '',
  stock: '0',
}

// Adjustment type config
const adjustmentTypeConfig: Record<string, { label: string; color: string; bgColor: string; icon: React.ElementType }> = {
  addition: { label: 'إضافة', color: 'text-emerald-700 dark:text-emerald-400', bgColor: 'bg-emerald-100 dark:bg-emerald-900/30', icon: ArrowUp },
  subtraction: { label: 'خصم', color: 'text-red-700 dark:text-red-400', bgColor: 'bg-red-100 dark:bg-red-900/30', icon: ArrowDown },
  correction: { label: 'تصحيح', color: 'text-blue-700 dark:text-blue-400', bgColor: 'bg-blue-100 dark:bg-blue-900/30', icon: PenLine },
  return: { label: 'إرجاع', color: 'text-amber-700 dark:text-amber-400', bgColor: 'bg-amber-100 dark:bg-amber-900/30', icon: RotateCcw },
  initial: { label: 'رصيد أولي', color: 'text-purple-700 dark:text-purple-400', bgColor: 'bg-purple-100 dark:bg-purple-900/30', icon: FileInput },
}

export function InventoryScreen() {
  // Currency
  const { symbol } = useCurrency()
  const user = useAppStore((s) => s.user)

  // Data state
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  // Filter state
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState('all')
  const [lowStock, setLowStock] = useState(false)

  // Dialog state
  const [formOpen, setFormOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null)
  const [form, setForm] = useState<ProductFormData>(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Stock adjustment dialog state
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false)
  const [adjustProduct, setAdjustProduct] = useState<Product | null>(null)
  const [adjustForm, setAdjustForm] = useState<AdjustmentFormData>(emptyAdjustmentForm)
  const [adjustSubmitting, setAdjustSubmitting] = useState(false)

  // ─── Batch Operations State ──────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [batchSubmitting, setBatchSubmitting] = useState(false)

  // Batch price change dialog state
  const [batchPriceOpen, setBatchPriceOpen] = useState(false)
  const [batchPriceType, setBatchPriceType] = useState<'fixed' | 'percentage'>('fixed')
  const [batchPriceValue, setBatchPriceValue] = useState('')
  const [batchPercentDir, setBatchPercentDir] = useState<'increase' | 'decrease'>('increase')

  // Batch category change dialog state
  const [batchCategoryOpen, setBatchCategoryOpen] = useState(false)
  const [batchNewCategoryId, setBatchNewCategoryId] = useState('')

  // Batch status toggle dialog state
  const [batchStatusOpen, setBatchStatusOpen] = useState(false)
  const [batchNewStatus, setBatchNewStatus] = useState(true)

  // Batch delete confirmation dialog state
  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false)

  // Per-product stock history popover state
  const [productHistoryId, setProductHistoryId] = useState<string | null>(null)
  const [productMovements, setProductMovements] = useState<StockAdjustment[]>([])
  const [productMovementsLoading, setProductMovementsLoading] = useState(false)

  // Stock history dialog state
  const [historyOpen, setHistoryOpen] = useState(false)
  const [adjustments, setAdjustments] = useState<StockAdjustment[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyPage, setHistoryPage] = useState(1)
  const [historyTotalPages, setHistoryTotalPages] = useState(1)
  const [historyTotal, setHistoryTotal] = useState(0)
  const [historyFilterProduct, setHistoryFilterProduct] = useState('all')
  const [historyFilterType, setHistoryFilterType] = useState('all')
  const [historyDateFrom, setHistoryDateFrom] = useState<Date | undefined>()
  const [historyDateTo, setHistoryDateTo] = useState<Date | undefined>()
  const [dateFromOpen, setDateFromOpen] = useState(false)
  const [dateToOpen, setDateToOpen] = useState(false)

  // ─── Variants Dialog State ────────────────────────────────────
  const [variantsOpen, setVariantsOpen] = useState(false)
  const [variantsProduct, setVariantsProduct] = useState<Product | null>(null)
  const [variants, setVariants] = useState<ProductVariant[]>([])
  const [variantsLoading, setVariantsLoading] = useState(false)
  const [variantFormOpen, setVariantFormOpen] = useState(false)
  const [editingVariant, setEditingVariant] = useState<ProductVariant | null>(null)
  const [variantForm, setVariantForm] = useState<VariantFormData>(emptyVariantForm)
  const [variantSubmitting, setVariantSubmitting] = useState(false)

  // ─── Variants Handlers ────────────────────────────────────────
  const openVariantsDialog = useCallback(async (product: Product) => {
    setVariantsProduct(product)
    setVariantsOpen(true)
    setVariantFormOpen(false)
    setEditingVariant(null)
    setVariantsLoading(true)
    try {
      const res = await fetch(`/api/product-variants?productId=${product.id}`)
      const data = await res.json()
      if (data.success) {
        setVariants(data.data)
      }
    } catch {
      toast.error('فشل في تحميل المتغيرات')
    } finally {
      setVariantsLoading(false)
    }
  }, [])

  const openAddVariantDialog = () => {
    setEditingVariant(null)
    setVariantForm(emptyVariantForm)
    setVariantFormOpen(true)
  }

  const openEditVariantDialog = (variant: ProductVariant) => {
    setEditingVariant(variant)
    setVariantForm({
      name: variant.name,
      sku: variant.sku || '',
      barcode: variant.barcode || '',
      costPrice: String(variant.costPrice),
      sellPrice: String(variant.sellPrice),
      stock: String(variant.stock),
    })
    setVariantFormOpen(true)
  }

  const handleVariantSubmit = async () => {
    if (!variantsProduct) return
    if (!variantForm.name.trim()) {
      toast.error('يرجى إدخال اسم المتغير')
      return
    }

    setVariantSubmitting(true)
    try {
      let res: Response
      if (editingVariant) {
        res = await fetch(`/api/product-variants?id=${editingVariant.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: variantForm.name.trim(),
            sku: variantForm.sku.trim() || null,
            barcode: variantForm.barcode.trim() || null,
            costPrice: Number(variantForm.costPrice) || 0,
            sellPrice: Number(variantForm.sellPrice) || 0,
            stock: Number(variantForm.stock) || 0,
          }),
        })
        toast.success('تم تحديث المتغير بنجاح')
      } else {
        res = await fetch('/api/product-variants', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productId: variantsProduct.id,
            name: variantForm.name.trim(),
            sku: variantForm.sku.trim() || null,
            barcode: variantForm.barcode.trim() || null,
            costPrice: Number(variantForm.costPrice) || 0,
            sellPrice: Number(variantForm.sellPrice) || 0,
            stock: Number(variantForm.stock) || 0,
          }),
        })
        toast.success('تم إضافة المتغير بنجاح')
      }

      const data = await res.json()
      if (!data.success) {
        toast.error(data.error || 'حدث خطأ أثناء الحفظ')
        return
      }

      setVariantFormOpen(false)
      openVariantsDialog(variantsProduct)
    } catch {
      toast.error('حدث خطأ في الاتصال')
    } finally {
      setVariantSubmitting(false)
    }
  }

  const handleDeleteVariant = async (variantId: string) => {
    try {
      const res = await fetch(`/api/product-variants?id=${variantId}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (data.success) {
        toast.success('تم حذف المتغير بنجاح')
        if (variantsProduct) {
          openVariantsDialog(variantsProduct)
        }
      } else {
        toast.error(data.error || 'فشل في حذف المتغير')
      }
    } catch {
      toast.error('حدث خطأ في الاتصال')
    }
  }

  // ─── Per-product stock history fetch ─────────────────────────
  const fetchProductMovements = useCallback(async (productId: string) => {
    setProductMovementsLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('productId', productId)
      params.set('page', '1')
      params.set('limit', '5')
      const res = await fetch(`/api/stock-adjustments?${params.toString()}`)
      const data = await res.json()
      if (data.success) {
        setProductMovements(data.data || [])
      } else {
        setProductMovements([])
      }
    } catch {
      setProductMovements([])
    } finally {
      setProductMovementsLoading(false)
    }
  }, [])

  // Stock movement type config for mini timeline
  const movementTypeConfig: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
    in: { label: 'إضافة', icon: TrendingUp, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
    purchase: { label: 'شراء', icon: TrendingUp, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
    return: { label: 'إرجاع', icon: TrendingUp, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/30' },
    out: { label: 'خصم', icon: TrendingDown, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/30' },
    sale: { label: 'بيع', icon: TrendingDown, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/30' },
    adjustment: { label: 'تعديل', icon: ArrowUpDown, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/30' },
    addition: { label: 'إضافة', icon: TrendingUp, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
    subtraction: { label: 'خصم', icon: TrendingDown, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/30' },
    correction: { label: 'تصحيح', icon: ArrowUpDown, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/30' },
  }

  // Image upload handler with compression
  const handleImageUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('يرجى اختيار ملف صورة فقط')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('حجم الصورة يجب أن يكون أقل من 2 ميجابايت')
      return
    }
    try {
      toast.loading('جاري ضغط الصورة...', { id: 'image-compress' })
      const compressed = await compressImage(file, 400, 0.75)
      setForm((prev) => ({ ...prev, image: compressed }))
      toast.success('تم تحميل الصورة بنجاح', { id: 'image-compress' })
    } catch {
      toast.error('فشل في تحميل الصورة', { id: 'image-compress' })
    }
  }, [])

  // Fetch categories
  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/categories')
      const data = await res.json()
      if (data.success) {
        setCategories(data.data)
      }
    } catch {
      toast.error('فشل في تحميل التصنيفات')
    }
  }, [])

  // Fetch products
  const fetchProducts = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (categoryId && categoryId !== 'all') params.set('categoryId', categoryId)
      if (lowStock) params.set('lowStock', 'true')

      const res = await fetch(`/api/products?${params.toString()}`)
      const data = await res.json()
      if (data.success) {
        setProducts(data.data)
      } else {
        toast.error(data.error || 'فشل في تحميل المنتجات')
      }
    } catch {
      toast.error('حدث خطأ في الاتصال')
    } finally {
      setLoading(false)
    }
  }, [search, categoryId, lowStock])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  // Debounced search
  const [searchTimer, setSearchTimer] = useState<NodeJS.Timeout | null>(null)
  const handleSearchChange = (value: string) => {
    setSearch(value)
    if (searchTimer) clearTimeout(searchTimer)
    const timer = setTimeout(() => {
      fetchProducts()
    }, 300)
    setSearchTimer(timer)
  }

  // Form handlers
  const openAddDialog = () => {
    setEditingProduct(null)
    setForm(emptyForm)
    setFormOpen(true)
  }

  const openEditDialog = (product: Product) => {
    setEditingProduct(product)
    setForm({
      name: product.name,
      categoryId: product.categoryId,
      price: String(product.price),
      costPrice: String(product.costPrice),
      quantity: String(product.quantity),
      minQuantity: String(product.minQuantity),
      barcode: product.barcode || '',
      image: product.image || '',
    })
    setFormOpen(true)
  }

  const openDeleteDialog = (product: Product) => {
    setDeletingProduct(product)
    setDeleteOpen(true)
  }

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast.error('يرجى إدخال اسم المنتج')
      return
    }
    if (!form.categoryId) {
      toast.error('يرجى اختيار التصنيف')
      return
    }
    if (!form.price || Number(form.price) <= 0) {
      toast.error('يرجى إدخال سعر البيع')
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        name: form.name.trim(),
        categoryId: form.categoryId,
        price: Number(form.price),
        costPrice: Number(form.costPrice) || 0,
        quantity: Number(form.quantity) || 0,
        minQuantity: Number(form.minQuantity) || 5,
        barcode: form.barcode.trim() || null,
        image: form.image.trim() || null,
      }

      let res: Response
      if (editingProduct) {
        res = await fetch('/api/products', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingProduct.id, ...payload }),
        })
        toast.success('تم تحديث المنتج بنجاح')
      } else {
        res = await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        toast.success('تم إضافة المنتج بنجاح')
      }

      const data = await res.json()
      if (!data.success) {
        toast.error(data.error || 'حدث خطأ أثناء الحفظ')
        return
      }

      setFormOpen(false)
      fetchProducts()
    } catch {
      toast.error('حدث خطأ في الاتصال')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingProduct) return

    try {
      const res = await fetch('/api/products', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deletingProduct.id }),
      })
      const data = await res.json()

      if (data.success) {
        toast.success('تم حذف المنتج بنجاح')
        setDeleteOpen(false)
        setDeletingProduct(null)
        fetchProducts()
      } else {
        toast.error(data.error || 'فشل في حذف المنتج')
      }
    } catch {
      toast.error('حدث خطأ في الاتصال')
    }
  }

  // ─── Stock Adjustment Handlers ───────────────────────────────────
  const openAdjustDialog = (product: Product) => {
    setAdjustProduct(product)
    setAdjustForm(emptyAdjustmentForm)
    setAdjustDialogOpen(true)
  }

  const handleAdjustSubmit = async () => {
    if (!adjustProduct) return
    if (!adjustForm.quantity || Number(adjustForm.quantity) <= 0) {
      toast.error('يرجى إدخال الكمية')
      return
    }
    if (!adjustForm.reason.trim()) {
      toast.error('يرجى إدخال سبب التعديل')
      return
    }

    setAdjustSubmitting(true)
    try {
      const res = await fetch('/api/stock-adjustments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: adjustProduct.id,
          type: adjustForm.type,
          quantity: Number(adjustForm.quantity),
          reason: adjustForm.reason.trim(),
          userId: user?.id || 'unknown',
          userName: user?.name || null,
          reference: adjustForm.reference.trim() || null,
        }),
      })
      const data = await res.json()

      if (data.success) {
        toast.success(data.message || 'تم تعديل المخزون بنجاح')
        setAdjustDialogOpen(false)
        setAdjustProduct(null)
        setAdjustForm(emptyAdjustmentForm)
        fetchProducts()
      } else {
        toast.error(data.error || 'فشل في تعديل المخزون')
      }
    } catch {
      toast.error('حدث خطأ في الاتصال')
    } finally {
      setAdjustSubmitting(false)
    }
  }

  // ─── Stock History Handlers ───────────────────────────────────────
  const fetchHistory = useCallback(async (page = 1) => {
    setHistoryLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('limit', '15')
      if (historyFilterProduct && historyFilterProduct !== 'all') {
        params.set('productId', historyFilterProduct)
      }
      if (historyFilterType && historyFilterType !== 'all') {
        params.set('type', historyFilterType)
      }
      if (historyDateFrom) {
        params.set('dateFrom', format(historyDateFrom, 'yyyy-MM-dd'))
      }
      if (historyDateTo) {
        params.set('dateTo', format(historyDateTo, 'yyyy-MM-dd'))
      }

      const res = await fetch(`/api/stock-adjustments?${params.toString()}`)
      const data = await res.json()

      if (data.success) {
        setAdjustments(data.data)
        setHistoryPage(data.pagination.page)
        setHistoryTotalPages(data.pagination.totalPages)
        setHistoryTotal(data.pagination.total)
      } else {
        toast.error(data.error || 'فشل في تحميل السجل')
      }
    } catch {
      toast.error('حدث خطأ في الاتصال')
    } finally {
      setHistoryLoading(false)
    }
  }, [historyFilterProduct, historyFilterType, historyDateFrom, historyDateTo])

  useEffect(() => {
    if (historyOpen) {
      setHistoryPage(1)
      fetchHistory(1)
    }
  }, [historyOpen, fetchHistory])

  const handleHistoryPageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= historyTotalPages) {
      setHistoryPage(newPage)
      fetchHistory(newPage)
    }
  }

  const handleExportCSV = () => {
    if (adjustments.length === 0) {
      toast.error('لا توجد بيانات للتصدير')
      return
    }

    const headers = ['المنتج', 'التصنيف', 'النوع', 'الكمية', 'السابق', 'الجديد', 'السبب', 'المستخدم', 'المرجع', 'التاريخ']
    const rows = adjustments.map((a) => [
      a.product.name,
      a.product.category.name,
      adjustmentTypeConfig[a.type]?.label || a.type,
      a.quantity,
      a.previousQty,
      a.newQty,
      `"${a.reason}"`,
      a.userName || a.userId,
      a.reference || '',
      new Date(a.createdAt).toLocaleString('ar-SA'),
    ])

    const csv = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `stock-adjustments-${format(new Date(), 'yyyy-MM-dd')}.csv`
    link.click()
    URL.revokeObjectURL(link.href)
    toast.success('تم تصدير البيانات بنجاح')
  }

  // ─── Batch Selection Handlers ─────────────────────────────────
  const toggleSelectProduct = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === products.length && products.length > 0) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(products.map((p) => p.id)))
    }
  }

  const clearSelection = () => {
    setSelectedIds(new Set())
  }

  const isAllSelected = products.length > 0 && selectedIds.size === products.length
  const isSomeSelected = selectedIds.size > 0

  // ─── Batch Operation Handlers ─────────────────────────────────
  const selectedProducts = products.filter((p) => selectedIds.has(p.id))

  const handleBatchPriceChange = async () => {
    if (selectedIds.size === 0) return
    if (!batchPriceValue || Number(batchPriceValue) <= 0) {
      toast.error('يرجى إدخال قيمة صحيحة')
      return
    }

    setBatchSubmitting(true)
    try {
      const payload: Record<string, unknown> = {
        ids: Array.from(selectedIds),
        priceChangeType: batchPriceType,
      }

      if (batchPriceType === 'fixed') {
        payload.priceChangeValue = Number(batchPriceValue)
      } else {
        payload.priceChangeValue = batchPercentDir === 'increase'
          ? Number(batchPriceValue)
          : -Number(batchPriceValue)
      }

      const res = await fetch('/api/products', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()

      if (data.success) {
        toast.success(`تم تغيير سعر ${data.data.count} منتج بنجاح`)
        setBatchPriceOpen(false)
        setBatchPriceValue('')
        clearSelection()
        fetchProducts()
      } else {
        toast.error(data.error || 'فشل في تغيير الأسعار')
      }
    } catch {
      toast.error('حدث خطأ في الاتصال')
    } finally {
      setBatchSubmitting(false)
    }
  }

  const handleBatchCategoryChange = async () => {
    if (selectedIds.size === 0) return
    if (!batchNewCategoryId) {
      toast.error('يرجى اختيار التصنيف')
      return
    }

    setBatchSubmitting(true)
    try {
      const res = await fetch('/api/products', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: Array.from(selectedIds),
          categoryId: batchNewCategoryId,
        }),
      })
      const data = await res.json()

      if (data.success) {
        toast.success(`تم نقل ${data.data.count} منتج إلى التصنيف الجديد`)
        setBatchCategoryOpen(false)
        setBatchNewCategoryId('')
        clearSelection()
        fetchProducts()
      } else {
        toast.error(data.error || 'فشل في نقل المنتجات')
      }
    } catch {
      toast.error('حدث خطأ في الاتصال')
    } finally {
      setBatchSubmitting(false)
    }
  }

  const handleBatchStatusToggle = async () => {
    if (selectedIds.size === 0) return

    setBatchSubmitting(true)
    try {
      const res = await fetch('/api/products', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: Array.from(selectedIds),
          isActive: batchNewStatus,
        }),
      })
      const data = await res.json()

      if (data.success) {
        toast.success(`تم ${batchNewStatus ? 'تفعيل' : 'تعطيل'} ${data.data.count} منتج بنجاح`)
        setBatchStatusOpen(false)
        clearSelection()
        fetchProducts()
      } else {
        toast.error(data.error || 'فشل في تعديل الحالة')
      }
    } catch {
      toast.error('حدث خطأ في الاتصال')
    } finally {
      setBatchSubmitting(false)
    }
  }

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return

    setBatchSubmitting(true)
    try {
      const ids = Array.from(selectedIds)
      const res = await fetch('/api/products', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      })
      const data = await res.json()

      if (data.success) {
        toast.success(`تم حذف ${data.data.count} منتج بنجاح`)
        setBatchDeleteOpen(false)
        clearSelection()
        fetchProducts()
      } else {
        toast.error(data.error || 'فشل في حذف المنتجات')
      }
    } catch {
      toast.error('حدث خطأ في الاتصال')
    } finally {
      setBatchSubmitting(false)
    }
  }

  // ─── CSV Import State ────────────────────────────────────────
  const [csvImportOpen, setCsvImportOpen] = useState(false)

  // ─── Category Management State ─────────────────────────────────
  const [catMgmtOpen, setCatMgmtOpen] = useState(false)
  const [catFormOpen, setCatFormOpen] = useState(false)
  const [editingCat, setEditingCat] = useState<Category | null>(null)
  const [catName, setCatName] = useState('')
  const [catSubmitting, setCatSubmitting] = useState(false)
  const [catDeleteOpen, setCatDeleteOpen] = useState(false)
  const [deletingCat, setDeletingCat] = useState<Category | null>(null)

  // ─── Category Management Handlers ─────────────────────────────
  const openAddCatDialog = () => {
    setEditingCat(null)
    setCatName('')
    setCatFormOpen(true)
  }

  const openEditCatDialog = (cat: Category) => {
    setEditingCat(cat)
    setCatName(cat.name)
    setCatFormOpen(true)
  }

  const handleCatSubmit = async () => {
    if (!catName.trim()) {
      toast.error('يرجى إدخال اسم التصنيف')
      return
    }

    setCatSubmitting(true)
    try {
      if (editingCat) {
        const res = await fetch('/api/categories', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingCat.id, name: catName.trim(), icon: editingCat.icon }),
        })
        const data = await res.json()
        if (data.success) {
          toast.success('تم تحديث التصنيف بنجاح')
          setCatFormOpen(false)
          fetchCategories()
        } else {
          toast.error(data.error || 'فشل في تحديث التصنيف')
        }
      } else {
        const res = await fetch('/api/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: catName.trim() }),
        })
        const data = await res.json()
        if (data.success) {
          toast.success('تم إضافة التصنيف بنجاح')
          setCatFormOpen(false)
          fetchCategories()
        } else {
          toast.error(data.error || 'فشل في إضافة التصنيف')
        }
      }
    } catch {
      toast.error('حدث خطأ في الاتصال')
    } finally {
      setCatSubmitting(false)
    }
  }

  const handleCatDelete = async () => {
    if (!deletingCat) return
    try {
      const res = await fetch('/api/categories', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deletingCat.id }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('تم حذف التصنيف بنجاح')
        setCatDeleteOpen(false)
        setDeletingCat(null)
        fetchCategories()
      } else {
        toast.error(data.error || 'فشل في حذف التصنيف')
      }
    } catch {
      toast.error('حدث خطأ في الاتصال')
    }
  }

  // Count low stock items
  const lowStockCount = products.filter((p) => p.quantity <= p.minQuantity).length

  return (
    <div className="h-full flex flex-col p-4 md:p-6 gap-4 md:gap-6 bg-muted/30 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Package className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground heading-decoration">إدارة المخزون</h2>
            <p className="text-xs text-muted-foreground">
              {products.length} منتج
              {lowStockCount > 0 && (
                <span className="animate-pulse-glow inline-flex items-center px-2 py-0.5 rounded-full text-destructive font-medium mr-2 text-xs bg-destructive/10">
                  • {lowStockCount} منتج منخفض المخزون
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setCatMgmtOpen(true)}
            className="gap-2 rounded-lg"
          >
            <Tags className="w-4 h-4" />
            إدارة التصنيفات
          </Button>
          <Button
            variant="outline"
            onClick={() => setHistoryOpen(true)}
            className="gap-2 rounded-lg"
          >
            <History className="w-4 h-4" />
            سجل التعديلات
          </Button>
          <Button
            variant="outline"
            onClick={() => setCsvImportOpen(true)}
            className="gap-2 rounded-lg"
          >
            <Upload className="w-4 h-4" />
            استيراد CSV
          </Button>
          <Button onClick={openAddDialog} className="gap-2 shadow-md shadow-primary/20">
            <Plus className="w-4 h-4" />
            إضافة منتج
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card rounded-xl border shadow-sm p-4 card-hover glass-card-subtle filter-bar">
        <div className="flex items-center gap-2 mb-3 filter-group">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">تصفية وبحث</span>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 stagger-children">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="بحث عن منتج..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pr-9 h-10 rounded-lg"
            />
          </div>

          {/* Category filter */}
          <div className="sm:w-48">
            <Select value={categoryId} onValueChange={(val) => { setCategoryId(val) }}>
              <SelectTrigger className="h-10 rounded-lg select-enhanced">
                <SelectValue placeholder="جميع التصنيفات" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع التصنيفات</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Low Stock Toggle */}
          <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2 border">
            <Switch
              id="low-stock-toggle"
              checked={lowStock}
              onCheckedChange={setLowStock}
            />
            <Label htmlFor="low-stock-toggle" className="text-sm cursor-pointer flex items-center gap-1.5 whitespace-nowrap">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              مخزون منخفض
            </Label>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-card rounded-xl border shadow-sm flex-1 flex flex-col overflow-hidden card-hover data-table-enhanced table-modern table-hover-highlight">
        {loading ? (
          <div className="flex-1 flex items-center justify-center loading-overlay" style={{ position: 'absolute', inset: 0 }}>
            <div className="loading-spinner" />
            <div className="loading-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
            <p className="loading-text">جاري تحميل المنتجات...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <PackageX className="w-12 h-12 opacity-30" />
              <p className="text-sm font-medium">لا توجد منتجات</p>
              <p className="text-xs">أضف منتج جديد أو عدّل عوامل التصفية</p>
            </div>
          </div>
        ) : (
          <ScrollArea className="flex-1">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-10 text-center">
                    <Checkbox
                      checked={isAllSelected}
                      ref={(el) => {
                        if (el) {
                          (el as unknown as HTMLInputElement).indeterminate = isSomeSelected && !isAllSelected
                        }
                      }}
                      onCheckedChange={toggleSelectAll}
                      className="mx-auto"
                      aria-label="تحديد الكل"
                    />
                  </TableHead>
                  <TableHead className="text-sm font-semibold text-foreground">المنتج</TableHead>
                  <TableHead className="text-sm font-semibold text-foreground">التصنيف</TableHead>
                  <TableHead className="text-sm font-semibold text-foreground text-center">الكمية</TableHead>
                  <TableHead className="text-sm font-semibold text-foreground text-center">سعر الشراء</TableHead>
                  <TableHead className="text-sm font-semibold text-foreground text-center">سعر البيع</TableHead>
                  <TableHead className="text-sm font-semibold text-foreground text-center">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => {
                  const isLowStock = product.quantity <= product.minQuantity
                  const isSelected = selectedIds.has(product.id)
                  return (
                    <TableRow
                      key={product.id}
                      className={`scrollable-list-item pricing-row group transition-colors ${isSelected ? 'bg-primary/5' : ''} ${isLowStock && !isSelected ? 'bg-destructive/[0.03] hover:bg-destructive/[0.06]' : ''}`}
                    >
                      {/* Checkbox */}
                      <TableCell className="w-10 text-center">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelectProduct(product.id)}
                          className="mx-auto"
                          aria-label={`تحديد ${product.name}`}
                        />
                      </TableCell>

                      {/* Product Name with image */}
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {product.image ? (
                            <div className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0">
                              <img
                                src={product.image}
                                alt={product.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <Package className="w-4 h-4 text-primary" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{product.name}</p>
                            {product.barcode && (
                              <p className="text-[10px] text-muted-foreground font-mono">{product.barcode}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      {/* Category */}
                      <TableCell>
                        <Badge variant="secondary" className="text-xs font-medium">
                          {product.category.name}
                        </Badge>
                      </TableCell>

                      {/* Quantity */}
                      <TableCell className="text-center">
                        <div className={`inline-flex flex-col items-center px-3 py-1.5 rounded-lg ${isLowStock ? 'bg-destructive/10 status-chip-danger' : 'bg-muted/50'}`}>
                          <span className={`text-sm font-bold tabular-nums tabular-nums-enhanced ${isLowStock ? 'text-destructive' : 'text-foreground'}`}>
                            {product.quantity}
                          </span>
                          {isLowStock && (
                            <span className="chip chip-warning text-[10px] flex items-center gap-0.5 mt-0.5">
                              <AlertTriangle className="w-2.5 h-2.5" />
                              حد أدنى: {product.minQuantity}
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* Cost Price */}
                      <TableCell className="text-center">
                        <span className="text-sm text-muted-foreground tabular-nums">
                          {product.costPrice.toLocaleString('ar-SA')} {symbol}
                        </span>
                      </TableCell>

                      {/* Selling Price */}
                      <TableCell className="text-center">
                        <span className="text-sm font-semibold text-foreground tabular-nums">
                          {product.price.toLocaleString('ar-SA')} {symbol}
                        </span>
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-center">
                        <div className="action-menu flex items-center justify-center gap-1">
                          {/* Per-product stock history button */}
                          <Popover
                            open={productHistoryId === product.id}
                            onOpenChange={(open) => {
                              if (open) {
                                setProductHistoryId(product.id)
                                fetchProductMovements(product.id)
                              } else {
                                setProductHistoryId(null)
                                setProductMovements([])
                              }
                            }}
                          >
                            <PopoverTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-muted-foreground hover:text-blue-700 dark:hover:text-blue-400"
                                title="سجل الحركة"
                              >
                                <Activity className="w-4 h-4" />
                                <span className="sr-only">سجل الحركة</span>
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80 p-0" dir="rtl" side="left" align="start">
                              {/* Popover Header */}
                              <div className="flex items-center gap-2 px-4 py-3 border-b bg-muted/30">
                                <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                  <Activity className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-bold text-foreground truncate">آخر الحركات</p>
                                  <p className="text-[10px] text-muted-foreground truncate">{product.name}</p>
                                </div>
                              </div>
                              {/* Popover Content */}
                              <div className="max-h-72 overflow-y-auto">
                                {productMovementsLoading ? (
                                  <div className="flex items-center justify-center py-8">
                                    <Loader2 className="w-5 h-5 text-primary animate-spin" />
                                  </div>
                                ) : productMovements.length === 0 ? (
                                  <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                                    <History className="w-8 h-8 text-muted-foreground/20 mb-2" />
                                    <p className="text-xs text-muted-foreground">لا توجد حركات مسجلة</p>
                                  </div>
                                ) : (
                                  <div className="divide-y">
                                    {productMovements.map((mov) => {
                                      const cfg = movementTypeConfig[mov.type] || movementTypeConfig.adjustment
                                      const MovIcon = cfg.icon
                                      const change = mov.newQty - mov.previousQty
                                      const isUp = change > 0
                                      const isDown = change < 0
                                      return (
                                        <div key={mov.id} className="flex items-start gap-2.5 px-4 py-2.5 hover:bg-muted/30 transition-colors">
                                          {/* Icon */}
                                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${cfg.bg}`}>
                                            <MovIcon className={`w-3.5 h-3.5 ${cfg.color}`} />
                                          </div>
                                          {/* Info */}
                                          <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-1 mb-0.5">
                                              <span className={`text-[10px] font-semibold ${cfg.color}`}>{cfg.label}</span>
                                              <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                                                <Clock className="w-2.5 h-2.5" />
                                                {new Date(mov.createdAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                                              </span>
                                            </div>
                                            {/* Quantities */}
                                            <div className="flex items-center gap-1.5 text-[10px]">
                                              <span className="text-muted-foreground tabular-nums">{mov.previousQty}</span>
                                              <ArrowLeft className={`w-3 h-3 ${isUp ? 'text-emerald-500' : isDown ? 'text-red-500' : 'text-amber-500'}`} />
                                              <span className={`font-bold tabular-nums ${isUp ? 'text-emerald-600 dark:text-emerald-400' : isDown ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`}>
                                                {mov.newQty}
                                              </span>
                                              {change !== 0 && (
                                                <span className={`rounded-full px-1.5 py-0 text-[9px] font-bold ${
                                                  isUp ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                                }`}>
                                                  {isUp ? '+' : ''}{change}
                                                </span>
                                              )}
                                            </div>
                                            {/* Reason */}
                                            {mov.reason && (
                                              <p className="text-[9px] text-muted-foreground truncate mt-0.5 max-w-[180px]">{mov.reason}</p>
                                            )}
                                          </div>
                                        </div>
                                      )
                                    })}
                                  </div>
                                )}
                              </div>
                              {/* Footer */}
                              {!productMovementsLoading && productMovements.length > 0 && (
                                <div className="border-t px-4 py-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="w-full h-7 text-[10px] gap-1 text-muted-foreground hover:text-foreground"
                                    onClick={() => {
                                      setProductHistoryId(null)
                                      setProductMovements([])
                                      setHistoryFilterProduct(product.id)
                                      setHistoryOpen(true)
                                    }}
                                  >
                                    <History className="w-3 h-3" />
                                    عرض السجل الكامل
                                  </Button>
                                </div>
                              )}
                            </PopoverContent>
                          </Popover>
                          {/* Variants button */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openVariantsDialog(product)}
                            className="h-8 w-8 p-0 hover:bg-violet-100 dark:hover:bg-violet-900/30 text-muted-foreground hover:text-violet-700 dark:hover:text-violet-400"
                            title="المتغيرات"
                          >
                            <Layers className="w-4 h-4" />
                            <span className="sr-only">المتغيرات</span>
                          </Button>
                          {/* Quick stock adjust button */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openAdjustDialog(product)}
                            className="h-8 w-8 p-0 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 text-muted-foreground hover:text-emerald-700 dark:hover:text-emerald-400"
                            title="تعديل المخزون"
                          >
                            <PackagePlus className="w-4 h-4" />
                            <span className="sr-only">تعديل المخزون</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(product)}
                            className="h-8 w-8 p-0 hover:bg-primary/10 text-muted-foreground hover:text-primary"
                          >
                            <Pencil className="w-4 h-4" />
                            <span className="sr-only">تعديل</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openDeleteDialog(product)}
                            className="h-8 w-8 p-0 hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span className="sr-only">حذف</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </div>

      {/* ─── Floating Batch Action Bar ────────────────────────── */}
      {isSomeSelected && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 animate-fade-in-up">
          <div className="glass-card rounded-2xl shadow-xl border px-4 py-3 flex items-center gap-3">
            {/* Selected count badge */}
            <Badge variant="default" className="rounded-full px-3 py-1 text-sm font-bold gap-1.5 bg-primary shadow-md">
              <CheckSquare className="w-3.5 h-3.5" />
              {selectedIds.size}
            </Badge>

            <div className="w-px h-8 bg-border/50" />

            {/* Batch actions - scrollable on mobile */}
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setBatchPriceType('fixed')
                  setBatchPriceValue('')
                  setBatchPercentDir('increase')
                  setBatchPriceOpen(true)
                }}
                className="gap-1.5 rounded-lg whitespace-nowrap text-xs shrink-0"
              >
                <DollarSign className="w-3.5 h-3.5" />
                تغيير السعر
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setBatchNewCategoryId('')
                  setBatchCategoryOpen(true)
                }}
                className="gap-1.5 rounded-lg whitespace-nowrap text-xs shrink-0"
              >
                <ListFilter className="w-3.5 h-3.5" />
                تغيير التصنيف
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setBatchNewStatus(true)
                  setBatchStatusOpen(true)
                }}
                className="gap-1.5 rounded-lg whitespace-nowrap text-xs shrink-0"
              >
                <Tags className="w-3.5 h-3.5" />
                تعديل الحالة
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setBatchDeleteOpen(true)}
                className="gap-1.5 rounded-lg whitespace-nowrap text-xs text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20 shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
                حذف المحدد
              </Button>
            </div>

            <div className="w-px h-8 bg-border/50" />

            {/* Clear selection */}
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSelection}
              className="text-xs text-muted-foreground hover:text-foreground rounded-lg whitespace-nowrap shrink-0"
            >
              إلغاء التحديد
            </Button>
          </div>
        </div>
      )}

      {/* ─── Add/Edit Dialog ────────────────────────────────────── */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-hidden flex flex-col" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {editingProduct ? 'تعديل المنتج' : 'إضافة منتج جديد'}
            </DialogTitle>
            <DialogDescription>
              {editingProduct ? 'قم بتعديل بيانات المنتج' : 'أدخل بيانات المنتج الجديد'}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="grid gap-4 py-2 glass-card rounded-xl p-4">
              {/* Product Name */}
              <div className="form-group">
                <label htmlFor="product-name" className="form-label-enhanced">
                  اسم المنتج <span className="required-asterisk">*</span>
                </label>
                <Input
                  id="product-name"
                  placeholder="مثال: بيبسي 330مل"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="h-10 rounded-lg"
                  autoFocus
                />
              </div>

              {/* Category */}
              <div className="form-group">
                <label className="form-label-enhanced">
                  التصنيف <span className="required-asterisk">*</span>
                </label>
                <Select
                  value={form.categoryId}
                  onValueChange={(val) => setForm({ ...form, categoryId: val })}
                >
                  <SelectTrigger className="h-10 rounded-lg">
                    <SelectValue placeholder="اختر التصنيف" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Price & Cost - side by side */}
              <div className="grid grid-cols-2 gap-3">
                <div className="form-group">
                  <label htmlFor="cost-price" className="form-label-enhanced">
                    سعر الشراء
                  </label>
                  <Input
                    id="cost-price"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={form.costPrice}
                    onChange={(e) => setForm({ ...form, costPrice: e.target.value })}
                    className="h-10 rounded-lg text-left"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="sell-price" className="form-label-enhanced">
                    سعر البيع <span className="required-asterisk">*</span>
                  </label>
                  <Input
                    id="sell-price"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    className="h-10 rounded-lg text-left"
                  />
                </div>
              </div>

              {/* Quantity & Min Quantity - side by side */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="quantity" className="text-sm font-medium">
                    الكمية
                  </Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="0"
                    placeholder="0"
                    value={form.quantity}
                    onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                    className="h-10 rounded-lg text-left"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="min-quantity" className="text-sm font-medium">
                    الحد الأدنى للمخزون
                  </Label>
                  <Input
                    id="min-quantity"
                    type="number"
                    min="0"
                    placeholder="5"
                    value={form.minQuantity}
                    onChange={(e) => setForm({ ...form, minQuantity: e.target.value })}
                    className="h-10 rounded-lg text-left"
                  />
                </div>
              </div>

              {/* Barcode */}
              <div className="space-y-2">
                <Label htmlFor="barcode" className="text-sm font-medium">
                  باركود <span className="text-muted-foreground text-xs">(اختياري)</span>
                </Label>
                <Input
                  id="barcode"
                  placeholder="أدخل رقم الباركود"
                  value={form.barcode}
                  onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                  className="h-10 rounded-lg font-mono"
                  dir="ltr"
                />
              </div>

              {/* Image Upload */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  صورة المنتج <span className="text-muted-foreground text-xs">(اختياري)</span>
                </Label>
                <div
                  onDrop={(e) => { e.preventDefault(); const file = e.dataTransfer.files[0]; if (file) handleImageUpload(file) }}
                  onDragOver={(e) => e.preventDefault()}
                  className={`image-upload-zone relative rounded-xl border-2 border-dashed ${
                    form.image
                      ? 'border-primary/30 bg-primary/5'
                      : 'border-border'
                  }`}
                >
                  {form.image ? (
                    <div className="relative p-3">
                      <div className="product-image-lg w-full h-32 mx-auto">
                        <img
                          src={form.image}
                          alt="صورة المنتج"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex justify-center mt-2">
                        <button
                          type="button"
                          onClick={() => setForm({ ...form, image: '' })}
                          className="image-remove-btn inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-destructive/10 text-destructive text-xs font-medium hover:bg-destructive/20 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                          حذف الصورة
                        </button>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors mr-2"
                        >
                          <ImagePlus className="w-3.5 h-3.5" />
                          تغيير الصورة
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="flex flex-col items-center justify-center py-8 cursor-pointer gap-2"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <div className="w-12 h-12 rounded-xl bg-muted/80 flex items-center justify-center">
                        <ImagePlus className="w-6 h-6 text-muted-foreground" />
                      </div>
                      <p className="text-xs text-muted-foreground text-center">
                        <span className="font-medium text-primary">اضغط لاختيار صورة</span>
                        {' '}
                        أو اسحبها هنا
                      </p>
                      <p className="text-[10px] text-muted-foreground/60">PNG, JPG, WEBP — حد أقصى 2 ميجابايت</p>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleImageUpload(file)
                      // Reset input so same file can be selected again
                      e.target.value = ''
                    }}
                  />
                </div>
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="pt-4 border-t gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setFormOpen(false)}
              disabled={submitting}
              className="rounded-lg"
            >
              إلغاء
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="gap-2 rounded-lg shadow-md shadow-primary/20"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {editingProduct ? 'تحديث المنتج' : 'إضافة المنتج'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Confirmation Dialog ──────────────────────────── */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5" />
              تأكيد الحذف
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              هل أنت متأكد من حذف المنتج{' '}
              <span className="font-bold text-foreground">{deletingProduct?.name}</span>
              ؟
              <br />
              <span className="text-destructive font-medium">
                لا يمكن التراجع عن هذا الإجراء.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel className="rounded-lg">إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-white hover:bg-destructive/90 rounded-lg gap-2"
            >
              <Trash2 className="w-4 h-4" />
              حذف المنتج
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ─── Stock Adjustment Dialog ────────────────────────────── */}
      <Dialog open={adjustDialogOpen} onOpenChange={setAdjustDialogOpen}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <PackagePlus className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
              </div>
              تعديل المخزون
            </DialogTitle>
            <DialogDescription>
              قم بتعديل كمية المنتج في المخزون
            </DialogDescription>
          </DialogHeader>

          {adjustProduct && (
            <div className="space-y-5 mt-2">
              {/* Product Info */}
              <div className="glass-card rounded-xl p-4">
                <div className="flex items-center gap-3">
                  {adjustProduct.image ? (
                    <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
                      <img src={adjustProduct.image} alt={adjustProduct.name} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Package className="w-5 h-5 text-primary" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground truncate">{adjustProduct.name}</p>
                    <p className="text-xs text-muted-foreground">{adjustProduct.category.name}</p>
                  </div>
                  <div className="text-left flex-shrink-0">
                    <p className="text-xs text-muted-foreground">المخزون الحالي</p>
                    <p className={`text-lg font-bold tabular-nums ${adjustProduct.quantity <= adjustProduct.minQuantity ? 'text-destructive' : 'text-foreground'}`}>
                      {adjustProduct.quantity}
                    </p>
                  </div>
                </div>
              </div>

              {/* Adjustment Type */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">نوع التعديل</Label>
                <RadioGroup
                  value={adjustForm.type}
                  onValueChange={(val) => setAdjustForm({ ...adjustForm, type: val as AdjustmentFormData['type'] })}
                  className="grid grid-cols-3 gap-2"
                >
                  {(['addition', 'subtraction', 'correction'] as const).map((type) => {
                    const config = adjustmentTypeConfig[type]
                    const Icon = config.icon
                    return (
                      <label
                        key={type}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                          adjustForm.type === type
                            ? `${config.bgColor} ${config.color} border-current`
                            : 'border-border hover:border-muted-foreground/30'
                        }`}
                      >
                        <RadioGroupItem value={type} className="sr-only" />
                        <Icon className="w-5 h-5" />
                        <span className="text-xs font-semibold">{config.label}</span>
                      </label>
                    )
                  })}
                </RadioGroup>
                {adjustForm.type === 'correction' && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <ArrowUpDown className="w-3 h-3" />
                    عند اختيار التصحيح، سيتم تعيين الكمية المدخلة كرصيد جديد
                  </p>
                )}
              </div>

              {/* Quantity */}
              <div className="space-y-2">
                <Label htmlFor="adjust-qty" className="text-sm font-medium">
                  الكمية <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="adjust-qty"
                  type="number"
                  min="1"
                  placeholder={adjustForm.type === 'correction' ? 'الكمية الجديدة المطلوبة' : 'عدد الوحدات'}
                  value={adjustForm.quantity}
                  onChange={(e) => setAdjustForm({ ...adjustForm, quantity: e.target.value })}
                  className="h-10 rounded-lg text-left tabular-nums"
                  dir="ltr"
                />
                {/* Preview */}
                {adjustForm.quantity && Number(adjustForm.quantity) > 0 && (
                  <div className="flex items-center justify-center gap-2 p-2 rounded-lg bg-muted/50 text-xs">
                    <span className="text-muted-foreground">النتيجة:</span>
                    <span className="font-semibold tabular-nums">{adjustProduct.quantity}</span>
                    <ArrowLeft className="w-3 h-3 text-muted-foreground" />
                    <span className="font-bold tabular-nums text-primary">
                      {adjustForm.type === 'addition'
                        ? adjustProduct.quantity + Number(adjustForm.quantity)
                        : adjustForm.type === 'subtraction'
                          ? Math.max(0, adjustProduct.quantity - Number(adjustForm.quantity))
                          : Number(adjustForm.quantity)}
                    </span>
                  </div>
                )}
              </div>

              {/* Reason */}
              <div className="space-y-2">
                <Label htmlFor="adjust-reason" className="text-sm font-medium">
                  سبب التعديل <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="adjust-reason"
                  placeholder="مثال: تزويد مخزون جديد، تالف، جرد..."
                  value={adjustForm.reason}
                  onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                  className="h-10 rounded-lg"
                />
              </div>

              {/* Reference */}
              <div className="space-y-2">
                <Label htmlFor="adjust-ref" className="text-sm font-medium">
                  رقم المرجع <span className="text-muted-foreground text-xs">(اختياري)</span>
                </Label>
                <Input
                  id="adjust-ref"
                  placeholder="مثال: رقم فاتورة الشراء"
                  value={adjustForm.reference}
                  onChange={(e) => setAdjustForm({ ...adjustForm, reference: e.target.value })}
                  className="h-10 rounded-lg"
                  dir="ltr"
                />
              </div>
            </div>
          )}

          <DialogFooter className="pt-4 border-t gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setAdjustDialogOpen(false)}
              disabled={adjustSubmitting}
              className="rounded-lg"
            >
              إلغاء
            </Button>
            <Button
              onClick={handleAdjustSubmit}
              disabled={adjustSubmitting || !adjustProduct}
              className="gap-2 rounded-lg shadow-md shadow-emerald-500/20 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {adjustSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              <PackagePlus className="w-4 h-4" />
              تطبيق التعديل
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Stock History Dialog ────────────────────────────────── */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <History className="w-5 h-5 text-blue-700 dark:text-blue-400" />
              </div>
              سجل تعديلات المخزون
            </DialogTitle>
            <DialogDescription>
              عرض وتصفية جميع تعديلات المخزون
            </DialogDescription>
          </DialogHeader>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-2 p-3 rounded-xl bg-muted/50 border">
            <div className="flex-1">
              <Select value={historyFilterProduct} onValueChange={(val) => setHistoryFilterProduct(val)}>
                <SelectTrigger className="h-9 rounded-lg text-xs">
                  <SelectValue placeholder="كل المنتجات" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل المنتجات</SelectItem>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:w-36">
              <Select value={historyFilterType} onValueChange={(val) => setHistoryFilterType(val)}>
                <SelectTrigger className="h-9 rounded-lg text-xs">
                  <SelectValue placeholder="كل الأنواع" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل الأنواع</SelectItem>
                  {Object.entries(adjustmentTypeConfig).map(([key, cfg]) => (
                    <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Date from */}
            <Popover open={dateFromOpen} onOpenChange={setDateFromOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-9 rounded-lg text-xs gap-1.5 flex-1 sm:flex-none justify-center">
                  <span>{historyDateFrom ? format(historyDateFrom, 'dd/MM/yyyy') : 'من تاريخ'}</span>
                  {historyDateFrom && (
                    <X className="w-3 h-3" onClick={(e) => { e.stopPropagation(); setHistoryDateFrom(undefined) }} />
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={historyDateFrom}
                  onSelect={(date) => { setHistoryDateFrom(date); setDateFromOpen(false) }}
                  locale={ar}
                />
              </PopoverContent>
            </Popover>
            {/* Date to */}
            <Popover open={dateToOpen} onOpenChange={setDateToOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-9 rounded-lg text-xs gap-1.5 flex-1 sm:flex-none justify-center">
                  <span>{historyDateTo ? format(historyDateTo, 'dd/MM/yyyy') : 'إلى تاريخ'}</span>
                  {historyDateTo && (
                    <X className="w-3 h-3" onClick={(e) => { e.stopPropagation(); setHistoryDateTo(undefined) }} />
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={historyDateTo}
                  onSelect={(date) => { setHistoryDateTo(date); setDateToOpen(false) }}
                  locale={ar}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Stats bar */}
          <div className="flex items-center gap-4 px-1">
            <span className="text-xs text-muted-foreground">
              إجمالي: <span className="font-semibold text-foreground">{historyTotal}</span> تعديل
            </span>
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5" onClick={handleExportCSV}>
              <Download className="w-3.5 h-3.5" />
              تصدير CSV
            </Button>
          </div>

          {/* Adjustments Table */}
          <div className="flex-1 overflow-hidden rounded-xl border">
            {historyLoading ? (
              <div className="h-full flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
              </div>
            ) : adjustments.length === 0 ? (
              <div className="h-full flex items-center justify-center py-12">
                <div className="text-center">
                  <History className="w-10 h-10 text-muted-foreground/20 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">لا توجد تعديلات مسجلة</p>
                </div>
              </div>
            ) : (
              <ScrollArea className="h-full max-h-[45vh]">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-xs font-semibold">المنتج</TableHead>
                      <TableHead className="text-xs font-semibold text-center">النوع</TableHead>
                      <TableHead className="text-xs font-semibold text-center">الكمية</TableHead>
                      <TableHead className="text-xs font-semibold text-center">السابق</TableHead>
                      <TableHead className="text-xs font-semibold text-center">الجديد</TableHead>
                      <TableHead className="text-xs font-semibold">السبب</TableHead>
                      <TableHead className="text-xs font-semibold text-center">التاريخ</TableHead>
                      <TableHead className="text-xs font-semibold text-center">المستخدم</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {adjustments.map((adj) => {
                      const typeCfg = adjustmentTypeConfig[adj.type] || adjustmentTypeConfig.correction
                      const TypeIcon = typeCfg.icon
                      return (
                        <TableRow key={adj.id} className="group">
                          <TableCell>
                            <p className="text-xs font-medium text-foreground truncate max-w-[120px]">
                              {adj.product.name}
                            </p>
                            <p className="text-[10px] text-muted-foreground">{adj.product.category.name}</p>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge className={`${typeCfg.bgColor} ${typeCfg.color} border-0 text-[10px] font-semibold gap-1 px-2`}>
                              <TypeIcon className="w-3 h-3" />
                              {typeCfg.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="text-xs font-semibold tabular-nums">{adj.quantity}</span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="text-xs text-muted-foreground tabular-nums">{adj.previousQty}</span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="text-xs font-bold tabular-nums text-foreground">{adj.newQty}</span>
                          </TableCell>
                          <TableCell>
                            <p className="text-xs text-foreground truncate max-w-[140px]" title={adj.reason}>
                              {adj.reason}
                            </p>
                            {adj.reference && (
                              <p className="text-[10px] text-muted-foreground font-mono">#{adj.reference}</p>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                              {new Date(adj.createdAt).toLocaleDateString('ar-SA', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                              {adj.userName || adj.userId}
                            </span>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </div>

          {/* Pagination */}
          {historyTotalPages > 1 && (
            <div className="flex items-center justify-between pt-3 border-t">
              <span className="text-xs text-muted-foreground">
                صفحة {historyPage} من {historyTotalPages}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0 rounded-lg"
                  onClick={() => handleHistoryPageChange(1)}
                  disabled={historyPage <= 1}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0 rounded-lg"
                  onClick={() => handleHistoryPageChange(historyPage - 1)}
                  disabled={historyPage <= 1}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
                {/* Page numbers */}
                {Array.from({ length: Math.min(5, historyTotalPages) }, (_, i) => {
                  let pageNum: number
                  if (historyTotalPages <= 5) {
                    pageNum = i + 1
                  } else if (historyPage <= 3) {
                    pageNum = i + 1
                  } else if (historyPage >= historyTotalPages - 2) {
                    pageNum = historyTotalPages - 4 + i
                  } else {
                    pageNum = historyPage - 2 + i
                  }
                  return (
                    <Button
                      key={pageNum}
                      variant={historyPage === pageNum ? 'default' : 'outline'}
                      size="sm"
                      className="h-8 w-8 p-0 rounded-lg text-xs"
                      onClick={() => handleHistoryPageChange(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  )
                })}
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0 rounded-lg"
                  onClick={() => handleHistoryPageChange(historyPage + 1)}
                  disabled={historyPage >= historyTotalPages}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0 rounded-lg"
                  onClick={() => handleHistoryPageChange(historyTotalPages)}
                  disabled={historyPage >= historyTotalPages}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          <DialogFooter className="pt-3 border-t">
            <Button variant="outline" onClick={() => setHistoryOpen(false)} className="rounded-lg">
              إغلاق
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Batch Price Change Dialog ────────────────────────── */}
      <Dialog open={batchPriceOpen} onOpenChange={(open) => { setBatchPriceOpen(open); if (!open) setBatchPriceValue('') }}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-amber-700 dark:text-amber-400" />
              </div>
              تغيير سعر المنتجات المحددة
            </DialogTitle>
            <DialogDescription>
              تغيير سعر {selectedIds.size} منتج محدد
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            {/* Price mode selector */}
            <RadioGroup
              value={batchPriceType}
              onValueChange={(val) => { setBatchPriceType(val as 'fixed' | 'percentage'); setBatchPriceValue('') }}
              className="grid grid-cols-2 gap-3"
            >
              <label className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                batchPriceType === 'fixed'
                  ? 'bg-primary/5 border-primary text-primary'
                  : 'border-border hover:border-muted-foreground/30'
              }`}>
                <RadioGroupItem value="fixed" className="sr-only" />
                <DollarSign className="w-5 h-5" />
                <span className="text-sm font-semibold">سعر ثابت</span>
                <span className="text-[10px] text-muted-foreground">تحديد سعر موحد للجميع</span>
              </label>
              <label className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                batchPriceType === 'percentage'
                  ? 'bg-primary/5 border-primary text-primary'
                  : 'border-border hover:border-muted-foreground/30'
              }`}>
                <RadioGroupItem value="percentage" className="sr-only" />
                <ArrowUpDown className="w-5 h-5" />
                <span className="text-sm font-semibold">نسبة مئوية</span>
                <span className="text-[10px] text-muted-foreground">زيادة أو نقصان بنسبة %</span>
              </label>
            </RadioGroup>

            {/* Value input */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                {batchPriceType === 'fixed' ? 'السعر الجديد' : 'النسبة المئوية'}
              </Label>
              {batchPriceType === 'fixed' ? (
                <div className="relative">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={batchPriceValue}
                    onChange={(e) => setBatchPriceValue(e.target.value)}
                    className="h-10 rounded-lg text-left tabular-nums pl-14"
                    dir="ltr"
                    autoFocus
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{symbol}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="flex-1 relative">
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      max="1000"
                      placeholder="0"
                      value={batchPriceValue}
                      onChange={(e) => setBatchPriceValue(e.target.value)}
                      className="h-10 rounded-lg text-left tabular-nums pl-8"
                      dir="ltr"
                      autoFocus
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                  </div>
                  <RadioGroup
                    value={batchPercentDir}
                    onValueChange={(val) => setBatchPercentDir(val as 'increase' | 'decrease')}
                    className="flex gap-1"
                  >
                    <label className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border cursor-pointer text-xs font-medium transition-all ${
                      batchPercentDir === 'increase'
                        ? 'bg-emerald-100 dark:bg-emerald-900/30 border-emerald-500 text-emerald-700 dark:text-emerald-400'
                        : 'border-border hover:border-muted-foreground/30'
                    }`}>
                      <RadioGroupItem value="increase" className="sr-only" />
                      <ArrowUp className="w-3.5 h-3.5" />
                      زيادة
                    </label>
                    <label className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border cursor-pointer text-xs font-medium transition-all ${
                      batchPercentDir === 'decrease'
                        ? 'bg-red-100 dark:bg-red-900/30 border-red-500 text-red-700 dark:text-red-400'
                        : 'border-border hover:border-muted-foreground/30'
                    }`}>
                      <RadioGroupItem value="decrease" className="sr-only" />
                      <ArrowDown className="w-3.5 h-3.5" />
                      نقصان
                    </label>
                  </RadioGroup>
                </div>
              )}
            </div>

            {/* Preview table for percentage mode */}
            {batchPriceType === 'percentage' && batchPriceValue && Number(batchPriceValue) > 0 && (
              <div className="glass-card rounded-xl p-3 max-h-48 overflow-y-auto">
                <p className="text-xs font-semibold text-foreground mb-2">معاينة الأسعار الجديدة:</p>
                <div className="space-y-1.5">
                  {selectedProducts.map((p) => {
                    const mult = batchPercentDir === 'increase' ? 1 : -1
                    const newPrice = Math.max(0, Number((p.price * (1 + mult * Number(batchPriceValue) / 100)).toFixed(2)))
                    return (
                      <div key={p.id} className="flex items-center justify-between text-xs">
                        <span className="text-foreground truncate max-w-[140px]">{p.name}</span>
                        <div className="flex items-center gap-2 tabular-nums">
                          <span className="text-muted-foreground line-through">{p.price.toLocaleString('ar-SA')}</span>
                          <ArrowLeft className="w-3 h-3 text-muted-foreground" />
                          <span className={`font-bold ${newPrice > p.price ? 'text-emerald-600' : newPrice < p.price ? 'text-red-600' : 'text-foreground'}`}>
                            {newPrice.toLocaleString('ar-SA')} {symbol}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Preview for fixed mode */}
            {batchPriceType === 'fixed' && batchPriceValue && Number(batchPriceValue) > 0 && (
              <p className="text-xs text-muted-foreground text-center">
                سيتم تعيين سعر <span className="font-bold text-foreground">{Number(batchPriceValue).toLocaleString('ar-SA')} {symbol}</span> لجميع المنتجات المحددة
              </p>
            )}
          </div>

          <DialogFooter className="pt-4 border-t gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setBatchPriceOpen(false)} disabled={batchSubmitting} className="rounded-lg">
              إلغاء
            </Button>
            <Button
              onClick={handleBatchPriceChange}
              disabled={batchSubmitting || !batchPriceValue || Number(batchPriceValue) <= 0}
              className="gap-2 rounded-lg shadow-md shadow-primary/20 btn-ripple"
            >
              {batchSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              <DollarSign className="w-4 h-4" />
              تطبيق على {selectedIds.size} منتج
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Batch Category Change Dialog ─────────────────────── */}
      <Dialog open={batchCategoryOpen} onOpenChange={(open) => { setBatchCategoryOpen(open); if (!open) setBatchNewCategoryId('') }}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <ListFilter className="w-5 h-5 text-blue-700 dark:text-blue-400" />
              </div>
              تغيير تصنيف المنتجات المحددة
            </DialogTitle>
            <DialogDescription>
              نقل {selectedIds.size} منتج إلى تصنيف آخر
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div className="glass-card rounded-xl p-3 max-h-32 overflow-y-auto">
              <p className="text-xs font-semibold text-foreground mb-2">المنتجات المحددة:</p>
              <div className="flex flex-wrap gap-1">
                {selectedProducts.map((p) => (
                  <Badge key={p.id} variant="secondary" className="text-[10px]">
                    {p.name}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">التصنيف الجديد</Label>
              <Select value={batchNewCategoryId} onValueChange={setBatchNewCategoryId}>
                <SelectTrigger className="h-10 rounded-lg">
                  <SelectValue placeholder="اختر التصنيف الجديد" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="pt-4 border-t gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setBatchCategoryOpen(false)} disabled={batchSubmitting} className="rounded-lg">
              إلغاء
            </Button>
            <Button
              onClick={handleBatchCategoryChange}
              disabled={batchSubmitting || !batchNewCategoryId}
              className="gap-2 rounded-lg shadow-md shadow-primary/20 btn-ripple"
            >
              {batchSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              <ListFilter className="w-4 h-4" />
              نقل المنتجات
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Batch Status Toggle Dialog ───────────────────────── */}
      <AlertDialog open={batchStatusOpen} onOpenChange={setBatchStatusOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${batchNewStatus ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                <Tags className={`w-5 h-5 ${batchNewStatus ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`} />
              </div>
              <span>{batchNewStatus ? 'تفعيل' : 'تعطيل'} المنتجات المحددة</span>
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              هل تريد {batchNewStatus ? 'تفعيل' : 'تعطيل'}{' '}
              <span className="font-bold text-foreground">{selectedIds.size}</span> منتج محدد؟
              <br />
              <span className="text-muted-foreground text-sm">
                {batchNewStatus ? 'سيصبح بإمكان بيع هذه المنتجات في نقطة البيع' : 'لن تظهر هذه المنتجات في نقطة البيع'}
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-2 my-2">
            <label className={`flex-1 flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all ${
              batchNewStatus
                ? 'bg-emerald-100 dark:bg-emerald-900/30 border-emerald-500 text-emerald-700 dark:text-emerald-400'
                : 'border-border hover:border-muted-foreground/30'
            }`}>
              <input
                type="radio"
                name="batch-status"
                checked={batchNewStatus}
                onChange={() => setBatchNewStatus(true)}
                className="sr-only"
              />
              <ArrowUp className="w-4 h-4" />
              <span className="text-sm font-semibold">تفعيل</span>
            </label>
            <label className={`flex-1 flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all ${
              !batchNewStatus
                ? 'bg-red-100 dark:bg-red-900/30 border-red-500 text-red-700 dark:text-red-400'
                : 'border-border hover:border-muted-foreground/30'
            }`}>
              <input
                type="radio"
                name="batch-status"
                checked={!batchNewStatus}
                onChange={() => setBatchNewStatus(false)}
                className="sr-only"
              />
              <ArrowDown className="w-4 h-4" />
              <span className="text-sm font-semibold">تعطيل</span>
            </label>
          </div>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel disabled={batchSubmitting} className="rounded-lg">إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBatchStatusToggle}
              disabled={batchSubmitting}
              className={`rounded-lg gap-2 ${
                batchNewStatus
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-red-600 hover:bg-red-700 text-white'
              }`}
            >
              {batchSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              تأكيد {batchNewStatus ? 'التفعيل' : 'التعطيل'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ─── Batch Delete Confirmation Dialog ─────────────────── */}
      <AlertDialog open={batchDeleteOpen} onOpenChange={setBatchDeleteOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5" />
              تأكيد الحذف الجماعي
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              هل أنت متأكد من حذف{' '}
              <span className="font-bold text-foreground">{selectedIds.size}</span> منتج محدد؟
              <br />
              <span className="text-destructive font-medium">
                لا يمكن التراجع عن هذا الإجراء.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="glass-card rounded-xl p-3 max-h-32 overflow-y-auto mt-2">
            <div className="flex flex-wrap gap-1">
              {selectedProducts.map((p) => (
                <Badge key={p.id} variant="secondary" className="text-[10px]">
                  {p.name}
                </Badge>
              ))}
            </div>
          </div>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel disabled={batchSubmitting} className="rounded-lg">إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBatchDelete}
              disabled={batchSubmitting}
              className="bg-destructive text-white hover:bg-destructive/90 rounded-lg gap-2"
            >
              {batchSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              <Trash2 className="w-4 h-4" />
              حذف {selectedIds.size} منتج
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ─── Product Variants Dialog ────────────────────────────── */}
      <Dialog open={variantsOpen} onOpenChange={(open) => { setVariantsOpen(open); if (!open) { setVariantFormOpen(false); setEditingVariant(null) } }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <div className="w-9 h-9 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                <Layers className="w-5 h-5 text-violet-700 dark:text-violet-400" />
              </div>
              متغيرات المنتج
            </DialogTitle>
            <DialogDescription>
              {variantsProduct?.name} — إدارة الأحجام والنكهات والتعبئات
            </DialogDescription>
          </DialogHeader>

          {variantsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
            </div>
          ) : (
            <>
              {/* Variants list */}
              {variants.length === 0 && !variantFormOpen ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Layers className="w-12 h-12 opacity-20 mb-3" />
                  <p className="text-sm font-medium">لا توجد متغيرات</p>
                  <p className="text-xs mt-1">أضف متغيراً جديداً لتحديد الأحجام أو النكهات</p>
                </div>
              ) : (
                <ScrollArea className="flex-1 max-h-[40vh]">
                  <div className="space-y-2 p-1">
                    {variants.map((variant) => (
                      <div
                        key={variant.id}
                        className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                          variant.isActive
                            ? 'bg-card hover:bg-muted/50'
                            : 'bg-muted/30 opacity-60'
                        }`}
                      >
                        <div className="flex-1 min-w-0 grid grid-cols-5 gap-3">
                          {/* Name */}
                          <div className="min-w-0">
                            <p className="text-xs text-muted-foreground mb-0.5">الاسم</p>
                            <p className="text-sm font-semibold text-foreground truncate">{variant.name}</p>
                          </div>
                          {/* SKU */}
                          <div>
                            <p className="text-xs text-muted-foreground mb-0.5">SKU</p>
                            <p className="text-xs font-mono text-foreground">{variant.sku || '—'}</p>
                          </div>
                          {/* Cost Price */}
                          <div>
                            <p className="text-xs text-muted-foreground mb-0.5">التكلفة</p>
                            <p className="text-xs text-muted-foreground tabular-nums">{variant.costPrice.toLocaleString('ar-SA')} {symbol}</p>
                          </div>
                          {/* Sell Price */}
                          <div>
                            <p className="text-xs text-muted-foreground mb-0.5">البيع</p>
                            <p className="text-xs font-semibold text-foreground tabular-nums">{variant.sellPrice.toLocaleString('ar-SA')} {symbol}</p>
                          </div>
                          {/* Stock */}
                          <div>
                            <p className="text-xs text-muted-foreground mb-0.5">المخزون</p>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              variant.stock <= 0
                                ? 'bg-destructive/10 text-destructive chip-danger'
                                : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 chip-success'
                            }`}>
                              {variant.stock <= 0 ? (
                                <AlertTriangle className="w-2.5 h-2.5" />
                              ) : null}
                              {variant.stock}
                            </span>
                          </div>
                        </div>
                        {/* Actions */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditVariantDialog(variant)}
                            className="h-7 w-7 p-0 hover:bg-primary/10 text-muted-foreground hover:text-primary"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteVariant(variant.id)}
                            className="h-7 w-7 p-0 hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}

              {/* Add/Edit variant form */}
              {variantFormOpen && (
                <div className="border-t pt-4 mt-2">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 rounded-md bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                      <Save className="w-3.5 h-3.5 text-violet-700 dark:text-violet-400" />
                    </div>
                    <p className="text-sm font-bold text-foreground">
                      {editingVariant ? 'تعديل المتغير' : 'إضافة متغير جديد'}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="col-span-2 sm:col-span-1 space-y-1.5">
                      <Label className="text-xs font-medium">اسم المتغير <span className="text-destructive">*</span></Label>
                      <Input
                        placeholder="مثال: صغير، كبير، نكهة مانجو"
                        value={variantForm.name}
                        onChange={(e) => setVariantForm({ ...variantForm, name: e.target.value })}
                        className="h-9 rounded-lg text-sm"
                        autoFocus
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">SKU</Label>
                      <Input
                        placeholder="رمز SKU"
                        value={variantForm.sku}
                        onChange={(e) => setVariantForm({ ...variantForm, sku: e.target.value })}
                        className="h-9 rounded-lg text-sm font-mono"
                        dir="ltr"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">باركود</Label>
                      <Input
                        placeholder="باركود"
                        value={variantForm.barcode}
                        onChange={(e) => setVariantForm({ ...variantForm, barcode: e.target.value })}
                        className="h-9 rounded-lg text-sm font-mono"
                        dir="ltr"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">سعر التكلفة</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={variantForm.costPrice}
                        onChange={(e) => setVariantForm({ ...variantForm, costPrice: e.target.value })}
                        className="h-9 rounded-lg text-sm text-left tabular-nums"
                        dir="ltr"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">سعر البيع</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={variantForm.sellPrice}
                        onChange={(e) => setVariantForm({ ...variantForm, sellPrice: e.target.value })}
                        className="h-9 rounded-lg text-sm text-left tabular-nums"
                        dir="ltr"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">المخزون</Label>
                      <Input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={variantForm.stock}
                        onChange={(e) => setVariantForm({ ...variantForm, stock: e.target.value })}
                        className="h-9 rounded-lg text-sm text-left tabular-nums"
                        dir="ltr"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2 mt-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { setVariantFormOpen(false); setEditingVariant(null) }}
                      className="text-xs rounded-lg"
                    >
                      إلغاء
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleVariantSubmit}
                      disabled={variantSubmitting || !variantForm.name.trim()}
                      className="gap-1.5 text-xs rounded-lg bg-violet-600 hover:bg-violet-700 text-white shadow-md shadow-violet-500/20"
                    >
                      {variantSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      <Save className="w-3.5 h-3.5" />
                      {editingVariant ? 'حفظ التعديلات' : 'إضافة المتغير'}
                    </Button>
                  </div>
                </div>
              )}

              {/* Add variant button (when form not open) */}
              {!variantFormOpen && (
                <div className="border-t pt-3 mt-2">
                  <Button
                    variant="outline"
                    onClick={openAddVariantDialog}
                    className="gap-2 w-full rounded-lg border-dashed border-violet-300 dark:border-violet-700 text-violet-700 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 hover:text-violet-800 dark:hover:text-violet-300"
                  >
                    <Plus className="w-4 h-4" />
                    إضافة متغير
                  </Button>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── Category Management Dialog ──────────────────────────── */}
      <Dialog open={catMgmtOpen} onOpenChange={setCatMgmtOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-hidden flex flex-col" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Tags className="w-4 h-4 text-primary" />
              </div>
              إدارة التصنيفات
            </DialogTitle>
            <DialogDescription>
              أضف أو عدّل أو احذف تصنيفات المنتجات
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto -mx-6 px-6">
            <div className="space-y-2 py-2">
              {categories.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-8 text-muted-foreground">
                  <PackageX className="w-10 h-10 opacity-30" />
                  <p className="text-sm">لا توجد تصنيفات</p>
                  <p className="text-xs">أضف تصنيف جديد لتنظيم المنتجات</p>
                </div>
              ) : (
                categories.map((cat) => (
                  <div
                    key={cat.id}
                    className="flex items-center justify-between p-3 rounded-xl border bg-card hover:bg-muted/30 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Package className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{cat.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {cat._count?.products || 0} منتج
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditCatDialog(cat)}
                        className="h-8 w-8 p-0 hover:bg-primary/10 text-muted-foreground hover:text-primary"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setDeletingCat(cat)
                          setCatDeleteOpen(true)
                        }}
                        className="h-8 w-8 p-0 hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                        disabled={(cat._count?.products ?? 0) > 0}
                        title={(cat._count?.products ?? 0) > 0 ? 'لا يمكن حذف تصنيف يحتوي على منتجات' : 'حذف التصنيف'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <DialogFooter className="mt-2 gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setCatMgmtOpen(false)}
              className="rounded-lg"
            >
              إغلاق
            </Button>
            <Button
              onClick={openAddCatDialog}
              className="gap-2 rounded-lg shadow-md shadow-primary/20"
            >
              <Plus className="w-4 h-4" />
              إضافة تصنيف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Category Add/Edit Dialog ────────────────────────────── */}
      <Dialog open={catFormOpen} onOpenChange={setCatFormOpen}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {editingCat ? 'تعديل التصنيف' : 'إضافة تصنيف جديد'}
            </DialogTitle>
            <DialogDescription>
              {editingCat ? 'قم بتعديل اسم التصنيف' : 'أدخل اسم التصنيف الجديد'}
            </DialogDescription>
          </DialogHeader>

          <div className="glass-card rounded-xl p-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cat-name" className="text-sm font-medium">
                اسم التصنيف <span className="text-destructive">*</span>
              </Label>
              <Input
                id="cat-name"
                placeholder="مثال: مشروبات غازية"
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                className="h-10 rounded-lg"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCatSubmit()
                }}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setCatFormOpen(false)}
              disabled={catSubmitting}
              className="rounded-lg"
            >
              إلغاء
            </Button>
            <Button
              onClick={handleCatSubmit}
              disabled={catSubmitting}
              className="gap-2 rounded-lg shadow-md shadow-primary/20"
            >
              {catSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {editingCat ? 'حفظ التعديلات' : 'إضافة التصنيف'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Category Delete Confirmation Dialog ─────────────────── */}
      <AlertDialog open={catDeleteOpen} onOpenChange={setCatDeleteOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5" />
              حذف التصنيف
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              هل أنت متأكد من حذف تصنيف{' '}
              <span className="font-bold text-foreground">"{deletingCat?.name}"</span>؟
              {deletingCat && (deletingCat._count?.products ?? 0) > 0 && (
                <>
                  <br />
                  <span className="text-amber-600 dark:text-amber-400 font-medium mt-2 block">
                    ⚠️ هذا التصنيف يحتوي على {deletingCat._count?.products} منتج. لا يمكن حذفه قبل نقل أو حذف جميع المنتجات.
                  </span>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel className="rounded-lg">إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCatDelete}
              disabled={!!deletingCat && (deletingCat._count?.products ?? 0) > 0}
              className="bg-destructive text-white hover:bg-destructive/90 rounded-lg gap-2"
            >
              <Trash2 className="w-4 h-4" />
              حذف التصنيف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ─── CSV Import Dialog ── */}
      <CsvImportDialog
        open={csvImportOpen}
        onOpenChange={setCsvImportOpen}
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        onImportComplete={() => { fetchProducts(); fetchCategories() }}
      />
    </div>
  )
}
