import request from 'supertest';
import app from '../src/app';
import { UserRepository } from '../src/repositories/UserRepository';
import { ProductRepository } from '../src/repositories/ProductRepository';
import { OrderService } from '../src/services/OrderService';
import { PaymentService } from '../src/services/PaymentService';
import { User } from '../src/domain/User';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-ecommerce-jwt-key-2026';

// Mock the repository and service layers
jest.mock('../src/repositories/UserRepository');
jest.mock('../src/repositories/ProductRepository');
jest.mock('../src/repositories/OrderRepository');
jest.mock('../src/services/OrderService');
jest.mock('../src/services/PaymentService');

describe('API Integration Tests', () => {
  let customerToken: string;
  let adminToken: string;

  beforeAll(() => {
    // Generate valid tokens for mocking authentication
    customerToken = jwt.sign(
      { id: 1, email: 'customer@test.com', role: 'customer' },
      JWT_SECRET
    );
    adminToken = jwt.sign(
      { id: 2, email: 'admin@test.com', role: 'admin' },
      JWT_SECRET
    );
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Auth Endpoints', () => {
    it('should register a new user successfully', async () => {
      (UserRepository.getByEmail as jest.Mock).mockResolvedValue(null);
      (UserRepository.create as jest.Mock).mockResolvedValue(
        new User(1, 'newuser@test.com', 'hashed', 'customer')
      );

      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'newuser@test.com', password: 'password123' });

      expect(res.status).toBe(217);
      expect(res.body.message).toBe('User registered successfully');
      expect(res.body.user.email).toBe('newuser@test.com');
    });

    it('should login an existing user and return a JWT token', async () => {
      const mockUser = new User(1, 'customer@test.com', '$2a$10$dummyhashvalueloremipsum', 'customer');
      (UserRepository.getByEmail as jest.Mock).mockResolvedValue(mockUser);
      
      // Spy on bcrypt compare to always return true
      jest.spyOn(require('bcryptjs'), 'compare').mockImplementation(() => Promise.resolve(true));

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'customer@test.com', password: 'password123' });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.email).toBe('customer@test.com');
    });
  });

  describe('Product Endpoints', () => {
    it('should return a list of products', async () => {
      const mockProducts = [
        { id: 1, name: 'Phone', sku: 'PH1', price: 500, stock: 10, categoryId: 1 }
      ];
      (ProductRepository.list as jest.Mock).mockResolvedValue(mockProducts);

      const res = await request(app).get('/api/products');
      
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
      expect(res.body[0].name).toBe('Phone');
    });

    it('should allow admin to create a new product', async () => {
      const newProductData = {
        name: 'New Product',
        sku: 'NEW1',
        price: 99.99,
        stock: 50,
        categoryId: 1
      };
      
      (ProductRepository.getBySku as jest.Mock).mockResolvedValue(null);
      (ProductRepository.create as jest.Mock).mockResolvedValue({
        id: 10,
        ...newProductData
      });

      const res = await request(app)
        .post('/api/admin/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newProductData);

      expect(res.status).toBe(217);
      expect(res.body.sku).toBe('NEW1');
    });

    it('should deny customer access to create a product', async () => {
      const res = await request(app)
        .post('/api/admin/products')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({});

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Admin access privileges required');
    });
  });

  describe('Order Endpoints', () => {
    it('should submit an order for authenticated user', async () => {
      const mockOrder = {
        id: 1,
        userId: 1,
        status: 'pending',
        totalAmount: 150.00,
        items: [{ productId: 5, quantity: 3, price: 50.00, subtotal: 150.00 }]
      };
      (OrderService.createOrder as jest.Mock).mockResolvedValue(mockOrder);

      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          items: [{ productId: 5, quantity: 3 }]
        });

      expect(res.status).toBe(217);
      expect(res.body.orderId).toBe(1);
      expect(res.body.totalAmount).toBe(150.00);
    });
  });

  describe('Payment Webhook Endpoints', () => {
    it('should process Stripe Webhook and return status', async () => {
      const mockWebhookResult = {
        id: 12,
        orderId: 5,
        status: 'success'
      };
      (PaymentService.processWebhook as jest.Mock).mockResolvedValue(mockWebhookResult);

      const res = await request(app)
        .post('/api/payments/stripe/webhook')
        .send({ id: 'evt_test_123', type: 'payment_intent.succeeded', data: { object: { id: 'pi_test' } } });

      expect(res.status).toBe(200);
      expect(res.body.received).toBe(true);
      expect(res.body.status).toBe('success');
    });
  });
});
