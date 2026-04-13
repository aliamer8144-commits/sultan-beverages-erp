'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import {
  ChevronDown,
  RefreshCw,
  DollarSign,
  Save,
  Clock,
  TrendingUp,
  Globe,
  ArrowLeftRight,
  Loader2,
  CheckCircle2,
} from 'lucide-react'
import { useAppStore } from '@/store/app-store'
import { fetchWithAuth } from '@/lib/fetch-with-auth'
import { CURRENCY_MAP, type CurrencyCode } from '@/types'

// ─── Types ────────────────────────────────────────────────────────
interface ExchangeRateData {
  primaryCurrency: CurrencyCode
  secondaryCurrencyEnabled: boolean
  secondaryCurrency: CurrencyCode
  exchangeRate: number
  currencyDisplayMode: string
}

// ─── Currency list for the widget ─────────────────────────────────
const DISPLAY_CURRENCIES: CurrencyCode[] = ['YER', 'SAR', 'USD', 'EUR', 'AED']

// Approximate cross rates (base: YER)
// These are reference rates — in production you'd use a real API
const CROSS_RATES: Record<string, number> = {
  YER: 1,
  SAR: 1.4925,      // 1 SAR ≈ 53.45 YER → inverted for display
  USD: 560,          // 1 USD ≈ 560 YER
  EUR: 610,          // 1 EUR ≈ 610 YER
  AED: 152.5,        // 1 AED ≈ 152.5 YER
}

// ─── Component ────────────────────────────────────────────────────
export function ExchangeRateWidget() {
  const [isOpen, setIsOpen] = useState(true)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Exchange rate state
  const [rateData, setRateData] = useState<ExchangeRateData>({
    primaryCurrency: 'YER',
    secondaryCurrencyEnabled: false,
    secondaryCurrency: 'SAR',
    exchangeRate: 1,
    currencyDisplayMode: 'primary-only',
  })

  // Manual override form
  const [manualRate, setManualRate] = useState('')
  const [selectedSecondary, setSelectedSecondary] = useState<CurrencyCode>('SAR')
  const [displayMode, setDisplayMode] = useState<string>('primary-only')
  const [secondaryEnabled, setSecondaryEnabled] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<string>('')

  // ─── Fetch exchange rate settings ──────────────────────────────
  const fetchRates = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetchWithAuth('/api/exchange-rate')
      const data = await res.json()
      if (data.success) {
        const d = data.data as ExchangeRateData
        setRateData(d)
        setManualRate(String(d.exchangeRate))
        setSelectedSecondary(d.secondaryCurrency)
        setDisplayMode(d.currencyDisplayMode)
        setSecondaryEnabled(d.secondaryCurrencyEnabled)
        setLastUpdated(new Date().toLocaleTimeString('ar-SA'))
      }
    } catch {
      // Use defaults from store
      const settings = useAppStore.getState().settings
      setRateData({
        primaryCurrency: settings.currency,
        secondaryCurrencyEnabled: settings.secondaryCurrencyEnabled,
        secondaryCurrency: settings.secondaryCurrency,
        exchangeRate: settings.exchangeRate,
        currencyDisplayMode: settings.currencyDisplayMode,
      })
      setManualRate(String(settings.exchangeRate))
      setSelectedSecondary(settings.secondaryCurrency)
      setDisplayMode(settings.currencyDisplayMode)
      setSecondaryEnabled(settings.secondaryCurrencyEnabled)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRates()
  }, [fetchRates])

  // ─── Save exchange rate ────────────────────────────────────────
  const handleSave = async () => {
    const rate = Number(manualRate)
    if (!rate || rate <= 0) {
      toast.error('يرجى إدخال سعر صرف صحيح')
      return
    }

    setSaving(true)
    try {
      const res = await fetchWithAuth('/api/exchange-rate', {
        method: 'POST',
        body: JSON.stringify({
          exchangeRate: rate,
          secondaryCurrency: selectedSecondary,
          currencyDisplayMode: displayMode,
          secondaryCurrencyEnabled: secondaryEnabled,
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('تم حفظ سعر الصرف بنجاح')
        setLastUpdated(new Date().toLocaleTimeString('ar-SA'))
        setRateData((prev) => ({
          ...prev,
          exchangeRate: rate,
          secondaryCurrency: selectedSecondary,
          currencyDisplayMode: displayMode,
          secondaryCurrencyEnabled: secondaryEnabled,
        }))
      } else {
        toast.error(data.error || 'فشل في حفظ سعر الصرف')
      }
    } catch {
      toast.error('حدث خطأ في الاتصال')
    } finally {
      setSaving(false)
    }
  }

  // ─── Calculate cross rate between two currencies ───────────────
  const getCrossRate = (from: CurrencyCode, to: CurrencyCode): number => {
    if (from === to) return 1
    const fromRate = CROSS_RATES[from] || 1
    const toRate = CROSS_RATES[to] || 1
    return toRate / fromRate
  }

  const formatRate = (rate: number): string => {
    if (rate >= 100) return rate.toFixed(2)
    if (rate >= 1) return rate.toFixed(4)
    return rate.toFixed(6)
  }

  const primaryInfo = CURRENCY_MAP[rateData.primaryCurrency]
  const secondaryInfo = CURRENCY_MAP[selectedSecondary]

  return (
    <Card className="rounded-2xl border-0 shadow-sm card-hover">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-3">
          <CollapsibleTrigger className="w-full">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                  <Globe className="w-5 h-5 text-emerald-500" />
                </div>
                <div className="text-right">
                  <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                    أسعار الصرف
                    {secondaryEnabled && (
                      <Badge variant="secondary" className="text-[10px] bg-emerald-500/10 text-emerald-600 rounded-md">
                        مفعّل
                      </Badge>
                    )}
                  </CardTitle>
                  {lastUpdated && (
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3" />
                      آخر تحديث: {lastUpdated}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
              </div>
            </div>
          </CollapsibleTrigger>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : (
              <>
                {/* Reference Rates Grid */}
                <div>
                  <div className="flex items-center gap-1.5 mb-3">
                    <TrendingUp className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-xs font-semibold text-muted-foreground">أسعار مرجعية (بالريال اليمني)</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {DISPLAY_CURRENCIES.map((code) => {
                      const info = CURRENCY_MAP[code]
                      const rate = CROSS_RATES[code] || 1
                      const isPrimary = code === rateData.primaryCurrency
                      return (
                        <div
                          key={code}
                          className={`p-3 rounded-xl border text-center transition-all ${
                            isPrimary
                              ? 'border-primary/30 bg-primary/5 ring-1 ring-primary/20'
                              : 'border-border/50 hover:bg-muted/30'
                          }`}
                        >
                          <div className="flex items-center justify-center gap-1 mb-1">
                            <span className="text-sm font-bold text-foreground">{info.symbol}</span>
                            <span className="text-[10px] text-muted-foreground">{code}</span>
                          </div>
                          <p className="text-xs font-bold text-foreground tabular-nums">
                            {formatRate(rate)}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{info.name}</p>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="section-divider-dashed" />

                {/* Manual Rate Override */}
                <div>
                  <div className="flex items-center gap-1.5 mb-3">
                    <ArrowLeftRight className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-xs font-semibold text-muted-foreground">تعيين سعر الصرف اليدوي</span>
                  </div>

                  {/* Enable dual currency toggle */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      <Label htmlFor="dual-currency-toggle" className="text-sm font-medium cursor-pointer">
                        عرض سعر ثانوي في الفواتير
                      </Label>
                    </div>
                    <Switch
                      id="dual-currency-toggle"
                      checked={secondaryEnabled}
                      onCheckedChange={setSecondaryEnabled}
                    />
                  </div>

                  {secondaryEnabled && (
                    <div className="space-y-3">
                      {/* Currency Selection */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-muted-foreground">العملة الأساسية</Label>
                          <div className="p-2.5 rounded-lg bg-muted/30 border text-center">
                            <span className="text-sm font-bold">{primaryInfo.symbol}</span>
                            <span className="text-xs text-muted-foreground mr-1.5">{primaryInfo.name}</span>
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-muted-foreground">العملة الثانوية</Label>
                          <Select value={selectedSecondary} onValueChange={(val) => setSelectedSecondary(val as CurrencyCode)}>
                            <SelectTrigger className="h-10 rounded-lg">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {DISPLAY_CURRENCIES.filter((c) => c !== rateData.primaryCurrency).map((code) => (
                                <SelectItem key={code} value={code}>
                                  <span className="flex items-center gap-2">
                                    <span className="font-bold">{CURRENCY_MAP[code].symbol}</span>
                                    <span>{CURRENCY_MAP[code].name}</span>
                                    <span className="text-muted-foreground">({code})</span>
                                  </span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Exchange Rate Input */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-muted-foreground">
                          سعر الصرف (1 {primaryInfo.symbol} = ? {secondaryInfo.symbol})
                        </Label>
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            placeholder="أدخل سعر الصرف"
                            value={manualRate}
                            onChange={(e) => setManualRate(e.target.value)}
                            className="flex-1 h-10 rounded-lg tabular-nums text-center text-lg font-bold"
                            dir="ltr"
                            min="0"
                            step="0.01"
                          />
                          <Button
                            onClick={handleSave}
                            disabled={saving}
                            className="gap-2 rounded-lg min-w-[100px]"
                          >
                            {saving ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <CheckCircle2 className="w-4 h-4" />
                            )}
                            حفظ
                          </Button>
                        </div>
                      </div>

                      {/* Current rate display */}
                      {rateData.exchangeRate > 0 && (
                        <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-center">
                          <p className="text-xs text-muted-foreground">السعر الحالي</p>
                          <p className="text-lg font-bold text-emerald-600 tabular-nums mt-0.5">
                            1 {primaryInfo.symbol} = {rateData.exchangeRate.toLocaleString('ar-SA', { maximumFractionDigits: 4 })} {secondaryInfo.symbol}
                          </p>
                        </div>
                      )}

                      {/* Display Mode */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-muted-foreground">وضع العرض</Label>
                        <Select value={displayMode} onValueChange={setDisplayMode}>
                          <SelectTrigger className="h-10 rounded-lg">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="primary-only">العملة الأساسية فقط</SelectItem>
                            <SelectItem value="secondary-parentheses">العملة الثانوية بين أقواس</SelectItem>
                            <SelectItem value="secondary-main">العملة الثانوية كرئيسية</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Save settings button */}
                      <div className="flex justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleSave}
                          disabled={saving}
                          className="gap-1.5 rounded-lg"
                        >
                          {saving ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Save className="w-3.5 h-3.5" />
                          )}
                          حفظ الإعدادات
                        </Button>
                      </div>
                    </div>
                  )}

                  {!secondaryEnabled && (
                    <div className="text-center py-3 text-muted-foreground">
                      <p className="text-xs">فعّل عرض العملة الثانوية لإعداد سعر الصرف</p>
                    </div>
                  )}
                </div>

                {/* Quick refresh */}
                <div className="flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={fetchRates}
                    className="gap-1.5 text-xs text-muted-foreground"
                  >
                    <RefreshCw className="w-3 h-3" />
                    تحديث البيانات
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}
