export class User {
  constructor(
    public readonly id: number,
    public readonly email: string,
    public readonly passwordHash: string,
    public readonly role: 'admin' | 'customer' = 'customer',
    public readonly createdAt?: Date,
    public readonly updatedAt?: Date
  ) {}

  public static create(
    email: string,
    passwordHash: string,
    role: 'admin' | 'customer' = 'customer',
    id: number = 0
  ): User {
    if (!User.validateEmail(email)) {
      throw new Error('Invalid email format');
    }
    return new User(id, email, passwordHash, role);
  }

  public static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  public isAdmin(): boolean {
    return this.role === 'admin';
  }
}
