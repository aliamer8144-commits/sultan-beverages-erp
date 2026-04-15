'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Switch } from '@/components/ui/switch'
import { useAppStore } from '@/store/app-store'
import { useApi } from '@/hooks/use-api'
import { useFormValidation } from '@/hooks/use-form-validation'
import { createUserSchema, editUserSchema } from '@/lib/validations'
import { EmptyState } from '@/components/empty-state'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, UserCog, Shield, ShieldCheck } from 'lucide-react'
import { formatDateShortMonth } from '@/lib/date-utils'

interface UserRow {
  id: string
  username: string
  name: string
  role: string
  isActive: boolean
  createdAt: string
}

interface UserFormData {
  username: string
  password: string
  name: string
  role: string
  isActive: boolean
}

const emptyForm: UserFormData = {
  username: '',
  password: '',
  name: '',
  role: 'cashier',
  isActive: true,
}

export function UsersScreen() {
  const { user: currentUser } = useAppStore()
  const { get, post, put, del } = useApi()

  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)

  // Dialog states
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  // Form state
  const [addForm, setAddForm] = useState<UserFormData>({ ...emptyForm })
  const [editForm, setEditForm] = useState<UserFormData>({ ...emptyForm })
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [deletingUser, setDeletingUser] = useState<UserRow | null>(null)

  // Submitting states
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Validation
  const addV = useFormValidation({ schema: createUserSchema })
  const editV = useFormValidation({ schema: editUserSchema })

  // ─── Fetch users ───────────────────────────────────────────────
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true)
      const result = await get<UserRow[]>('/api/users')
      if (result) {
        setUsers(result)
      }
    } finally {
      setLoading(false)
    }
  }, [get])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  // ─── Add user ──────────────────────────────────────────────────
  const handleAdd = async () => {
    if (!addV.validate({
      username: addForm.username,
      password: addForm.password,
      name: addForm.name,
    })) return

    setSubmitting(true)
    try {
      const result = await post('/api/users', {
        username: addForm.username,
        password: addForm.password,
        name: addForm.name,
        role: addForm.role,
      }, { showSuccessToast: true, successMessage: `تم إضافة المستخدم "${addForm.name}" بنجاح` })
      if (result) {
        setAddForm({ ...emptyForm })
        addV.clearAllErrors()
        setAddDialogOpen(false)
        fetchUsers()
      }
    } finally {
      setSubmitting(false)
    }
  }

  // ─── Edit user ─────────────────────────────────────────────────
  const openEditDialog = (user: UserRow) => {
    setEditingUserId(user.id)
    setEditForm({
      username: user.username,
      password: '',
      name: user.name,
      role: user.role,
      isActive: user.isActive,
    })
    setEditDialogOpen(true)
  }

  const handleEdit = async () => {
    if (!editV.validate({
      name: editForm.name,
      password: editForm.password,
    })) return

    setSubmitting(true)
    try {
      const result = await put(`/api/users/${editingUserId}`, {
        name: editForm.name,
        role: editForm.role,
        isActive: editForm.isActive,
        password: editForm.password || undefined,
      }, { showSuccessToast: true, successMessage: `تم تحديث بيانات المستخدم "${editForm.name}" بنجاح` })
      if (result) {
        setEditDialogOpen(false)
        setEditingUserId(null)
        setEditForm({ ...emptyForm })
        fetchUsers()
      }
    } finally {
      setSubmitting(false)
    }
  }

  // ─── Delete user ───────────────────────────────────────────────
  const openDeleteDialog = (user: UserRow) => {
    if (user.id === currentUser?.id) {
      toast.error('لا يمكنك حذف حسابك الخاص')
      return
    }
    setDeletingUser(user)
    setDeleteDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!deletingUser) return

    setDeleting(true)
    try {
      const ok = await del(`/api/users/${deletingUser.id}`, { successMessage: `تم حذف المستخدم "${deletingUser.name}" بنجاح` })
      if (ok) {
        setDeleteDialogOpen(false)
        setDeletingUser(null)
        fetchUsers()
      }
    } finally {
      setDeleting(false)
    }
  }

  // ─── Render helpers ────────────────────────────────────────────
  // formatDateShortMonth imported from @/lib/date-utils

  // ─── Skeleton loader ──────────────────────────────────────────
  if (loading) {
    return (
      <div className="h-full overflow-y-auto p-4 md:p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header skeleton */}
          <div className="flex items-center justify-between">
            <div className="h-8 w-48 rounded-lg bg-muted animate-pulse" />
            <div className="h-10 w-36 rounded-xl bg-muted animate-pulse" />
          </div>
          {/* Table skeleton */}
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="h-4 flex-1 rounded bg-muted animate-pulse" />
                    <div className="h-4 w-24 rounded bg-muted animate-pulse" />
                    <div className="h-4 w-20 rounded bg-muted animate-pulse" />
                    <div className="h-4 w-16 rounded bg-muted animate-pulse" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          {/* Permissions card skeleton */}
          <div className="h-40 rounded-2xl bg-muted animate-pulse" />
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6 animate-fade-in-up">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* ─── Header ─────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <UserCog className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">إدارة المستخدمين والصلاحيات</h2>
              <p className="text-sm text-muted-foreground">
                {users.length} مستخدم مسجل
              </p>
            </div>
          </div>
          <Button
            onClick={() => {
              setAddForm({ ...emptyForm })
              setAddDialogOpen(true)
            }}
            className="rounded-xl h-10 gap-2 shadow-md shadow-primary/20"
          >
            <Plus className="w-4 h-4" />
            إضافة مستخدم
          </Button>
        </div>

        {/* ─── Users Table ────────────────────────────────────── */}
        <Card className="overflow-hidden card-hover">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-sm font-semibold text-foreground/80">
                      الاسم
                    </TableHead>
                    <TableHead className="text-sm font-semibold text-foreground/80">
                      اسم المستخدم
                    </TableHead>
                    <TableHead className="text-sm font-semibold text-foreground/80">
                      الدور
                    </TableHead>
                    <TableHead className="text-sm font-semibold text-foreground/80">
                      الحالة
                    </TableHead>
                    <TableHead className="text-sm font-semibold text-foreground/80 hidden md:table-cell">
                      تاريخ التسجيل
                    </TableHead>
                    <TableHead className="text-sm font-semibold text-foreground/80 text-left">
                      الإجراءات
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-48 p-0">
                        <EmptyState
                          icon={UserCog}
                          title="لا يوجد مستخدمين بعد"
                          description='اضغط على "إضافة مستخدم" لإنشاء مستخدم جديد'
                          action={(
                            <Button onClick={() => { setAddForm({ ...emptyForm }); setAddDialogOpen(true) }}>
                              <Plus className="w-4 h-4" /> إضافة مستخدم
                            </Button>
                          )}
                          compact
                        />
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((user) => (
                      <TableRow key={user.id} className="group">
                        {/* Name */}
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                                user.role === 'admin'
                                  ? 'bg-primary/10 text-primary'
                                  : 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400'
                              }`}
                            >
                              {user.name.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-foreground truncate">
                                {user.name}
                              </p>
                              {user.id === currentUser?.id && (
                                <p className="text-[10px] text-primary font-medium">(أنت)</p>
                              )}
                            </div>
                          </div>
                        </TableCell>

                        {/* Username */}
                        <TableCell>
                          <code className="text-xs bg-muted px-2 py-1 rounded-md font-mono">
                            {user.username}
                          </code>
                        </TableCell>

                        {/* Role */}
                        <TableCell>
                          <Badge
                            variant={user.role === 'admin' ? 'default' : 'secondary'}
                            className="rounded-lg text-xs font-semibold gap-1"
                          >
                            {user.role === 'admin' ? (
                              <ShieldCheck className="w-3 h-3" />
                            ) : (
                              <Shield className="w-3 h-3" />
                            )}
                            {user.role === 'admin' ? 'مدير' : 'كاشير'}
                          </Badge>
                        </TableCell>

                        {/* Status */}
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={user.isActive}
                              disabled={user.id === currentUser?.id}
                              onCheckedChange={async (checked) => {
                                // Inline toggle via edit
                                setEditingUserId(user.id)
                                setEditForm({
                                  username: user.username,
                                  password: '',
                                  name: user.name,
                                  role: user.role,
                                  isActive: checked,
                                })
                                // Fire the update immediately
                                const result = await put(`/api/users/${user.id}`, {
                                  name: user.name,
                                  role: user.role,
                                  isActive: checked,
                                }, {
                                  showSuccessToast: true,
                                  successMessage: checked ? 'تم تفعيل المستخدم' : 'تم تعطيل المستخدم',
                                })
                                if (result) {
                                  fetchUsers()
                                }
                              }}
                              className="scale-90"
                            />
                            <span
                              className={`text-xs font-medium ${
                                user.isActive ? 'badge-active px-2 py-0.5 rounded-full' : 'badge-inactive px-2 py-0.5 rounded-full'
                              }`}
                            >
                              {user.isActive ? 'نشط' : 'معطل'}
                            </span>
                          </div>
                        </TableCell>

                        {/* Created At */}
                        <TableCell className="hidden md:table-cell">
                          <span className="text-xs text-muted-foreground">
                            {formatDateShortMonth(user.createdAt)}
                          </span>
                        </TableCell>

                        {/* Actions */}
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 rounded-lg hover:bg-primary/10 hover:text-primary"
                              onClick={() => openEditDialog(user)}
                              aria-label="تعديل"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className={`h-8 w-8 p-0 rounded-lg hover:bg-destructive/10 hover:text-destructive ${
                                user.id === currentUser?.id
                                  ? 'opacity-30 pointer-events-none'
                                  : ''
                              }`}
                              onClick={() => openDeleteDialog(user)}
                              disabled={user.id === currentUser?.id}
                              aria-label="حذف"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* ─── Role Permissions Info ──────────────────────────── */}
        <Card className="border-primary/10 animated-gradient-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary" />
              صلاحيات الأدوار
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 stagger-children">
              {/* Admin */}
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                    <ShieldCheck className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">مدير (Admin)</p>
                    <p className="text-[10px] text-muted-foreground">صلاحيات كاملة</p>
                  </div>
                </div>
                <ul className="text-xs text-foreground/70 space-y-1.5 pr-4">
                  <li className="flex items-start gap-1.5">
                    <span className="text-primary mt-0.5">●</span>
                    الوصول الكامل لجميع الشاشات والصلاحيات
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-primary mt-0.5">●</span>
                    إدارة المستخدمين والصلاحيات
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-primary mt-0.5">●</span>
                    عرض التقارير والإحصائيات
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-primary mt-0.5">●</span>
                    إدارة المشتريات والموردين
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-primary mt-0.5">●</span>
                    إنشاء وتعديل وحذف الفواتير
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-primary mt-0.5">●</span>
                    إدارة المخزون والمنتجات
                  </li>
                </ul>
              </div>

              {/* Cashier */}
              <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center">
                    <Shield className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">كاشير (Cashier)</p>
                    <p className="text-[10px] text-muted-foreground">صلاحيات محدودة</p>
                  </div>
                </div>
                <ul className="text-xs text-foreground/70 space-y-1.5 pr-4">
                  <li className="flex items-start gap-1.5">
                    <span className="text-orange-500 mt-0.5">●</span>
                    نقطة البيع - إنشاء فواتير المبيعات
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-orange-500 mt-0.5">●</span>
                    العملاء - إدارة بيانات العملاء
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-orange-500 mt-0.5">●</span>
                    عرض المخزون فقط (قراءة)
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-red-400 mt-0.5">●</span>
                    <span className="text-red-500 dark:text-red-400">لا يمكنه حذف الفواتير</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-red-400 mt-0.5">●</span>
                    <span className="text-red-500 dark:text-red-400">لا يمكنه الوصول للتقارير</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-red-400 mt-0.5">●</span>
                    <span className="text-red-500 dark:text-red-400">لا يمكنه إدارة المشتريات والموردين</span>
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ═══════════════════════════════════════════════════════ */}
        {/* ─── ADD USER DIALOG ─────────────────────────────────── */}
        {/* ═══════════════════════════════════════════════════════ */}
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogContent className="sm:max-w-md glass-card" dir="rtl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg font-bold">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Plus className="w-4 h-4 text-primary" />
                </div>
                إضافة مستخدم جديد
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="add-name" className="text-sm font-medium">
                  الاسم الكامل <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="add-name"
                  placeholder="مثال: أحمد محمد"
                  value={addForm.name}
                  onChange={(e) => {
                    setAddForm({ ...addForm, name: e.target.value })
                    addV.clearFieldError('name')
                  }}
                  className="h-11 rounded-xl"
                />
                {addV.errors.name && (
                  <p className="text-sm text-destructive">{addV.errors.name}</p>
                )}
              </div>

              {/* Username */}
              <div className="space-y-2">
                <Label htmlFor="add-username" className="text-sm font-medium">
                  اسم المستخدم <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="add-username"
                  placeholder="مثال: ahmed"
                  value={addForm.username}
                  onChange={(e) => {
                    setAddForm({ ...addForm, username: e.target.value })
                    addV.clearFieldError('username')
                  }}
                  className="h-11 rounded-xl font-mono text-sm"
                  dir="ltr"
                />
                {addV.errors.username && (
                  <p className="text-sm text-destructive">{addV.errors.username}</p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="add-password" className="text-sm font-medium">
                  كلمة المرور <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="add-password"
                  type="password"
                  placeholder="4 أحرف على الأقل"
                  value={addForm.password}
                  onChange={(e) => {
                    setAddForm({ ...addForm, password: e.target.value })
                    addV.clearFieldError('password')
                  }}
                  className="h-11 rounded-xl"
                />
                {addV.errors.password && (
                  <p className="text-sm text-destructive">{addV.errors.password}</p>
                )}
              </div>

              {/* Role */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">الدور</Label>
                <Select
                  value={addForm.role}
                  onValueChange={(val) => setAddForm({ ...addForm, role: val })}
                >
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">
                      <span className="flex items-center gap-2">
                        <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                        مدير
                      </span>
                    </SelectItem>
                    <SelectItem value="cashier">
                      <span className="flex items-center gap-2">
                        <Shield className="w-3.5 h-3.5" />
                        كاشير
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => setAddDialogOpen(false)}
                className="rounded-xl"
                disabled={submitting}
              >
                إلغاء
              </Button>
              <Button
                onClick={handleAdd}
                disabled={submitting}
                className="rounded-xl shadow-md shadow-primary/20"
              >
                {submitting ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    جاري الإضافة...
                  </div>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    إضافة
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ═══════════════════════════════════════════════════════ */}
        {/* ─── EDIT USER DIALOG ────────────────────────────────── */}
        {/* ═══════════════════════════════════════════════════════ */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="sm:max-w-md glass-card" dir="rtl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg font-bold">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Pencil className="w-4 h-4 text-primary" />
                </div>
                تعديل بيانات المستخدم
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="edit-name" className="text-sm font-medium">
                  الاسم الكامل <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="edit-name"
                  placeholder="الاسم الكامل"
                  value={editForm.name}
                  onChange={(e) => {
                    setEditForm({ ...editForm, name: e.target.value })
                    editV.clearFieldError('name')
                  }}
                  className="h-11 rounded-xl"
                />
                {editV.errors.name && (
                  <p className="text-sm text-destructive">{editV.errors.name}</p>
                )}
              </div>

              {/* Username (read-only) */}
              <div className="space-y-2">
                <Label htmlFor="edit-username" className="text-sm font-medium">
                  اسم المستخدم
                </Label>
                <Input
                  id="edit-username"
                  value={editForm.username}
                  disabled
                  className="h-11 rounded-xl bg-muted/50 font-mono text-sm"
                  dir="ltr"
                />
                <p className="text-[10px] text-muted-foreground">لا يمكن تغيير اسم المستخدم</p>
              </div>

              {/* Password (optional) */}
              <div className="space-y-2">
                <Label htmlFor="edit-password" className="text-sm font-medium">
                  كلمة المرور الجديدة
                  <span className="text-muted-foreground font-normal"> (اختياري)</span>
                </Label>
                <Input
                  id="edit-password"
                  type="password"
                  placeholder="اتركها فارغة للإبقاء على كلمة المرور الحالية"
                  value={editForm.password}
                  onChange={(e) => {
                    setEditForm({ ...editForm, password: e.target.value })
                    editV.clearFieldError('password')
                  }}
                  className="h-11 rounded-xl"
                />
                {editV.errors.password && (
                  <p className="text-sm text-destructive">{editV.errors.password}</p>
                )}
              </div>

              {/* Role */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">الدور</Label>
                <Select
                  value={editForm.role}
                  onValueChange={(val) => setEditForm({ ...editForm, role: val })}
                >
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">
                      <span className="flex items-center gap-2">
                        <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                        مدير
                      </span>
                    </SelectItem>
                    <SelectItem value="cashier">
                      <span className="flex items-center gap-2">
                        <Shield className="w-3.5 h-3.5" />
                        كاشير
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Status */}
              <div className="flex items-center justify-between rounded-xl border p-3">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">حالة الحساب</Label>
                  <p className="text-[10px] text-muted-foreground">
                    تعطيل الحساب يمنع المستخدم من تسجيل الدخول
                  </p>
                </div>
                <Switch
                  checked={editForm.isActive}
                  onCheckedChange={(checked) =>
                    setEditForm({ ...editForm, isActive: checked })
                  }
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => setEditDialogOpen(false)}
                className="rounded-xl"
                disabled={submitting}
              >
                إلغاء
              </Button>
              <Button
                onClick={handleEdit}
                disabled={submitting}
                className="rounded-xl shadow-md shadow-primary/20"
              >
                {submitting ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    جاري الحفظ...
                  </div>
                ) : (
                  <>
                    <Pencil className="w-4 h-4" />
                    حفظ التعديلات
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ═══════════════════════════════════════════════════════ */}
        {/* ─── DELETE USER DIALOG ──────────────────────────────── */}
        {/* ═══════════════════════════════════════════════════════ */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent className="sm:max-w-md" dir="rtl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg font-bold text-destructive">
                <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center">
                  <Trash2 className="w-4 h-4 text-destructive" />
                </div>
                تأكيد حذف المستخدم
              </DialogTitle>
            </DialogHeader>

            {deletingUser && (
              <div className="py-4 space-y-4">
                <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-center space-y-2">
                  <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
                    <Trash2 className="w-7 h-7 text-destructive" />
                  </div>
                  <p className="text-sm text-foreground">
                    هل أنت متأكد من حذف المستخدم
                  </p>
                  <p className="text-base font-bold text-destructive">
                    &quot;{deletingUser.name}&quot;
                  </p>
                  <p className="text-xs text-muted-foreground">
                    هذا الإجراء لا يمكن التراجع عنه وسيتم حذف جميع البيانات المرتبطة بالمستخدم
                  </p>
                </div>
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => setDeleteDialogOpen(false)}
                className="rounded-xl"
                disabled={deleting}
              >
                إلغاء
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-xl"
              >
                {deleting ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    جاري الحذف...
                  </div>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    حذف نهائي
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
