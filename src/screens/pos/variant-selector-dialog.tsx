'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { CupSoda } from 'lucide-react'
import type { Product, ProductVariant } from './types'

interface VariantSelectorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  product: Product | null
  variants: ProductVariant[]
  loading: boolean
  onSelectVariant: (product: Product, variant: ProductVariant) => void
  formatDual: (amount: number) => { primary: string; secondary: string | null; display: string }
}

export function VariantSelectorDialog({
  open,
  onOpenChange,
  product,
  variants,
  loading,
  onSelectVariant,
  formatDual,
}: VariantSelectorDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-right text-base flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
              <CupSoda className="w-4 h-4 text-violet-700 dark:text-violet-400" />
            </div>
            اختر المتغير
          </DialogTitle>
          <DialogDescription className="text-right">
            {product?.name}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : variants.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">لا توجد متغيرات متاحة</p>
          </div>
        ) : (
          <ScrollArea className="max-h-[50vh]">
            <div className="space-y-2">
              {variants.map((variant) => (
                <button
                  key={variant.id}
                  onClick={() => product && onSelectVariant(product, variant)}
                  disabled={variant.stock <= 0}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-right ${
                    variant.stock <= 0
                      ? 'opacity-50 cursor-not-allowed bg-muted/30'
                      : 'bg-card hover:bg-muted/50 hover:border-primary/30 cursor-pointer'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{variant.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {variant.sku && <span className="font-mono mr-2">{variant.sku}</span>}
                      المخزون: {variant.stock}
                    </p>
                  </div>
                  <div className="text-left flex-shrink-0">
                    <p className="text-sm font-bold text-primary tabular-nums">
                      {formatDual(variant.sellPrice).display}
                    </p>
                    {variant.stock <= 0 && (
                      <p className="text-[10px] text-destructive font-medium">غير متوفر</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1 h-10 rounded-xl"
          >
            إلغاء
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
