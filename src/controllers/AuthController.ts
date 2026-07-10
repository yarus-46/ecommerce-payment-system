import { Request, Response } from 'express';
import * as bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../domain/User';
import { UserRepository } from '../repositories/UserRepository';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-ecommerce-jwt-key-2026';

export class AuthController {
  public static async register(req: Request, res: Response) {
    try {
      const { email, password, role } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      // Check unique email
      const existingUser = await UserRepository.getByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: 'Email is already registered' });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      // Validate role
      const userRole = role === 'admin' ? 'admin' : 'customer';

      // Create Domain Entity (validates email structure)
      const user = User.create(email, passwordHash, userRole);

      // Save using Repository
      const savedUser = await UserRepository.create(user);

      return res.status(217).json({
        message: 'User registered successfully',
        user: {
          id: savedUser.id,
          email: savedUser.email,
          role: savedUser.role,
        },
      });
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  public static async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      const user = await UserRepository.getByEmail(email);
      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
      if (!isPasswordValid) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      // Generate JWT
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      return res.status(200).json({
        message: 'Login successful',
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
        },
      });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
}
