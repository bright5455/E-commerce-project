/**
 * @paystack/inline-js ships no type declarations. This covers only the
 * surface this project actually uses - resumeTransaction() against a
 * server-issued access code. See node_modules/@paystack/inline-js/README.md
 * for the full API.
 */
declare module '@paystack/inline-js' {
  export interface PaystackTransactionResult {
    id?: number;
    reference: string;
    message?: string;
  }

  export interface PaystackTransactionCallbacks {
    onSuccess?: (transaction: PaystackTransactionResult) => void;
    onCancel?: () => void;
    onError?: (error: { message: string }) => void;
    onLoad?: (transaction: { id: number; accessCode: string }) => void;
  }

  export default class PaystackPop {
    resumeTransaction(
      accessCode: string,
      callbacks?: PaystackTransactionCallbacks,
    ): unknown;
  }
}
