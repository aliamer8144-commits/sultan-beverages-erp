import { db } from '@/lib/db'
import { hashPassword } from '@/lib/auth'

async function main() {
  console.log('🌱 Seeding database...')

  // Create admin user (password hashed with bcrypt)
  await db.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password: await hashPassword('admin123'),
      name: 'مدير النظام',
      role: 'admin',
    },
  })

  // Create cashier user (password hashed with bcrypt)
  await db.user.upsert({
    where: { username: 'cashier' },
    update: {},
    create: {
      username: 'cashier',
      password: await hashPassword('cashier123'),
      name: 'الكاشير',
      role: 'cashier',
    },
  })

  console.log('✅ Users created')

  // Create categories
  await db.category.upsert({ where: { name: 'عصائر طبيعية' }, update: {}, create: { name: 'عصائر طبيعية', icon: 'GlassWater' } })
  await db.category.upsert({ where: { name: 'مشروبات غازية' }, update: {}, create: { name: 'مشروبات غازية', icon: 'CupSoda' } })
  await db.category.upsert({ where: { name: 'عصائر فواكه' }, update: {}, create: { name: 'عصائر فواكه', icon: 'Cherry' } })
  await db.category.upsert({ where: { name: 'مشروبات ساخنة' }, update: {}, create: { name: 'مشروبات ساخنة', icon: 'Coffee' } })
  await db.category.upsert({ where: { name: 'سموذي' }, update: {}, create: { name: 'سموذي', icon: 'IceCreamCone' } })
  await db.category.upsert({ where: { name: 'مياه ومشروبات صحية' }, update: {}, create: { name: 'مياه ومشروبات صحية', icon: 'Droplets' } })

  console.log('✅ Categories created')

  // Get categories
  const categories = await db.category.findMany()

  // Create products (upsert by name since we added @unique)
  const products = [
    { name: 'عصير برتقال طبيعي', categoryId: categories.find(c => c.name === 'عصائر طبيعية')!.id, price: 15, costPrice: 8, quantity: 50, minQuantity: 10 },
    { name: 'عصير تفاح طبيعي', categoryId: categories.find(c => c.name === 'عصائر طبيعية')!.id, price: 15, costPrice: 8, quantity: 40, minQuantity: 10 },
    { name: 'عصير مانجو', categoryId: categories.find(c => c.name === 'عصائر طبيعية')!.id, price: 18, costPrice: 10, quantity: 35, minQuantity: 8 },
    { name: 'عصير جوافة', categoryId: categories.find(c => c.name === 'عصائر طبيعية')!.id, price: 15, costPrice: 7, quantity: 30, minQuantity: 10 },
    { name: 'بيبسي 330مل', categoryId: categories.find(c => c.name === 'مشروبات غازية')!.id, price: 5, costPrice: 3, quantity: 200, minQuantity: 50 },
    { name: 'كوكاكولا 330مل', categoryId: categories.find(c => c.name === 'مشروبات غازية')!.id, price: 5, costPrice: 3, quantity: 180, minQuantity: 50 },
    { name: 'سفن أب 330مل', categoryId: categories.find(c => c.name === 'مشروبات غازية')!.id, price: 5, costPrice: 3, quantity: 150, minQuantity: 50 },
    { name: 'ميراندا برتقال 330مل', categoryId: categories.find(c => c.name === 'مشروبات غازية')!.id, price: 5, costPrice: 3, quantity: 120, minQuantity: 50 },
    { name: 'عصير فراولة', categoryId: categories.find(c => c.name === 'عصائر فواكه')!.id, price: 20, costPrice: 12, quantity: 25, minQuantity: 8 },
    { name: 'عصير رمان', categoryId: categories.find(c => c.name === 'عصائر فواكه')!.id, price: 22, costPrice: 14, quantity: 20, minQuantity: 5 },
    { name: 'عصير ليمون بالنعناع', categoryId: categories.find(c => c.name === 'عصائر فواكه')!.id, price: 12, costPrice: 5, quantity: 45, minQuantity: 10 },
    { name: 'شاهي أحمر', categoryId: categories.find(c => c.name === 'مشروبات ساخنة')!.id, price: 5, costPrice: 2, quantity: 100, minQuantity: 20 },
    { name: 'قهوة عربية', categoryId: categories.find(c => c.name === 'مشروبات ساخنة')!.id, price: 10, costPrice: 4, quantity: 80, minQuantity: 15 },
    { name: 'كابتشينو', categoryId: categories.find(c => c.name === 'مشروبات ساخنة')!.id, price: 15, costPrice: 6, quantity: 60, minQuantity: 15 },
    { name: 'سموذي فراولة', categoryId: categories.find(c => c.name === 'سموذي')!.id, price: 25, costPrice: 15, quantity: 20, minQuantity: 5 },
    { name: 'سموذي موز', categoryId: categories.find(c => c.name === 'سموذي')!.id, price: 22, costPrice: 12, quantity: 18, minQuantity: 5 },
    { name: 'سموذي مانجو', categoryId: categories.find(c => c.name === 'سموذي')!.id, price: 25, costPrice: 14, quantity: 15, minQuantity: 5 },
    { name: 'مياه معدنية 500مل', categoryId: categories.find(c => c.name === 'مياه ومشروبات صحية')!.id, price: 3, costPrice: 1.5, quantity: 300, minQuantity: 100 },
    { name: 'مياه غازية 500مل', categoryId: categories.find(c => c.name === 'مياه ومشروبات صحية')!.id, price: 3, costPrice: 1.5, quantity: 250, minQuantity: 80 },
    { name: 'عصير أناناس', categoryId: categories.find(c => c.name === 'عصائر فواكه')!.id, price: 18, costPrice: 10, quantity: 3, minQuantity: 5 },
  ]

  for (const product of products) {
    await db.product.upsert({
      where: { name: product.name },
      update: {},
      create: product,
    })
  }

  console.log('✅ Products created:', products.length)

  // Create sample customers (upsert by name)
  const customers = [
    { name: 'عميل نقدي (واجهة)', phone: null },
    { name: 'أحمد محمد', phone: '0501234567' },
    { name: 'خالد العمري', phone: '0559876543' },
    { name: 'سعد الحربي', phone: '0541112233' },
  ]

  for (const customer of customers) {
    await db.customer.upsert({
      where: { name: customer.name },
      update: {},
      create: customer,
    })
  }

  console.log('✅ Customers created:', customers.length)

  // Create sample suppliers (upsert by name)
  const suppliers = [
    { name: 'شركة المشروبات المتحدة', phone: '0112345678', address: 'الرياض' },
    { name: 'مزرعة الفواكه الطازجة', phone: '0119876543', address: 'جدة' },
    { name: 'شركة المياه المعدنية', phone: '0115554444', address: 'الدمام' },
  ]

  for (const supplier of suppliers) {
    await db.supplier.upsert({
      where: { name: supplier.name },
      update: {},
      create: supplier,
    })
  }

  console.log('✅ Suppliers created:', suppliers.length)
  console.log('🎉 Seeding completed!')
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
