/**
 * ConfirmDialog — Sultan Beverages ERP
 *
 * Reusable confirmation dialog for destructive actions.
 * Built on shadcn/ui AlertDialog.
 *
 * Usage:
 *   const [confirmState, setConfirmState] = useState<{ open: boolean; onConfirm: () => void; title: string; description: string }>()
 *
 *   <ConfirmDialog
 *     open={confirmState.open}
 *     onOpenChange={(open) => setConfirmState(s => ({ ...s, open }))}
 *     title={confirmState.title}
 *     description={confirmState.description}
 *     onConfirm={() => { confirmState.onConfirm(); setConfirmState(s => ({ ...s, open: false })) }}
 *     confirmText="حذف"
 *     variant="destructive"
 *   />
 */

'use client'

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  onConfirm: () => void | Promise<void>
  confirmText?: string
  cancelText?: string
  variant?: 'default' | 'destructive'
  loading?: boolean
  children?: React.ReactNode
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  confirmText = 'تأكيد',
  cancelText = 'إلغاء',
  variant = 'default',
  loading = false,
  children,
}: ConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="glass-card" dir="rtl">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-base">{title}</AlertDialogTitle>
          {description && (
            <AlertDialogDescription className="text-sm">
              {description}
            </AlertDialogDescription>
          )}
          {children}
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel disabled={loading} className="text-sm">
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              onConfirm()
            }}
            disabled={loading}
            className={cn(
              'text-sm gap-2',
              variant === 'destructive' &&
                'bg-destructive text-destructive-foreground hover:bg-destructive/90',
            )}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : null}
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

// ── Hook helper for managing confirm dialogs ────────────────────────

interface ConfirmState {
  open: boolean
  title: string
  description: string
  onConfirm: () => void | Promise<void>
}

export function useConfirm() {
  const [state, setState] = useState<ConfirmState>({
    open: false,
    title: '',
    description: '',
    onConfirm: () => {},
  })
  const [loading, setLoading] = useState(false)

  const confirm = (options: {
    title: string
    description?: string
    onConfirm: () => void | Promise<void>
  }) => {
    setState({
      open: true,
      title: options.title,
      description: options.description || '',
      onConfirm: options.onConfirm,
    })
  }

  const handleConfirm = async () => {
    setLoading(true)
    try {
      await state.onConfirm()
      setState((s) => ({ ...s, open: false }))
    } finally {
      setLoading(false)
    }
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) setState((s) => ({ ...s, open: false }))
  }

  return {
    confirm,
    loading,
    isOpen: state.open,
    title: state.title,
    description: state.description,
    onConfirm: handleConfirm,
    onOpenChange: handleOpenChange,
  }
}

import { useState } from 'react'
