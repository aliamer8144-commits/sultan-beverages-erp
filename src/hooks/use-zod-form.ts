/**
 * useZodForm — Full-featured form management hook
 *
 * Manages form state, validation against a Zod schema, field-level errors,
 * and submission lifecycle. Designed for self-contained form components
 * that manage their own state (dialog forms, etc.).
 *
 * Supports separate input/output types — useful when form fields store
 * raw strings (e.g., `amount: ''`) but the schema coerces them to numbers
 * (e.g., `z.coerce.number()`).
 *
 * @example
 * ```tsx
 * // Simple: same type for form values and submit handler
 * const form = useZodForm({
 *   schema: createCategorySchema,
 *   defaultValues: { name: '', icon: '' },
 * })
 *
 * @example
 * ```tsx
 * // Advanced: separate input/output types (coerce.number scenario)
 * const form = useZodForm<PaymentInput, PaymentOutput>({
 *   schema: createPaymentSchema,
 *   defaultValues: { amount: '', method: 'cash' },
 * })
 * form.handleSubmit(async (values) => {
 *   // values.amount is number here (schema output)
 * })
 * ```
 */

'use client'

import { useState, useCallback } from 'react'
import { type z } from 'zod'
import { validateFormClient } from '@/lib/validation-utils'

/** Base type for form field values (string keys, any values) */
type FieldValues = Record<string, any>

interface UseZodFormOptions<
  TInput extends FieldValues = FieldValues,
  TOutput extends FieldValues = TInput,
> {
  /** Zod schema to validate against — output type is TOutput */
  schema: z.ZodType<TOutput>
  /** Default values for the form (input type) */
  defaultValues: TInput
}

interface UseZodFormReturn<
  TInput extends FieldValues = FieldValues,
  TOutput extends FieldValues = TInput,
> {
  /** Current form values (raw input state) */
  values: TInput
  /** Field-level error messages (field path → Arabic message) */
  errors: Record<string, string>
  /** Whether the form is currently being submitted */
  isSubmitting: boolean
  /** Whether the form has any errors */
  hasErrors: boolean
  /** Set a single field value (auto-clears its error) */
  setValue: <K extends keyof TInput>(field: K, value: TInput[K]) => void
  /** Set multiple field values at once (auto-clears their errors) */
  setValues: (partial: Partial<TInput>) => void
  /** Set error for a specific field */
  setError: (field: string, message: string) => void
  /** Replace all errors at once (e.g., from API or cross-field validation) */
  setErrorMap: (errors: Record<string, string>) => void
  /** Clear error for a specific field */
  clearError: (field: string) => void
  /** Clear all field errors */
  clearErrors: () => void
  /** Reset form to default values and clear all errors */
  reset: (newValues?: Partial<TInput>) => void
  /** Manually trigger validation. Returns `true` if valid. */
  validate: () => boolean
  /**
   * Wrap a submit handler with validation + loading state.
   * Only calls the callback if validation passes.
   * The callback receives schema-parsed values (TOutput — coerced types).
   * Automatically sets/unsets `isSubmitting`.
   */
  handleSubmit: (
    onValid: (values: TOutput) => void | Promise<void>
  ) => () => Promise<void>
}

export function useZodForm<
  TInput extends FieldValues = FieldValues,
  TOutput extends FieldValues = TInput,
>({
  schema,
  defaultValues,
}: UseZodFormOptions<TInput, TOutput>): UseZodFormReturn<TInput, TOutput> {
  const [values, setValuesState] = useState<TInput>(() => ({ ...defaultValues }))
  const [errors, setErrorsState] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const setValue = useCallback(
    <K extends keyof TInput>(field: K, value: TInput[K]) => {
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

  const setValues = useCallback((partial: Partial<TInput>) => {
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
    (newValues?: Partial<TInput>) => {
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
    (onValid: (values: TOutput) => void | Promise<void>) => {
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
