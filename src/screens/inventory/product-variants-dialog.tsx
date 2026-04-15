'use client'

import { useState, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Loader2, Layers, Plus, Pencil, Trash2, Save, AlertTriangle } from 'lucide-react'
import { useApi } from '@/hooks/use-api'
import { useZodForm } from '@/hooks/use-zod-form'
import { createProductVariantSchema } from '@/lib/validations'
import type { z } from 'zod'
import { useCurrency } from '@/hooks/use-currency'

import type { Product, ProductVariant } from './types'
import { emptyVariantForm, type VariantFormData } from './types'

/** Form state type — includes productId + string fields for number inputs */
interface VariantFormState extends VariantFormData {
  productId: string
}

const variantDefaultValues = {
  productId: '',
  name: '',
  sku: '',
  barcode: '',
  costPrice: '',
  sellPrice: '',
  stock: '0',
}

export interface ProductVariantsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  product: Product | null
}

export function ProductVariantsDialog({ open, onOpenChange, product }: ProductVariantsDialogProps) {
  const { get, post, put, del } = useApi()
  const { symbol } = useCurrency()

  const [variants, setVariants] = useState<ProductVariant[]>([])
  const [variantsLoading, setVariantsLoading] = useState(false)
  const [variantFormOpen, setVariantFormOpen] = useState(false)
  const [editingVariant, setEditingVariant] = useState<ProductVariant | null>(null)

  const variantForm = useZodForm<VariantFormState, z.infer<typeof createProductVariantSchema>>({
    schema: createProductVariantSchema,
    defaultValues: variantDefaultValues,
  })

  // Fetch variants when dialog opens or product changes
  const fetchVariants = useCallback(async (prod: Product) => {
    setVariantsLoading(true)
    try {
      const result = await get<ProductVariant[]>(
        '/api/product-variants',
        { productId: prod.id },
        { showErrorToast: false },
      )
      if (result) {
        setVariants(result)
      }
    } catch {
      // handled by useApi
    } finally {
      setVariantsLoading(false)
    }
  }, [get])

  useEffect(() => {
    if (open && product) {
      setVariantFormOpen(false)
      setEditingVariant(null)
      fetchVariants(product)
    }
  }, [open, product, fetchVariants])

  const openAddVariantDialog = () => {
    setEditingVariant(null)
    variantForm.reset({ ...variantDefaultValues, productId: product?.id || '' })
    setVariantFormOpen(true)
  }

  const openEditVariantDialog = (variant: ProductVariant) => {
    setEditingVariant(variant)
    variantForm.reset({
      productId: variant.productId,
      name: variant.name,
      sku: variant.sku || '',
      barcode: variant.barcode || '',
      costPrice: String(variant.costPrice),
      sellPrice: String(variant.sellPrice),
      stock: String(variant.stock),
    })
    setVariantFormOpen(true)
  }

  const handleVariantSubmit = variantForm.handleSubmit(async (values) => {
    if (!product) return
    try {
      const payload = {
        name: values.name.trim(),
        sku: values.sku?.trim() || null,
        barcode: values.barcode?.trim() || null,
        costPrice: values.costPrice || 0,
        sellPrice: values.sellPrice || 0,
        stock: values.stock || 0,
      }
      let result: ProductVariant | null
      if (editingVariant) {
        result = await put<ProductVariant>(
          `/api/product-variants?id=${editingVariant.id}`,
          payload,
          { showSuccessToast: true, successMessage: 'تم تحديث المتغير بنجاح' },
        )
      } else {
        result = await post<ProductVariant>(
          '/api/product-variants',
          { productId: product.id, ...payload },
          { showSuccessToast: true, successMessage: 'تم إضافة المتغير بنجاح' },
        )
      }

      if (!result) return

      setVariantFormOpen(false)
      fetchVariants(product)
    } catch {
      // handled by useApi
    }
  })

  const handleDeleteVariant = async (variantId: string) => {
    const ok = await del(`/api/product-variants?id=${variantId}`)
    if (ok && product) {
      fetchVariants(product)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(openVal) => { onOpenChange(openVal); if (!openVal) { setVariantFormOpen(false); setEditingVariant(null) } }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <div className="w-9 h-9 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
              <Layers className="w-5 h-5 text-violet-700 dark:text-violet-400" />
            </div>
            متغيرات المنتج
          </DialogTitle>
          <DialogDescription>
            {product?.name} — إدارة الأحجام والنكهات والتعبئات
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
                          aria-label="تعديل"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteVariant(variant.id)}
                          className="h-7 w-7 p-0 hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                          aria-label="حذف"
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
                      value={variantForm.values.name}
                      onChange={(e) => variantForm.setValue('name', e.target.value)}
                      className={`h-9 rounded-lg text-sm${variantForm.errors.name ? ' border-destructive focus-visible:ring-destructive' : ''}`}
                      autoFocus
                    />
                    {variantForm.errors.name && (
                      <p className="text-sm text-destructive">{variantForm.errors.name}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">SKU</Label>
                    <Input
                      placeholder="رمز SKU"
                      value={variantForm.values.sku}
                      onChange={(e) => variantForm.setValue('sku', e.target.value)}
                      className="h-9 rounded-lg text-sm font-mono"
                      dir="ltr"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">باركود</Label>
                    <Input
                      placeholder="باركود"
                      value={variantForm.values.barcode}
                      onChange={(e) => variantForm.setValue('barcode', e.target.value)}
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
                      value={variantForm.values.costPrice}
                      onChange={(e) => variantForm.setValue('costPrice', e.target.value)}
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
                      value={variantForm.values.sellPrice}
                      onChange={(e) => variantForm.setValue('sellPrice', e.target.value)}
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
                      value={variantForm.values.stock}
                      onChange={(e) => variantForm.setValue('stock', e.target.value)}
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
                    disabled={variantForm.isSubmitting || !variantForm.values.name.trim()}
                    className="gap-1.5 text-xs rounded-lg bg-violet-600 hover:bg-violet-700 text-white shadow-md shadow-violet-500/20"
                  >
                    {variantForm.isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
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
  )
}
