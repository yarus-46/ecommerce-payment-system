export class OrderItem {
  constructor(
    public readonly id: number,
    public readonly orderId: number,
    public readonly productId: number,
    public readonly quantity: number,
    public readonly price: number,
    public readonly subtotal: number
  ) {}

  public static create(
    productId: number,
    quantity: number,
    price: number,
    orderId: number = 0,
    id: number = 0
  ): OrderItem {
    if (quantity <= 0) {
      throw new Error('Quantity must be greater than 0');
    }
    if (price <= 0) {
      throw new Error('Price must be greater than 0');
    }
    
    // Deterministic algorithm for subtotal
    const subtotal = Number((quantity * price).toFixed(2));
    
    return new OrderItem(id, orderId, productId, quantity, price, subtotal);
  }
}
