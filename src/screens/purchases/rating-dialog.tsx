'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Star } from 'lucide-react'
import { useAppStore } from '@/store/app-store'
import { useApi } from '@/hooks/use-api'
import type { Supplier } from './types'

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
  const [ratingValue, setRatingValue] = useState(0)
  const [ratingReview, setRatingReview] = useState('')
  const [ratingSubmitting, setRatingSubmitting] = useState(false)
  const [ratingHover, setRatingHover] = useState(0)

  const handleSubmitRating = async () => {
    if (!supplier || ratingValue === 0) {
      toast.error('يرجى اختيار تقييم')
      return
    }

    setRatingSubmitting(true)
    try {
      const result = await post('/api/supplier-rating', {
        supplierId: supplier.id,
        rating: ratingValue,
        review: ratingReview.trim() || undefined,
        userName: user?.name || undefined,
      }, {
        showSuccessToast: true,
        successMessage: `تم تقييم المورد ${ratingValue} نجوم`,
      })
      if (result) {
        setRatingValue(0)
        setRatingReview('')
        setRatingHover(0)
        onOpenChange(false)
        onSuccess()
      }
    } finally {
      setRatingSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
                  const filled = star <= (ratingHover || ratingValue)
                  return (
                    <button
                      key={star}
                      type="button"
                      className="cursor-pointer hover:scale-125 transition-transform p-1"
                      onMouseEnter={() => setRatingHover(star)}
                      onMouseLeave={() => setRatingHover(0)}
                      onClick={() => setRatingValue(star)}
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
              {ratingValue > 0 && (
                <p className="text-xs text-center text-muted-foreground">
                  {ratingValue === 1 && 'سيئ'}
                  {ratingValue === 2 && 'مقبول'}
                  {ratingValue === 3 && 'جيد'}
                  {ratingValue === 4 && 'جيد جداً'}
                  {ratingValue === 5 && 'ممتاز'}
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
                value={ratingReview}
                onChange={(e) => setRatingReview(e.target.value)}
                className="rounded-xl min-h-[80px] resize-none"
                maxLength={200}
              />
              <p className="text-[10px] text-muted-foreground text-left" dir="ltr">
                {ratingReview.length}/200
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
            disabled={ratingSubmitting || ratingValue === 0}
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
