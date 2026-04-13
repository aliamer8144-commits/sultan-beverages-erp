'use client'

import { useCallback, useRef, useEffect, useState } from 'react'
import { GripVertical } from 'lucide-react'

/**
 * ResizeHandle — Draggable divider for controlling panel widths.
 *
 * In RTL layout:
 * - "left" panel = cart (on the left side visually)
 * - Dragging right → increases cart width
 * - Dragging left → decreases cart width
 */

interface ResizeHandleProps {
  /** Ref to the parent container */
  containerRef: React.RefObject<HTMLDivElement | null>
  /** Which side the resizable panel is on ("left" = cart in RTL) */
  panelSide: 'left' | 'right'
  /** Current width of the panel */
  panelWidth: number
  /** Callback when width changes */
  onResize: (width: number) => void
  /** Minimum allowed width */
  minWidth?: number
  /** Maximum allowed width */
  maxWidth?: number
}

export function ResizeHandle({
  containerRef,
  panelSide,
  panelWidth,
  onResize,
  minWidth = 250,
  maxWidth = 600,
}: ResizeHandleProps) {
  const [isDragging, setIsDragging] = useState(false)
  const startXRef = useRef(0)
  const startWidthRef = useRef(0)

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      setIsDragging(true)
      startXRef.current = e.clientX
      startWidthRef.current = panelWidth

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const container = containerRef.current
        if (!container) return

        const containerRect = container.getBoundingClientRect()
        const deltaX = startXRef.current - moveEvent.clientX // RTL: drag left = increase

        let newWidth: number

        if (panelSide === 'left') {
          // In RTL, left panel is on the left side
          // deltaX positive (dragged left) = wider panel
          newWidth = startWidthRef.current + deltaX
        } else {
          newWidth = startWidthRef.current - deltaX
        }

        // Clamp within bounds
        newWidth = Math.max(minWidth, Math.min(maxWidth, newWidth))

        onResize(newWidth)
      }

      const handleMouseUp = () => {
        setIsDragging(false)
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }

      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    },
    [containerRef, panelSide, panelWidth, minWidth, maxWidth, onResize],
  )

  // Touch support for tablets
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0]
      setIsDragging(true)
      startXRef.current = touch.clientX
      startWidthRef.current = panelWidth

      const handleTouchMove = (moveEvent: TouchEvent) => {
        const container = containerRef.current
        if (!container) return

        const touch = moveEvent.touches[0]
        const deltaX = startXRef.current - touch.clientX

        let newWidth: number
        if (panelSide === 'left') {
          newWidth = startWidthRef.current + deltaX
        } else {
          newWidth = startWidthRef.current - deltaX
        }

        newWidth = Math.max(minWidth, Math.min(maxWidth, newWidth))
        onResize(newWidth)
      }

      const handleTouchEnd = () => {
        setIsDragging(false)
        document.removeEventListener('touchmove', handleTouchMove)
        document.removeEventListener('touchend', handleTouchEnd)
      }

      document.addEventListener('touchmove', handleTouchMove, { passive: true })
      document.addEventListener('touchend', handleTouchEnd)
    },
    [containerRef, panelSide, panelWidth, minWidth, maxWidth, onResize],
  )

  // Prevent iframes from stealing mouse events during drag
  useEffect(() => {
    if (!isDragging) return

    const iframes = document.querySelectorAll('iframe')
    const originalPointerEvents: string[] = []

    iframes.forEach((iframe) => {
      originalPointerEvents.push(iframe.style.pointerEvents)
      iframe.style.pointerEvents = 'none'
    })

    return () => {
      iframes.forEach((iframe, i) => {
        iframe.style.pointerEvents = originalPointerEvents[i] || ''
      })
    }
  }, [isDragging])

  return (
    <div
      className={`
        relative w-2 h-full flex-shrink-0 cursor-col-resize
        group flex items-center justify-center
        transition-colors duration-150
        ${isDragging
          ? 'bg-primary/20'
          : 'bg-border/30 hover:bg-primary/10'
        }
      `}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      role="separator"
      aria-orientation="vertical"
      aria-valuenow={Math.round(panelWidth)}
      aria-valuemin={minWidth}
      aria-valuemax={maxWidth}
      aria-label="تعديل عرض اللوحة"
      tabIndex={0}
    >
      {/* Drag handle icon — visible on hover */}
      <div
        className={`
          absolute inset-y-0 flex items-center justify-center
          transition-opacity duration-150
          ${isDragging ? 'opacity-100' : 'opacity-0 group-hover:opacity-60'}
        `}
      >
        <div
          className={`
            flex flex-col items-center gap-0.5 py-3 px-0.5 rounded-full
            transition-colors duration-150
            ${isDragging
              ? 'bg-primary/20'
              : 'bg-border/50 group-hover:bg-primary/10'
            }
          `}
        >
          <GripVertical className="w-3.5 h-3.5 text-muted-foreground/60" />
        </div>
      </div>

      {/* Thin visible line */}
      <div
        className={`
          w-[2px] h-full transition-colors duration-150
          ${isDragging
            ? 'bg-primary/40'
            : 'bg-border/40 group-hover:bg-primary/20'
          }
        `}
      />
    </div>
  )
}
