import prisma from './prisma';
import { Order } from '../domain/Order';
import { OrderItem } from '../domain/OrderItem';

export class OrderRepository {
  private static mapToDomain(record: any): Order {
    const items = (record.orderItems || []).map(
      (item: any) =>
        new OrderItem(
          item.id,
          item.orderId,
          item.productId,
          item.quantity,
          item.price,
          item.subtotal
        )
    );
    return new Order(
      record.id,
      record.userId,
      record.status as 'pending' | 'paid' | 'canceled',
      record.totalAmount,
      items,
      record.createdAt,
      record.updatedAt
    );
  }

  public static async getById(id: number, tx: any = prisma): Promise<Order | null> {
    const record = await tx.order.findUnique({
      where: { id },
      include: {
        orderItems: true,
      },
    });
    if (!record) return null;
    return this.mapToDomain(record);
  }

  public static async getByUserId(userId: number, tx: any = prisma): Promise<Order[]> {
    const records = await tx.order.findMany({
      where: { userId },
      include: {
        orderItems: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return records.map((r: any) => this.mapToDomain(r));
  }

  public static async create(order: Order, tx: any = prisma): Promise<Order> {
    // Write Order and nested OrderItems in a transaction scope
    const record = await tx.order.create({
      data: {
        userId: order.userId,
        totalAmount: order.totalAmount,
        status: order.status,
        orderItems: {
          create: order.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
            subtotal: item.subtotal,
          })),
        },
      },
      include: {
        orderItems: true,
      },
    });
    return this.mapToDomain(record);
  }

  public static async updateStatus(
    orderId: number,
    status: 'pending' | 'paid' | 'canceled',
    tx: any = prisma
  ): Promise<void> {
    await tx.order.update({
      where: { id: orderId },
      data: { status },
    });
  }
}
