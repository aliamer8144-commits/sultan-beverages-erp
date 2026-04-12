'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Star } from 'lucide-react'
import { useAppStore } from '@/store/app-store'
import { useApi } from '@/hooks/use-api'
import { useZodForm } from '@/hooks/use-zod-form'
import { createSupplierReviewSchema } from '@/lib/validations'
import type { Supplier } from './types'

const reviewFormSchema = createSupplierReviewSchema.omit({ supplierId: true })

interface RatingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  supplier: Supplier | null
  onSuccess: () => void
}

export function RatingDialog({
  open,
  onOpenChange,
  supplier,
  onSuccess,
}: RatingDialogProps) {
  const { user } = useAppStore()
  const { post } = useApi()

  const form = useZodForm({
    schema: reviewFormSchema,
    defaultValues: {
      rating: 0 as any,
      review: '',
    },
  })

  const [ratingSubmitting, setRatingSubmitting] = useState(false)
  const [ratingHover, setRatingHover] = useState(0)

  const handleSubmitRating = async () => {
    if (!supplier) return

    if (!form.validate()) return

    const rating = Number(form.values.rating)
    setRatingSubmitting(true)
    try {
      const result = await post('/api/supplier-rating', {
        supplierId: supplier.id,
        rating,
        review: form.values.review?.trim() || undefined,
        userName: user?.name || undefined,
      }, {
        showSuccessToast: true,
        successMessage: `تم تقييم المورد ${rating} نجوم`,
      })
      if (result) {
        form.reset()
        setRatingHover(0)
        onOpenChange(false)
        onSuccess()
      }
    } finally {
      setRatingSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      if (!newOpen) form.clearErrors()
      onOpenChange(newOpen)
    }}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10">
              <Star className="h-5 w-5 text-amber-500" />
            </div>
            تقييم المورد
          </DialogTitle>
        </DialogHeader>
        {supplier && (
          <div className="space-y-4 py-2">
            {/* Supplier Info */}
            <div className="glass-card rounded-xl p-3">
              <p className="text-sm font-bold">{supplier.name}</p>
              {supplier.ratingCount > 0 && (
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  المتوسط الحالي: {supplier.rating.toFixed(1)} ({supplier.ratingCount} تقييم)
                </p>
              )}
            </div>

            {/* Star Selection */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">اختر التقييم</Label>
              <div className="flex items-center gap-1 justify-center py-2">
                {[1, 2, 3, 4, 5].map((star) => {
                  const filled = star <= (ratingHover || form.values.rating)
                  return (
                    <button
                      key={star}
                      type="button"
                      className="cursor-pointer hover:scale-125 transition-transform p-1"
                      onMouseEnter={() => setRatingHover(star)}
                      onMouseLeave={() => setRatingHover(0)}
                      onClick={() => form.setValue('rating', star)}
                    >
                      <Star
                        className={`w-8 h-8 ${
                          filled
                            ? 'fill-amber-400 text-amber-400'
                            : 'fill-transparent text-muted-foreground/30'
                        }`}
                      />
                    </button>
                  )
                })}
              </div>
              {form.errors.rating && (
                <p className="text-sm text-destructive text-center">{form.errors.rating}</p>
              )}
              {form.values.rating > 0 && (
                <p className="text-xs text-center text-muted-foreground">
                  {form.values.rating === 1 && 'سيئ'}
                  {form.values.rating === 2 && 'مقبول'}
                  {form.values.rating === 3 && 'جيد'}
                  {form.values.rating === 4 && 'جيد جداً'}
                  {form.values.rating === 5 && 'ممتاز'}
                </p>
              )}
            </div>

            {/* Review Text */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                ملاحظات <span className="text-muted-foreground text-xs">(اختياري)</span>
              </Label>
              <Textarea
                placeholder="أضف تعليقاً على تقييمك..."
                value={form.values.review || ''}
                onChange={(e) => form.setValue('review', e.target.value)}
                className={`rounded-xl min-h-[80px] resize-none${form.errors.review ? ' border-destructive focus-visible:ring-destructive' : ''}`}
                maxLength={200}
              />
              {form.errors.review && (
                <p className="text-sm text-destructive">{form.errors.review}</p>
              )}
              <p className="text-[10px] text-muted-foreground text-left" dir="ltr">
                {(form.values.review || '').length}/200
              </p>
            </div>
          </div>
        )}
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={ratingSubmitting}
            className="rounded-lg"
          >
            إلغاء
          </Button>
          <Button
            onClick={handleSubmitRating}
            disabled={ratingSubmitting || form.values.rating === 0}
            className="gap-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white"
          >
            {ratingSubmitting && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            <Star className="w-4 h-4" />
            إرسال التقييم
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
