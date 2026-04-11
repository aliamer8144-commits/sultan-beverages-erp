'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { useAppStore } from '@/store/app-store'
import { useCurrency } from '@/hooks/use-currency'
import { Search, Package, Clock, X, Loader2, TrendingDown } from 'lucide-react'

// Types
interface SearchResult {
  id: string
  name: string
  price: number
  quantity: number
  category: { id: string; name: string; icon: string }
  image?: string
  barcode?: string
}

// localStorage key for recent searches
const RECENT_SEARCHES_KEY = 'sultan-erp-recent-searches'
const MAX_RECENT = 5

function getRecentSearches(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveRecentSearch(query: string) {
  if (typeof window === 'undefined') return
  if (!query.trim()) return
  try {
    const existing = getRecentSearches()
    const filtered = existing.filter((s) => s !== query)
    const updated = [query, ...filtered].slice(0, MAX_RECENT)
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated))
  } catch {
    // ignore
  }
}

function removeRecentSearch(query: string) {
  if (typeof window === 'undefined') return
  try {
    const existing = getRecentSearches()
    const updated = existing.filter((s) => s !== query)
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated))
  } catch {
    // ignore
  }
}

export function GlobalSearchDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { setScreen } = useAppStore()
  const { formatCurrency } = useCurrency()

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedIdx, setSelectedIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load recent searches on open
  useEffect(() => {
    if (open) {
      setRecentSearches(getRecentSearches())
      setQuery('')
      setResults([])
      setSelectedIdx(0)
      // Focus input after dialog opens
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  // Debounced search
  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([])
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('q', q.trim())
      params.set('limit', '10')
      const res = await fetch(`/api/products/search?${params.toString()}`)
      const data = await res.json()
      if (data.success) {
        setResults(data.data)
      } else {
        setResults([])
      }
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  const handleInputChange = (value: string) => {
    setQuery(value)
    setSelectedIdx(0)

    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      doSearch(value)
    }, 300)
  }

  const handleSelectProduct = (product: SearchResult) => {
    // Save to recent searches
    saveRecentSearch(product.name)
    setRecentSearches(getRecentSearches())

    // Navigate to inventory screen
    setScreen('inventory')
    onOpenChange(false)

    // Store selected product ID for highlighting
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('sultan-highlight-product', product.id)
    }
  }

  const handleRecentClick = (term: string) => {
    setQuery(term)
    setSelectedIdx(0)
    doSearch(term)
  }

  const handleClearRecent = (term: string) => {
    removeRecentSearch(term)
    setRecentSearches(getRecentSearches())
  }

  // Keyboard navigation within results
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const totalItems = results.length + filteredRecent.length
    if (totalItems === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIdx((prev) => Math.min(prev + 1, totalItems - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIdx((prev) => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (results.length > 0 && selectedIdx < results.length) {
        handleSelectProduct(results[selectedIdx])
      } else {
        // Selected a recent search
        const recentIdx = selectedIdx - results.length
        if (recentIdx >= 0 && recentIdx < filteredRecent.length) {
          handleRecentClick(filteredRecent[recentIdx])
        }
      }
    }
  }

  const filteredRecent = query
    ? recentSearches.filter((s) => s.includes(query))
    : recentSearches

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-xl p-0 gap-0 overflow-hidden glass-card animate-scale-fade"
        dir="rtl"
        aria-label="البحث في المنتجات"
      >
        {/* Search Input */}
        <div className="flex items-center gap-2 px-4 py-3 border-b bg-muted/30">
          <Search className="w-5 h-5 text-muted-foreground flex-shrink-0" />
          <Input
            ref={inputRef}
            placeholder="ابحث عن منتج بالاسم أو الباركود..."
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            className="border-0 bg-transparent shadow-none focus-visible:ring-0 h-auto p-0 text-base placeholder:text-muted-foreground/60"
          />
          {query && (
            <button
              onClick={() => {
                setQuery('')
                setResults([])
                inputRef.current?.focus()
              }}
              className="flex-shrink-0 p-1 rounded-md hover:bg-muted transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
          {loading && (
            <Loader2 className="w-4 h-4 text-primary animate-spin flex-shrink-0" />
          )}
        </div>

        {/* Results */}
        <ScrollArea className="max-h-[400px]">
          {!query && filteredRecent.length > 0 && (
            <div className="p-3">
              <div className="flex items-center gap-1.5 mb-2 px-1">
                <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">عمليات البحث الأخيرة</span>
              </div>
              <div className="space-y-0.5">
                {filteredRecent.map((term, idx) => (
                  <button
                    key={term}
                    onClick={() => handleRecentClick(term)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm hover:bg-muted/60 transition-colors group ${
                      selectedIdx === idx ? 'bg-muted/80' : ''
                    }`}
                  >
                    <Clock className="w-4 h-4 text-muted-foreground/50 flex-shrink-0" />
                    <span className="flex-1 text-right truncate">{term}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleClearRecent(term)
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-destructive/10 hover:text-destructive transition-all"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </button>
                ))}
              </div>
            </div>
          )}

          {!query && filteredRecent.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-muted-foreground">
              <Package className="w-12 h-12 opacity-20 mb-3" />
              <p className="text-sm font-medium">ابدأ بالبحث عن منتج</p>
              <p className="text-xs mt-1">اكتب اسم المنتج أو رقم الباركود</p>
            </div>
          )}

          {query && results.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-muted-foreground">
              <Search className="w-10 h-10 opacity-20 mb-3" />
              <p className="text-sm font-medium">لا توجد نتائج</p>
              <p className="text-xs mt-1">جرب كلمات بحث أخرى</p>
            </div>
          )}

          {results.length > 0 && (
            <div className="p-2">
              <div className="flex items-center justify-between px-2 py-1.5 mb-1">
                <span className="text-xs font-medium text-muted-foreground">
                  {results.length} نتيجة
                </span>
              </div>
              <div className="space-y-0.5">
                {results.map((product, idx) => {
                  const isSelected = selectedIdx === idx
                  const isLowStock = product.quantity <= 0
                  return (
                    <button
                      key={product.id}
                      onClick={() => handleSelectProduct(product)}
                      className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm transition-colors ${
                        isSelected
                          ? 'bg-primary/5 border border-primary/20'
                          : 'hover:bg-muted/60 border border-transparent'
                      }`}
                    >
                      {/* Product Image or Icon */}
                      <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-muted/50">
                        {product.image ? (
                          <img
                            src={product.image}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-5 h-5 text-muted-foreground/40" />
                          </div>
                        )}
                      </div>

                      {/* Product Info */}
                      <div className="flex-1 min-w-0 text-right">
                        <p className="font-medium text-foreground truncate">{product.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-muted-foreground">
                            {product.category.name}
                          </span>
                          {isLowStock && (
                            <Badge
                              variant="destructive"
                              className="text-[9px] px-1.5 py-0 h-4"
                            >
                              <TrendingDown className="w-2.5 h-2.5 ml-0.5" />
                              نفذ
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Price & Stock */}
                      <div className="flex flex-col items-end flex-shrink-0 gap-0.5">
                        <span className="text-sm font-bold text-foreground tabular-nums">
                          {formatCurrency(product.price)}
                        </span>
                        <span className={`text-[10px] tabular-nums ${
                          isLowStock
                            ? 'text-destructive'
                            : product.quantity <= 5
                              ? 'text-amber-500'
                              : 'text-muted-foreground'
                        }`}>
                          المخزون: {product.quantity}
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </ScrollArea>

        {/* Footer hint */}
        <div className="flex items-center justify-between px-4 py-2.5 border-t bg-muted/20 text-[10px] text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="kbd text-[9px]">↑</kbd>
              <kbd className="kbd text-[9px]">↓</kbd>
              للتنقل
            </span>
            <span className="flex items-center gap-1">
              <kbd className="kbd text-[9px]">↵</kbd>
              للاختيار
            </span>
          </div>
          <span className="flex items-center gap-1">
            <kbd className="kbd text-[9px]">Esc</kbd>
            للإغلاق
          </span>
        </div>
      </DialogContent>
    </Dialog>
  )
}
