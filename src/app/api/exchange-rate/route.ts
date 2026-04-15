import { withAuth } from '@/lib/auth-middleware'
import { successResponse } from '@/lib/api-response'
import { tryCatch, withValidation } from '@/lib/api-error-handler'
import { z } from 'zod'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'

const EXCHANGE_RATE_FILE = join('/tmp', 'sultan-erp-exchange-rate.json')

const DEFAULT_SETTINGS = {
  enabled: false,
  primaryCurrency: 'YER',
  secondaryCurrencyEnabled: false,
  secondaryCurrency: 'USD',
  exchangeRate: 1,
  currencyDisplayMode: 'primary',
  secondaryCurrencySymbol: '$',
}

const exchangeRateSchema = z.object({
  exchangeRate: z.number().positive().optional(),
  secondaryCurrency: z.string().max(10).optional(),
  currencyDisplayMode: z.string().max(20).optional(),
  secondaryCurrencyEnabled: z.boolean().optional(),
  secondaryCurrencySymbol: z.string().max(10).optional(),
})

function loadSettings(): Record<string, unknown> {
  try {
    if (existsSync(EXCHANGE_RATE_FILE)) {
      const data = readFileSync(EXCHANGE_RATE_FILE, 'utf-8')
      return { ...DEFAULT_SETTINGS, ...JSON.parse(data) }
    }
  } catch {
    // Fall through to defaults
  }
  return { ...DEFAULT_SETTINGS }
}

function saveSettings(settings: Record<string, unknown>): void {
  try {
    writeFileSync(EXCHANGE_RATE_FILE, JSON.stringify(settings, null, 2), 'utf-8')
  } catch {
    // Silently fail — persistence is best-effort
  }
}

// ─── GET: Return persisted exchange rate settings ────────────────
export const GET = withAuth(tryCatch(async () => {
  const settings = loadSettings()
  return successResponse(settings)
}, 'فشل في جلب سعر الصرف'))

// ─── POST: Save exchange rate settings to file ──────────────────
export const POST = withAuth(withValidation(
  exchangeRateSchema,
  async (_request, body) => {
    const current = loadSettings()
    const updated = {
      ...current,
      ...(body.exchangeRate !== undefined ? { exchangeRate: body.exchangeRate } : {}),
      ...(body.secondaryCurrencyEnabled !== undefined ? { secondaryCurrencyEnabled: body.secondaryCurrencyEnabled } : {}),
      ...(body.secondaryCurrency !== undefined ? { secondaryCurrency: body.secondaryCurrency } : {}),
      ...(body.currencyDisplayMode !== undefined ? { currencyDisplayMode: body.currencyDisplayMode } : {}),
      ...(body.secondaryCurrencySymbol !== undefined ? { secondaryCurrencySymbol: body.secondaryCurrencySymbol } : {}),
    }
    saveSettings(updated)
    return successResponse(updated)
  },
  'فشل في حفظ سعر الصرف'
))
