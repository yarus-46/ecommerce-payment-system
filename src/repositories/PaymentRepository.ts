import prisma from './prisma';
import { Payment } from '../domain/Payment';

export class PaymentRepository {
  private static mapToDomain(record: any): Payment {
    return new Payment(
      record.id,
      record.orderId,
      record.provider as 'stripe' | 'bkash',
      record.transactionId,
      record.status as 'pending' | 'success' | 'failed',
      record.rawResponse,
      record.createdAt,
      record.updatedAt
    );
  }

  public static async getById(id: number, tx: any = prisma): Promise<Payment | null> {
    const record = await tx.payment.findUnique({
      where: { id },
    });
    if (!record) return null;
    return this.mapToDomain(record);
  }

  public static async getByTransactionId(transactionId: string, tx: any = prisma): Promise<Payment | null> {
    const record = await tx.payment.findUnique({
      where: { transactionId },
    });
    if (!record) return null;
    return this.mapToDomain(record);
  }

  public static async getByOrderId(orderId: number, tx: any = prisma): Promise<Payment[]> {
    const records = await tx.payment.findMany({
      where: { orderId },
      orderBy: { createdAt: 'desc' },
    });
    return records.map((r: any) => this.mapToDomain(r));
  }

  public static async getByUserId(userId: number, tx: any = prisma): Promise<Payment[]> {
    const records = await tx.payment.findMany({
      where: {
        order: {
          userId,
        },
      },
      include: {
        order: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return records.map((r: any) => this.mapToDomain(r));
  }

  public static async create(payment: Payment, tx: any = prisma): Promise<Payment> {
    const record = await tx.payment.create({
      data: {
        orderId: payment.orderId,
        provider: payment.provider,
        transactionId: payment.transactionId,
        status: payment.status,
        rawResponse: payment.rawResponse || {},
      },
    });
    return this.mapToDomain(record);
  }

  public static async updateStatus(
    paymentId: number,
    status: 'pending' | 'success' | 'failed',
    rawResponse: any,
    tx: any = prisma
  ): Promise<Payment> {
    const record = await tx.payment.update({
      where: { id: paymentId },
      data: {
        status,
        rawResponse: rawResponse || {},
      },
    });
    return this.mapToDomain(record);
  }
}
