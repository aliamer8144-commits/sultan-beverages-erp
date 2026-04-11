'use client'

import { useState, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'
import {
  Upload,
  FileSpreadsheet,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ArrowLeftRight,
  Eye,
} from 'lucide-react'
import { parseCSV } from '@/lib/csv-import'

// ─── Types ─────────────────────────────────────────────────────────
interface CsvImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  categories: { id: string; name: string }[]
  onImportComplete: () => void
}

interface ColumnMapping {
  csvColumn: string
  dbField: string
}

// ─── Column mapping options ────────────────────────────────────────
const DB_FIELDS = [
  { value: 'name', label: 'اسم المنتج' },
  { value: 'categoryId', label: 'التصنيف' },
  { value: 'price', label: 'سعر البيع' },
  { value: 'costPrice', label: 'سعر الشراء' },
  { value: 'quantity', label: 'الكمية' },
  { value: 'barcode', label: 'باركود' },
  { value: '_skip', label: '— تجاهل —' },
]

// ─── Component ─────────────────────────────────────────────────────
export function CsvImportDialog({ open, onOpenChange, categories, onImportComplete }: CsvImportDialogProps) {
  // File state
  const [file, setFile] = useState<File | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)

  // Parsed data
  const [parsedData, setParsedData] = useState<Record<string, string>[]>([])
  const [csvHeaders, setCsvHeaders] = useState<string[]>([])
  const [parseError, setParseError] = useState<string | null>(null)
  const [parsing, setParsing] = useState(false)

  // Column mapping
  const [columnMapping, setColumnMapping] = useState<ColumnMapping[]>([])

  // Import state
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState(0)
  const [importResult, setImportResult] = useState<{ success: number; skipped: number; errors: string[] } | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const dragCounterRef = useRef(0)

  // ─── Reset state ───────────────────────────────────────────────
  const resetState = useCallback(() => {
    setFile(null)
    setParsedData([])
    setCsvHeaders([])
    setParseError(null)
    setColumnMapping([])
    setImporting(false)
    setImportProgress(0)
    setImportResult(null)
    setIsDragOver(false)
  }, [])

  // ─── Parse file ────────────────────────────────────────────────
  const handleParseFile = useCallback(async (selectedFile: File) => {
    if (!selectedFile.name.match(/\.(csv|txt)$/i)) {
      toast.error('يرجى اختيار ملف CSV أو TXT')
      return
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      toast.error('حجم الملف كبير جداً (الحد الأقصى 5 ميجابايت)')
      return
    }

    setFile(selectedFile)
    setParsing(true)
    setParseError(null)
    setParsedData([])
    setImportResult(null)

    try {
      const text = await selectedFile.text()
      const data = await parseCSV(text)

      if (data.length === 0) {
        setParseError('لم يتم العثور على بيانات في الملف')
        setParsing(false)
        return
      }

      // Get headers from first row
      const headers = Object.keys(data[0])
      setCsvHeaders(headers)
      setParsedData(data)

      // Auto-detect mapping based on common column names
      const autoMapping: ColumnMapping[] = headers.map((header) => {
        const lower = header.toLowerCase().trim()

        if (['اسم', 'name', 'المنتج', 'product', 'product name', 'اسم المنتج'].includes(lower)) {
          return { csvColumn: header, dbField: 'name' }
        }
        if (['التصنيف', 'category', 'الفئة', 'type'].includes(lower)) {
          return { csvColumn: header, dbField: 'categoryId' }
        }
        if (['سعر البيع', 'price', 'selling price', 'sell price', 'سعر'].includes(lower)) {
          return { csvColumn: header, dbField: 'price' }
        }
        if (['سعر الشراء', 'cost price', 'cost', 'costprice', 'التكلفة'].includes(lower)) {
          return { csvColumn: header, dbField: 'costPrice' }
        }
        if (['الكمية', 'quantity', 'qty', 'stock', 'المخزون'].includes(lower)) {
          return { csvColumn: header, dbField: 'quantity' }
        }
        if (['باركود', 'barcode', 'ean', 'upc', 'sku'].includes(lower)) {
          return { csvColumn: header, dbField: 'barcode' }
        }

        return { csvColumn: header, dbField: '_skip' }
      })

      setColumnMapping(autoMapping)
      toast.success(`تم تحليل الملف: ${data.length} صف`)
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'فشل في تحليل الملف')
      toast.error('فشل في تحليل ملف CSV')
    } finally {
      setParsing(false)
    }
  }, [])

  // ─── Drag and drop handlers ────────────────────────────────────
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current++
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current--
    if (dragCounterRef.current === 0) {
      setIsDragOver(false)
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
    dragCounterRef.current = 0

    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) {
      handleParseFile(droppedFile)
    }
  }, [handleParseFile])

  // ─── File input change ─────────────────────────────────────────
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      handleParseFile(selectedFile)
    }
  }, [handleParseFile])

  // ─── Update column mapping ─────────────────────────────────────
  const updateMapping = useCallback((csvColumn: string, dbField: string) => {
    setColumnMapping((prev) =>
      prev.map((m) =>
        m.csvColumn === csvColumn ? { ...m, dbField } : m,
      ),
    )
  }, [])

  // ─── Execute import ────────────────────────────────────────────
  const handleImport = useCallback(async () => {
    if (parsedData.length === 0) return

    // Check required mapping
    const nameMapping = columnMapping.find((m) => m.dbField === 'name')
    if (!nameMapping) {
      toast.error('يرجى تعيين عمود "اسم المنتج"')
      return
    }

    setImporting(true)
    setImportProgress(0)
    setImportResult(null)

    const products: Record<string, unknown>[] = []
    const errors: string[] = []
    let skipped = 0

    // Find the default category
    const defaultCategory = categories.length > 0 ? categories[0].id : ''

    for (let i = 0; i < parsedData.length; i++) {
      const row = parsedData[i]
      setImportProgress(Math.round(((i + 1) / parsedData.length) * 90))

      try {
        const getName = (field: string) => row[field] || ''

        const name = getName(nameMapping.csvColumn).trim()
        if (!name) {
          errors.push(`صف ${i + 2}: اسم المنتج فارغ — تم التخطي`)
          skipped++
          continue
        }

        const priceMapping = columnMapping.find((m) => m.dbField === 'price')
        const costPriceMapping = columnMapping.find((m) => m.dbField === 'costPrice')
        const quantityMapping = columnMapping.find((m) => m.dbField === 'quantity')
        const barcodeMapping = columnMapping.find((m) => m.dbField === 'barcode')
        const categoryMapping = columnMapping.find((m) => m.dbField === 'categoryId')

        let categoryId = defaultCategory
        if (categoryMapping) {
          const catName = getName(categoryMapping.csvColumn).trim()
          if (catName) {
            const foundCat = categories.find(
              (c) => c.name.toLowerCase() === catName.toLowerCase(),
            )
            if (foundCat) {
              categoryId = foundCat.id
            }
          }
        }

        const price = parseFloat(getName(priceMapping?.csvColumn || '')) || 0
        const costPrice = parseFloat(getName(costPriceMapping?.csvColumn || '')) || 0
        const quantity = parseInt(getName(quantityMapping?.csvColumn || ''), 10) || 0
        const barcode = getName(barcodeMapping?.csvColumn || '').trim() || null

        if (price <= 0) {
          errors.push(`صف ${i + 2}: ${name} — سعر البيع غير صالح — تم التخطي`)
          skipped++
          continue
        }

        products.push({
          name,
          categoryId,
          price,
          costPrice,
          quantity,
          barcode,
        })
      } catch {
        errors.push(`صف ${i + 2}: خطأ غير معروف — تم التخطي`)
        skipped++
      }
    }

    try {
      setImportProgress(95)
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'bulk-import', products }),
      })
      const data = await res.json()

      if (data.success) {
        setImportProgress(100)
        setImportResult({
          success: data.data.created || products.length,
          skipped: skipped + (data.data.skipped || 0),
          errors,
        })
        toast.success(`تم استيراد ${data.data.created || products.length} منتج بنجاح`)
        onImportComplete()
      } else {
        toast.error(data.error || 'فشل في استيراد المنتجات')
        setImportResult({ success: 0, skipped: products.length, errors })
      }
    } catch {
      toast.error('حدث خطأ في الاتصال بالخادم')
      setImportResult({ success: 0, skipped: products.length, errors })
    } finally {
      setImporting(false)
    }
  }, [parsedData, columnMapping, categories, onImportComplete])

  // ─── Close handler ─────────────────────────────────────────────
  const handleClose = useCallback(() => {
    resetState()
    onOpenChange(false)
  }, [resetState, onOpenChange])

  // ─── Step indicator ────────────────────────────────────────────
  const currentStep = importResult ? 3 : parsedData.length > 0 ? 2 : file ? 1 : 0

  const stepLabels = ['رفع الملف', 'معاينة البيانات', 'تعيين الأعمدة', 'النتيجة']

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col animated-border-gradient" dir="rtl">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5 text-emerald-500" />
            </div>
            استيراد منتجات من CSV
          </DialogTitle>
          <DialogDescription>
            استورد المنتجات من ملف CSV مع دعم السحب والإفلات
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 px-1 flex-shrink-0">
          {stepLabels.map((label, idx) => (
            <div key={idx} className="flex items-center gap-2 flex-1">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors ${
                  idx <= currentStep
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {idx < currentStep ? (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                ) : (
                  idx + 1
                )}
              </div>
              <span className={`text-[10px] font-medium hidden sm:block ${
                idx <= currentStep ? 'text-foreground' : 'text-muted-foreground'
              }`}>
                {label}
              </span>
              {idx < stepLabels.length - 1 && (
                <div className={`flex-1 h-px ${idx < currentStep ? 'bg-primary/40' : 'bg-border'}`} />
              )}
            </div>
          ))}
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto">
          {/* ── Step 0: File Upload ── */}
          {!file && !importResult && (
            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${
                isDragOver
                  ? 'border-primary bg-primary/5 scale-[1.01]'
                  : 'border-border/60 hover:border-primary/40 hover:bg-muted/30'
              }`}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <div className="flex flex-col items-center gap-3">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${
                  isDragOver ? 'bg-primary/10' : 'bg-muted/60'
                }`}>
                  <Upload className={`w-7 h-7 ${isDragOver ? 'text-primary' : 'text-muted-foreground/50'}`} />
                </div>
                <div>
                  <p className="text-sm font-medium">اسحب الملف هنا أو انقر للاختيار</p>
                  <p className="text-xs text-muted-foreground mt-1">CSV أو TXT — الحد الأقصى 5 ميجابايت</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <FileSpreadsheet className="w-4 h-4 ml-2" />
                  اختيار ملف
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.txt"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
            </div>
          )}

          {/* ── Parsing indicator ── */}
          {parsing && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <p className="text-sm font-medium">جاري تحليل الملف...</p>
            </div>
          )}

          {/* ── Parse error ── */}
          {parseError && (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-destructive" />
              </div>
              <p className="text-sm text-destructive font-medium">{parseError}</p>
              <Button variant="outline" size="sm" onClick={() => { setFile(null); setParseError(null) }}>
                إعادة المحاولة
              </Button>
            </div>
          )}

          {/* ── Step 1-2: Preview & Column Mapping ── */}
          {parsedData.length > 0 && !importResult && (
            <div className="space-y-4">
              {/* File info */}
              <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/40">
                <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                <span className="text-xs font-medium truncate flex-1">{file?.name}</span>
                <Badge variant="secondary" className="text-[10px]">
                  {parsedData.length} صف
                </Badge>
                <Badge variant="secondary" className="text-[10px]">
                  {csvHeaders.length} عمود
                </Badge>
                <button
                  onClick={() => { setFile(null); setParsedData([]); setCsvHeaders([]) }}
                  className="p-1 rounded hover:bg-muted transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Preview table (first 5 rows) */}
              <div className="rounded-xl border overflow-hidden">
                <div className="flex items-center gap-1.5 px-3 py-2 bg-muted/40 border-b">
                  <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-[11px] font-semibold">معاينة البيانات (أول 5 صفوف)</span>
                </div>
                <ScrollArea className="max-h-48">
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr className="bg-muted/30">
                        <th className="px-2 py-1.5 text-right font-medium text-muted-foreground border-b">#</th>
                        {csvHeaders.map((h) => (
                          <th key={h} className="px-2 py-1.5 text-right font-medium text-foreground border-b whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {parsedData.slice(0, 5).map((row, idx) => (
                        <tr key={idx} className="border-b last:border-0 hover:bg-muted/20">
                          <td className="px-2 py-1 text-muted-foreground">{idx + 1}</td>
                          {csvHeaders.map((h) => (
                            <td key={h} className="px-2 py-1 truncate max-w-[120px]">{row[h] || '—'}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </ScrollArea>
              </div>

              {/* Column mapping */}
              <div className="rounded-xl border overflow-hidden">
                <div className="flex items-center gap-1.5 px-3 py-2 bg-muted/40 border-b">
                  <ArrowLeftRight className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-[11px] font-semibold">تعيين الأعمدة</span>
                </div>
                <div className="divide-y divide-border/40 max-h-64 overflow-y-auto">
                  {columnMapping.map((mapping) => (
                    <div key={mapping.csvColumn} className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/20">
                      <span className="text-xs font-medium flex-1 truncate">{mapping.csvColumn}</span>
                      <span className="text-muted-foreground text-xs">←</span>
                      <Select
                        value={mapping.dbField}
                        onValueChange={(val) => updateMapping(mapping.csvColumn, val)}
                      >
                        <SelectTrigger className="w-40 h-8 text-xs rounded-lg">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DB_FIELDS.map((field) => (
                            <SelectItem key={field.value} value={field.value}>
                              {field.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Step 3: Import Result ── */}
          {importResult && (
            <div className="space-y-4 py-2">
              <div className="flex flex-col items-center gap-3 py-4">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
                  importResult.success > 0
                    ? 'bg-emerald-500/10'
                    : 'bg-amber-500/10'
                }`}>
                  {importResult.success > 0 ? (
                    <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                  ) : (
                    <AlertCircle className="w-8 h-8 text-amber-500" />
                  )}
                </div>
                <p className="text-sm font-bold">
                  {importResult.success > 0
                    ? `تم استيراد ${importResult.success} منتج بنجاح`
                    : 'لم يتم استيراد أي منتج'}
                </p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-center">
                  <p className="text-lg font-bold text-emerald-600 tabular-nums">{importResult.success}</p>
                  <p className="text-[10px] text-muted-foreground">تم استيراده</p>
                </div>
                <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 text-center">
                  <p className="text-lg font-bold text-amber-600 tabular-nums">{importResult.skipped}</p>
                  <p className="text-[10px] text-muted-foreground">تم تخطيه</p>
                </div>
              </div>

              {/* Errors */}
              {importResult.errors.length > 0 && (
                <div className="rounded-xl border border-destructive/20 bg-destructive/5 overflow-hidden">
                  <div className="px-3 py-2 bg-destructive/10 border-b">
                    <p className="text-[11px] font-semibold text-destructive">
                      تحذيرات ({importResult.errors.length})
                    </p>
                  </div>
                  <ScrollArea className="max-h-32">
                    <div className="p-2 space-y-1">
                      {importResult.errors.slice(0, 20).map((err, idx) => (
                        <p key={idx} className="text-[10px] text-muted-foreground">{err}</p>
                      ))}
                      {importResult.errors.length > 20 && (
                        <p className="text-[10px] text-muted-foreground">
                          ... و {importResult.errors.length - 20} تحذير آخر
                        </p>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <DialogFooter className="flex-shrink-0 pt-2 gap-2">
          {importing && (
            <div className="flex-1">
              <Progress value={importProgress} className="h-2" />
              <p className="text-[10px] text-muted-foreground mt-1 text-center">
                جاري الاستيراد... {importProgress}%
              </p>
            </div>
          )}

          {!importResult && (
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={importing}
            >
              إلغاء
            </Button>
          )}

          {!importResult && parsedData.length > 0 && (
            <Button
              onClick={handleImport}
              disabled={importing || parsedData.length === 0}
              className="gap-2"
            >
              {importing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              استيراد ({parsedData.length} منتج)
            </Button>
          )}

          {importResult && (
            <Button onClick={handleClose} className="gap-2">
              <CheckCircle2 className="w-4 h-4" />
              تم
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
