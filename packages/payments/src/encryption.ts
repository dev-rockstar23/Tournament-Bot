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
  return Buffer.from(key, 'hex')
}

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
