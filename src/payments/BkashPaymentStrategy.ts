import { PaymentStrategy, PaymentInitiationResult, PaymentActionResult } from './PaymentStrategy';

export class BkashPaymentStrategy implements PaymentStrategy {
  private isMockMode: boolean = false;
  private appKey: string;
  private appSecret: string;
  private username: string;
  private password: string;
  private baseUrl: string;

  constructor() {
    this.appKey = process.env.BKASH_APP_KEY || '';
    this.appSecret = process.env.BKASH_APP_SECRET || '';
    this.username = process.env.BKASH_USERNAME || '';
    this.password = process.env.BKASH_PASSWORD || '';
    this.baseUrl = process.env.BKASH_BASE_URL || 'https://tokenized.sandbox.bka.sh/v1.2.0-beta';

    if (
      !this.appKey || 
      this.appKey.startsWith('bkash_mock_') || 
      process.env.NODE_ENV === 'test'
    ) {
      this.isMockMode = true;
      console.log('bKash running in MOCK mode (using dummy responses)');
    }
  }

  /**
   * Helper to retrieve bKash ID token (for production/sandbox calls)
   */
  private async getAuthToken(): Promise<string> {
    const response = await fetch(`${this.baseUrl}/checkout/token/grant`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        username: this.username,
        password: this.password,
      },
      body: JSON.stringify({
        app_key: this.appKey,
        app_secret: this.appSecret,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`bKash Grant Token Failed: ${errText}`);
    }

    const data: any = await response.json();
    return data.id_token;
  }

  public async initiatePayment(orderId: number, amount: number, metadata?: any): Promise<PaymentInitiationResult> {
    const transactionId = `bkash_trx_${Math.random().toString(36).substring(2, 10)}`;

    if (this.isMockMode) {
      // Simulate bKash redirect URL (redirect to our own local mock endpoint or dashboard)
      const bkashURL = `/api/payments/bkash/mock-checkout?paymentID=${transactionId}&orderId=${orderId}&amount=${amount}`;
      return {
        transactionId,
        provider: 'bkash',
        status: 'pending',
        bkashURL,
        rawResponse: { paymentID: transactionId, status: 'Initial', amount: String(amount), intent: 'sale', createTime: new Date().toISOString() },
      };
    }

    try {
      const idToken = await this.getAuthToken();
      // Call create payment endpoint
      const response = await fetch(`${this.baseUrl}/checkout/payment/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: idToken,
          'X-APP-Key': this.appKey,
        },
        body: JSON.stringify({
          mode: '0011', // Unique code for checkout
          payerReference: 'CustomerReference',
          callbackURL: `http://localhost:${process.env.PORT || 3000}/api/payments/bkash/callback`,
          amount: String(amount),
          currency: 'BDT',
          intent: 'sale',
          merchantInvoiceNumber: String(orderId),
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`bKash Create Payment API failed: ${errText}`);
      }

      const data: any = await response.json();
      return {
        transactionId: data.paymentID || transactionId,
        provider: 'bkash',
        status: 'pending',
        bkashURL: data.bkashURL,
        rawResponse: data,
      };
    } catch (error: any) {
      console.error('bKash Payment Initiation Error:', error);
      throw error;
    }
  }

  public async executePayment(paymentID: string, payload?: any): Promise<PaymentActionResult> {
    if (this.isMockMode) {
      const orderId = payload?.orderId ? Number(payload.orderId) : 0;
      return {
        transactionId: paymentID,
        orderId,
        status: 'success',
        rawResponse: { paymentID, transactionStatus: 'Completed', trxID: `TXN${paymentID.toUpperCase()}`, amount: payload?.amount || '0' },
      };
    }

    try {
      const idToken = await this.getAuthToken();
      const response = await fetch(`${this.baseUrl}/checkout/payment/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: idToken,
          'X-APP-Key': this.appKey,
        },
        body: JSON.stringify({ paymentID }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`bKash Execute Payment failed: ${errText}`);
      }

      const data: any = await response.json();
      let status: 'success' | 'failed' | 'pending' = 'pending';
      if (data.transactionStatus === 'Completed') {
        status = 'success';
      } else if (data.transactionStatus === 'Failed') {
        status = 'failed';
      }

      return {
        transactionId: data.paymentID || paymentID,
        orderId: Number(data.merchantInvoiceNumber) || 0,
        status,
        rawResponse: data,
      };
    } catch (error) {
      console.error('bKash Payment Execution Error:', error);
      throw error;
    }
  }

  public async queryPayment(transactionId: string): Promise<PaymentActionResult> {
    if (this.isMockMode) {
      return {
        transactionId,
        orderId: 0,
        status: 'success',
        rawResponse: { paymentID: transactionId, transactionStatus: 'Completed' },
      };
    }

    try {
      const idToken = await this.getAuthToken();
      const response = await fetch(`${this.baseUrl}/checkout/payment/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: idToken,
          'X-APP-Key': this.appKey,
        },
        body: JSON.stringify({ paymentID: transactionId }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`bKash Query Payment failed: ${errText}`);
      }

      const data: any = await response.json();
      let status: 'success' | 'failed' | 'pending' = 'pending';
      if (data.transactionStatus === 'Completed') {
        status = 'success';
      } else if (data.transactionStatus === 'Failed') {
        status = 'failed';
      }

      return {
        transactionId: data.paymentID || transactionId,
        orderId: Number(data.merchantInvoiceNumber) || 0,
        status,
        rawResponse: data,
      };
    } catch (error) {
      console.error('bKash Query Payment Error:', error);
      throw error;
    }
  }

  public async handleWebhook(payload: any, headers?: any): Promise<PaymentActionResult> {
    // bKash webhook IPN is typically parsed from payload
    if (this.isMockMode) {
      const orderId = Number(payload.merchantInvoiceNumber) || 0;
      const paymentID = payload.paymentID || 'mock_bkash_id';
      const status = payload.transactionStatus === 'Completed' ? 'success' : 'failed';
      return {
        transactionId: paymentID,
        orderId,
        status,
        rawResponse: payload,
      };
    }

    // IPN verification would check signature if bKash provides headers.
    // For standard tokenized flow, we parse the IPN payload.
    const paymentID = payload.paymentID;
    const orderId = Number(payload.merchantInvoiceNumber) || 0;
    let status: 'success' | 'failed' | 'pending' = 'pending';

    if (payload.transactionStatus === 'Completed') {
      status = 'success';
    } else if (payload.transactionStatus === 'Failed') {
      status = 'failed';
    }

    return {
      transactionId: paymentID,
      orderId,
      status,
      rawResponse: payload,
    };
  }
}
