import prisma from './prisma';
import { Product } from '../domain/Product';

export class ProductRepository {
  private static mapToDomain(record: any): Product {
    return new Product(
      record.id,
      record.name,
      record.sku,
      record.price,
      record.stock,
      record.status as 'active' | 'inactive',
      record.categoryId,
      record.description || undefined,
      record.createdAt,
      record.updatedAt
    );
  }

  public static async getById(id: number, tx: any = prisma): Promise<Product | null> {
    const record = await tx.product.findUnique({
      where: { id },
    });
    if (!record) return null;
    return this.mapToDomain(record);
  }

  public static async getBySku(sku: string, tx: any = prisma): Promise<Product | null> {
    const record = await tx.product.findUnique({
      where: { sku },
    });
    if (!record) return null;
    return this.mapToDomain(record);
  }

  public static async list(categoryId?: number, tx: any = prisma): Promise<Product[]> {
    const records = await tx.product.findMany({
      where: categoryId ? { categoryId } : {},
      orderBy: { id: 'asc' },
    });
    return records.map((r: any) => this.mapToDomain(r));
  }

  public static async create(product: Product, tx: any = prisma): Promise<Product> {
    const record = await tx.product.create({
      data: {
        name: product.name,
        sku: product.sku,
        description: product.description || null,
        price: product.price,
        stock: product.stock,
        status: product.status,
        categoryId: product.categoryId,
      },
    });
    return this.mapToDomain(record);
  }

  public static async update(product: Product, tx: any = prisma): Promise<Product> {
    const record = await tx.product.update({
      where: { id: product.id },
      data: {
        name: product.name,
        sku: product.sku,
        description: product.description || null,
        price: product.price,
        stock: product.stock,
        status: product.status,
        categoryId: product.categoryId,
      },
    });
    return this.mapToDomain(record);
  }

  public static async delete(id: number, tx: any = prisma): Promise<boolean> {
    await tx.product.delete({
      where: { id },
    });
    return true;
  }
}
