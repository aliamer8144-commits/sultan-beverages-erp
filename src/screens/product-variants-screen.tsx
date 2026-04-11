'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { toast } from 'sonner'
import {
  Layers, Search, Plus, Pencil, Trash2, ChevronDown, ChevronLeft,
  Loader2, Package, PackagePlus, RotateCcw, AlertTriangle, RefreshCw,
  BarChart3, Archive,
} from 'lucide-react'
import { useCurrency } from '@/hooks/use-currency'

// ─── Types ────────────────────────────────────────────────────────
interface Product {
  id: string
  name: string
  price: number
  costPrice: number
  quantity: number
  category: { id: string; name: string }
  barcode?: string
  _count?: { variants: number }
}

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

interface QuickAdjustment {
  variantId: string
  variantName: string
  adjustment: string
}

// ─── Component ────────────────────────────────────────────────────
export function ProductVariantsScreen() {
  const { symbol } = useCurrency()

  // Data state
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Expanded products
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set())

  // Variant data per product
  const [variantsMap, setVariantsMap] = useState<Record<string, ProductVariant[]>>({})

  // Variant form dialog
  const [formOpen, setFormOpen] = useState(false)
  const [editingVariant, setEditingVariant] = useState<ProductVariant | null>(null)
  const [formProduct, setFormProduct] = useState<Product | null>(null)
  const [form, setForm] = useState<VariantFormData>(emptyVariantForm)
  const [submitting, setSubmitting] = useState(false)

  // Delete dialog
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deletingVariant, setDeletingVariant] = useState<ProductVariant | null>(null)

  // Quick stock adjustment dialog
  const [quickAdjustOpen, setQuickAdjustOpen] = useState(false)
  const [quickAdjustVariant, setQuickAdjustVariant] = useState<ProductVariant | null>(null)
  const [quickAdjustValue, setQuickAdjustValue] = useState('')
  const [quickAdjustSubmitting, setQuickAdjustSubmitting] = useState(false)

  // ─── Fetch products ────────────────────────────────────────────
  const fetchProducts = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      const res = await fetch(`/api/products?${params.toString()}`)
      const data = await res.json()
      if (data.success) {
        setProducts(data.data)
      }
    } catch {
      toast.error('حدث خطأ في تحميل المنتجات')
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  // ─── Fetch variants for a product ──────────────────────────────
  const fetchVariants = useCallback(async (productId: string) => {
    try {
      const res = await fetch(`/api/product-variants?productId=${productId}`)
      const data = await res.json()
      if (data.success) {
        setVariantsMap((prev) => ({ ...prev, [productId]: data.data }))
      }
    } catch {
      // Silent
    }
  }, [])

  // ─── Toggle product expansion ──────────────────────────────────
  const toggleExpand = async (productId: string) => {
    const newExpanded = new Set(expandedProducts)
    if (newExpanded.has(productId)) {
      newExpanded.delete(productId)
    } else {
      newExpanded.add(productId)
      // Fetch variants if not already loaded
      if (!variantsMap[productId]) {
        await fetchVariants(productId)
      }
    }
    setExpandedProducts(newExpanded)
  }

  // ─── Expand all / collapse all ─────────────────────────────────
  const expandAll = async () => {
    const allIds = new Set(products.map((p) => p.id))
    setExpandedProducts(allIds)
    // Fetch variants for all products
    for (const id of allIds) {
      if (!variantsMap[id]) {
        await fetchVariants(id)
      }
    }
  }

  const collapseAll = () => {
    setExpandedProducts(new Set())
  }

  // ─── Add variant ───────────────────────────────────────────────
  const openAddVariant = (product: Product) => {
    setFormProduct(product)
    setEditingVariant(null)
    setForm(emptyVariantForm)
    setFormOpen(true)
  }

  // ─── Edit variant ──────────────────────────────────────────────
  const openEditVariant = (variant: ProductVariant, product: Product) => {
    setFormProduct(product)
    setEditingVariant(variant)
    setForm({
      name: variant.name,
      sku: variant.sku || '',
      barcode: variant.barcode || '',
      costPrice: String(variant.costPrice),
      sellPrice: String(variant.sellPrice),
      stock: String(variant.stock),
    })
    setFormOpen(true)
  }

  // ─── Submit variant form ───────────────────────────────────────
  const handleSubmit = async () => {
    if (!formProduct) return
    if (!form.name.trim()) {
      toast.error('يرجى إدخال اسم المتغير')
      return
    }
    if (!form.sellPrice || Number(form.sellPrice) <= 0) {
      toast.error('يرجى إدخال سعر البيع')
      return
    }

    setSubmitting(true)
    try {
      let res: Response
      if (editingVariant) {
        res = await fetch(`/api/product-variants?id=${editingVariant.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: form.name.trim(),
            sku: form.sku.trim() || null,
            barcode: form.barcode.trim() || null,
            costPrice: Number(form.costPrice) || 0,
            sellPrice: Number(form.sellPrice) || 0,
            stock: Number(form.stock) || 0,
          }),
        })
        toast.success('تم تحديث المتغير بنجاح')
      } else {
        res = await fetch('/api/product-variants', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productId: formProduct.id,
            name: form.name.trim(),
            sku: form.sku.trim() || null,
            barcode: form.barcode.trim() || null,
            costPrice: Number(form.costPrice) || 0,
            sellPrice: Number(form.sellPrice) || 0,
            stock: Number(form.stock) || 0,
          }),
        })
        toast.success('تم إضافة المتغير بنجاح')
      }

      const data = await res.json()
      if (!data.success) {
        toast.error(data.error || 'حدث خطأ أثناء الحفظ')
        return
      }

      setFormOpen(false)
      await fetchVariants(formProduct.id)
      fetchProducts() // Refresh variant counts
    } catch {
      toast.error('حدث خطأ في الاتصال')
    } finally {
      setSubmitting(false)
    }
  }

  // ─── Delete variant ────────────────────────────────────────────
  const openDeleteVariant = (variant: ProductVariant) => {
    setDeletingVariant(variant)
    setDeleteOpen(true)
  }

  const handleDelete = async () => {
    if (!deletingVariant) return
    try {
      const res = await fetch(`/api/product-variants?id=${deletingVariant.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        toast.success('تم حذف المتغير بنجاح')
        setDeleteOpen(false)
        // Find product to refresh its variants
        const productId = deletingVariant.productId
        await fetchVariants(productId)
        fetchProducts()
      } else {
        toast.error(data.error || 'فشل في حذف المتغير')
      }
    } catch {
      toast.error('حدث خطأ في الاتصال')
    }
  }

  // ─── Quick stock adjustment ────────────────────────────────────
  const openQuickAdjust = (variant: ProductVariant) => {
    setQuickAdjustVariant(variant)
    setQuickAdjustValue('')
    setQuickAdjustOpen(true)
  }

  const handleQuickAdjust = async () => {
    if (!quickAdjustVariant) return
    const adjustment = Number(quickAdjustValue)
    if (isNaN(adjustment) || adjustment === 0) {
      toast.error('يرجى إدخال قيمة صحيحة')
      return
    }

    const newStock = quickAdjustVariant.stock + adjustment
    if (newStock < 0) {
      toast.error('المخزون لا يمكن أن يكون سالباً')
      return
    }

    setQuickAdjustSubmitting(true)
    try {
      const res = await fetch(`/api/product-variants?id=${quickAdjustVariant.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stock: newStock }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(`تم ${adjustment > 0 ? 'إضافة' : 'خصم'} ${Math.abs(adjustment)} وحدة`)
        setQuickAdjustOpen(false)
        await fetchVariants(quickAdjustVariant.productId)
      } else {
        toast.error(data.error || 'فشل في تعديل المخزون')
      }
    } catch {
      toast.error('حدث خطأ في الاتصال')
    } finally {
      setQuickAdjustSubmitting(false)
    }
  }

  // ─── Computed stats ────────────────────────────────────────────
  const totalProducts = products.length
  const productsWithVariants = products.filter((p) => (p._count?.variants || 0) > 0).length
  const totalVariants = Object.values(variantsMap).reduce((sum, vars) => sum + vars.length, 0)
  const totalStockFromVariants = Object.values(variantsMap)
    .flat()
    .reduce((sum, v) => sum + v.stock, 0)

  // ─── Debounced search ──────────────────────────────────────────
  const [searchTimer, setSearchTimer] = useState<ReturnType<typeof setTimeout> | null>(null)
  const handleSearchChange = (value: string) => {
    setSearch(value)
    if (searchTimer) clearTimeout(searchTimer)
    const timer = setTimeout(() => {
      fetchProducts()
    }, 300)
    setSearchTimer(timer)
  }

  return (
    <div className="h-full flex flex-col p-4 md:p-6 gap-4 md:gap-6 bg-muted/30 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Layers className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground heading-decoration">إدارة متغيرات المنتجات</h2>
            <p className="text-xs text-muted-foreground">
              {totalProducts} منتج • {productsWithVariants} يحتوي متغيرات • {totalVariants} متغير إجمالي
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-card rounded-xl border p-4 card-hover">
          <div className="flex items-center gap-2 mb-1">
            <Package className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground">إجمالي المنتجات</span>
          </div>
          <p className="text-xl font-bold text-foreground tabular-nums">{totalProducts}</p>
        </div>
        <div className="bg-card rounded-xl border p-4 card-hover">
          <div className="flex items-center gap-2 mb-1">
            <Layers className="w-4 h-4 text-emerald-500" />
            <span className="text-xs text-muted-foreground">منتجات بمتغيرات</span>
          </div>
          <p className="text-xl font-bold text-foreground tabular-nums">{productsWithVariants}</p>
        </div>
        <div className="bg-card rounded-xl border p-4 card-hover">
          <div className="flex items-center gap-2 mb-1">
            <Archive className="w-4 h-4 text-blue-500" />
            <span className="text-xs text-muted-foreground">إجمالي المتغيرات</span>
          </div>
          <p className="text-xl font-bold text-foreground tabular-nums">{totalVariants}</p>
        </div>
        <div className="bg-card rounded-xl border p-4 card-hover">
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="w-4 h-4 text-amber-500" />
            <span className="text-xs text-muted-foreground">مخزون المتغيرات</span>
          </div>
          <p className="text-xl font-bold text-foreground tabular-nums">{totalStockFromVariants.toLocaleString('ar-SA')}</p>
        </div>
      </div>

      {/* Search & Actions */}
      <div className="bg-card rounded-xl border shadow-sm p-4 card-hover glass-card-subtle">
        <div className="flex flex-col sm:flex-row gap-3 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="بحث عن منتج..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pr-9 h-10 rounded-lg"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={expandAll}
              className="gap-1.5 rounded-lg"
            >
              <ChevronDown className="w-3.5 h-3.5" />
              توسيع الكل
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={collapseAll}
              className="gap-1.5 rounded-lg"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              طي الكل
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchProducts}
              className="gap-1.5 rounded-lg"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              تحديث
            </Button>
          </div>
        </div>
      </div>

      {/* Products with Variants Table */}
      <div className="bg-card rounded-xl border shadow-sm flex-1 flex flex-col overflow-hidden card-hover data-table-enhanced">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">جاري تحميل المنتجات...</p>
            </div>
          </div>
        ) : products.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <Package className="w-12 h-12 opacity-30" />
              <p className="text-sm font-medium">لا توجد منتجات</p>
              <p className="text-xs">أضف منتجات أولاً في صفحة المخزون</p>
            </div>
          </div>
        ) : (
          <ScrollArea className="flex-1">
            <div className="divide-y divide-border/50">
              {products.map((product) => {
                const isExpanded = expandedProducts.has(product.id)
                const variants = variantsMap[product.id] || []
                const variantCount = product._count?.variants || 0
                const totalVariantStock = variants.reduce((sum, v) => sum + v.stock, 0)

                return (
                  <Collapsible
                    key={product.id}
                    open={isExpanded}
                    onOpenChange={() => toggleExpand(product.id)}
                  >
                    <CollapsibleTrigger className="w-full px-4 py-3 flex items-center gap-3 hover:bg-muted/30 transition-colors text-right">
                      {/* Expand icon */}
                      <div className={`transition-transform duration-200 ${isExpanded ? 'rotate-0' : '-rotate-90'}`}>
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      </div>

                      {/* Product info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-foreground truncate">{product.name}</span>
                          {variantCount > 0 && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 rounded-md bg-primary/10 text-primary">
                              {variantCount} متغير
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-xs text-muted-foreground">{product.category.name}</span>
                          {product.barcode && (
                            <span className="text-[10px] text-muted-foreground font-mono">{product.barcode}</span>
                          )}
                        </div>
                      </div>

                      {/* Price & Stock */}
                      <div className="text-left flex-shrink-0 flex items-center gap-4">
                        <div className="text-center hidden sm:block">
                          <p className="text-[10px] text-muted-foreground">سعر البيع</p>
                          <p className="text-sm font-semibold text-foreground tabular-nums">
                            {product.price.toLocaleString('ar-SA')} {symbol}
                          </p>
                        </div>
                        <div className="text-center hidden sm:block">
                          <p className="text-[10px] text-muted-foreground">مخزون المتغيرات</p>
                          <p className={`text-sm font-bold tabular-nums ${
                            totalVariantStock <= 5 ? 'text-red-500' : 'text-foreground'
                          }`}>
                            {totalVariantStock}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] text-muted-foreground">مخزون المنتج</p>
                          <p className={`text-sm font-bold tabular-nums ${
                            product.quantity <= product.minQuantity ? 'text-red-500' : 'text-foreground'
                          }`}>
                            {product.quantity}
                          </p>
                        </div>

                        {/* Add variant button */}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1 text-xs rounded-lg h-8"
                          onClick={(e) => {
                            e.stopPropagation()
                            openAddVariant(product)
                          }}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          إضافة متغير
                        </Button>
                      </div>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      {isExpanded && (
                        <div className="border-t border-border/30 bg-muted/20">
                          {variants.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                              <Layers className="w-8 h-8 opacity-30 mb-2" />
                              <p className="text-sm">لا توجد متغيرات لهذا المنتج</p>
                              <Button
                                variant="outline"
                                size="sm"
                                className="mt-3 gap-1.5 rounded-lg"
                                onClick={() => openAddVariant(product)}
                              >
                                <Plus className="w-3.5 h-3.5" />
                                إضافة أول متغير
                              </Button>
                            </div>
                          ) : (
                            <div className="px-4 py-2">
                              {/* Variants table header */}
                              <div className="grid grid-cols-12 gap-2 px-2 py-1.5 text-[10px] font-semibold text-muted-foreground border-b border-border/30">
                                <div className="col-span-3">المتغير</div>
                                <div className="col-span-2 text-center">SKU</div>
                                <div className="col-span-2 text-center hidden md:block">باركود</div>
                                <div className="col-span-1 text-center">شراء</div>
                                <div className="col-span-1 text-center">بيع</div>
                                <div className="col-span-1 text-center">مخزون</div>
                                <div className="col-span-2 text-center">الإجراءات</div>
                              </div>

                              {/* Variant rows */}
                              {variants.map((variant) => (
                                <div
                                  key={variant.id}
                                  className={`grid grid-cols-12 gap-2 px-2 py-2.5 rounded-lg hover:bg-muted/40 transition-colors items-center border-b border-border/20 last:border-0 ${
                                    !variant.isActive ? 'opacity-50' : ''
                                  }`}
                                >
                                  {/* Variant name */}
                                  <div className="col-span-3 flex items-center gap-2 min-w-0">
                                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${variant.isActive ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                                    <span className="text-sm font-medium text-foreground truncate">{variant.name}</span>
                                  </div>

                                  {/* SKU */}
                                  <div className="col-span-2 text-center">
                                    <span className="text-xs text-muted-foreground font-mono truncate block">
                                      {variant.sku || '—'}
                                    </span>
                                  </div>

                                  {/* Barcode */}
                                  <div className="col-span-2 text-center hidden md:block">
                                    <span className="text-xs text-muted-foreground font-mono truncate block">
                                      {variant.barcode || '—'}
                                    </span>
                                  </div>

                                  {/* Cost price */}
                                  <div className="col-span-1 text-center">
                                    <span className="text-xs text-muted-foreground tabular-nums">
                                      {variant.costPrice.toLocaleString('ar-SA')}
                                    </span>
                                  </div>

                                  {/* Sell price */}
                                  <div className="col-span-1 text-center">
                                    <span className="text-xs font-semibold text-foreground tabular-nums">
                                      {variant.sellPrice.toLocaleString('ar-SA')}
                                    </span>
                                  </div>

                                  {/* Stock */}
                                  <div className="col-span-1 text-center">
                                    <span className={`text-xs font-bold tabular-nums px-1.5 py-0.5 rounded-md ${
                                      variant.stock <= 0 ? 'bg-red-100 dark:bg-red-900/30 text-red-600' :
                                      variant.stock <= 5 ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600' :
                                      'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600'
                                    }`}>
                                      {variant.stock}
                                    </span>
                                  </div>

                                  {/* Actions */}
                                  <div className="col-span-2 flex items-center justify-center gap-1">
                                    <button
                                      onClick={() => openQuickAdjust(variant)}
                                      className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                                      title="تعديل سريع للمخزون"
                                    >
                                      <RotateCcw className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => openEditVariant(variant, product)}
                                      className="p-1.5 rounded-lg hover:bg-blue-500/10 text-muted-foreground hover:text-blue-500 transition-colors"
                                      title="تعديل المتغير"
                                    >
                                      <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => openDeleteVariant(variant)}
                                      className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                                      title="حذف المتغير"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              ))}

                              {/* Total stock row */}
                              <div className="flex items-center justify-between px-2 py-2 bg-muted/30 rounded-lg mt-1">
                                <span className="text-xs font-semibold text-muted-foreground">إجمالي مخزون المتغيرات</span>
                                <div className="flex items-center gap-4">
                                  <span className="text-sm font-bold text-foreground tabular-nums">
                                    {totalVariantStock.toLocaleString('ar-SA')} وحدة
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    ({variants.length} متغير)
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </CollapsibleContent>
                  </Collapsible>
                )
              })}
            </div>
          </ScrollArea>
        )}
      </div>

      {/* ─── Add/Edit Variant Dialog ──────────────────────────────── */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <PackagePlus className="w-4 h-4 text-primary" />
              </div>
              {editingVariant ? 'تعديل المتغير' : 'إضافة متغير جديد'}
            </DialogTitle>
            <DialogDescription>
              {formProduct?.name} — {editingVariant ? `تعديل: ${editingVariant.name}` : 'إضافة متغير جديد لهذا المنتج'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium">اسم المتغير *</Label>
              <Input
                placeholder="مثال: صغير، كبير، نكهة مانجو"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                className="h-10 rounded-lg"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm font-medium">SKU</Label>
                <Input
                  placeholder="رمز SKU"
                  value={form.sku}
                  onChange={(e) => setForm((prev) => ({ ...prev, sku: e.target.value }))}
                  className="h-10 rounded-lg"
                  dir="ltr"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">باركود</Label>
                <Input
                  placeholder="باركود"
                  value={form.barcode}
                  onChange={(e) => setForm((prev) => ({ ...prev, barcode: e.target.value }))}
                  className="h-10 rounded-lg"
                  dir="ltr"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label className="text-sm font-medium">سعر الشراء</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={form.costPrice}
                  onChange={(e) => setForm((prev) => ({ ...prev, costPrice: e.target.value }))}
                  className="h-10 rounded-lg tabular-nums"
                  dir="ltr"
                  min="0"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">سعر البيع *</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={form.sellPrice}
                  onChange={(e) => setForm((prev) => ({ ...prev, sellPrice: e.target.value }))}
                  className="h-10 rounded-lg tabular-nums"
                  dir="ltr"
                  min="0"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">المخزون</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={form.stock}
                  onChange={(e) => setForm((prev) => ({ ...prev, stock: e.target.value }))}
                  className="h-10 rounded-lg tabular-nums"
                  dir="ltr"
                  min="0"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setFormOpen(false)} disabled={submitting}>
              إلغاء
            </Button>
            <Button onClick={handleSubmit} disabled={submitting} className="gap-2">
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <PackagePlus className="w-4 h-4" />
              )}
              {editingVariant ? 'تحديث' : 'إضافة'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Confirmation Dialog ────────────────────────────── */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              حذف المتغير
            </AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف المتغير &quot;{deletingVariant?.name}&quot;؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ─── Quick Stock Adjustment Dialog ─────────────────────────── */}
      <Dialog open={quickAdjustOpen} onOpenChange={setQuickAdjustOpen}>
        <DialogContent className="sm:max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <RotateCcw className="w-4 h-4 text-amber-500" />
              </div>
              تعديل سريع للمخزون
            </DialogTitle>
            <DialogDescription>
              {quickAdjustVariant?.name} — المخزون الحالي: {quickAdjustVariant?.stock}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium">الكمية (+ للإضافة، - للخصم)</Label>
              <Input
                type="number"
                placeholder="مثال: 10 أو -5"
                value={quickAdjustValue}
                onChange={(e) => setQuickAdjustValue(e.target.value)}
                className="h-10 rounded-lg tabular-nums text-center text-lg font-bold"
                dir="ltr"
              />
            </div>

            {/* Quick buttons */}
            <div className="grid grid-cols-3 gap-2">
              {[-10, -5, -1, 1, 5, 10].map((val) => (
                <Button
                  key={val}
                  variant="outline"
                  size="sm"
                  className={`rounded-lg tabular-nums ${
                    val > 0 ? 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20' :
                    'text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20'
                  }`}
                  onClick={() => setQuickAdjustValue(String(val))}
                >
                  {val > 0 ? '+' : ''}{val}
                </Button>
              ))}
            </div>

            {quickAdjustValue && !isNaN(Number(quickAdjustValue)) && Number(quickAdjustValue) !== 0 && quickAdjustVariant && (
              <div className="p-3 rounded-xl bg-muted/50 text-center">
                <span className="text-xs text-muted-foreground">المخزون الجديد: </span>
                <span className={`text-sm font-bold tabular-nums ${
                  quickAdjustVariant.stock + Number(quickAdjustValue) < 0 ? 'text-red-500' : 'text-foreground'
                }`}>
                  {Math.max(0, quickAdjustVariant.stock + Number(quickAdjustValue))}
                </span>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setQuickAdjustOpen(false)} disabled={quickAdjustSubmitting}>
              إلغاء
            </Button>
            <Button onClick={handleQuickAdjust} disabled={quickAdjustSubmitting} className="gap-2">
              {quickAdjustSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <PackagePlus className="w-4 h-4" />
              )}
              تطبيق
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
