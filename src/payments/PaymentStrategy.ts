export interface PaymentInitiationResult {
  transactionId: string;
  provider: 'stripe' | 'bkash';
  status: 'pending' | 'success' | 'failed';
  clientSecret?: string; // Stripe client secret
  bkashURL?: string;     // bKash redirect URL
  rawResponse: any;
}

export interface PaymentActionResult {
  transactionId: string;
  orderId: number;
  status: 'success' | 'failed' | 'pending';
  rawResponse: any;
}

export interface PaymentStrategy {
  /**
   * Initiates payment for a given order.
   */
  initiatePayment(orderId: number, amount: number, metadata?: any): Promise<PaymentInitiationResult>;

  /**
   * Executes payment execution / authorization (mainly for bKash executePayment endpoint).
   */
  executePayment(paymentID: string, payload?: any): Promise<PaymentActionResult>;

  /**
   * Queries payment status directly from the provider.
   */
  queryPayment(transactionId: string): Promise<PaymentActionResult>;

  /**
   * Process webhook notifications sent by the payment provider.
   */
  handleWebhook(payload: any, headers?: any): Promise<PaymentActionResult>;
}
