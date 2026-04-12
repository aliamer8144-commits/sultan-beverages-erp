/**
 * useZodForm — Full-featured form management hook
 *
 * Manages form state, validation against a Zod schema, field-level errors,
 * and submission lifecycle. Designed for self-contained form components
 * that manage their own state (dialog forms, etc.).
 *
 * @example
 * ```tsx
 * function MyForm({ onSaved }: { onSaved: () => void }) {
 *   const form = useZodForm({
 *     schema: createCustomerSchema,
 *     defaultValues: { name: '', phone: '', category: 'عادي', notes: '' },
 *   })
 *
 *   return (
 *     <form onSubmit={form.handleSubmit(async (values) => {
 *       await post('/api/customers', values)
 *       form.reset()
 *       onSaved()
 *     })}>
 *       <Input
 *         value={form.values.name}
 *         onChange={(e) => form.setValue('name', e.target.value)}
 *         className={form.errors.name ? 'border-destructive' : ''}
 *       />
 *       {form.errors.name && (
 *         <p className="text-sm text-destructive">{form.errors.name}</p>
 *       )}
 *     </form>
 *   )
 * }
 * ```
 */

'use client'

import { useState, useCallback } from 'react'
import { type z } from 'zod'
import { validateFormClient } from '@/lib/validation-utils'

type FieldValues = Record<string, any>

interface UseZodFormOptions<TValues extends FieldValues = FieldValues> {
  /** Zod schema to validate against */
  schema: z.ZodType<any, any, any>
  /** Default values for the form */
  defaultValues: TValues
}

interface UseZodFormReturn<TValues extends FieldValues = FieldValues> {
  /** Current form values */
  values: TValues
  /** Field-level error messages (field path → Arabic message) */
  errors: Record<string, string>
  /** Whether the form is currently being submitted */
  isSubmitting: boolean
  /** Whether the form has any errors */
  hasErrors: boolean
  /** Set a single field value (auto-clears its error) */
  setValue: <K extends keyof TValues>(field: K, value: TValues[K]) => void
  /** Set multiple field values at once (auto-clears their errors) */
  setValues: (partial: Partial<TValues>) => void
  /** Set error for a specific field */
  setError: (field: string, message: string) => void
  /** Replace all errors at once (e.g., from API or cross-field validation) */
  setErrorMap: (errors: Record<string, string>) => void
  /** Clear error for a specific field */
  clearError: (field: string) => void
  /** Clear all field errors */
  clearErrors: () => void
  /** Reset form to default values and clear all errors */
  reset: (newValues?: Partial<TValues>) => void
  /** Manually trigger validation. Returns `true` if valid. */
  validate: () => boolean
  /**
   * Wrap a submit handler with validation + loading state.
   * Only calls the callback if validation passes.
   * Automatically sets/unsets `isSubmitting`.
   */
  handleSubmit: (
    onValid: (values: z.infer<any>) => void | Promise<void>
  ) => () => Promise<void>
}

export function useZodForm<TValues extends FieldValues = FieldValues>({
  schema,
  defaultValues,
}: UseZodFormOptions<TValues>): UseZodFormReturn<TValues> {
  const [values, setValuesState] = useState<TValues>(() => ({ ...defaultValues }))
  const [errors, setErrorsState] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const setValue = useCallback(
    <K extends keyof TValues>(field: K, value: TValues[K]) => {
      setValuesState((prev) => ({ ...prev, [field]: value }))
      // Auto-clear error for this field
      setErrorsState((prev) => {
        const key = String(field)
        if (!prev[key]) return prev
        const next = { ...prev }
        delete next[key]
        return next
      })
    },
    []
  )

  const setValues = useCallback((partial: Partial<TValues>) => {
    setValuesState((prev) => ({ ...prev, ...partial }))
    // Auto-clear errors for updated fields
    setErrorsState((prev) => {
      const next = { ...prev }
      let changed = false
      for (const key of Object.keys(partial)) {
        if (next[key]) {
          delete next[key]
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [])

  const setError = useCallback((field: string, message: string) => {
    setErrorsState((prev) => ({ ...prev, [field]: message }))
  }, [])

  const setErrorMap = useCallback((newErrors: Record<string, string>) => {
    setErrorsState(newErrors)
  }, [])

  const clearError = useCallback((field: string) => {
    setErrorsState((prev) => {
      if (!prev[field]) return prev
      const next = { ...prev }
      delete next[field]
      return next
    })
  }, [])

  const clearErrors = useCallback(() => {
    setErrorsState({})
  }, [])

  const reset = useCallback(
    (newValues?: Partial<TValues>) => {
      setValuesState({ ...defaultValues, ...newValues })
      setErrorsState({})
      setIsSubmitting(false)
    },
    [defaultValues]
  )

  const validate = useCallback((): boolean => {
    const fieldErrors = validateFormClient(schema, values)
    if (fieldErrors) {
      setErrorsState(fieldErrors)
      return false
    }
    setErrorsState({})
    return true
  }, [schema, values])

  const handleSubmit = useCallback(
    (onValid: (values: any) => void | Promise<void>) => {
      return async () => {
        const fieldErrors = validateFormClient(schema, values)
        if (fieldErrors) {
          setErrorsState(fieldErrors)
          return
        }

        setIsSubmitting(true)
        try {
          // Parse with schema to get properly typed/transformed values
          const result = schema.safeParse(values)
          if (result.success) {
            await onValid(result.data)
          } else {
            // This shouldn't happen since we already validated above,
            // but handle it defensively
            const errs: Record<string, string> = {}
            for (const issue of result.error.issues) {
              const field = issue.path.join('.')
              if (!errs[field]) errs[field] = issue.message
            }
            setErrorsState(errs)
          }
        } finally {
          setIsSubmitting(false)
        }
      }
    },
    [schema, values]
  )

  return {
    values,
    errors,
    isSubmitting,
    hasErrors: Object.keys(errors).length > 0,
    setValue,
    setValues,
    setError,
    setErrorMap,
    clearError,
    clearErrors,
    reset,
    validate,
    handleSubmit,
  }
}
