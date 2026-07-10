import { User } from '../src/domain/User';
import { Product } from '../src/domain/Product';
import { Order } from '../src/domain/Order';
import { OrderItem } from '../src/domain/OrderItem';
import { Payment } from '../src/domain/Payment';

describe('Domain Models Unit Tests', () => {
  
  describe('User Domain Model', () => {
    it('should create a valid user', () => {
      const user = User.create('john@example.com', 'hashedpassword', 'customer');
      expect(user.email).toBe('john@example.com');
      expect(user.role).toBe('customer');
      expect(user.isAdmin()).toBe(false);
    });

    it('should throw an error for invalid email formats', () => {
      expect(() => User.create('invalid-email', 'hashedpassword')).toThrow('Invalid email format');
    });

    it('should detect admin roles correctly', () => {
      const admin = User.create('admin@example.com', 'hashedpassword', 'admin');
      expect(admin.isAdmin()).toBe(true);
    });
  });

  describe('Product Domain Model', () => {
    it('should create a valid product', () => {
      const product = Product.create({
        name: 'Laptop',
        sku: 'LAP123',
        price: 999.99,
        stock: 10,
        categoryId: 1
      });
      expect(product.name).toBe('Laptop');
      expect(product.stock).toBe(10);
      expect(product.isActive()).toBe(true);
    });

    it('should reject invalid price or stock values', () => {
      expect(() => Product.create({ name: 'L', sku: 'S', price: -5, stock: 10, categoryId: 1 })).toThrow();
      expect(() => Product.create({ name: 'L', sku: 'S', price: 10, stock: -1, categoryId: 1 })).toThrow();
    });

    it('should manage stock levels correctly', () => {
      const product = Product.create({ name: 'L', sku: 'S', price: 100, stock: 5, categoryId: 1 });
      expect(product.hasEnoughStock(3)).toBe(true);
      expect(product.hasEnoughStock(6)).toBe(false);

      product.reduceStock(3);
      expect(product.stock).toBe(2);

      product.increaseStock(5);
      expect(product.stock).toBe(7);
    });

    it('should throw error when stock goes negative', () => {
      const product = Product.create({ name: 'L', sku: 'S', price: 100, stock: 2, categoryId: 1 });
      expect(() => product.reduceStock(3)).toThrow('Insufficient stock');
    });
  });

  describe('Order & OrderItem Domain Models', () => {
    it('should calculate totals and subtotals deterministically', () => {
      const order = Order.create(1, 100);
      expect(order.totalAmount).toBe(0);
      expect(order.status).toBe('pending');

      order.addItem(10, 2, 49.99); // Subtotal: 99.98
      expect(order.items.length).toBe(1);
      expect(order.items[0].subtotal).toBe(99.98);
      expect(order.totalAmount).toBe(99.98);

      order.addItem(11, 1, 150.00); // Subtotal: 150.00
      expect(order.totalAmount).toBe(249.98);
    });

    it('should guard order state changes', () => {
      const order = Order.create(1, 100);
      expect(order.status).toBe('pending');
      
      order.pay();
      expect(order.status).toBe('paid');

      expect(() => order.cancel()).toThrow('Cannot cancel an order in paid status');
    });
  });

  describe('Payment Domain Model', () => {
    it('should create valid payment entities', () => {
      const payment = Payment.create({
        orderId: 100,
        provider: 'stripe',
        transactionId: 'pi_test123',
        status: 'success',
        rawResponse: { id: 'pi_test123' }
      });
      expect(payment.provider).toBe('stripe');
      expect(payment.isSuccessful()).toBe(true);
    });
  });

});
