import Stripe from 'stripe';
import { PaymentStrategy, PaymentInitiationResult, PaymentActionResult } from './PaymentStrategy';

export class StripePaymentStrategy implements PaymentStrategy {
  private stripe: Stripe | null = null;
  private isMockMode: boolean = false;

  constructor() {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key || key.startsWith('sk_test_mock_') || process.env.NODE_ENV === 'test') {
      this.isMockMode = true;
      console.log('Stripe running in MOCK mode (using dummy responses)');
    } else {
      this.stripe = new Stripe(key, { apiVersion: '2023-10-16' as any });
    }
  }

  public async initiatePayment(orderId: number, amount: number, metadata?: any): Promise<PaymentInitiationResult> {
    if (this.isMockMode) {
      // Mock stripe response
      const mockPiId = `pi_mock_${Math.random().toString(36).substring(2, 10)}`;
      return {
        transactionId: mockPiId,
        provider: 'stripe',
        status: 'pending',
        clientSecret: `${mockPiId}_secret_${Math.random().toString(36).substring(2, 10)}`,
        rawResponse: { id: mockPiId, object: 'payment_intent', amount: amount * 100, currency: 'usd', status: 'requires_payment_method', metadata },
      };
    }

    if (!this.stripe) throw new Error('Stripe client not initialized');

    // Stripe amount must be in cents (smallest currency unit)
    const centsAmount = Math.round(amount * 100);

    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: centsAmount,
      currency: 'usd',
      metadata: { orderId: String(orderId), ...metadata },
      automatic_payment_methods: { enabled: true },
    });

    return {
      transactionId: paymentIntent.id,
      provider: 'stripe',
      status: 'pending',
      clientSecret: paymentIntent.client_secret || undefined,
      rawResponse: paymentIntent,
    };
  }

  public async executePayment(paymentID: string, payload?: any): Promise<PaymentActionResult> {
    // For Stripe, confirmation is typically done on frontend, and webhook confirms it.
    // However, we query/verify the status here.
    return this.queryPayment(paymentID);
  }

  public async queryPayment(transactionId: string): Promise<PaymentActionResult> {
    if (this.isMockMode) {
      return {
        transactionId,
        orderId: 0, // Mock: order ID not available in direct mock query
        status: transactionId.includes('fail') ? 'failed' : 'success',
        rawResponse: { id: transactionId, status: transactionId.includes('fail') ? 'requires_payment_method' : 'succeeded' },
      };
    }

    if (!this.stripe) throw new Error('Stripe client not initialized');

    const paymentIntent = await this.stripe.paymentIntents.retrieve(transactionId);
    let status: 'success' | 'failed' | 'pending' = 'pending';
    
    if (paymentIntent.status === 'succeeded') {
      status = 'success';
    } else if (paymentIntent.status === 'canceled' || paymentIntent.status === 'requires_payment_method') {
      // In real stripe flow, requires_payment_method means it hasn't succeeded/failed definitively yet,
      // but if we query it after a failure we can map it accordingly
      status = 'pending';
    }

    return {
      transactionId: paymentIntent.id,
      orderId: Number(paymentIntent.metadata.orderId) || 0,
      status,
      rawResponse: paymentIntent,
    };
  }

  public async handleWebhook(payload: any, headers?: any): Promise<PaymentActionResult> {
    if (this.isMockMode) {
      const type = payload.type;
      const object = payload.data?.object || {};
      const piId = object.id || 'pi_mock_123';
      const orderId = Number(object.metadata?.orderId) || 0;
      const status = type === 'payment_intent.succeeded' ? 'success' : 'failed';
      return {
        transactionId: piId,
        orderId,
        status,
        rawResponse: payload,
      };
    }

    if (!this.stripe) throw new Error('Stripe client not initialized');
    const signature = headers?.['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

    let event: Stripe.Event;

    try {
      // payload here needs to be the raw request buffer to verify signature correctly
      event = this.stripe.webhooks.constructEvent(payload, signature, endpointSecret);
    } catch (err: any) {
      throw new Error(`Stripe Webhook Signature verification failed: ${err.message}`);
    }

    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const orderId = Number(paymentIntent.metadata.orderId) || 0;
    let status: 'success' | 'failed' | 'pending' = 'pending';

    if (event.type === 'payment_intent.succeeded') {
      status = 'success';
    } else if (event.type === 'payment_intent.payment_failed') {
      status = 'failed';
    }

    return {
      transactionId: paymentIntent.id,
      orderId,
      status,
      rawResponse: paymentIntent,
    };
  }
}
