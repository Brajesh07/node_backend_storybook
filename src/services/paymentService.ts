import Razorpay from 'razorpay';
import { configService } from '../config';

export interface CreateOrderRequest {
  amount: number; // Amount in paise (₹1 = 100 paise)
  currency: string;
  receipt?: string;
  notes?: Record<string, any>;
}

export interface RazorpayOrder {
  id: string;
  entity: string;
  amount: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  receipt: string;
  offer_id: string | null;
  status: string;
  attempts: number;
  notes: Record<string, any>;
  created_at: number;
}

export interface PaymentVerificationData {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

class PaymentService {
  private razorpay: Razorpay | null = null;

  constructor() {
    this.initializeRazorpay();
  }

  private initializeRazorpay(): void {
    try {
      const { razorpayKeyId, razorpayKeySecret } = configService.config;
      
      if (!razorpayKeyId || !razorpayKeySecret) {
        console.warn('⚠️ Razorpay credentials not configured. Payment features disabled.');
        return;
      }

      this.razorpay = new Razorpay({
        key_id: razorpayKeyId,
        key_secret: razorpayKeySecret,
      });

      console.log('✅ Razorpay initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Razorpay:', error);
    }
  }

  /**
   * Create a new payment order
   */
  async createOrder(orderData: CreateOrderRequest): Promise<RazorpayOrder> {
    if (!this.razorpay) {
      throw new Error('Razorpay not initialized. Please check credentials.');
    }

    try {
      console.log('💳 Creating Razorpay order:', {
        amount: orderData.amount,
        currency: orderData.currency,
        receipt: orderData.receipt,
      });

      const order = await this.razorpay.orders.create({
        amount: orderData.amount,
        currency: orderData.currency,
        receipt: orderData.receipt || `receipt_${Date.now()}`,
        notes: orderData.notes || {},
      });

      console.log('✅ Order created successfully:', order.id);
      return order as RazorpayOrder;
    } catch (error) {
      console.error('❌ Error creating Razorpay order:', error);
      throw new Error('Failed to create payment order');
    }
  }

  /**
   * Verify payment signature
   */
  verifyPayment(verificationData: PaymentVerificationData): boolean {
    if (!this.razorpay) {
      throw new Error('Razorpay not initialized');
    }

    try {
      const crypto = require('crypto');
      const { razorpayKeySecret } = configService.config;

      const expectedSignature = crypto
        .createHmac('sha256', razorpayKeySecret)
        .update(`${verificationData.razorpay_order_id}|${verificationData.razorpay_payment_id}`)
        .digest('hex');

      const isValid = expectedSignature === verificationData.razorpay_signature;
      
      console.log(isValid ? '✅ Payment verified successfully' : '❌ Payment verification failed');
      return isValid;
    } catch (error) {
      console.error('❌ Error verifying payment:', error);
      return false;
    }
  }

  /**
   * Fetch order details
   */
  async getOrder(orderId: string): Promise<RazorpayOrder> {
    if (!this.razorpay) {
      throw new Error('Razorpay not initialized');
    }

    try {
      const order = await this.razorpay.orders.fetch(orderId);
      return order as RazorpayOrder;
    } catch (error) {
      console.error('❌ Error fetching order:', error);
      throw new Error('Failed to fetch order details');
    }
  }

  /**
   * Get payment details
   */
  async getPayment(paymentId: string) {
    if (!this.razorpay) {
      throw new Error('Razorpay not initialized');
    }

    try {
      const payment = await this.razorpay.payments.fetch(paymentId);
      return payment;
    } catch (error) {
      console.error('❌ Error fetching payment:', error);
      throw new Error('Failed to fetch payment details');
    }
  }

  /**
   * Check if Razorpay is configured and ready
   */
  isConfigured(): boolean {
    return this.razorpay !== null;
  }

  /**
   * Get Razorpay key ID for frontend (safe to expose)
   */
  getKeyId(): string {
    return configService.config.razorpayKeyId;
  }
}

// Export singleton instance
export const paymentService = new PaymentService();