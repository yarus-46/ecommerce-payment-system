export class Product {
  constructor(
    public readonly id: number,
    public readonly name: string,
    public readonly sku: string,
    public readonly price: number,
    private _stock: number,
    public readonly status: 'active' | 'inactive',
    public readonly categoryId: number,
    public readonly description?: string,
    public readonly createdAt?: Date,
    public readonly updatedAt?: Date
  ) {}

  public get stock(): number {
    return this._stock;
  }

  public static create(data: {
    name: string;
    sku: string;
    price: number;
    stock: number;
    categoryId: number;
    description?: string;
    status?: 'active' | 'inactive';
    id?: number;
  }): Product {
    if (!data.name || data.name.trim() === '') {
      throw new Error('Product name cannot be empty');
    }
    if (data.price <= 0) {
      throw new Error('Price must be greater than 0');
    }
    if (data.stock < 0) {
      throw new Error('Stock cannot be negative');
    }
    if (!data.sku || data.sku.trim() === '') {
      throw new Error('SKU cannot be empty');
    }

    return new Product(
      data.id || 0,
      data.name,
      data.sku,
      data.price,
      data.stock,
      data.status || 'active',
      data.categoryId,
      data.description
    );
  }

  public isActive(): boolean {
    return this.status === 'active';
  }

  public hasEnoughStock(quantity: number): boolean {
    return this._stock >= quantity;
  }

  public reduceStock(quantity: number): void {
    if (quantity <= 0) {
      throw new Error('Quantity to reduce must be greater than 0');
    }
    if (!this.hasEnoughStock(quantity)) {
      throw new Error(`Insufficient stock for product ${this.name}. Available: ${this._stock}, Requested: ${quantity}`);
    }
    this._stock -= quantity;
  }

  public increaseStock(quantity: number): void {
    if (quantity <= 0) {
      throw new Error('Quantity to increase must be greater than 0');
    }
    this._stock += quantity;
  }
}
