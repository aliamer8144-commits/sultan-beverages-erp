'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Shield,
  Download,
  Upload,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  Database,
  Users,
  Package,
  ShoppingCart,
  Truck,
  FileText,
  DollarSign,
  RefreshCw,
  Clock,
} from 'lucide-react'
import { toast } from 'sonner'

// ─── Types ───────────────────────────────────────────────────────────────────

interface BackupSummary {
  users: number
  categories: number
  products: number
  customers: number
  suppliers: number
  invoices: number
  invoiceItems: number
  payments: number
}

interface BackupMetadata {
  backupDate: string
  version?: string
  app?: string
  summary?: BackupSummary
}

interface LastBackupInfo {
  date: string
  summary: BackupSummary
}

// ─── Component ───────────────────────────────────────────────────────────────

export function BackupScreen() {
  // ── Backup state ──
  const [creatingBackup, setCreatingBackup] = useState(false)
  const [backupData, setBackupData] = useState<Record<string, unknown> | null>(null)
  const [lastBackupInfo, setLastBackupInfo] = useState<LastBackupInfo | null>(null)

  // ── Restore state ──
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewData, setPreviewData] = useState<BackupMetadata | null>(null)
  const [restoring, setRestoring] = useState(false)
  const [restoreResult, setRestoreResult] = useState<{ success: boolean; counts: Record<string, number>; error?: string } | null>(null)
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load last backup info from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('sultan-last-backup')
      if (saved) {
        setLastBackupInfo(JSON.parse(saved))
      }
    } catch {
      // ignore
    }
  }, [])

  // ── Create Backup ──
  const handleCreateBackup = useCallback(async () => {
    setCreatingBackup(true)
    try {
      const res = await fetch('/api/backup')
      const json = await res.json()

      if (json.success) {
        setBackupData(json.data)
        // Save to localStorage
        const info: LastBackupInfo = {
          date: json.data.backupDate,
          summary: json.data.summary,
        }
        setLastBackupInfo(info)
        localStorage.setItem('sultan-last-backup', JSON.stringify(info))
        toast.success('تم إنشاء النسخة الاحتياطية بنجاح')
      } else {
        toast.error('فشل في إنشاء النسخة الاحتياطية')
      }
    } catch {
      toast.error('حدث خطأ في الاتصال بالخادم')
    } finally {
      setCreatingBackup(false)
    }
  }, [])

  // ── Download Backup ──
  const handleDownload = useCallback(() => {
    if (!backupData) return

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const date = new Date().toISOString().split('T')[0]
    a.download = `sultan-backup-${date}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success('تم تحميل ملف النسخة الاحتياطية')
  }, [backupData])

  // ── File handling ──
  const handleFileSelect = useCallback((file: File) => {
    if (!file.name.endsWith('.json')) {
      toast.error('يرجى اختيار ملف JSON')
      return
    }

    setSelectedFile(file)
    setRestoreResult(null)

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string)
        if (!data || !data.data) {
          toast.error('هيكل الملف غير صالح')
          return
        }
        const metadata: BackupMetadata = {
          backupDate: data.backupDate || 'غير معروف',
          version: data.version || 'غير معروف',
          app: data.app || 'غير معروف',
          summary: data.summary || null,
        }
        setPreviewData(metadata)
      } catch {
        toast.error('فشل في قراءة الملف')
      }
    }
    reader.readAsText(file)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileSelect(file)
  }, [handleFileSelect])

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFileSelect(file)
  }, [handleFileSelect])

  // ── Restore ──
  const handleRestore = useCallback(async () => {
    if (!selectedFile || !previewData) return

    setConfirmDialogOpen(false)
    setRestoring(true)
    setRestoreResult(null)

    try {
      const text = await selectedFile.text()
      const data = JSON.parse(text)

      const res = await fetch('/api/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const json = await res.json()

      if (json.success) {
        setRestoreResult({ success: true, counts: json.data })
        toast.success('تمت استعادة البيانات بنجاح')
      } else {
        setRestoreResult({ success: false, counts: {}, error: json.error })
        toast.error(json.error || 'فشل في استعادة البيانات')
      }
    } catch (error) {
      setRestoreResult({ success: false, counts: {}, error: 'حدث خطأ في الاتصال' })
      toast.error('حدث خطأ في الاتصال بالخادم')
    } finally {
      setRestoring(false)
    }
  }, [selectedFile, previewData])

  // ── Reset ──
  const handleReset = useCallback(() => {
    setSelectedFile(null)
    setPreviewData(null)
    setRestoreResult(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [])

  // ── Summary table items ──
  const summaryItems = (summary: BackupSummary | undefined) => [
    { label: 'المستخدمين', count: summary?.users ?? 0, icon: Users, color: 'text-primary' },
    { label: 'الفئات', count: summary?.categories ?? 0, icon: Database, color: 'text-emerald-600' },
    { label: 'المنتجات', count: summary?.products ?? 0, icon: Package, color: 'text-amber-600' },
    { label: 'العملاء', count: summary?.customers ?? 0, icon: ShoppingCart, color: 'text-rose-600' },
    { label: 'الموردين', count: summary?.suppliers ?? 0, icon: Truck, color: 'text-violet-600' },
    { label: 'الفواتير', count: summary?.invoices ?? 0, icon: FileText, color: 'text-cyan-600' },
    { label: 'بنود الفواتير', count: summary?.invoiceItems ?? 0, icon: FileText, color: 'text-orange-600' },
    { label: 'المدفوعات', count: summary?.payments ?? 0, icon: DollarSign, color: 'text-teal-600' },
  ]

  // ─── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="h-full overflow-y-auto p-4 md:p-6 animate-fade-in-up" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-foreground">النسخ الاحتياطي والاستعادة</h2>
            <p className="text-sm text-muted-foreground mt-0.5">حماية بيانات نظام السلطان للمشروبات</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="backup" className="space-y-6" dir="rtl">
        <TabsList className="grid w-full max-w-md grid-cols-2 rounded-xl h-11">
          <TabsTrigger value="backup" className="rounded-lg gap-2 text-sm font-medium">
            <Shield className="w-4 h-4" />
            نسخ احتياطي
          </TabsTrigger>
          <TabsTrigger value="restore" className="rounded-lg gap-2 text-sm font-medium">
            <Upload className="w-4 h-4" />
            استعادة
          </TabsTrigger>
        </TabsList>

        {/* ── Backup Tab ── */}
        <TabsContent value="backup" className="space-y-6">
          {/* Action Card */}
          <Card className="rounded-2xl border-0 shadow-sm card-hover glass-card">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                إنشاء نسخة احتياطية
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground leading-relaxed">
                سيتم إنشاء نسخة احتياطية كاملة لجميع بيانات النظام بما في ذلك المستخدمين، المنتجات، الفواتير، العملاء، والموردين.
              </p>
              <div className="flex gap-3">
                <Button
                  onClick={handleCreateBackup}
                  disabled={creatingBackup}
                  className="gap-2 rounded-xl btn-ripple shadow-lg shadow-primary/20"
                >
                  {creatingBackup ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Shield className="w-4 h-4" />
                  )}
                  {creatingBackup ? 'جاري الإنشاء...' : 'إنشاء نسخة احتياطية'}
                </Button>
                {backupData && (
                  <Button
                    onClick={handleDownload}
                    variant="outline"
                    className="gap-2 rounded-xl btn-ripple"
                  >
                    <Download className="w-4 h-4" />
                    تحميل النسخة
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Last Backup Info */}
          {lastBackupInfo != null && (
            <Card className="rounded-2xl border-0 shadow-sm card-hover glass-card">
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                  <Clock className="w-5 h-5 text-emerald-500" />
                  آخر نسخة احتياطية
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">تاريخ النسخة:</span>
                  <Badge variant="secondary" className="rounded-lg">
                    {new Date(lastBackupInfo.date).toLocaleDateString('ar-SA', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Badge>
                </div>
                <Separator />
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-3">ملخص البيانات:</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {summaryItems(lastBackupInfo.summary).map((item) => (
                      <div key={item.label} className="flex items-center gap-2 p-2.5 rounded-xl bg-muted/40">
                        <item.icon className={`w-4 h-4 ${item.color} flex-shrink-0`} />
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground truncate">{item.label}</p>
                          <p className="text-sm font-bold tabular-nums">{item.count}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Current Backup Summary (if just created) */}
          {backupData && backupData.summary && (
            <Card className="rounded-2xl border-0 shadow-sm card-hover glass-card">
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                  <Database className="w-5 h-5 text-primary" />
                  ملخص النسخة الحالية
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {summaryItems(backupData.summary as BackupSummary).map((item) => (
                    <div key={item.label} className="flex items-center gap-2 p-2.5 rounded-xl bg-muted/40">
                      <item.icon className={`w-4 h-4 ${item.color} flex-shrink-0`} />
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground truncate">{item.label}</p>
                        <p className="text-sm font-bold tabular-nums">{item.count}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Restore Tab ── */}
        <TabsContent value="restore" className="space-y-6">
          {/* Upload Area */}
          <Card className="rounded-2xl border-0 shadow-sm card-hover glass-card">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                <Upload className="w-5 h-5 text-primary" />
                استعادة من نسخة احتياطية
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <p className="text-xs text-amber-700 leading-relaxed">
                  تنبيه: سيتم حذف جميع البيانات الحالية واستبدالها بالبيانات الموجودة في النسخة الاحتياطية. لا يمكن التراجع عن هذا الإجراء.
                </p>
              </div>

              {/* Drag & Drop Area */}
              {!selectedFile ? (
                <div
                  className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-200 cursor-pointer ${
                    dragOver
                      ? 'border-primary bg-primary/5 scale-[1.01]'
                      : 'border-border/60 hover:border-primary/40 hover:bg-muted/30'
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="w-14 h-14 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto mb-3">
                    <Upload className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-foreground">اسحب ملف النسخة الاحتياطية هنا</p>
                  <p className="text-xs text-muted-foreground mt-1">أو اضغط لاختيار ملف (.json)</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={handleFileInputChange}
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  {/* File Preview */}
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/40 border border-border/50">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{selectedFile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(selectedFile.size / 1024).toFixed(1)} كيلوبايت
                      </p>
                    </div>
                    <button
                      onClick={handleReset}
                      className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Backup Metadata Preview */}
                  {previewData && (
                    <div className="rounded-xl bg-muted/30 border border-border/50 p-4 space-y-3">
                      <h4 className="text-sm font-bold text-foreground">معلومات النسخة:</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">التطبيق:</span>
                          <span className="font-medium">{previewData.app}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">الإصدار:</span>
                          <Badge variant="secondary" className="rounded-lg text-xs">{previewData.version}</Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">تاريخ النسخة:</span>
                          <span className="font-medium text-xs">
                            {new Date(previewData.backupDate).toLocaleDateString('ar-SA', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>

                      {previewData.summary && (
                        <>
                          <Separator />
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-2">عدد السجلات:</p>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                              {summaryItems(previewData.summary).map((item) => (
                                <div key={item.label} className="flex items-center gap-1.5 text-xs">
                                  <item.icon className={`w-3 h-3 ${item.color}`} />
                                  <span className="text-muted-foreground">{item.label}:</span>
                                  <span className="font-bold tabular-nums">{item.count}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* Restore / Reset Buttons */}
                  <div className="flex gap-3">
                    <Button
                      onClick={() => setConfirmDialogOpen(true)}
                      disabled={restoring}
                      className="gap-2 rounded-xl btn-ripple"
                    >
                      {restoring ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4" />
                      )}
                      {restoring ? 'جاري الاستعادة...' : 'استعادة البيانات'}
                    </Button>
                    <Button
                      onClick={handleReset}
                      variant="outline"
                      disabled={restoring}
                      className="rounded-xl"
                    >
                      إلغاء
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Restore Result */}
          {restoreResult && (
            <Card className={`rounded-2xl border-0 shadow-sm card-hover ${
              restoreResult.success
                ? 'bg-emerald-500/5 border border-emerald-500/20'
                : 'bg-destructive/5 border border-destructive/20'
            }`}>
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  {restoreResult.success ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                  ) : (
                    <XCircle className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <h4 className={`text-sm font-bold ${restoreResult.success ? 'text-emerald-700' : 'text-destructive'}`}>
                      {restoreResult.success ? 'تمت الاستعادة بنجاح' : 'فشلت الاستعادة'}
                    </h4>
                    {restoreResult.success && restoreResult.counts && (
                      <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {Object.entries(restoreResult.counts).map(([table, count]) => (
                          <div key={table} className="text-xs flex items-center gap-1.5">
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                            <span className="text-muted-foreground">{table}:</span>
                            <span className="font-bold tabular-nums">{count}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {restoreResult.error && (
                      <p className="text-xs text-destructive/80 mt-1">{restoreResult.error}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Confirm Restore Dialog ── */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-right">
              <div className="w-9 h-9 rounded-xl bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              تأكيد استعادة البيانات
            </DialogTitle>
            <DialogDescription>
              هل أنت متأكد من استعادة البيانات؟ سيتم حذف جميع البيانات الحالية واستبدالها ببيانات النسخة الاحتياطية. هذا الإجراء لا يمكن التراجع عنه.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => setConfirmDialogOpen(false)}
              className="flex-1 h-11 rounded-xl"
            >
              إلغاء
            </Button>
            <Button
              onClick={handleRestore}
              className="flex-1 h-11 rounded-xl gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              نعم، استعادة البيانات
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
