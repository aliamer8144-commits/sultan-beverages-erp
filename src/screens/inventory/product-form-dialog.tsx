'use client'

import { useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Loader2, ImagePlus, X } from 'lucide-react'
import { toast } from 'sonner'
import { useApi } from '@/hooks/use-api'
import { useZodForm } from '@/hooks/use-zod-form'
import { createProductSchema } from '@/lib/validations'
import type { z } from 'zod'
import { compressImage } from '@/lib/image-utils'

import type { Product, Category } from './types'
import { emptyForm, type ProductFormData } from './types'

export interface ProductFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingProduct: Product | null
  categories: Category[]
  onSaved: () => void
}

export function ProductFormDialog({ open, onOpenChange, editingProduct, categories, onSaved }: ProductFormDialogProps) {
  const { post, put } = useApi()

  const form = useZodForm<ProductFormData, z.infer<typeof createProductSchema>>({
    schema: createProductSchema,
    defaultValues: emptyForm,
  })
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Reset form when dialog opens or editing product changes
  useEffect(() => {
    if (open) {
      if (editingProduct) {
        form.reset({
          name: editingProduct.name,
          categoryId: editingProduct.categoryId,
          price: String(editingProduct.price),
          costPrice: String(editingProduct.costPrice),
          quantity: String(editingProduct.quantity),
          minQuantity: String(editingProduct.minQuantity),
          barcode: editingProduct.barcode || '',
          image: editingProduct.image || '',
        })
      } else {
        form.reset()
      }
    }
  }, [open, editingProduct, form.reset])

  // Image upload handler with compression
  const handleImageUpload = async (file: File) => {
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
      form.setValue('image', compressed)
      toast.success('تم تحميل الصورة بنجاح', { id: 'image-compress' })
    } catch {
      toast.error('فشل في تحميل الصورة', { id: 'image-compress' })
    }
  }

  const handleSubmit = form.handleSubmit(async (values) => {
    try {
      const payload = {
        name: values.name.trim(),
        categoryId: values.categoryId,
        price: values.price,
        costPrice: values.costPrice || 0,
        quantity: values.quantity || 0,
        minQuantity: values.minQuantity || 5,
        barcode: values.barcode?.trim() || null,
        image: values.image?.trim() || null,
      }

      let result: Product | null
      if (editingProduct) {
        result = await put<Product>(
          `/api/products/${editingProduct.id}`,
          payload,
          { showSuccessToast: true, successMessage: 'تم تحديث المنتج بنجاح' },
        )
      } else {
        result = await post<Product>(
          '/api/products',
          payload,
          { showSuccessToast: true, successMessage: 'تم إضافة المنتج بنجاح' },
        )
      }

      if (!result) return

      onOpenChange(false)
      onSaved()
    } catch {
      // handled by useApi
    }
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
                value={form.values.name}
                onChange={(e) => form.setValue('name', e.target.value)}
                className={`h-10 rounded-lg${form.errors.name ? ' border-destructive focus-visible:ring-destructive' : ''}`}
                autoFocus
              />
              {form.errors.name && (
                <p className="text-sm text-destructive">{form.errors.name}</p>
              )}
            </div>

            {/* Category */}
            <div className="form-group">
              <label className="form-label-enhanced">
                التصنيف <span className="required-asterisk">*</span>
              </label>
              <Select
                value={form.values.categoryId}
                onValueChange={(val) => form.setValue('categoryId', val)}
              >
                <SelectTrigger className={`h-10 rounded-lg${form.errors.categoryId ? ' border-destructive focus:ring-destructive' : ''}`}>
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
              {form.errors.categoryId && (
                <p className="text-sm text-destructive">{form.errors.categoryId}</p>
              )}
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
                  value={form.values.costPrice}
                  onChange={(e) => form.setValue('costPrice', e.target.value)}
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
                  value={form.values.price}
                  onChange={(e) => form.setValue('price', e.target.value)}
                  className={`h-10 rounded-lg text-left${form.errors.price ? ' border-destructive focus-visible:ring-destructive' : ''}`}
                />
                {form.errors.price && (
                  <p className="text-sm text-destructive">{form.errors.price}</p>
                )}
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
                  value={form.values.quantity}
                  onChange={(e) => form.setValue('quantity', e.target.value)}
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
                  value={form.values.minQuantity}
                  onChange={(e) => form.setValue('minQuantity', e.target.value)}
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
                value={form.values.barcode}
                onChange={(e) => form.setValue('barcode', e.target.value)}
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
                  form.values.image
                    ? 'border-primary/30 bg-primary/5'
                    : 'border-border'
                }`}
              >
                {form.values.image ? (
                  <div className="relative p-3">
                    <div className="product-image-lg w-full h-32 mx-auto">
                      <img
                        src={form.values.image}
                        alt="صورة المنتج"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex justify-center mt-2">
                      <button
                        type="button"
                        onClick={() => form.setValue('image', '')}
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
            onClick={() => onOpenChange(false)}
            disabled={form.isSubmitting}
            className="rounded-lg"
          >
            إلغاء
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={form.isSubmitting}
            className="gap-2 rounded-lg shadow-md shadow-primary/20"
          >
            {form.isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {editingProduct ? 'تحديث المنتج' : 'إضافة المنتج'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
