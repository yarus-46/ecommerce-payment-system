import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { PaymentService } from '../services/PaymentService';
import { PaymentRepository } from '../repositories/PaymentRepository';
import { OrderRepository } from '../repositories/OrderRepository';

export class PaymentController {
  /**
   * Initiates payment for an order (creates Stripe intent or bKash session).
   */
  public static async initiate(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { orderId, provider, metadata } = req.body;

      if (!orderId || !provider) {
        return res.status(400).json({ error: 'orderId and provider are required' });
      }

      if (provider !== 'stripe' && provider !== 'bkash') {
        return res.status(400).json({ error: 'Provider must be "stripe" or "bkash"' });
      }

      // Verify order belongs to the user
      const order = await OrderRepository.getById(Number(orderId));
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }

      if (order.userId !== userId && req.user!.role !== 'admin') {
        return res.status(403).json({ error: 'Unauthorized to pay for this order' });
      }

      const result = await PaymentService.initiate(Number(orderId), provider, metadata);
      return res.status(201).json(result);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  /**
   * Executes bKash payment verification (callback from merchant checkout redirects).
   */
  public static async executeBkash(req: Request, res: Response) {
    try {
      const { paymentID, orderId, amount } = req.query;

      if (!paymentID || !orderId) {
        return res.status(400).json({ error: 'paymentID and orderId are required' });
      }

      const result = await PaymentService.executeBkash(
        String(paymentID),
        Number(orderId),
        String(amount || '0')
      );

      return res.status(200).json({
        message: 'bKash payment executed successfully',
        status: result.status,
        transactionId: result.transactionId,
      });
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  /**
   * Queries payment status directly from bKash server.
   */
  public static async queryBkash(req: Request, res: Response) {
    try {
      const { paymentID } = req.query;
      if (!paymentID) {
        return res.status(400).json({ error: 'paymentID query parameter is required' });
      }

      const strategy = new (require('../payments/BkashPaymentStrategy').BkashPaymentStrategy)();
      const status = await strategy.queryPayment(String(paymentID));
      return res.status(200).json(status);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * Receives Stripe webhook events.
   */
  public static async stripeWebhook(req: Request, res: Response) {
    try {
      // In production, Stripe webhook signatures require raw body parsing.
      // In mock mode or simple testing, JSON payload is sufficient.
      const payload = req.body;
      const headers = req.headers;

      const updatedPayment = await PaymentService.processWebhook('stripe', payload, headers);
      return res.status(200).json({ received: true, paymentId: updatedPayment.id, status: updatedPayment.status });
    } catch (error: any) {
      return res.status(400).send(`Webhook Error: ${error.message}`);
    }
  }

  /**
   * Receives bKash webhook IPN events.
   */
  public static async bkashWebhook(req: Request, res: Response) {
    try {
      const payload = req.body;
      const updatedPayment = await PaymentService.processWebhook('bkash', payload);
      return res.status(200).json({ received: true, paymentId: updatedPayment.id, status: updatedPayment.status });
    } catch (error: any) {
      return res.status(400).send(`Webhook Error: ${error.message}`);
    }
  }

  /**
   * Retrieve list of payments for the logged-in customer.
   */
  public static async listMine(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const payments = await PaymentRepository.getByUserId(userId);
      return res.status(200).json(payments);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * Interactive mock checkout page portal for testing bKash payments visually.
   */
  public static async mockBkashCheckoutPage(req: Request, res: Response) {
    const { paymentID, orderId, amount } = req.query;

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>bKash Tokenized Checkout Simulator</title>
        <style>
          body {
            font-family: 'Outfit', sans-serif;
            background-color: #f7f7f7;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
          }
          .checkout-container {
            background-color: #e2136e; /* bKash Brand Pink */
            color: white;
            padding: 30px;
            border-radius: 12px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.15);
            width: 360px;
            text-align: center;
          }
          .logo {
            font-size: 28px;
            font-weight: bold;
            margin-bottom: 20px;
          }
          .logo span {
            background-color: white;
            color: #e2136e;
            padding: 2px 8px;
            border-radius: 4px;
            margin-right: 5px;
          }
          .info-box {
            background-color: rgba(255,255,255,0.15);
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
            font-size: 14px;
            text-align: left;
          }
          .info-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
          }
          .info-row:last-child {
            margin-bottom: 0;
          }
          .input-group {
            margin-bottom: 20px;
            text-align: left;
          }
          label {
            display: block;
            margin-bottom: 5px;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          input {
            width: 100%;
            padding: 10px;
            border: none;
            border-radius: 6px;
            box-sizing: border-box;
            font-size: 16px;
            text-align: center;
            letter-spacing: 4px;
          }
          .btn-group {
            display: flex;
            gap: 10px;
          }
          button {
            flex: 1;
            padding: 12px;
            border: none;
            border-radius: 6px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.2s ease;
          }
          .btn-confirm {
            background-color: white;
            color: #e2136e;
          }
          .btn-confirm:hover {
            background-color: #f0f0f0;
          }
          .btn-cancel {
            background-color: transparent;
            color: white;
            border: 1px solid rgba(255,255,255,0.4);
          }
          .btn-cancel:hover {
            background-color: rgba(255,255,255,0.1);
          }
        </style>
      </head>
      <body>
        <div class="checkout-container">
          <div class="logo"><span>bKash</span>Checkout</div>
          
          <div class="info-box">
            <div class="info-row">
              <span>Merchant:</span>
              <strong>E-Commerce Corp</strong>
            </div>
            <div class="info-row">
              <span>Order ID:</span>
              <strong>#${orderId}</strong>
            </div>
            <div class="info-row">
              <span>Amount:</span>
              <strong>BDT ${amount}</strong>
            </div>
            <div class="info-row">
              <span>Transaction ID:</span>
              <strong>${paymentID}</strong>
            </div>
          </div>

          <div class="input-group">
            <label for="pin">Enter 5-digit PIN</label>
            <input type="password" id="pin" placeholder="•••••" maxlength="5">
          </div>

          <div class="btn-group">
            <button class="btn-cancel" onclick="cancelPayment()">Cancel</button>
            <button class="btn-confirm" onclick="confirmPayment()">Confirm</button>
          </div>
        </div>

        <script>
          function confirmPayment() {
            const pin = document.getElementById('pin').value;
            if (pin.length !== 5) {
              alert('Please enter a 5-digit PIN');
              return;
            }
            
            // Execute payment by hitting the backend API
            fetch('/api/payments/bkash/execute?paymentID=${paymentID}&orderId=${orderId}&amount=${amount}')
              .then(res => res.json())
              .then(data => {
                alert('Payment Success! Status: ' + data.status);
                // Return to parent window if inside iframe or redirect
                window.location.href = '/api/orders/' + ${orderId};
              })
              .catch(err => {
                alert('Execution failed: ' + err.message);
              });
          }

          function cancelPayment() {
            alert('Payment Canceled by User');
            window.location.href = '/api/orders/' + ${orderId};
          }
        </script>
      </body>
      </html>
    `;

    return res.status(200).send(htmlContent);
  }
}
