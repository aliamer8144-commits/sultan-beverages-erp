import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/auth-middleware'
import { successResponse, errorResponse, serverError } from '@/lib/api-response'

// ─── GET: Return default exchange rate settings ──────────────────
// Stateless endpoint — the frontend manages exchange rate via Zustand.
// Previous implementation incorrectly used useAppStore.getState() on the server.
export const GET = withAuth(async () => {
  try {
    return successResponse({
      enabled: false,
      primaryCurrency: 'YER',
      secondaryCurrencyEnabled: false,
      secondaryCurrency: 'USD',
      exchangeRate: 1,
      currencyDisplayMode: 'primary',
    })
  } catch {
    return serverError('فشل في جلب سعر الصرف')
  }
})

// ─── POST: Accept exchange rate settings (stateless echo) ────────
// The frontend persists settings via Zustand/localStorage.
// This endpoint validates and echoes back the posted data.
export const POST = withAuth(async (request: NextRequest) => {
  try {
    const body = await request.json()
    const { exchangeRate, secondaryCurrency, currencyDisplayMode, secondaryCurrencyEnabled, secondaryCurrencySymbol } = body

    if (exchangeRate !== undefined && (typeof exchangeRate !== 'number' || exchangeRate <= 0)) {
      return errorResponse('يجب أن يكون سعر الصرف رقماً أكبر من صفر')
    }

    return successResponse({
      primaryCurrency: 'YER',
      secondaryCurrencyEnabled: secondaryCurrencyEnabled ?? false,
      secondaryCurrency: secondaryCurrency ?? 'USD',
      exchangeRate: exchangeRate ?? 1,
      currencyDisplayMode: currencyDisplayMode ?? 'primary',
      secondaryCurrencySymbol: secondaryCurrencySymbol ?? '$',
    })
  } catch {
    return serverError('فشل في حفظ سعر الصرف')
  }
})
