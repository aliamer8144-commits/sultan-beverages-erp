// ─── Shared Date Formatting Utilities ─────────────────────────────────
// Centralized date formatting for all screens (Arabic locale)

const ARABIC_LOCALE = 'ar-SA'

/** Full date: "15 يناير 2025" */
export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(ARABIC_LOCALE, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/** Short date: "2025/01/15" */
export function formatShortDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(ARABIC_LOCALE, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

/** Time only: "02:30 م" */
export function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString(ARABIC_LOCALE, {
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Full date + time: "15 يناير 2025, 02:30 م" */
export function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(ARABIC_LOCALE, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Date with short month: "15 يناير 2025" (shorter than formatDate) */
export function formatDateShortMonth(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(ARABIC_LOCALE, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

/** Full day name + date: "الأربعاء 15 يناير 2025" */
export function formatDateFull(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(ARABIC_LOCALE, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/** Relative time: "الآن", "منذ 5 دقيقة", "منذ 3 ساعة", "منذ 2 يوم" */
export function getRelativeTime(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHour = Math.floor(diffMs / 3600000)
  const diffDay = Math.floor(diffMs / 86400000)

  if (diffMin < 1) return 'الآن'
  if (diffMin < 60) return `منذ ${diffMin} دقيقة`
  if (diffHour < 24) return `منذ ${diffHour} ساعة`
  if (diffDay < 7) return `منذ ${diffDay} يوم`
  return new Date(dateStr).toLocaleDateString(ARABIC_LOCALE, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}
