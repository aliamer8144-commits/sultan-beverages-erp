import { db } from '@/lib/db'
import { withAuth, getRequestUser } from '@/lib/auth-middleware'
import { successResponse } from '@/lib/api-response'
import { logAction } from '@/lib/audit-logger'
import { hashPassword } from '@/lib/auth'
import { tryCatch } from '@/lib/api-error-handler'

// POST /api/seed — Seed database with sample data (admin only)
export const POST = withAuth(tryCatch(async (request) => {
  const user = getRequestUser(request)

  // Create users — SECURITY: Hash passwords before storing
  await db.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: { username: 'admin', password: await hashPassword('admin123'), name: 'مدير النظام', role: 'admin' },
  })
  await db.user.upsert({
    where: { username: 'cashier' },
    update: {},
    create: { username: 'cashier', password: await hashPassword('cashier123'), name: 'الكاشير', role: 'cashier' },
  })

  // Create categories
  const catData = [
    { name: 'عصائر طبيعية', icon: 'GlassWater' },
    { name: 'مشروبات غازية', icon: 'CupSoda' },
    { name: 'عصائر فواكه', icon: 'Cherry' },
    { name: 'مشروبات ساخنة', icon: 'Coffee' },
    { name: 'سموذي', icon: 'IceCreamCone' },
    { name: 'مياه ومشروبات صحية', icon: 'Droplets' },
  ]
  for (const c of catData) {
    await db.category.upsert({ where: { name: c.name }, update: {}, create: c })
  }

  const categories = await db.category.findMany()
  const catMap = Object.fromEntries(categories.map(c => [c.name, c.id]))

  // Create products
  const products = [
    { name: 'عصير برتقال طبيعي', categoryId: catMap['عصائر طبيعية'], price: 15, costPrice: 8, quantity: 50, minQuantity: 10 },
    { name: 'عصير تفاح طبيعي', categoryId: catMap['عصائر طبيعية'], price: 15, costPrice: 8, quantity: 40, minQuantity: 10 },
    { name: 'عصير مانجو', categoryId: catMap['عصائر طبيعية'], price: 18, costPrice: 10, quantity: 35, minQuantity: 8 },
    { name: 'عصير جوافة', categoryId: catMap['عصائر طبيعية'], price: 15, costPrice: 7, quantity: 30, minQuantity: 10 },
    { name: 'بيبسي 330مل', categoryId: catMap['مشروبات غازية'], price: 5, costPrice: 3, quantity: 200, minQuantity: 50 },
    { name: 'كوكاكولا 330مل', categoryId: catMap['مشروبات غازية'], price: 5, costPrice: 3, quantity: 180, minQuantity: 50 },
    { name: 'سفن أب 330مل', categoryId: catMap['مشروبات غازية'], price: 5, costPrice: 3, quantity: 150, minQuantity: 50 },
    { name: 'ميراندا برتقال 330مل', categoryId: catMap['مشروبات غازية'], price: 5, costPrice: 3, quantity: 120, minQuantity: 50 },
    { name: 'عصير فراولة', categoryId: catMap['عصائر فواكه'], price: 20, costPrice: 12, quantity: 25, minQuantity: 8 },
    { name: 'عصير رمان', categoryId: catMap['عصائر فواكه'], price: 22, costPrice: 14, quantity: 20, minQuantity: 5 },
    { name: 'عصير ليمون بالنعناع', categoryId: catMap['عصائر فواكه'], price: 12, costPrice: 5, quantity: 45, minQuantity: 10 },
    { name: 'شاهي أحمر', categoryId: catMap['مشروبات ساخنة'], price: 5, costPrice: 2, quantity: 100, minQuantity: 20 },
    { name: 'قهوة عربية', categoryId: catMap['مشروبات ساخنة'], price: 10, costPrice: 4, quantity: 80, minQuantity: 15 },
    { name: 'كابتشينو', categoryId: catMap['مشروبات ساخنة'], price: 15, costPrice: 6, quantity: 60, minQuantity: 15 },
    { name: 'سموذي فراولة', categoryId: catMap['سموذي'], price: 25, costPrice: 15, quantity: 20, minQuantity: 5 },
    { name: 'سموذي موز', categoryId: catMap['سموذي'], price: 22, costPrice: 12, quantity: 18, minQuantity: 5 },
    { name: 'سموذي مانجو', categoryId: catMap['سموذي'], price: 25, costPrice: 14, quantity: 15, minQuantity: 5 },
    { name: 'مياه معدنية 500مل', categoryId: catMap['مياه ومشروبات صحية'], price: 3, costPrice: 1.5, quantity: 300, minQuantity: 100 },
    { name: 'مياه غازية 500مل', categoryId: catMap['مياه ومشروبات صحية'], price: 3, costPrice: 1.5, quantity: 250, minQuantity: 80 },
    { name: 'عصير أناناس', categoryId: catMap['عصائر فواكه'], price: 18, costPrice: 10, quantity: 3, minQuantity: 5 },
  ]
  for (const p of products) {
    await db.product.upsert({ where: { name: p.name }, update: {}, create: p })
  }

  // Create customers
  const customers = [
    { name: 'عميل نقدي (واجهة)', phone: null as string | null },
    { name: 'أحمد محمد', phone: '0501234567' },
    { name: 'خالد العمري', phone: '0559876543' },
    { name: 'سعد الحربي', phone: '0541112233' },
  ]
  for (const c of customers) {
    await db.customer.upsert({ where: { name: c.name }, update: {}, create: c })
  }

  // Create suppliers
  const suppliers = [
    { name: 'شركة المشروبات المتحدة', phone: '0112345678', address: 'الرياض' },
    { name: 'مزرعة الفواكه الطازجة', phone: '0119876543', address: 'جدة' },
    { name: 'شركة المياه المعدنية', phone: '0115554444', address: 'الدمام' },
  ]
  for (const s of suppliers) {
    await db.supplier.upsert({ where: { name: s.name }, update: {}, create: s })
  }

  logAction({
    action: 'seed',
    entity: 'System',
    userId: user?.userId,
    userName: user?.username,
    details: { productsCount: products.length, categoriesCount: catData.length, customersCount: customers.length, suppliersCount: suppliers.length },
  })

  return successResponse({ message: 'تم زراعة البيانات بنجاح' })
}, 'خطأ غير معروف'), { requireAdmin: true })
