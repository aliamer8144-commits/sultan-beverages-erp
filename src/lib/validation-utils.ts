/**
 * Client-side Form Validation Utilities — Sultan Beverages ERP
 *
 * Reuses existing Zod schemas from validations.ts for client-side
 * field-level validation. Provides consistent error messages in Arabic.
 */

import { type z } from 'zod'

/**
 * Validate form data against a Zod schema and return field-level errors.
 *
 * Returns `null` if all fields are valid, or a `Record<string, string>`
 * mapping field paths to their Arabic error messages.
 *
 * @example
 * ```ts
 * const errors = validateFormClient(createCustomerSchema, { name: '', phone: '' })
 * // errors = { name: 'اسم العميل مطلوب' }
 * ```
 */
export function validateFormClient<T extends z.ZodType>(
  schema: T,
  data: unknown
): Record<string, string> | null {
  const result = schema.safeParse(data)
  if (result.success) return null

  const errors: Record<string, string> = {}
  for (const issue of result.error.issues) {
    const field = issue.path.join('.')
    // Keep only the first error per field
    if (!errors[field]) {
      errors[field] = issue.message
    }
  }
  return errors
}

/**
 * Validate a single field against a Zod schema.
 *
 * Uses `.pick()` to validate only the specific field instead of
 * parsing the entire schema, which is much more efficient for
 * large schemas.
 *
 * Returns the first error message for the specified field,
 * or `undefined` if the field is valid.
 *
 * @example
 * ```ts
 * const error = validateField(createCustomerSchema, 'name', '')
 * // error = 'اسم العميل مطلوب'
 * ```
 */
export function validateField(
  schema: z.ZodObject<any>,
  field: string,
  value: unknown
): string | undefined {
  try {
    const fieldSchema = schema.pick({ [field]: true })
    const result = fieldSchema.safeParse({ [field]: value })
    if (result.success) return undefined

    const match = result.error.issues.find(
      (issue) => issue.path.join('.') === field
    )
    return match?.message
  } catch {
    // Fallback: if pick fails (e.g. field doesn't exist in schema), return undefined
    return undefined
  }
}

/**
 * Get the first error message from a validation result.
 * Useful for showing a single toast when a form has errors.
 */
export function getFirstError(
  errors: Record<string, string> | null
): string | undefined {
  if (!errors) return undefined
  return Object.values(errors)[0]
}
