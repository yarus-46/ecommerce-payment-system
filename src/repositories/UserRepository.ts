import prisma from './prisma';
import { User } from '../domain/User';

export class UserRepository {
  public static async getByEmail(email: string): Promise<User | null> {
    const record = await prisma.user.findUnique({
      where: { email },
    });
    if (!record) return null;
    return new User(
      record.id,
      record.email,
      record.passwordHash,
      record.role as 'admin' | 'customer',
      record.createdAt,
      record.updatedAt
    );
  }

  public static async getById(id: number): Promise<User | null> {
    const record = await prisma.user.findUnique({
      where: { id },
    });
    if (!record) return null;
    return new User(
      record.id,
      record.email,
      record.passwordHash,
      record.role as 'admin' | 'customer',
      record.createdAt,
      record.updatedAt
    );
  }

  public static async create(user: User): Promise<User> {
    const record = await prisma.user.create({
      data: {
        email: user.email,
        passwordHash: user.passwordHash,
        role: user.role,
      },
    });
    return new User(
      record.id,
      record.email,
      record.passwordHash,
      record.role as 'admin' | 'customer',
      record.createdAt,
      record.updatedAt
    );
  }
}
