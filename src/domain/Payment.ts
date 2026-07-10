export class Payment {
  constructor(
    public readonly id: number,
    public readonly orderId: number,
    public readonly provider: 'stripe' | 'bkash',
    public readonly transactionId: string,
    public readonly status: 'pending' | 'success' | 'failed',
    public readonly rawResponse: any,
    public readonly createdAt?: Date,
    public readonly updatedAt?: Date
  ) {}

  public static create(data: {
    orderId: number;
    provider: 'stripe' | 'bkash';
    transactionId: string;
    status: 'pending' | 'success' | 'failed';
    rawResponse: any;
    id?: number;
  }): Payment {
    if (data.orderId <= 0) {
      throw new Error('Invalid order ID');
    }
    if (!data.transactionId || data.transactionId.trim() === '') {
      throw new Error('Transaction ID cannot be empty');
    }
    return new Payment(
      data.id || 0,
      data.orderId,
      data.provider,
      data.transactionId,
      data.status,
      data.rawResponse
    );
  }

  public isSuccessful(): boolean {
    return this.status === 'success';
  }
}
