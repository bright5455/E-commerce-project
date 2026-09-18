import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import {
  PaystackInitializeResponse,
  PaystackRefundResponse,
  PaystackVerifyResponse,
} from './paystack.types';

@Injectable()
export class PaystackService {
  private readonly logger = new Logger(PaystackService.name);
  private readonly secretKey: string;
  private readonly baseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.secretKey = this.validatePaystackConfig();
    this.baseUrl =
      this.configService.get<string>('PAYSTACK_BASE_URL') ||
      'https://api.paystack.co';
  }

  private validatePaystackConfig(): string {
    const secretKey = this.configService.get<string>('PAYSTACK_SECRET_KEY');

    if (!secretKey) {
      this.logger.error('Missing required configuration: PAYSTACK_SECRET_KEY');
      throw new Error(
        'Paystack service initialization failed. Missing: PAYSTACK_SECRET_KEY',
      );
    }

    return secretKey;
  }

  private async request<T>(
    method: 'GET' | 'POST',
    path: string,
    body?: Record<string, unknown>,
  ): Promise<T> {
    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(10_000),
      });

      const json = await response.json();

      if (!response.ok || json?.status === false) {
        this.logger.error(
          `Paystack request failed (${method} ${path}): ${json?.message ?? response.statusText}`,
        );
        throw new ServiceUnavailableException(
          json?.message || 'Payment provider request failed',
        );
      }

      return json as T;
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }
      this.logger.error(`Paystack request error (${method} ${path}):`, error);
      throw new ServiceUnavailableException(
        'Unable to reach payment provider. Please try again shortly.',
      );
    }
  }

  async initializeTransaction(params: {
    email: string;
    amountNaira: number;
    orderId: string;
    callbackPath: string;
  }): Promise<PaystackInitializeResponse['data']> {
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') ||
      'http://localhost:3000';
    const amountKobo = Math.round(params.amountNaira * 100);

    const result = await this.request<PaystackInitializeResponse>(
      'POST',
      '/transaction/initialize',
      {
        email: params.email,
        amount: amountKobo,
        callback_url: `${frontendUrl}${params.callbackPath}`,
        metadata: { orderId: params.orderId },
      },
    );

    return result.data;
  }

  async verifyTransaction(
    reference: string,
  ): Promise<PaystackVerifyResponse['data']> {
    const result = await this.request<PaystackVerifyResponse>(
      'GET',
      `/transaction/verify/${encodeURIComponent(reference)}`,
    );

    return result.data;
  }

  async refundTransaction(reference: string): Promise<PaystackRefundResponse> {
    return this.request<PaystackRefundResponse>('POST', '/refund', {
      transaction: reference,
    });
  }

  verifyWebhookSignature(rawBody: Buffer, signatureHeader: string): boolean {
    if (!signatureHeader) {
      return false;
    }

    const expectedHash = crypto
      .createHmac('sha512', this.secretKey)
      .update(rawBody)
      .digest('hex');

    const expected = Buffer.from(expectedHash, 'utf8');
    const actual = Buffer.from(signatureHeader, 'utf8');

    if (expected.length !== actual.length) {
      return false;
    }

    return crypto.timingSafeEqual(expected, actual);
  }
}
