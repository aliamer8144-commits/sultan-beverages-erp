// ─── Shared Progress Bar Utilities ───────────────────────────────────
// Centralized progress color/message utilities for all screens

/** Background color class for progress bar fill */
export function getProgressColor(percent: number): string {
  if (percent >= 80) return 'bg-emerald-500'
  if (percent >= 50) return 'bg-amber-500'
  return 'bg-red-500'
}

/** SVG stroke color for circular progress ring */
export function getProgressRingColor(percent: number): string {
  if (percent >= 80) return 'stroke-emerald-500'
  if (percent >= 50) return 'stroke-amber-500'
  return 'stroke-red-500'
}

/** Text + background color class for progress label */
export function getProgressBgColor(percent: number): string {
  if (percent >= 80) return 'bg-emerald-500/10 text-emerald-700'
  if (percent >= 50) return 'bg-amber-500/10 text-amber-700'
  return 'bg-red-500/10 text-red-700'
}

/** Text color for progress percentage */
export function getProgressTextColor(percent: number): string {
  if (percent >= 80) return 'text-emerald-600'
  if (percent >= 50) return 'text-amber-600'
  return 'text-red-600'
}

/** Motivational Arabic message based on target progress */
export function getMotivationalMessage(percent: number): string {
  if (percent >= 100) return '🎉 أحسنت! لقد حققت الهدف! استمر في العطاء'
  if (percent >= 80) return '🔥 قريب جداً! استمر بنفس الحماس'
  if (percent >= 60) return '💪 أداء رائع! أنت على الطريق الصحيح'
  if (percent >= 40) return '📈 تقدم جيد! كل فاتورة تقربك من الهدف'
  if (percent >= 20) return '🚀 البداية كانت ممتازة! واصل البيع'
  return '🎯 بداية جديدة! كل مبيعاتك تُحسب'
}

/** Type label mapping for sales targets */
export function getTargetTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    daily: 'اليومي',
    weekly: 'الأسبوعي',
    monthly: 'الشهري',
  }
  return labels[type] || type
}
