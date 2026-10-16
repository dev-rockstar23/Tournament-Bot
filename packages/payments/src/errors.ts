export class PaymentsDisabledError extends Error {
  constructor() {
    super('Payment module is disabled pending legal review.')
    this.name = 'PaymentsDisabledError'
  }
}
export function assertPaymentsEnabled(): void {
  if (process.env.PAYMENTS_ENABLED !== 'true') throw new PaymentsDisabledError()
}
