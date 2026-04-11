'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Loader2, Plus, PackageX, Pencil, Trash2, Tags, Package } from 'lucide-react'
import { toast } from 'sonner'
import { useApi } from '@/hooks/use-api'

import type { Category } from './types'

export interface CategoryManagerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  categories: Category[]
  onUpdated: () => void
}

export function CategoryManager({ open, onOpenChange, categories, onUpdated }: CategoryManagerProps) {
  const { post, put, del } = useApi()

  // Category form dialog state
  const [catFormOpen, setCatFormOpen] = useState(false)
  const [editingCat, setEditingCat] = useState<Category | null>(null)
  const [catName, setCatName] = useState('')
  const [catSubmitting, setCatSubmitting] = useState(false)

  // Category delete confirmation state
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
        const result = await put<Category>(
          `/api/categories/${editingCat.id}`,
          { name: catName.trim(), icon: editingCat.icon },
          { showSuccessToast: true, successMessage: 'تم تحديث التصنيف بنجاح' },
        )
        if (result) {
          setCatFormOpen(false)
          onUpdated()
        }
      } else {
        const result = await post<Category>(
          '/api/categories',
          { name: catName.trim() },
          { showSuccessToast: true, successMessage: 'تم إضافة التصنيف بنجاح' },
        )
        if (result) {
          setCatFormOpen(false)
          onUpdated()
        }
      }
    } catch {
      // handled by useApi
    } finally {
      setCatSubmitting(false)
    }
  }

  const handleCatDelete = async () => {
    if (!deletingCat) return
    const ok = await del(`/api/categories/${deletingCat.id}`)
    if (ok) {
      setCatDeleteOpen(false)
      setDeletingCat(null)
      onUpdated()
    }
  }

  return (
    <>
      {/* ─── Category Management Dialog ──────────────────────────── */}
      <Dialog open={open} onOpenChange={onOpenChange}>
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
              onClick={() => onOpenChange(false)}
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
      <ConfirmDialog
        open={catDeleteOpen}
        onOpenChange={setCatDeleteOpen}
        title="تأكيد حذف التصنيف"
        description={`هل أنت متأكد من حذف التصنيف "${deletingCat?.name}"؟`}
        onConfirm={handleCatDelete}
        confirmText="حذف التصنيف"
        variant="destructive"
      />
    </>
  )
}
