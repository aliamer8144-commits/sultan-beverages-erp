'use client'

import { useEffect } from 'react'
import { useTranslationStore } from '@/lib/translations'

/**
 * DirectionManager - Client component that applies RTL/LTR direction
 * to the <html> element based on the stored language preference.
 * Should be placed inside the body as a child of RootLayout.
 */
export function DirectionManager() {
  const { lang } = useTranslationStore()

  useEffect(() => {
    const html = document.documentElement
    html.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr')
    html.setAttribute('lang', lang)
  }, [lang])

  return null
}
