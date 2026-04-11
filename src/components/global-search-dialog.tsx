'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useAppStore } from '@/store/app-store'
import { type Screen } from '@/types'
import {
  Search,
  Package,
  Clock,
  X,
  Loader2,
  Users,
  FileText,
  Truck,
  ArrowLeft,
  TrendingDown,
  AlertCircle,
  type LucideIcon,
} from 'lucide-react'

// ─── Types ──────────────────────────────────────────────────────────
interface SearchCategory {
  id: string
  label: string
  icon: LucideIcon
  color: string
  bgColor: string
  borderColor: string
  navigateTo: Screen
}

interface SearchItem {
  id: string
  name: string
  subtitle: string
  detail: string
  meta: string
  lowStock?: boolean
  outOfStock?: boolean
  hasDebt?: boolean
  isSale?: boolean
  hasRemaining?: boolean
  image?: string
  date?: string
}

interface SearchGroup {
  category: string
  items: SearchItem[]
}

interface GlobalSearchResponse {
  success: boolean
  data: SearchGroup[]
  counts: Record<string, number>
  totalResults: number
  query: string
}

// ─── Category Configuration ─────────────────────────────────────────
const SEARCH_CATEGORIES: SearchCategory[] = [
  {
    id: 'products',
    label: 'المنتجات',
    icon: Package,
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-500/10',
    borderColor: 'border-cyan-500/20',
    navigateTo: 'inventory',
  },
  {
    id: 'customers',
    label: 'العملاء',
    icon: Users,
    color: 'text-violet-500',
    bgColor: 'bg-violet-500/10',
    borderColor: 'border-violet-500/20',
    navigateTo: 'customers',
  },
  {
    id: 'invoices',
    label: 'الفواتير',
    icon: FileText,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/20',
    navigateTo: 'invoices',
  },
  {
    id: 'suppliers',
    label: 'الموردين',
    icon: Truck,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/20',
    navigateTo: 'purchases',
  },
]

const CATEGORY_MAP = new Map(SEARCH_CATEGORIES.map((c) => [c.id, c]))

// ─── localStorage helpers ───────────────────────────────────────────
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

// ─── Component ──────────────────────────────────────────────────────
export function GlobalSearchDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { setScreen } = useAppStore()

  const [query, setQuery] = useState('')
  const [groups, setGroups] = useState<SearchGroup[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [totalResults, setTotalResults] = useState(0)
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [selectedIdx, setSelectedIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Flatten all items for keyboard navigation ────────────────
  const flatItems = useMemo(() => {
    const displayGroups = activeCategory
      ? groups.filter((g) => g.category === activeCategory)
      : groups
    return displayGroups.flatMap((g) =>
      g.items.map((item) => ({ ...item, category: g.category }))
    )
  }, [groups, activeCategory])

  // ── Load recent searches on open ────────────────────────────
  useEffect(() => {
    if (open) {
      setRecentSearches(getRecentSearches())
      setQuery('')
      setGroups([])
      setCounts({})
      setTotalResults(0)
      setActiveCategory(null)
      setSelectedIdx(0)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  // ── Debounced search ────────────────────────────────────────
  const doSearch = useCallback(async (q: string, cat?: string | null) => {
    if (!q.trim()) {
      setGroups([])
      setCounts({})
      setTotalResults(0)
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('q', q.trim())
      params.set('limit', '8')
      if (cat && cat !== 'all') params.set('category', cat)

      const res = await fetch(`/api/global-search?${params.toString()}`)
      const data: GlobalSearchResponse = await res.json()
      if (data.success) {
        setGroups(data.data || [])
        setCounts(data.counts || {})
        setTotalResults(data.totalResults || 0)
      } else {
        setGroups([])
        setCounts({})
        setTotalResults(0)
      }
    } catch {
      setGroups([])
      setCounts({})
      setTotalResults(0)
    } finally {
      setLoading(false)
    }
  }, [])

  const handleInputChange = (value: string) => {
    setQuery(value)
    setSelectedIdx(0)
    setActiveCategory(null)

    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      doSearch(value)
    }, 300)
  }

  const handleCategoryFilter = (catId: string | null) => {
    setActiveCategory(catId === activeCategory ? null : catId)
    setSelectedIdx(0)
  }

  // ── Select an item ──────────────────────────────────────────
  const handleSelectItem = (item: SearchItem & { category?: string }) => {
    saveRecentSearch(query)
    setRecentSearches(getRecentSearches())

    const catConfig = CATEGORY_MAP.get(item.category || 'products')
    if (catConfig) {
      setScreen(catConfig.navigateTo)
      // For products, set highlight
      if (item.category === 'products') {
        sessionStorage.setItem('sultan-highlight-product', item.id)
      }
    }
    onOpenChange(false)
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

  // ── Keyboard navigation ─────────────────────────────────────
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const recentLen = filteredRecent.length

    if (!query && recentLen > 0) {
      // Navigating recent searches
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIdx((prev) => Math.min(prev + 1, recentLen - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIdx((prev) => Math.max(prev - 1, 0))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (selectedIdx < recentLen) {
          handleRecentClick(filteredRecent[selectedIdx])
        }
      }
      return
    }

    if (flatItems.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIdx((prev) => Math.min(prev + 1, flatItems.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIdx((prev) => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (flatItems[selectedIdx]) {
        handleSelectItem(flatItems[selectedIdx])
      }
    }
  }

  const filteredRecent = query
    ? recentSearches.filter((s) => s.includes(query))
    : recentSearches

  // ── Auto-select category when results are in one category ───
  useEffect(() => {
    if (groups.length === 1 && !activeCategory) {
      // Don't auto-select, let user see the category header
    }
  }, [groups, activeCategory])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[560px] p-0 gap-0 overflow-hidden glass-card animate-scale-fade"
        dir="rtl"
        aria-label="البحث الشامل"
      >
        {/* Search Input */}
        <div className="flex items-center gap-2 px-4 py-3 border-b bg-muted/30">
          <Search className="w-5 h-5 text-muted-foreground flex-shrink-0" />
          <Input
            ref={inputRef}
            placeholder="ابحث عن منتج، عميل، فاتورة، مورد..."
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            className="border-0 bg-transparent shadow-none focus-visible:ring-0 h-auto p-0 text-base placeholder:text-muted-foreground/60"
          />
          {query && (
            <button
              onClick={() => {
                setQuery('')
                setGroups([])
                setCounts({})
                setTotalResults(0)
                setActiveCategory(null)
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

        {/* Category Filter Tabs (shown when there are results) */}
        {query && !loading && totalResults > 0 && (
          <div className="flex items-center gap-1.5 px-4 py-2 border-b bg-muted/10 overflow-x-auto">
            <button
              onClick={() => handleCategoryFilter(null)}
              className={`text-[11px] font-medium px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap ${
                !activeCategory
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              الكل ({totalResults})
            </button>
            {SEARCH_CATEGORIES.map((cat) => {
              const count = counts[cat.id] || 0
              if (count === 0) return null
              const Icon = cat.icon
              return (
                <button
                  key={cat.id}
                  onClick={() => handleCategoryFilter(cat.id)}
                  className={`text-[11px] font-medium px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1 ${
                    activeCategory === cat.id
                      ? `${cat.bgColor} ${cat.color}`
                      : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  {cat.label} ({count})
                </button>
              )
            })}
          </div>
        )}

        {/* Results Area */}
        <ScrollArea className="max-h-[420px]">
          {/* ── Recent Searches (no query) ──────────────────────── */}
          {!query && filteredRecent.length > 0 && (
            <div className="p-3">
              <div className="flex items-center gap-1.5 mb-2 px-1">
                <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">عمليات البحث الأخيرة</span>
                <button
                  onClick={() => {
                    localStorage.removeItem(RECENT_SEARCHES_KEY)
                    setRecentSearches([])
                  }}
                  className="text-[10px] text-muted-foreground/60 hover:text-destructive mr-auto transition-colors"
                >
                  مسح الكل
                </button>
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

          {/* ── Empty State (no query, no recent) ──────────────── */}
          {!query && filteredRecent.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-muted-foreground">
              <Search className="w-12 h-12 opacity-20 mb-3" />
              <p className="text-sm font-medium">ابدأ بالبحث</p>
              <p className="text-xs mt-1 text-muted-foreground/60">ابحث عن منتجات، عملاء، فواتير، وموردين</p>
              <div className="flex items-center gap-2 mt-4">
                {SEARCH_CATEGORIES.map((cat) => {
                  const Icon = cat.icon
                  return (
                    <div
                      key={cat.id}
                      className={`w-9 h-9 rounded-lg ${cat.bgColor} flex items-center justify-center`}
                    >
                      <Icon className={`w-4 h-4 ${cat.color}`} />
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── No Results ─────────────────────────────────────── */}
          {query && !loading && totalResults === 0 && (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-muted-foreground">
              <AlertCircle className="w-10 h-10 opacity-20 mb-3" />
              <p className="text-sm font-medium">لا توجد نتائج</p>
              <p className="text-xs mt-1">جرب كلمات بحث أخرى أو تصفح الفئات</p>
              <div className="flex items-center gap-2 mt-4">
                {SEARCH_CATEGORIES.map((cat) => {
                  const Icon = cat.icon
                  return (
                    <button
                      key={cat.id}
                      onClick={() => handleCategoryFilter(cat.id)}
                      className={`flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-lg ${cat.bgColor} ${cat.color} hover:opacity-80 transition-opacity`}
                    >
                      <Icon className="w-3 h-3" />
                      {cat.label}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── Search Results ─────────────────────────────────── */}
          {flatItems.length > 0 && (
            <div className="p-2">
              {/* Results count */}
              <div className="flex items-center justify-between px-2 py-1.5 mb-1">
                <span className="text-xs font-medium text-muted-foreground">
                  {totalResults} نتيجة
                  {activeCategory && (
                    <span className="mr-1.5">
                      في <span className="text-foreground">{CATEGORY_MAP.get(activeCategory)?.label}</span>
                    </span>
                  )}
                </span>
              </div>

              <div className="space-y-1">
                {/* Render grouped results */}
                {(activeCategory
                  ? groups.filter((g) => g.category === activeCategory)
                  : groups
                ).map((group) => {
                  const catConfig = CATEGORY_MAP.get(group.category)
                  if (!catConfig) return null
                  const CatIcon = catConfig.icon
                  const groupOffset = activeCategory
                    ? 0
                    : groups.slice(0, groups.indexOf(group)).reduce((sum, g) => sum + g.items.length, 0)

                  return (
                    <div key={group.category}>
                      {/* Category Header */}
                      {!activeCategory && (
                        <div className="flex items-center gap-2 px-2 pt-2 pb-1">
                          <div className={`w-5 h-5 rounded-md ${catConfig.bgColor} flex items-center justify-center`}>
                            <CatIcon className={`w-3 h-3 ${catConfig.color}`} />
                          </div>
                          <span className="text-[11px] font-semibold text-foreground">{catConfig.label}</span>
                          <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4">
                            {counts[group.category] || group.items.length}
                          </Badge>
                        </div>
                      )}

                      {/* Category Items */}
                      <div className="space-y-0.5">
                        {group.items.map((item, idx) => {
                          const globalIdx = groupOffset + idx
                          const isSelected = selectedIdx === globalIdx
                          return (
                            <button
                              key={`${group.category}-${item.id}`}
                              onClick={() => handleSelectItem({ ...item, category: group.category })}
                              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                                isSelected
                                  ? 'bg-primary/5 border border-primary/20'
                                  : 'hover:bg-muted/60 border border-transparent'
                              }`}
                            >
                              {/* Category Icon */}
                              <div className={`w-9 h-9 rounded-lg ${catConfig.bgColor} flex items-center justify-center flex-shrink-0`}>
                                {item.image && group.category === 'products' ? (
                                  <img
                                    src={item.image}
                                    alt={item.name}
                                    className="w-full h-full rounded-lg object-cover"
                                  />
                                ) : (
                                  <CatIcon className={`w-4 h-4 ${catConfig.color}`} />
                                )}
                              </div>

                              {/* Item Info */}
                              <div className="flex-1 min-w-0 text-right">
                                <p className="font-medium text-foreground truncate text-[13px]">{item.name}</p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="text-[10px] text-muted-foreground truncate">
                                    {item.subtitle}
                                  </span>
                                  {item.outOfStock && (
                                    <Badge variant="destructive" className="text-[8px] px-1 py-0 h-3.5">
                                      <TrendingDown className="w-2 h-2 ml-0.5" />
                                      نفذ
                                    </Badge>
                                  )}
                                  {item.hasDebt && (
                                    <Badge variant="destructive" className="text-[8px] px-1 py-0 h-3.5 bg-amber-500/15 text-amber-600 border-amber-500/30 dark:text-amber-400 dark:border-amber-500/30">
                                      مديونية
                                    </Badge>
                                  )}
                                </div>
                              </div>

                              {/* Detail & Meta */}
                              <div className="flex flex-col items-end flex-shrink-0 gap-0.5">
                                <span className="text-[13px] font-bold text-foreground tabular-nums">
                                  {item.detail}
                                </span>
                                <span className="text-[9px] text-muted-foreground tabular-nums truncate max-w-[140px]">
                                  {item.meta}
                                </span>
                              </div>

                              {/* Navigate hint */}
                              <ArrowLeft className="w-3.5 h-3.5 text-muted-foreground/30 flex-shrink-0" />
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </ScrollArea>

        {/* Footer hints */}
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
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="kbd text-[9px]">⌘K</kbd>
              <span className="hidden sm:inline">/</span>
              <kbd className="kbd text-[9px] hidden sm:inline-flex">Ctrl+K</kbd>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="kbd text-[9px]">Esc</kbd>
              للإغلاق
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
