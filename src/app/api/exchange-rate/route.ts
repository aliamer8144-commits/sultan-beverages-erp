import { NextResponse } from 'next/server'
import { useAppStore } from '@/store/app-store'

// ─── GET: Return current exchange rate settings ──────────────────
export async function GET() {
  try {
    const settings = useAppStore.getState().settings
    return NextResponse.json({
      success: true,
      data: {
        primaryCurrency: settings.currency,
        secondaryCurrencyEnabled: settings.secondaryCurrencyEnabled,
        secondaryCurrency: settings.secondaryCurrency,
        exchangeRate: settings.exchangeRate,
        currencyDisplayMode: settings.currencyDisplayMode,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch exchange rate'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

// ─── POST: Save exchange rate to settings ────────────────────────
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { exchangeRate, secondaryCurrency, currencyDisplayMode } = body

    if (exchangeRate !== undefined && (typeof exchangeRate !== 'number' || exchangeRate <= 0)) {
      return NextResponse.json(
        { success: false, error: 'يجب أن يكون سعر الصرف رقماً أكبر من صفر' },
        { status: 400 }
      )
    }

    const updates: Record<string, unknown> = {}
    if (exchangeRate !== undefined) updates.exchangeRate = exchangeRate
    if (secondaryCurrency) updates.secondaryCurrency = secondaryCurrency
    if (currencyDisplayMode) updates.currencyDisplayMode = currencyDisplayMode
    if (body.secondaryCurrencyEnabled !== undefined) updates.secondaryCurrencyEnabled = body.secondaryCurrencyEnabled
    if (body.secondaryCurrencySymbol !== undefined) updates.secondaryCurrencySymbol = body.secondaryCurrencySymbol

    const store = useAppStore.getState()
    store.updateSettings(updates)

    const updatedSettings = useAppStore.getState().settings
    return NextResponse.json({
      success: true,
      data: {
        primaryCurrency: updatedSettings.currency,
        secondaryCurrencyEnabled: updatedSettings.secondaryCurrencyEnabled,
        secondaryCurrency: updatedSettings.secondaryCurrency,
        exchangeRate: updatedSettings.exchangeRate,
        currencyDisplayMode: updatedSettings.currencyDisplayMode,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to save exchange rate'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
