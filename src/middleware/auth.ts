import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-ecommerce-jwt-key-2026';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: 'admin' | 'customer';
  };
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization token missing or malformed' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: number;
      email: string;
      role: 'admin' | 'customer';
    };
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired authorization token' });
  }
}

export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access privileges required' });
  }
  next();
}
