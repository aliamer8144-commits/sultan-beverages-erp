'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import { Plus, Pencil } from 'lucide-react'
import { useFormValidation } from '@/hooks/use-form-validation'
import { createCustomerSchema } from '@/lib/validations'

import type { CustomerFormData } from './types'
import { CUSTOMER_CATEGORIES } from './types'

interface CustomerFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'add' | 'edit'
  form: CustomerFormData
  setForm: React.Dispatch<React.SetStateAction<CustomerFormData>>
  onSubmit: () => void
  submitting: boolean
  symbol: string
}

export function CustomerFormDialog({
  open,
  onOpenChange,
  mode,
  form,
  setForm,
  onSubmit,
  submitting,
  symbol,
}: CustomerFormDialogProps) {
  const prefix = mode === 'add' ? 'add' : 'edit'
  const isAdd = mode === 'add'

  const v = useFormValidation({ schema: createCustomerSchema })

  const handleSubmit = () => {
    if (!v.validate(form)) return
    onSubmit()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isAdd ? (
              <Plus className="h-5 w-5 text-primary" />
            ) : (
              <Pencil className="h-5 w-5 text-primary" />
            )}
            {isAdd ? 'إضافة عميل جديد' : 'تعديل بيانات العميل'}
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-4 glass-card rounded-xl p-4">
          <div className={isAdd ? 'form-group' : 'flex flex-col gap-2'}>
            {isAdd ? (
              <label htmlFor={`${prefix}-name`} className="form-label-enhanced">
                اسم العميل <span className="required-asterisk">*</span>
              </label>
            ) : (
              <Label htmlFor={`${prefix}-name`}>
                اسم العميل <span className="text-destructive">*</span>
              </Label>
            )}
            <Input
              id={`${prefix}-name`}
              placeholder="أدخل اسم العميل"
              value={form.name}
              onChange={(e) => {
                setForm({ ...form, name: e.target.value })
                v.clearFieldError('name')
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              className={v.errors.name ? 'border-destructive focus-visible:ring-destructive' : ''}
            />
            {v.errors.name && (
              <p className="text-sm text-destructive">{v.errors.name}</p>
            )}
          </div>
          <div className={isAdd ? 'form-group' : 'flex flex-col gap-2'}>
            {isAdd ? (
              <label htmlFor={`${prefix}-phone`} className="form-label-enhanced">
                رقم الهاتف
              </label>
            ) : (
              <Label htmlFor={`${prefix}-phone`}>رقم الهاتف</Label>
            )}
            <Input
              id={`${prefix}-phone`}
              placeholder={isAdd ? 'أدخل رقم الهاتف (اختياري)' : 'أدخل رقم الهاتف'}
              value={form.phone}
              onChange={(e) => {
                setForm({ ...form, phone: e.target.value })
                v.clearFieldError('phone')
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              dir="ltr"
              className={v.errors.phone ? 'border-destructive focus-visible:ring-destructive' : ''}
            />
            {v.errors.phone && (
              <p className="text-sm text-destructive">{v.errors.phone}</p>
            )}
          </div>
          {!isAdd && (
            <div className="flex flex-col gap-2">
              <Label htmlFor={`${prefix}-debt`}>المديونية ({symbol})</Label>
              <Input
                id={`${prefix}-debt`}
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={form.debt}
                onChange={(e) => setForm({ ...form, debt: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                dir="ltr"
                className={parseFloat(form.debt) > 0 ? 'border-destructive/50' : ''}
              />
            </div>
          )}
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
            <Label htmlFor={`${prefix}-notes`}>
              ملاحظات
              <span className="mr-1 text-muted-foreground text-xs">(اختياري)</span>
            </Label>
            <Textarea
              id={`${prefix}-notes`}
              placeholder="أضف ملاحظات عن العميل..."
              value={form.notes}
              onChange={(e) => {
                setForm({ ...form, notes: e.target.value })
                v.clearFieldError('notes')
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              rows={2}
              className="resize-none"
            />
            {v.errors.notes && (
              <p className="text-sm text-destructive">{v.errors.notes}</p>
            )}
          </div>
        </div>
        <DialogFooter className="flex gap-2 sm:justify-start">
          <Button onClick={handleSubmit} disabled={submitting} className="btn-ripple">
            {submitting
              ? (isAdd ? 'جارٍ الإضافة...' : 'جارٍ التحديث...')
              : (isAdd ? 'إضافة' : 'تحديث')}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false)
            }}
          >
            إلغاء
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
