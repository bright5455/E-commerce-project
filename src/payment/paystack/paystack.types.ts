export interface PaystackInitializeResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

export interface PaystackVerifyResponse {
  status: boolean;
  message: string;
  data: {
    status: 'success' | 'failed' | 'abandoned' | string;
    reference: string;
    amount: number; // kobo
    currency: string;
    gateway_response: string;
    paid_at: string | null;
    customer: { email: string };
    [key: string]: unknown;
  };
}

export interface PaystackRefundResponse {
  status: boolean;
  message: string;
  data: Record<string, unknown>;
}

export interface PaystackChargeSuccessWebhookPayload {
  event: string;
  data: {
    id: number;
    status: string;
    reference: string;
    amount: number; // kobo
    currency: string;
    customer: { email: string };
    [key: string]: unknown;
  };
}
