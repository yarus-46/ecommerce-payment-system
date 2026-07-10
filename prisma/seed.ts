import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Clean Database
  await prisma.payment.deleteMany({});
  await prisma.orderItem.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.category.deleteMany({});
  await prisma.user.deleteMany({});

  // 2. Create Users
  const adminPasswordHash = await bcrypt.hash('adminpassword', 10);
  const customerPasswordHash = await bcrypt.hash('customerpassword', 10);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@ecommerce.com',
      passwordHash: adminPasswordHash,
      role: 'admin',
    },
  });

  const customer = await prisma.user.create({
    data: {
      email: 'customer@ecommerce.com',
      passwordHash: customerPasswordHash,
      role: 'customer',
    },
  });

  console.log('Users seeded:', { admin: admin.email, customer: customer.email });

  // 3. Create Category Tree (Hierarchy)
  // Root Categories
  const electronics = await prisma.category.create({
    data: { name: 'Electronics' },
  });

  const fashion = await prisma.category.create({
    data: { name: 'Fashion' },
  });

  // Level 1 Subcategories
  const smartphones = await prisma.category.create({
    data: { name: 'Smartphones', parentId: electronics.id },
  });

  const laptops = await prisma.category.create({
    data: { name: 'Laptops', parentId: electronics.id },
  });

  const mensClothing = await prisma.category.create({
    data: { name: "Men's Clothing", parentId: fashion.id },
  });

  // Level 2 Subcategory (Deep hierarchy)
  const iphoneAccessories = await prisma.category.create({
    data: { name: 'iPhone Accessories', parentId: smartphones.id },
  });

  console.log('Categories seeded hierarchical tree.');

  // 4. Create Products
  const p1 = await prisma.product.create({
    data: {
      name: 'iPhone 15 Pro',
      sku: 'IPHONE15PRO',
      description: 'Latest model iPhone with titanium design.',
      price: 999.99,
      stock: 15,
      status: 'active',
      categoryId: smartphones.id,
    },
  });

  const p2 = await prisma.product.create({
    data: {
      name: 'MacBook Pro 16',
      sku: 'MBP16M3',
      description: 'Apple M3 Pro chip notebook.',
      price: 2499.99,
      stock: 5,
      status: 'active',
      categoryId: laptops.id,
    },
  });

  const p3 = await prisma.product.create({
    data: {
      name: 'Leather Jacket',
      sku: 'LEATHERJKT',
      description: 'Premium black leather jacket.',
      price: 149.99,
      stock: 50,
      status: 'active',
      categoryId: mensClothing.id,
    },
  });

  const p4 = await prisma.product.create({
    data: {
      name: 'MagSafe Charger',
      sku: 'MAGSAFECHG',
      description: 'Wireless charger for iPhone.',
      price: 39.99,
      stock: 100,
      status: 'active',
      categoryId: iphoneAccessories.id,
    },
  });

  console.log('Products seeded:', [p1.sku, p2.sku, p3.sku, p4.sku]);
  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
