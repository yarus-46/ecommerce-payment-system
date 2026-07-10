import prisma from '../repositories/prisma';
import { OrderRepository } from '../repositories/OrderRepository';
import { ProductRepository } from '../repositories/ProductRepository';
import { Order } from '../domain/Order';

export class OrderService {
  /**
   * Creates a new order.
   * Performs validation of products and stock availability.
   */
  public static async createOrder(
    userId: number,
    itemsInput: Array<{ productId: number; quantity: number }>
  ): Promise<Order> {
    if (!itemsInput || itemsInput.length === 0) {
      throw new Error('Order must contain at least one item');
    }

    // Run order validation and creation inside a transaction to prevent concurrent stock issues
    return await prisma.$transaction(async (tx) => {
      const order = Order.create(userId);

      for (const item of itemsInput) {
        const productDomain = await ProductRepository.getById(item.productId, tx);
        if (!productDomain) {
          throw new Error(`Product with ID ${item.productId} not found`);
        }
        if (!productDomain.isActive()) {
          throw new Error(`Product '${productDomain.name}' is not currently active`);
        }
        if (!productDomain.hasEnoughStock(item.quantity)) {
          throw new Error(
            `Insufficient stock for '${productDomain.name}'. Requested: ${item.quantity}, Available: ${productDomain.stock}`
          );
        }

        order.addItem(productDomain.id, item.quantity, productDomain.price);
      }

      // Save Order and nested OrderItems in database
      return await OrderRepository.create(order, tx);
    });
  }

  /**
   * Complete payment for an order and atomically reduce inventory stock.
   * Can run inside an existing transaction client for full atomicity.
   */
  public static async fulfillOrder(orderId: number, tx: any): Promise<void> {
    const order = await OrderRepository.getById(orderId, tx);
    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }

    if (order.status === 'paid') {
      // Already fulfilled (idempotent guard)
      return;
    }

    if (order.status === 'canceled') {
      throw new Error('Cannot fulfill a canceled order');
    }

    // Safely reduce stock for each product in the order
    for (const item of order.items) {
      const product = await ProductRepository.getById(item.productId, tx);
      if (!product) {
        throw new Error(`Product ${item.productId} not found during fulfillment`);
      }

      // Reduce stock locally in Domain Entity (verifies stock >= quantity)
      product.reduceStock(item.quantity);

      // Persist updated stock
      await ProductRepository.update(product, tx);
    }

    // Mark order as paid
    await OrderRepository.updateStatus(orderId, 'paid', tx);
  }
}
