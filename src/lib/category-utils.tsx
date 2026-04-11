// ─── Shared Category Utilities ────────────────────────────────────────
// Category icon mapping and color palette used across POS, Inventory,
// Customers, and other screens.

import {
  CupSoda,
  Beer,
  Wine,
  Coffee,
  Droplets,
  IceCreamCone,
  GlassWater,
  Citrus,
  Flame,
  Leaf,
  Sparkles,
  type LucideIcon,
  type LucideProps,
} from 'lucide-react'

// ── Icon mapping ──────────────────────────────────────────────────────

const iconMap: Record<string, LucideIcon> = {
  CupSoda,
  Beer,
  Wine,
  Coffee,
  Droplets,
  IceCreamCone,
  GlassWater,
  Citrus,
  Flame,
  Leaf,
  Sparkles,
}

/** Returns the Lucide icon component for a given category icon name */
export function getCategoryIcon(iconName: string, props: LucideProps) {
  const Icon = iconMap[iconName] || CupSoda
  return <Icon {...props} />
}

// ── Category color palette ────────────────────────────────────────────

interface CategoryColor {
  bg: string
  text: string
  hover: string
}

const colorPalette: CategoryColor[] = [
  { bg: 'bg-emerald-500/10', text: 'text-emerald-600', hover: 'group-hover:bg-emerald-500/20' },
  { bg: 'bg-amber-500/10', text: 'text-amber-600', hover: 'group-hover:bg-amber-500/20' },
  { bg: 'bg-rose-500/10', text: 'text-rose-600', hover: 'group-hover:bg-rose-500/20' },
  { bg: 'bg-violet-500/10', text: 'text-violet-600', hover: 'group-hover:bg-violet-500/20' },
  { bg: 'bg-cyan-500/10', text: 'text-cyan-600', hover: 'group-hover:bg-cyan-500/20' },
  { bg: 'bg-orange-500/10', text: 'text-orange-600', hover: 'group-hover:bg-orange-500/20' },
  { bg: 'bg-teal-500/10', text: 'text-teal-600', hover: 'group-hover:bg-teal-500/20' },
  { bg: 'bg-pink-500/10', text: 'text-pink-600', hover: 'group-hover:bg-pink-500/20' },
  { bg: 'bg-lime-500/10', text: 'text-lime-600', hover: 'group-hover:bg-lime-500/20' },
  { bg: 'bg-sky-500/10', text: 'text-sky-600', hover: 'group-hover:bg-sky-500/20' },
]

/**
 * Returns a consistent color set for a category based on its ID hash.
 * Useful for product cards, category badges, and chart segments.
 */
export function getCategoryColor(categoryId: string): CategoryColor {
  let hash = 0
  for (let i = 0; i < categoryId.length; i++) {
    hash = categoryId.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colorPalette[Math.abs(hash) % colorPalette.length]
}
