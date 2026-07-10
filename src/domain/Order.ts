import { OrderItem } from './OrderItem';

export class Order {
  private _items: OrderItem[] = [];
  private _totalAmount: number = 0;
  private _status: 'pending' | 'paid' | 'canceled' = 'pending';

  constructor(
    public readonly id: number,
    public readonly userId: number,
    status: 'pending' | 'paid' | 'canceled',
    totalAmount: number,
    items: OrderItem[] = [],
    public readonly createdAt?: Date,
    public readonly updatedAt?: Date
  ) {
    this._status = status;
    this._items = items;
    this._totalAmount = totalAmount;
  }

  public get items(): OrderItem[] {
    return [...this._items];
  }

  public get totalAmount(): number {
    return this._totalAmount;
  }

  public get status(): 'pending' | 'paid' | 'canceled' {
    return this._status;
  }

  public static create(userId: number, id: number = 0): Order {
    if (userId <= 0) {
      throw new Error('Invalid user ID');
    }
    return new Order(id, userId, 'pending', 0, []);
  }

  public addItem(productId: number, quantity: number, price: number): void {
    if (this._status !== 'pending') {
      throw new Error('Cannot add items to a completed or canceled order');
    }
    const newItem = OrderItem.create(productId, quantity, price, this.id);
    this._items.push(newItem);
    this.calculateTotals();
  }

  // Deterministic algorithm to calculate totals and subtotals
  public calculateTotals(): void {
    const total = this._items.reduce((sum, item) => sum + item.subtotal, 0);
    this._totalAmount = Number(total.toFixed(2));
  }

  public pay(): void {
    if (this._status !== 'pending') {
      throw new Error(`Cannot pay for an order in ${this._status} status`);
    }
    this._status = 'paid';
  }

  public cancel(): void {
    if (this._status !== 'pending') {
      throw new Error(`Cannot cancel an order in ${this._status} status`);
    }
    this._status = 'canceled';
  }
}
