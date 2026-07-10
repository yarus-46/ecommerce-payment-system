import express, { Request, Response, NextFunction } from 'express';
import apiRouter from './routes/api';

const app = express();

// Standard middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root route (API info)
app.get('/', (req: Request, res: Response) => {
  res.status(200).json({
    message: 'Welcome to the E-commerce Ordering & Payment System API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      products: '/api/products',
      categories: '/api/categories',
      orders: '/api/orders',
      payments: '/api/payments'
    }
  });
});

// Mount all API endpoints
app.use('/api', apiRouter);

// Global 404 Handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Global Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

export default app;
