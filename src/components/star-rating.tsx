'use client'

import { useState } from 'react'
import { Star } from 'lucide-react'

/**
 * StarRating — Reusable star rating widget
 *
 * Supports both interactive (clickable) and read-only modes.
 * Used in supplier ratings, product reviews, etc.
 */

interface StarRatingProps {
  /** Current rating value (0–5) */
  rating: number
  /** Callback when user clicks a star (interactive mode only) */
  onRate?: (val: number) => void
  /** Size variant */
  size?: 'sm' | 'md' | 'lg'
  /** Whether stars are clickable */
  interactive?: boolean
  /** Additional CSS class */
  className?: string
}

const sizeClasses = {
  sm: 'w-3.5 h-3.5',
  md: 'w-5 h-5',
  lg: 'w-7 h-7',
} as const

export function StarRating({
  rating,
  onRate,
  size = 'sm',
  interactive = false,
  className = '',
}: StarRatingProps) {
  const sizeClass = sizeClasses[size]
  const [hovered, setHovered] = useState(0)

  return (
    <div className={`flex items-center gap-0.5 ${className}`}>
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= (hovered || rating)
        return (
          <button
            key={star}
            type="button"
            className={`${interactive ? 'cursor-pointer hover:scale-110' : 'cursor-default'} transition-transform`}
            onMouseEnter={() => interactive && setHovered(star)}
            onMouseLeave={() => interactive && setHovered(0)}
            onClick={() => interactive && onRate?.(star)}
            disabled={!interactive}
            aria-label={`${star} نجمة`}
          >
            <Star
              className={`${sizeClass} ${
                filled
                  ? 'fill-amber-400 text-amber-400'
                  : 'fill-transparent text-muted-foreground/30'
              }`}
            />
          </button>
        )
      })}
    </div>
  )
}
