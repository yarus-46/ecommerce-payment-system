import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { ProductController } from '../controllers/ProductController';
import { CategoryController } from '../controllers/CategoryController';
import { OrderController } from '../controllers/OrderController';
import { PaymentController } from '../controllers/PaymentController';
import { requireAuth, requireAdmin } from '../middleware/auth';

const router = Router();

// --- Auth Routes ---
router.post('/auth/register', AuthController.register);
router.post('/auth/login', AuthController.login);

// --- Product Routes ---
router.get('/products', ProductController.list);
router.get('/products/:id', ProductController.getById);
router.post('/admin/products', requireAuth as any, requireAdmin as any, ProductController.create);
router.put('/admin/products/:id', requireAuth as any, requireAdmin as any, ProductController.update);
router.delete('/admin/products/:id', requireAuth as any, requireAdmin as any, ProductController.delete);

// --- Category Routes ---
router.get('/categories', CategoryController.list);
router.post('/categories', requireAuth as any, requireAdmin as any, CategoryController.create);
router.get('/categories/:id/recommendations', CategoryController.getRecommendations);

// --- Order Routes ---
router.post('/orders', requireAuth as any, OrderController.create as any);
router.get('/orders/mine', requireAuth as any, OrderController.listMine as any);
router.get('/orders/:id', requireAuth as any, OrderController.getById as any);

// --- Payment Routes ---
router.post('/payments/initiate', requireAuth as any, PaymentController.initiate as any);
router.get('/payments/bkash/execute', PaymentController.executeBkash);
router.get('/payments/bkash/query', requireAuth as any, PaymentController.queryBkash as any);
router.post('/payments/stripe/webhook', PaymentController.stripeWebhook);
router.post('/payments/bkash/webhook', PaymentController.bkashWebhook);
router.get('/payments/mine', requireAuth as any, PaymentController.listMine as any);

// Simulator Portal Route (interactive UI for local testing)
router.get('/payments/bkash/mock-checkout', PaymentController.mockBkashCheckoutPage);

export default router;
