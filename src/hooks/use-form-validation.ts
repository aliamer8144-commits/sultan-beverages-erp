/**
 * useFormValidation — Lightweight validation hook for controlled forms
 *
 * Use this when the parent component manages form state (via props),
 * and you only need validation error tracking.
 *
 * @example
 * ```tsx
 * function CustomerFormDialog({ form, setForm, onSubmit }) {
 *   const v = useFormValidation({ schema: createCustomerSchema })
 *
 *   const handleSubmit = () => {
 *     if (!v.validate(form)) return
 *     onSubmit()
 *   }
 *
 *   return (
 *     <Input
 *       value={form.name}
 *       onChange={(e) => {
 *         setForm({ ...form, name: e.target.value })
 *         v.clearFieldError('name')
 *       }}
 *       className={v.errors.name ? 'border-destructive' : ''}
 *     />
 *     {v.errors.name && (
 *       <p className="text-sm text-destructive">{v.errors.name}</p>
 *     )}
 *   )
 * }
 * ```
 */

'use client'

import { useState, useCallback } from 'react'
import { type z } from 'zod'
import { validateFormClient, getFirstError } from '@/lib/validation-utils'

interface UseFormValidationOptions {
  /** Zod schema to validate against */
  schema: z.ZodType<any, any, any>
}

interface UseFormValidationReturn {
  /** Current field-level errors (field path → Arabic message) */
  errors: Record<string, string>
  /** Whether the form currently has any errors */
  hasErrors: boolean
  /**
   * Validate data against the schema.
   * Returns `true` if valid, sets internal error state.
   */
  validate: (data: unknown) => boolean
  /**
   * Validate data and return the first error as a string (for toast).
   * Returns `null` if valid.
   */
  validateAndGetFirstError: (data: unknown) => string | null
  /** Clear error for a specific field */
  clearFieldError: (field: string) => void
  /** Clear all errors */
  clearAllErrors: () => void
  /** Manually set errors (e.g., from API response) */
  setErrorMap: (errors: Record<string, string>) => void
}

export function useFormValidation({
  schema,
}: UseFormValidationOptions): UseFormValidationReturn {
  const [errorState, setErrorState] = useState<Record<string, string>>({})

  const validate = useCallback(
    (data: unknown): boolean => {
      const fieldErrors = validateFormClient(schema, data)
      setErrorState(fieldErrors || {})
      return !fieldErrors
    },
    [schema]
  )

  const validateAndGetFirstError = useCallback(
    (data: unknown): string | null => {
      const fieldErrors = validateFormClient(schema, data)
      setErrorState(fieldErrors || {})
      const first = getFirstError(fieldErrors)
      return first ?? null
    },
    [schema]
  )

  const clearFieldError = useCallback((field: string) => {
    setErrorState((prev) => {
      if (!prev[field]) return prev
      const next = { ...prev }
      delete next[field]
      return next
    })
  }, [])

  const clearAllErrors = useCallback(() => {
    setErrorState({})
  }, [])

  const setErrorMap = useCallback((newErrors: Record<string, string>) => {
    setErrorState(newErrors)
  }, [])

  return {
    errors: errorState,
    hasErrors: Object.keys(errorState).length > 0,
    validate,
    validateAndGetFirstError,
    clearFieldError,
    clearAllErrors,
    setErrorMap,
  }
}
