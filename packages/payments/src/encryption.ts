import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const AUTH_TAG_LENGTH = 16

function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY
  if (!key) {
    throw new Error(
      'ENCRYPTION_KEY environment variable is not set. Please set a 64-character hex string (32 bytes).',
    )
  }
  if (key.length !== 64) {
    throw new Error(
      `ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes), got ${key.length}`,
    )
  }
  // Validate hex format
  if (!/^[0-9a-f]{64}$/i.test(key)) {
    throw new Error(
      'ENCRYPTION_KEY must be a valid 64-character hex string (only 0-9, a-f characters)',
    )
  }
  return Buffer.from(key, 'hex')
}

/**
 * Validate ENCRYPTION_KEY at module load time to fail fast if misconfigured.
 * Only runs if PAYMENTS_ENABLED is true.
 */
export function validateEncryptionKey(): void {
  if (process.env.PAYMENTS_ENABLED === 'true') {
    try {
      getEncryptionKey()
    } catch (error) {
      console.error('ENCRYPTION_KEY validation failed:', error)
      throw error
    }
  }
}

// Run validation at module load time
validateEncryptionKey()

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Returns format: {iv}:{authTag}:{ciphertext} (all hex-encoded)
 */
export function encryptCredential(plaintext: string): string {
  const key = getEncryptionKey()
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv)

  let encrypted = cipher.update(plaintext, 'utf8', 'hex')
  encrypted += cipher.final('hex')

  const authTag = cipher.getAuthTag()

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
}

/**
 * Decrypt a credential encrypted with encryptCredential.
 * Expects format: {iv}:{authTag}:{ciphertext} (all hex-encoded)
 */
export function decryptCredential(encrypted: string): string {
  const key = getEncryptionKey()
  const parts = encrypted.split(':')

  if (parts.length !== 3) {
    throw new Error('Invalid encrypted credential format. Expected iv:authTag:ciphertext')
  }

  const [ivHex, authTagHex, ciphertext] = parts
  const iv = Buffer.from(ivHex, 'hex')
  const authTag = Buffer.from(authTagHex, 'hex')

  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)

  let decrypted = decipher.update(ciphertext, 'hex', 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted
}
