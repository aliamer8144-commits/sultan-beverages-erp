'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Plus, Minus, type LucideProps } from 'lucide-react'
import type { Product } from './types'

interface ProductQuickViewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  product: Product | null
  quickViewQuantity: number
  setQuickViewQuantity: (val: number) => void
  onAddToCart: () => void
  formatDual: (amount: number) => { primary: string; secondary: string | null; display: string }
  getCategoryIcon: (icon: string, props: LucideProps) => React.ReactNode
  getCategoryColor: (categoryId: string) => { bg: string; text: string; hover: string }
}

export function ProductQuickViewDialog({
  open,
  onOpenChange,
  product,
  quickViewQuantity,
  setQuickViewQuantity,
  onAddToCart,
  formatDual,
  getCategoryIcon,
  getCategoryColor,
}: ProductQuickViewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xs" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-right text-base">
            تفاصيل المنتج
          </DialogTitle>
        </DialogHeader>
        {product && (
          <div className="space-y-4">
            {/* Product image */}
            {(() => {
              const colors = getCategoryColor(product.categoryId)
              return product.image ? (
                <div className="product-image-lg w-full h-32">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="product-placeholder w-full h-32 rounded-xl">
                  {getCategoryIcon(product.category.icon || 'CupSoda', { className: 'w-12 h-12' })}
                </div>
              )
            })()}
            {/* Product info */}
            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold truncate">{product.name}</h3>
                <p className="text-[11px] text-muted-foreground">{product.category.name}</p>
              </div>
            </div>

            {/* Price & Stock */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <p className="text-[10px] text-muted-foreground mb-0.5">السعر</p>
                <p className="text-base font-bold text-primary tabular-nums">
                  {formatDual(product.price).display}
                </p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <p className="text-[10px] text-muted-foreground mb-0.5">المخزون</p>
                <p className={`text-base font-bold tabular-nums ${product.quantity <= product.minQuantity ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {product.quantity}
                </p>
              </div>
            </div>

            {/* Quantity selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">الكمية</label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setQuickViewQuantity(Math.max(1, quickViewQuantity - 1))}
                  className="w-9 h-9 rounded-xl bg-muted/50 border border-border/60 flex items-center justify-center hover:bg-muted transition-colors"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <Input
                  type="number"
                  min={1}
                  max={product.quantity}
                  value={quickViewQuantity}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 1
                    setQuickViewQuantity(Math.max(1, Math.min(val, product.quantity)))
                  }}
                  className="h-9 rounded-xl text-center text-base font-bold tabular-nums"
                  dir="ltr"
                />
                <button
                  onClick={() => setQuickViewQuantity(Math.min(product.quantity, quickViewQuantity + 1))}
                  className="w-9 h-9 rounded-xl bg-muted/50 border border-border/60 flex items-center justify-center hover:bg-muted transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              {quickViewQuantity > 0 && (
                <p className="text-[10px] text-muted-foreground text-center">
                  الإجمالي: {formatDual(product.price * quickViewQuantity).display}
                </p>
              )}
            </div>
          </div>
        )}
        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1 h-10 rounded-xl"
          >
            إغلاق
          </Button>
          <Button
            onClick={onAddToCart}
            className="flex-1 h-10 rounded-xl gap-2 btn-ripple"
          >
            <Plus className="w-4 h-4" />
            إضافة للسلة
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
