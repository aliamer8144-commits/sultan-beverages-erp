import { withAuth } from '@/lib/auth-middleware'
import { successResponse } from '@/lib/api-response'
import { tryCatch, withValidation } from '@/lib/api-error-handler'
import { z } from 'zod'

const exchangeRateSchema = z.object({
  exchangeRate: z.number().positive().optional(),
  secondaryCurrency: z.string().max(10).optional(),
  currencyDisplayMode: z.string().max(20).optional(),
  secondaryCurrencyEnabled: z.boolean().optional(),
  secondaryCurrencySymbol: z.string().max(10).optional(),
})

// ─── GET: Return default exchange rate settings ──────────────────
// Stateless endpoint — the frontend manages exchange rate via Zustand.
// Previous implementation incorrectly used useAppStore.getState() on the server.
export const GET = withAuth(tryCatch(async () => {
  return successResponse({
    enabled: false,
    primaryCurrency: 'YER',
    secondaryCurrencyEnabled: false,
    secondaryCurrency: 'USD',
    exchangeRate: 1,
    currencyDisplayMode: 'primary',
  })
}, 'فشل في جلب سعر الصرف'))

// ─── POST: Accept exchange rate settings (stateless echo) ────────
// The frontend persists settings via Zustand/localStorage.
// This endpoint validates and echoes back the posted data.
export const POST = withAuth(withValidation(
  exchangeRateSchema,
  async (request, body) => {
    return successResponse({
      primaryCurrency: 'YER',
      secondaryCurrencyEnabled: body.secondaryCurrencyEnabled ?? false,
      secondaryCurrency: body.secondaryCurrency ?? 'USD',
      exchangeRate: body.exchangeRate ?? 1,
      currencyDisplayMode: body.currencyDisplayMode ?? 'primary',
      secondaryCurrencySymbol: body.secondaryCurrencySymbol ?? '$',
    })
  },
  'فشل في حفظ سعر الصرف'
))
