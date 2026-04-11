/**
 * EmptyState — Sultan Beverages ERP
 *
 * Reusable empty state display for tables and lists.
 * Consistent styling across all screens.
 *
 * Usage:
 *   <EmptyState
 *     icon={PackageOpen}
 *     title="لا توجد منتجات"
 *     description="لم يتم تسجيل أي منتج بعد"
 *     action={<Button onClick={onAdd}>إضافة منتج</Button>}
 *   />
 */

'use client'

import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
  compact?: boolean
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-center empty-state',
        compact ? 'py-8' : 'py-16',
        className,
      )}
    >
      <div className="flex flex-col items-center gap-4 text-center max-w-sm">
        {Icon && (
          <div
            className={cn(
              'rounded-2xl bg-muted flex items-center justify-center empty-state-icon',
              compact ? 'w-12 h-12' : 'w-16 h-16',
            )}
          >
            <Icon
              className={cn(
                'text-muted-foreground/50',
                compact ? 'w-6 h-6' : 'w-8 h-8',
              )}
            />
          </div>
        )}
        <div>
          <p className={cn('font-semibold text-foreground empty-state-title', compact ? 'text-sm' : 'text-sm')}>
            {title}
          </p>
          {description && (
            <p className="text-xs text-muted-foreground mt-1 empty-state-description">
              {description}
            </p>
          )}
        </div>
        {action && <div className="mt-2">{action}</div>}
      </div>
    </div>
  )
}

// ── Loading Spinner ────────────────────────────────────────────────

interface LoadingStateProps {
  message?: string
  className?: string
}

export function LoadingState({
  message = 'جاري التحميل...',
  className,
}: LoadingStateProps) {
  return (
    <div className={cn('flex items-center justify-center py-16', className)}>
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  )
}

// ── Pagination Component ───────────────────────────────────────────

interface PaginationProps {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  className?: string
}

export function Pagination({
  page,
  totalPages,
  onPageChange,
  className,
}: PaginationProps) {
  if (totalPages <= 1) return null

  return (
    <div className={cn('flex items-center justify-center gap-2', className)}>
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="px-3 py-1.5 text-xs rounded-lg border border-border/50 bg-card text-foreground hover:bg-muted/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        السابق
      </button>
      <span className="text-xs text-muted-foreground px-3 min-w-[60px] text-center">
        {page} / {totalPages}
      </span>
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className="px-3 py-1.5 text-xs rounded-lg border border-border/50 bg-card text-foreground hover:bg-muted/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        التالي
      </button>
    </div>
  )
}
