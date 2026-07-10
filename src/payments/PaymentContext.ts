import { PaymentStrategy } from './PaymentStrategy';
import { StripePaymentStrategy } from './StripePaymentStrategy';
import { BkashPaymentStrategy } from './BkashPaymentStrategy';

export class PaymentContext {
  private strategies: Map<string, PaymentStrategy> = new Map();

  constructor() {
    // Register current payment strategies
    this.strategies.set('stripe', new StripePaymentStrategy());
    this.strategies.set('bkash', new BkashPaymentStrategy());
  }

  /**
   * Retrieves the strategy for a given payment provider.
   */
  public getStrategy(provider: string): PaymentStrategy {
    const strategy = this.strategies.get(provider.toLowerCase());
    if (!strategy) {
      throw new Error(`Payment provider '${provider}' is not supported.`);
    }
    return strategy;
  }

  /**
   * Register a new strategy at runtime (open-closed principle)
   */
  public registerStrategy(provider: string, strategy: PaymentStrategy): void {
    this.strategies.set(provider.toLowerCase(), strategy);
  }
}
