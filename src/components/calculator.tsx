'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Minus, Plus, X, Delete, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'

// ─── Types ───────────────────────────────────────────────────────────────────

interface CalculatorProps {
  isOpen: boolean
  onClose: () => void
  onUseResult?: (result: number) => void
}

// ─── Helper (pure function, no hook dependencies) ────────────────────────────

function calc(a: number, b: number, op: string): number {
  switch (op) {
    case '+': return a + b
    case '-': return a - b
    case '×': return a * b
    case '÷': return b !== 0 ? a / b : 0
    default: return b
  }
}

function formatDisplay(val: string): string {
  const num = parseFloat(val)
  if (isNaN(num)) return val
  if (val.endsWith('.') || val.endsWith('.0')) return val
  if (Math.abs(num) > 999999999) return num.toExponential(4)
  if (val.includes('.')) {
    const parts = val.split('.')
    return Number(parts[0]).toLocaleString('en-US') + '.' + parts[1]
  }
  return num.toLocaleString('en-US')
}

// ─── Component ───────────────────────────────────────────────────────────────

export function Calculator({ isOpen, onClose, onUseResult }: CalculatorProps) {
  const [display, setDisplay] = useState('0')
  const [previousValue, setPreviousValue] = useState<number | null>(null)
  const [operation, setOperation] = useState<string | null>(null)
  const [resetNext, setResetNext] = useState(false)
  const [memory, setMemory] = useState(0)
  const [minimized, setMinimized] = useState(false)
  const calcRef = useRef<HTMLDivElement>(null)

  // ── Core calculator operations ──
  const handleNumber = useCallback((num: string) => {
    setDisplay((prev) => {
      if (resetNext || prev === '0') {
        setResetNext(false)
        return num
      }
      if (prev.length >= 15) return prev
      return prev + num
    })
  }, [resetNext])

  const handleDecimal = useCallback(() => {
    setDisplay((prev) => {
      if (resetNext) {
        setResetNext(false)
        return '0.'
      }
      if (prev.includes('.')) return prev
      return prev + '.'
    })
  }, [resetNext])

  const handleOperator = useCallback((op: string) => {
    const current = parseFloat(display)
    if (previousValue !== null && operation && !resetNext) {
      const result = calc(previousValue, current, operation)
      setDisplay(String(result))
      setPreviousValue(result)
    } else {
      setPreviousValue(current)
    }
    setOperation(op)
    setResetNext(true)
  }, [display, previousValue, operation, resetNext])

  const handleEquals = useCallback(() => {
    if (previousValue === null || !operation) return
    const current = parseFloat(display)
    const result = calc(previousValue, current, operation)
    setDisplay(String(result))
    setPreviousValue(null)
    setOperation(null)
    setResetNext(true)
  }, [display, previousValue, operation])

  const handleClear = useCallback(() => {
    setDisplay('0')
    setPreviousValue(null)
    setOperation(null)
    setResetNext(false)
  }, [])

  const handleBackspace = useCallback(() => {
    setDisplay((prev) => {
      if (prev.length <= 1 || (prev.length === 2 && prev.startsWith('-'))) return '0'
      return prev.slice(0, -1)
    })
  }, [])

  const handlePercent = useCallback(() => {
    const current = parseFloat(display)
    if (previousValue !== null) {
      const result = previousValue * (current / 100)
      setDisplay(String(result))
      setResetNext(true)
    } else {
      setDisplay(String(current / 100))
    }
  }, [display, previousValue])

  // ── Keyboard support ──
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!calcRef.current?.contains(document.activeElement)) return

      if (e.key >= '0' && e.key <= '9') handleNumber(e.key)
      else if (e.key === '.') handleDecimal()
      else if (e.key === '+') handleOperator('+')
      else if (e.key === '-') handleOperator('-')
      else if (e.key === '*') handleOperator('×')
      else if (e.key === '/') { e.preventDefault(); handleOperator('÷') }
      else if (e.key === '%') handlePercent()
      else if (e.key === 'Enter' || e.key === '=') handleEquals()
      else if (e.key === 'Backspace') handleBackspace()
      else if (e.key === 'Escape' || e.key === 'c' || e.key === 'C') handleClear()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, handleNumber, handleDecimal, handleOperator, handlePercent, handleEquals, handleBackspace, handleClear])

  // ── Memory functions ──
  const handleMC = useCallback(() => setMemory(0), [])
  const handleMR = useCallback(() => {
    setDisplay(String(memory))
    setResetNext(true)
  }, [memory])
  const handleMPlus = useCallback(() => {
    setMemory((prev) => prev + parseFloat(display))
  }, [display])
  const handleMMinus = useCallback(() => {
    setMemory((prev) => prev - parseFloat(display))
  }, [display])

  // ── Use result ──
  const handleUseResult = useCallback(() => {
    const result = parseFloat(display)
    if (isNaN(result)) return
    if (onUseResult) {
      onUseResult(result)
      toast.success(`تم استخدام النتيجة: ${result.toFixed(2)}`)
    } else {
      navigator.clipboard.writeText(result.toFixed(2)).then(() => {
        toast.success(`تم نسخ ${result.toFixed(2)} إلى الحافظة`)
      }).catch(() => {
        toast.success(`النتيجة: ${result.toFixed(2)}`)
      })
    }
  }, [display, onUseResult])

  if (!isOpen) return null

  // ─── Render ─────────────────────────────────────────────────────────────
  return (
    <div
      ref={calcRef}
      className={`fixed z-[60] bottom-4 left-4 transition-all duration-300 ease-in-out ${
        minimized ? 'w-56' : 'w-72'
      }`}
      dir="ltr"
    >
      <div className="glass-card rounded-2xl shadow-2xl border border-border/60 overflow-hidden">
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-border/40 bg-primary/5">
          <div className="flex items-center gap-1.5">
            {memory !== 0 && (
              <span className="text-[9px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-md">M</span>
            )}
            {operation && previousValue !== null && (
              <span className="text-[10px] text-muted-foreground">
                {previousValue} {operation}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setMinimized(!minimized)}
              className="p-1 rounded-lg hover:bg-muted transition-colors"
              title={minimized ? 'توسيع' : 'تصغير'}
            >
              <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 ${minimized ? '' : 'rotate-180'}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* ── Display ── */}
        <div className="px-4 pt-3 pb-2 bg-gradient-to-b from-muted/30 to-transparent">
          <div className="text-left overflow-hidden">
            <div className="text-2xl font-bold text-foreground tabular-nums truncate">
              {formatDisplay(display)}
            </div>
          </div>
        </div>

        {/* ── Memory Buttons ── */}
        {!minimized && (
          <>
            <div className="px-3 pb-1">
              <div className="grid grid-cols-4 gap-1">
                {[
                  { label: 'MC', action: handleMC },
                  { label: 'MR', action: handleMR },
                  { label: 'M+', action: handleMPlus },
                  { label: 'M-', action: handleMMinus },
                ].map((btn) => (
                  <button
                    key={btn.label}
                    onClick={btn.action}
                    className="h-7 rounded-lg text-[10px] font-bold text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors active:scale-95"
                  >
                    {btn.label}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Operator Buttons Row ── */}
            <div className="px-3 pb-1">
              <div className="grid grid-cols-4 gap-1">
                {[
                  { label: 'C', action: handleClear, className: 'text-destructive hover:bg-destructive/10' },
                  { label: '%', action: handlePercent },
                  { label: '⌫', action: handleBackspace, icon: true },
                  { label: '÷', action: () => handleOperator('÷'), className: 'text-amber-600 hover:bg-amber-500/10' },
                ].map((btn) => (
                  <button
                    key={btn.label}
                    onClick={btn.action}
                    className={`h-9 rounded-lg text-sm font-bold transition-colors active:scale-95 ${
                      btn.className || 'text-foreground hover:bg-muted/60'
                    } ${operation === btn.label && !resetNext ? 'bg-primary text-white hover:bg-primary/90' : ''}`}
                  >
                    {btn.icon ? <Delete className="w-4 h-4 mx-auto" /> : btn.label}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Number Pad ── */}
            <div className="px-3 pb-1">
              <div className="grid grid-cols-4 gap-1">
                {/* Row 1: 7, 8, 9, × */}
                {[
                  { label: '7', action: () => handleNumber('7') },
                  { label: '8', action: () => handleNumber('8') },
                  { label: '9', action: () => handleNumber('9') },
                  { label: '×', action: () => handleOperator('×'), className: 'text-amber-600 hover:bg-amber-500/10' },
                ].map((btn) => (
                  <button
                    key={btn.label}
                    onClick={btn.action}
                    className={`h-10 rounded-lg text-sm font-bold transition-colors active:scale-95 ${
                      btn.className || 'bg-white hover:bg-muted/50 text-foreground'
                    }`}
                  >
                    {btn.label}
                  </button>
                ))}
                {/* Row 2: 4, 5, 6, - */}
                {[
                  { label: '4', action: () => handleNumber('4') },
                  { label: '5', action: () => handleNumber('5') },
                  { label: '6', action: () => handleNumber('6') },
                  { label: '−', action: () => handleOperator('-'), className: 'text-amber-600 hover:bg-amber-500/10' },
                ].map((btn) => (
                  <button
                    key={btn.label}
                    onClick={btn.action}
                    className={`h-10 rounded-lg text-sm font-bold transition-colors active:scale-95 ${
                      btn.className || 'bg-white hover:bg-muted/50 text-foreground'
                    }`}
                  >
                    {btn.label}
                  </button>
                ))}
                {/* Row 3: 1, 2, 3, + */}
                {[
                  { label: '1', action: () => handleNumber('1') },
                  { label: '2', action: () => handleNumber('2') },
                  { label: '3', action: () => handleNumber('3') },
                  { label: '+', action: () => handleOperator('+'), className: 'text-amber-600 hover:bg-amber-500/10' },
                ].map((btn) => (
                  <button
                    key={btn.label}
                    onClick={btn.action}
                    className={`h-10 rounded-lg text-sm font-bold transition-colors active:scale-95 ${
                      btn.className || 'bg-white hover:bg-muted/50 text-foreground'
                    }`}
                  >
                    {btn.label}
                  </button>
                ))}
                {/* Row 4: 0, ., = (0 spans 2 cols) */}
                <button
                  onClick={() => handleNumber('0')}
                  className="col-span-2 h-10 rounded-lg text-sm font-bold bg-white hover:bg-muted/50 text-foreground transition-colors active:scale-95"
                >
                  0
                </button>
                <button
                  onClick={handleDecimal}
                  className="h-10 rounded-lg text-sm font-bold bg-white hover:bg-muted/50 text-foreground transition-colors active:scale-95"
                >
                  .
                </button>
                <button
                  onClick={handleEquals}
                  className="h-10 rounded-lg text-sm font-bold bg-primary text-white hover:bg-primary/90 shadow-sm shadow-primary/25 transition-colors active:scale-95"
                >
                  =
                </button>
              </div>
            </div>

            {/* ── Use Result Button ── */}
            <div className="px-3 pb-3">
              <Button
                onClick={handleUseResult}
                className="w-full h-9 rounded-xl text-xs font-bold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                استخدام النتيجة
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
