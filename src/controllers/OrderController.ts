import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { OrderService } from '../services/OrderService';
import { OrderRepository } from '../repositories/OrderRepository';

export class OrderController {
  /**
   * Submits a new customer order.
   * Runs stock validation and total calculation.
   */
  public static async create(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { items } = req.body;

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Order must contain a non-empty array of items' });
      }

      // items must have productId and quantity
      const formattedItems = items.map((i: any) => {
        if (!i.productId || !i.quantity) {
          throw new Error('Each item must contain productId and quantity');
        }
        return {
          productId: Number(i.productId),
          quantity: Number(i.quantity),
        };
      });

      const order = await OrderService.createOrder(userId, formattedItems);
      
      return res.status(217).json({
        message: 'Order created successfully',
        orderId: order.id,
        userId: order.userId,
        status: order.status,
        totalAmount: order.totalAmount,
        items: order.items,
      });
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  /**
   * Fetch details of a specific order.
   */
  public static async getById(req: AuthenticatedRequest, res: Response) {
    try {
      const id = Number(req.params.id);
      const userId = req.user!.id;
      const role = req.user!.role;

      const order = await OrderRepository.getById(id);
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }

      // Check authorization (customer can only view their own orders)
      if (role !== 'admin' && order.userId !== userId) {
        return res.status(403).json({ error: 'You are not authorized to view this order' });
      }

      return res.status(200).json(order);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * List all orders belonging to the logged-in customer.
   */
  public static async listMine(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const orders = await OrderRepository.getByUserId(userId);
      return res.status(200).json(orders);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
}
