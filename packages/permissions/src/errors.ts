export class PermissionError extends Error {
  constructor(
    public readonly code: 'UNAUTHENTICATED' | 'NOT_MEMBER' | 'INSUFFICIENT_ROLE' | 'BANNED',
    public readonly httpStatus: 401 | 403,
    message: string
  ) {
    super(message)
    this.name = 'PermissionError'
  }
}
