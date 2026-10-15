import { z } from 'zod';

export const OrderCreateSchema = z.object({
  registrationId: z.string().cuid(),
  amount: z
    .number()
    .positive()
    .refine((v) => Number.isFinite(v), { message: 'Amount must be a finite number' }),
  currency: z.string().default('INR'),
  expiresInMinutes: z.number().int().min(5).max(60).default(15),
});
export type OrderCreate = z.infer<typeof OrderCreateSchema>;

export const PaymentWebhookPayloadSchema = z.object({
  type: z.string(),
  orderId: z.string(),
  providerRef: z.string(),
  amount: z.number(),
  currency: z.string(),
  timestamp: z.string(),
  signature: z.string(),
});
export type PaymentWebhookPayload = z.infer<typeof PaymentWebhookPayloadSchema>;
