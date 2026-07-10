import { PaymentContext } from '../src/payments/PaymentContext';
import { StripePaymentStrategy } from '../src/payments/StripePaymentStrategy';
import { BkashPaymentStrategy } from '../src/payments/BkashPaymentStrategy';

describe('Payment Strategy Pattern Tests', () => {
  let context: PaymentContext;

  beforeEach(() => {
    context = new PaymentContext();
  });

  it('should retrieve Stripe and bKash strategies correctly', () => {
    const stripeStrat = context.getStrategy('stripe');
    const bkashStrat = context.getStrategy('bkash');

    expect(stripeStrat).toBeInstanceOf(StripePaymentStrategy);
    expect(bkashStrat).toBeInstanceOf(BkashPaymentStrategy);
  });

  it('should throw error for unsupported payment providers', () => {
    expect(() => context.getStrategy('paypal')).toThrow("Payment provider 'paypal' is not supported.");
  });

  it('should initiate Stripe payment mock response successfully', async () => {
    const stripeStrat = context.getStrategy('stripe');
    const result = await stripeStrat.initiatePayment(101, 49.99, { customerName: 'Alice' });

    expect(result.provider).toBe('stripe');
    expect(result.status).toBe('pending');
    expect(result.transactionId).toContain('pi_mock_');
    expect(result.clientSecret).toBeDefined();
    expect(result.rawResponse.status).toBe('requires_payment_method');
  });

  it('should initiate bKash payment mock response successfully', async () => {
    const bkashStrat = context.getStrategy('bkash');
    const result = await bkashStrat.initiatePayment(101, 1500.00);

    expect(result.provider).toBe('bkash');
    expect(result.status).toBe('pending');
    expect(result.transactionId).toContain('bkash_trx_');
    expect(result.bkashURL).toContain('/api/payments/bkash/mock-checkout');
  });

  it('should handle bKash mock payment execution correctly', async () => {
    const bkashStrat = context.getStrategy('bkash');
    const result = await bkashStrat.executePayment('bkash_trx_123', { orderId: 101, amount: '1500.00' });

    expect(result.transactionId).toBe('bkash_trx_123');
    expect(result.status).toBe('success');
    expect(result.rawResponse.transactionStatus).toBe('Completed');
  });
});
