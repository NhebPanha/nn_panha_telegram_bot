import crypto from 'crypto'

const ALGORITHM = 'aes-256-cbc'
const IV_LENGTH = 16

function getEncryptionKey() {
  const config = useRuntimeConfig()
  const key = config.encryptionKey || process.env.ENCRYPTION_KEY || 'default-secret-key-32-chars-long!'
  // Hash key to ensure it is exactly 32 bytes for AES-256
  return crypto.createHash('sha256').update(key).digest()
}

export function encryptToken(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv)
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  return `${iv.toString('hex')}:${encrypted}`
}

export function decryptToken(encryptedText: string): string {
  try {
    const [ivHex, encryptedHex] = encryptedText.split(':')
    if (!ivHex || !encryptedHex) {
      throw new Error('Invalid encrypted token format')
    }
    const iv = Buffer.from(ivHex, 'hex')
    const decipher = crypto.createDecipheriv(ALGORITHM, getEncryptionKey(), iv)
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  } catch (error: any) {
    throw new Error(`Failed to decrypt token: ${error.message}`)
  }
}
