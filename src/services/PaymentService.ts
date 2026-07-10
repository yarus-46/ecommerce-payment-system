import prisma from '../repositories/prisma';
import { PaymentContext } from '../payments/PaymentContext';
import { PaymentRepository } from '../repositories/PaymentRepository';
import { OrderRepository } from '../repositories/OrderRepository';
import { OrderService } from './OrderService';
import { Payment } from '../domain/Payment';

const paymentContext = new PaymentContext();

export class PaymentService {
  /**
   * Initiates payment for an order using the chosen payment provider.
   * Creates a pending payment transaction.
   */
  public static async initiate(
    orderId: number,
    provider: 'stripe' | 'bkash',
    metadata?: any
  ): Promise<any> {
    const order = await OrderRepository.getById(orderId);
    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }
    if (order.status !== 'pending') {
      throw new Error(`Cannot initiate payment for an order in status: ${order.status}`);
    }

    const strategy = paymentContext.getStrategy(provider);
    const result = await strategy.initiatePayment(orderId, order.totalAmount, metadata);

    // Save payment attempt to database with pending status
    const payment = Payment.create({
      orderId,
      provider,
      transactionId: result.transactionId,
      status: result.status,
      rawResponse: result.rawResponse,
    });

    await PaymentRepository.create(payment);

    return result;
  }

  /**
   * Executes payment verification (required for bKash redirected callbacks).
   * Runs stock reduction and status changes within an atomic transaction.
   */
  public static async executeBkash(
    paymentID: string,
    orderId: number,
    amount: string
  ): Promise<Payment> {
    const strategy = paymentContext.getStrategy('bkash');

    const paymentRecord = await PaymentRepository.getByTransactionId(paymentID);
    if (!paymentRecord) {
      throw new Error(`Payment record with transaction ID ${paymentID} not found`);
    }

    const result = await strategy.executePayment(paymentID, { orderId, amount });

    // Process status update inside database transaction for safety
    return await prisma.$transaction(async (tx) => {
      let finalStatus: 'pending' | 'success' | 'failed' = 'pending';
      
      if (result.status === 'success') {
        finalStatus = 'success';
        await OrderService.fulfillOrder(orderId, tx);
      } else if (result.status === 'failed') {
        finalStatus = 'failed';
        await OrderRepository.updateStatus(orderId, 'canceled', tx);
      }

      return await PaymentRepository.updateStatus(
        paymentRecord.id,
        finalStatus,
        result.rawResponse,
        tx
      );
    });
  }

  /**
   * Processes generic webhooks from payment providers.
   * Ensures stock updates and order status are handled transactionally.
   */
  public static async processWebhook(
    provider: 'stripe' | 'bkash',
    payload: any,
    headers?: any
  ): Promise<Payment> {
    const strategy = paymentContext.getStrategy(provider);
    const result = await strategy.handleWebhook(payload, headers);

    const paymentRecord = await PaymentRepository.getByTransactionId(result.transactionId);
    if (!paymentRecord) {
      throw new Error(`Payment record with transaction ID ${result.transactionId} not found`);
    }

    return await prisma.$transaction(async (tx) => {
      let finalStatus: 'pending' | 'success' | 'failed' = 'pending';

      if (result.status === 'success') {
        finalStatus = 'success';
        await OrderService.fulfillOrder(result.orderId || paymentRecord.orderId, tx);
      } else if (result.status === 'failed') {
        finalStatus = 'failed';
        await OrderRepository.updateStatus(result.orderId || paymentRecord.orderId, 'canceled', tx);
      }

      return await PaymentRepository.updateStatus(
        paymentRecord.id,
        finalStatus,
        result.rawResponse,
        tx
      );
    });
  }
}
