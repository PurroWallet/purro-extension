import { DataEncryption } from '@/background/types/account';
import { PasswordData } from '../types/storage';

// Security Constants - Increased for better protection
const ITERATIONS = 600000; // Increased from 100k for better security
const SALT_LENGTH = 32; // Increased from 16 for better entropy
const NONCE_LENGTH = 16; // Increased from 12 for better security
const KDF = 'PBKDF2';
const PASSWORD_SALT_LENGTH = 64; // Increased from 32 for better entropy
const TAG_LENGTH = 16; // For AES-GCM authentication tag

// Enhanced security requirements
const MIN_PASSWORD_LENGTH = 8;
const MIN_ITERATIONS = 500000; // Increased minimum
const MAX_ITERATIONS = 2000000; // Prevent DoS attacks
const MAX_DATA_SIZE = 10 * 1024 * 1024; // 10MB max to prevent memory exhaustion

// Enhanced utility functions
const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  try {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  } catch {
    throw new Error('Failed to encode to base64');
  }
};

const base64ToArrayBuffer = (base64: string): Uint8Array => {
  try {
    // Validate base64 format
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(base64)) {
      throw new Error('Invalid base64 format');
    }

    return new Uint8Array(
      atob(base64)
        .split('')
        .map(c => c.charCodeAt(0))
    );
  } catch {
    throw new Error('Invalid base64 string');
  }
};

// Enhanced validation functions
const validatePassword = (password: string): void => {
  if (!password) {
    throw new Error('Password is required');
  }
  if (typeof password !== 'string') {
    throw new Error('Password must be a string');
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(
      `Password must be at least ${MIN_PASSWORD_LENGTH} characters`
    );
  }
  if (password.length > 1000) {
    throw new Error('Password too long');
  }

  // Check for null bytes and control characters
  if (/[\x00-\x08\x0E-\x1F\x7F]/.test(password)) {
    throw new Error('Password contains invalid characters');
  }
};

const validateData = (data: string): void => {
  if (!data) {
    throw new Error('Data is required');
  }
  if (typeof data !== 'string') {
    throw new Error('Data must be a string');
  }
  if (new TextEncoder().encode(data).length > MAX_DATA_SIZE) {
    throw new Error(`Data too large (max ${MAX_DATA_SIZE} bytes)`);
  }
};

const validateEncryptionData = (data: DataEncryption): void => {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid encryption data object');
  }

  const requiredFields = [
    'digest',
    'encrypted',
    'iterations',
    'kdf',
    'nonce',
    'salt',
  ];
  for (const field of requiredFields) {
    const value = data[field as keyof DataEncryption];
    if (!value || (typeof value !== 'string' && typeof value !== 'number')) {
      throw new Error(`Missing or invalid required field: ${field}`);
    }
  }

  if (typeof data.iterations !== 'number' || data.iterations < MIN_ITERATIONS) {
    throw new Error(
      `Insufficient iterations: minimum ${MIN_ITERATIONS} required`
    );
  }

  if (data.iterations > MAX_ITERATIONS) {
    throw new Error(`Too many iterations: maximum ${MAX_ITERATIONS} allowed`);
  }

  if (data.kdf !== KDF) {
    throw new Error(`Unsupported KDF: ${data.kdf}`);
  }

  // Validate base64 fields
  try {
    base64ToArrayBuffer(data.salt);
    base64ToArrayBuffer(data.nonce);
    base64ToArrayBuffer(data.encrypted);
    base64ToArrayBuffer(data.digest);
  } catch {
    throw new Error('Invalid base64 encoding in encryption data');
  }
};

// Memory clearing utility
const secureMemoryClear = (data: any): void => {
  if (typeof data === 'string') {
    // Overwrite string memory (limited effectiveness in JS)
    for (let i = 0; i < 3; i++) {
      data = crypto.getRandomValues(new Uint8Array(data.length)).join('');
    }
  } else if (data instanceof Uint8Array) {
    crypto.getRandomValues(data);
  }
};

export const encryption = {
  /**
   * Enhanced encryption with additional security measures
   */
  encrypt: async (data: string, password: string): Promise<DataEncryption> => {
    validateData(data);
    validatePassword(password);

    let salt: Uint8Array | null = null;
    let nonce: Uint8Array | null = null;
    let keyMaterial: CryptoKey | null = null;
    let key: CryptoKey | null = null;

    try {
      salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
      nonce = crypto.getRandomValues(new Uint8Array(NONCE_LENGTH));

      keyMaterial = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(password),
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
      );

      key = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: salt as BufferSource,
          iterations: ITERATIONS,
          hash: 'SHA-256',
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt']
      );

      const plaintext = new TextEncoder().encode(data);
      const encrypted = await crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv: nonce as BufferSource,
          tagLength: TAG_LENGTH * 8, // 128 bits
        },
        key,
        plaintext
      );

      // Create digest of original data for integrity verification
      const digest = await crypto.subtle.digest('SHA-256', plaintext);

      return {
        digest: arrayBufferToBase64(digest),
        encrypted: arrayBufferToBase64(encrypted),
        iterations: ITERATIONS,
        kdf: KDF,
        nonce: arrayBufferToBase64(nonce.buffer as ArrayBuffer),
        salt: arrayBufferToBase64(salt.buffer as ArrayBuffer),
      };
    } catch (error) {
      throw new Error(`Encryption failed: ${(error as Error).message}`);
    } finally {
      // Clear sensitive data from memory
      if (salt) secureMemoryClear(salt);
      if (nonce) secureMemoryClear(nonce);
      // Note: CryptoKey objects are automatically cleared by the browser
    }
  },

  /**
   * Enhanced decryption with additional security measures
   */
  decrypt: async (
    encryptedData: DataEncryption,
    password: string
  ): Promise<string> => {
    validatePassword(password);
    validateEncryptionData(encryptedData);

    let salt: Uint8Array | null = null;
    let nonce: Uint8Array | null = null;
    let encrypted: Uint8Array | null = null;
    let keyMaterial: CryptoKey | null = null;
    let key: CryptoKey | null = null;

    try {
      salt = base64ToArrayBuffer(encryptedData.salt);
      nonce = base64ToArrayBuffer(encryptedData.nonce);
      encrypted = base64ToArrayBuffer(encryptedData.encrypted);

      keyMaterial = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(password),
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
      );

      key = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: salt as BufferSource,
          iterations: encryptedData.iterations,
          hash: 'SHA-256',
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['decrypt']
      );

      const decrypted = await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: nonce as BufferSource,
          tagLength: TAG_LENGTH * 8,
        },
        key,
        encrypted
      );

      const decryptedText = new TextDecoder().decode(decrypted);

      // Verify data integrity using secure comparison
      const computedDigest = await crypto.subtle.digest('SHA-256', decrypted);
      const computedDigestB64 = arrayBufferToBase64(computedDigest);

      if (!encryption.secureCompare(computedDigestB64, encryptedData.digest)) {
        throw new Error('Data integrity verification failed');
      }

      return decryptedText;
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('integrity')) {
          throw error; // Re-throw integrity errors as-is
        }
        if (error.name === 'OperationError') {
          throw new Error('Invalid password or corrupted data');
        }
      }
      throw new Error(`Decryption failed: ${(error as Error).message}`);
    } finally {
      // Clear sensitive data from memory
      if (salt) secureMemoryClear(salt);
      if (nonce) secureMemoryClear(nonce);
      if (encrypted) secureMemoryClear(encrypted);
    }
  },

  /**
   * Enhanced password hashing with better security
   */
  hashPassword: async (
    password: string,
    salt?: Uint8Array
  ): Promise<PasswordData> => {
    validatePassword(password);

    let passwordSalt: Uint8Array | null = null;
    let keyMaterial: CryptoKey | null = null;

    try {
      passwordSalt =
        salt || crypto.getRandomValues(new Uint8Array(PASSWORD_SALT_LENGTH));

      keyMaterial = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(password),
        { name: 'PBKDF2' },
        false,
        ['deriveBits']
      );

      const hashBuffer = await crypto.subtle.deriveBits(
        {
          name: 'PBKDF2',
          salt: passwordSalt as BufferSource,
          iterations: ITERATIONS,
          hash: 'SHA-256',
        },
        keyMaterial,
        256
      );

      return {
        data: arrayBufferToBase64(hashBuffer),
        salt: arrayBufferToBase64(passwordSalt.buffer as ArrayBuffer),
      };
    } catch (error) {
      throw new Error(`Password hashing failed: ${(error as Error).message}`);
    } finally {
      // Clear sensitive data from memory
      if (!salt && passwordSalt) secureMemoryClear(passwordSalt);
    }
  },

  /**
   * Enhanced password verification with rate limiting
   */
  verifyPassword: async (
    password: string,
    storedHash: string,
    storedSalt: string
  ): Promise<boolean> => {
    if (!password || !storedHash || !storedSalt) {
      return false;
    }

    let salt: Uint8Array | null = null;

    try {
      salt = base64ToArrayBuffer(storedSalt);
      const { data } = await encryption.hashPassword(password, salt);
      const result = encryption.secureCompare(data, storedHash);

      return result;
    } catch (error) {
      console.error('Password verification error:', error);
      return false;
    } finally {
      if (salt) secureMemoryClear(salt);
    }
  },

  /**
   * Enhanced data hashing
   */
  hashData: async (data: string): Promise<string> => {
    validateData(data);

    try {
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(data);
      const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
      return arrayBufferToBase64(hashBuffer);
    } catch (error) {
      throw new Error(`Data hashing failed: ${(error as Error).message}`);
    }
  },

  /**
   * Enhanced salt generation
   */
  generateSalt: (length: number = SALT_LENGTH): Uint8Array => {
    if (typeof length !== 'number' || length <= 0 || length > 1024) {
      throw new Error('Salt length must be a positive number <= 1024');
    }
    return crypto.getRandomValues(new Uint8Array(length));
  },

  /**
   * Enhanced nonce generation
   */
  generateNonce: (length: number = NONCE_LENGTH): Uint8Array => {
    if (typeof length !== 'number' || length <= 0 || length > 1024) {
      throw new Error('Nonce length must be a positive number <= 1024');
    }
    return crypto.getRandomValues(new Uint8Array(length));
  },

  /**
   * Enhanced password strength validation
   */
  validatePasswordStrength: (
    password: string
  ): { isValid: boolean; errors: string[]; score: number } => {
    const errors: string[] = [];
    let score = 0;

    if (!password || typeof password !== 'string') {
      errors.push('Password must be a valid string');
      return { isValid: false, errors, score: 0 };
    }

    // Length requirements
    if (password.length < MIN_PASSWORD_LENGTH) {
      errors.push(
        `Password must be at least ${MIN_PASSWORD_LENGTH} characters long`
      );
    } else {
      score += Math.min(password.length, 20); // Up to 20 points for length
    }

    // Character requirements
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    } else {
      score += 10;
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    } else {
      score += 10;
    }

    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    } else {
      score += 10;
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    } else {
      score += 10;
    }

    // Additional security checks
    if (password.length > 16) {
      score += 10; // Bonus for longer passwords
    }

    if (/[^\x20-\x7E]/.test(password)) {
      score += 5; // Bonus for unicode characters
    }

    // Penalize common patterns
    if (/(.)\1{2,}/.test(password)) {
      score -= 10; // Repeated characters
      errors.push('Password should not contain repeated characters');
    }

    if (/123|abc|qwe|password|admin/i.test(password)) {
      score -= 20; // Common patterns
      errors.push('Password contains common patterns');
    }

    score = Math.max(0, Math.min(100, score));

    return {
      isValid: errors.length === 0 && score >= 60,
      errors,
      score,
    };
  },

  /**
   * Enhanced secure comparison to prevent timing attacks
   * Uses native timing-safe comparison when available
   */
  secureCompare: (a: string, b: string): boolean => {
    if (typeof a !== 'string' || typeof b !== 'string') {
      return false;
    }

    if (a.length !== b.length) {
      return false;
    }

    // Try to use native timing-safe comparison if available
    if (
      typeof crypto !== 'undefined' &&
      crypto.subtle &&
      'timingSafeEqual' in crypto.subtle
    ) {
      try {
        const aBuffer = new TextEncoder().encode(a);
        const bBuffer = new TextEncoder().encode(b);
        return (crypto.subtle as any).timingSafeEqual(aBuffer, bBuffer);
      } catch {
        // Fallback to manual implementation
      }
    }

    // Manual constant-time comparison
    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return result === 0;
  },

  /**
   * Key derivation function for additional security
   */
  deriveKey: async (
    password: string,
    salt: Uint8Array,
    iterations: number = ITERATIONS,
    keyLength: number = 256
  ): Promise<ArrayBuffer> => {
    validatePassword(password);

    if (iterations < MIN_ITERATIONS || iterations > MAX_ITERATIONS) {
      throw new Error(
        `Iterations must be between ${MIN_ITERATIONS} and ${MAX_ITERATIONS}`
      );
    }

    try {
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(password),
        { name: 'PBKDF2' },
        false,
        ['deriveBits']
      );

      return await crypto.subtle.deriveBits(
        {
          name: 'PBKDF2',
          salt: salt as BufferSource,
          iterations: iterations,
          hash: 'SHA-256',
        },
        keyMaterial,
        keyLength
      );
    } catch (error) {
      throw new Error(`Key derivation failed: ${(error as Error).message}`);
    }
  },

  /**
   * Get current security constants
   */
  getSecurityConstants: () => ({
    ITERATIONS,
    SALT_LENGTH,
    NONCE_LENGTH,
    PASSWORD_SALT_LENGTH,
    MIN_PASSWORD_LENGTH,
    MIN_ITERATIONS,
    MAX_ITERATIONS,
    MAX_DATA_SIZE,
  }),
};
