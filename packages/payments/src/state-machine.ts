export enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  FAILED = 'FAILED',
  EXPIRED = 'EXPIRED',
  DISPUTED = 'DISPUTED',
  REFUNDED = 'REFUNDED',
}

// Valid transitions: from -> allowed targets
const VALID_TRANSITIONS: Record<PaymentStatus, PaymentStatus[]> = {
  [PaymentStatus.PENDING]:  [PaymentStatus.PAID, PaymentStatus.FAILED, PaymentStatus.EXPIRED],
  [PaymentStatus.PAID]:     [PaymentStatus.DISPUTED, PaymentStatus.REFUNDED],
  [PaymentStatus.FAILED]:   [PaymentStatus.REFUNDED],
  [PaymentStatus.EXPIRED]:  [],
  [PaymentStatus.DISPUTED]: [PaymentStatus.REFUNDED],
  [PaymentStatus.REFUNDED]: [],
}

export function assertPaymentTransition(from: PaymentStatus, to: PaymentStatus): void {
  const allowed = VALID_TRANSITIONS[from]
  if (!allowed || !allowed.includes(to)) {
    throw new Error(
      `Invalid payment status transition: ${from} → ${to}. Allowed transitions from ${from}: [${allowed?.join(', ') ?? ''}]`,
    )
  }
}
