'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Pencil, Star, Globe, Phone } from 'lucide-react'
import { StarRating } from '@/components/star-rating'
import type { Supplier } from './types'
import { PAYMENT_TERMS } from './types'

interface SupplierFormState {
  name: string
  phone: string
  phone2: string
  address: string
  website: string
  paymentTerms: string
  notes: string
}

interface SupplierFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingSupplier: Supplier | null
  supplierForm: SupplierFormState
  setSupplierForm: (form: SupplierFormState) => void
  onSave: () => void
  loading: boolean
}

export function SupplierFormDialog({
  open,
  onOpenChange,
  editingSupplier,
  supplierForm,
  setSupplierForm,
  onSave,
  loading,
}: SupplierFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {editingSupplier ? (
              <>
                <Pencil className="w-4 h-4 text-primary" />
                تعديل المورد
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 text-primary" />
                إضافة مورد جديد
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh]">
          <div className="space-y-4 py-2 px-1">
            {/* Rating Display */}
            {editingSupplier && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/30">
                <Star className="w-5 h-5 text-amber-500" />
                <div>
                  <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">التقييم الحالي</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <StarRating rating={editingSupplier.rating} size="sm" />
                    <span className="text-xs text-muted-foreground">
                      ({editingSupplier.ratingCount} تقييم)
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="glass-card rounded-xl p-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="supplier-name">اسم المورد *</Label>
                <Input
                  id="supplier-name"
                  placeholder="أدخل اسم المورد"
                  value={supplierForm.name}
                  onChange={(e) =>
                    setSupplierForm({ ...supplierForm, name: e.target.value })
                  }
                  className="h-10 rounded-xl"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="supplier-phone" className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                    رقم الهاتف
                  </Label>
                  <Input
                    id="supplier-phone"
                    placeholder="رقم الهاتف"
                    value={supplierForm.phone}
                    onChange={(e) =>
                      setSupplierForm({ ...supplierForm, phone: e.target.value })
                    }
                    className="h-10 rounded-xl"
                    dir="ltr"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="supplier-phone2" className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                    هاتف احتياطي
                  </Label>
                  <Input
                    id="supplier-phone2"
                    placeholder="رقم احتياطي"
                    value={supplierForm.phone2}
                    onChange={(e) =>
                      setSupplierForm({ ...supplierForm, phone2: e.target.value })
                    }
                    className="h-10 rounded-xl"
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="supplier-address">العنوان</Label>
                <Input
                  id="supplier-address"
                  placeholder="أدخل العنوان"
                  value={supplierForm.address}
                  onChange={(e) =>
                    setSupplierForm({ ...supplierForm, address: e.target.value })
                  }
                  className="h-10 rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="supplier-website" className="flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-muted-foreground" />
                  الموقع الإلكتروني
                </Label>
                <Input
                  id="supplier-website"
                  placeholder="https://example.com"
                  value={supplierForm.website}
                  onChange={(e) =>
                    setSupplierForm({ ...supplierForm, website: e.target.value })
                  }
                  className="h-10 rounded-xl"
                  dir="ltr"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="supplier-payment-terms">شروط الدفع</Label>
                <Select
                  value={supplierForm.paymentTerms}
                  onValueChange={(val) => setSupplierForm({ ...supplierForm, paymentTerms: val })}
                >
                  <SelectTrigger className="h-10 rounded-xl">
                    <SelectValue placeholder="شروط الدفع" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_TERMS.map((term) => (
                      <SelectItem key={term.value} value={term.value}>
                        {term.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="supplier-notes">ملاحظات</Label>
                <Textarea
                  id="supplier-notes"
                  placeholder="ملاحظات إضافية عن المورد..."
                  value={supplierForm.notes}
                  onChange={(e) =>
                    setSupplierForm({ ...supplierForm, notes: e.target.value })
                  }
                  className="rounded-xl resize-none min-h-[80px]"
                  rows={3}
                />
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-xl"
          >
            إلغاء
          </Button>
          <Button
            onClick={onSave}
            disabled={loading}
            className="rounded-xl gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>جاري الحفظ...</span>
              </>
            ) : editingSupplier ? (
              <>
                <Pencil className="w-4 h-4" />
                حفظ التعديلات
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                إضافة المورد
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
