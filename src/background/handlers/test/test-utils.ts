// Test utilities for handlers testing

// Mock Chrome Storage
class MockChromeStorage {
  private data: Record<string, any> = {};

  get = async (
    keys: string | string[] | Record<string, any>
  ): Promise<Record<string, any>> => {
    if (typeof keys === 'string') {
      return { [keys]: this.data[keys] };
    } else if (Array.isArray(keys)) {
      const result: Record<string, any> = {};
      keys.forEach(key => {
        if (this.data[key] !== undefined) {
          result[key] = this.data[key];
        }
      });
      return result;
    } else {
      // Return all data if no keys specified
      return { ...this.data };
    }
  };

  set = async (items: Record<string, any>): Promise<void> => {
    Object.assign(this.data, items);
  };

  remove = async (keys: string | string[]): Promise<void> => {
    const keysArray = Array.isArray(keys) ? keys : [keys];
    keysArray.forEach(key => {
      delete this.data[key];
    });
  };

  clear = async (): Promise<void> => {
    this.data = {};
  };

  // Helper method to get all data for debugging
  getAllData = (): Record<string, any> => {
    return { ...this.data };
  };
}

// Setup mock Chrome API
const mockStorage = new MockChromeStorage();

(global as any).chrome = {
  storage: {
    local: mockStorage,
  },
};

// Mock crypto.randomUUID
let uuidCounter = 0;
if (!(global as any).crypto) {
  (global as any).crypto = {};
}
if (!(global as any).crypto.randomUUID) {
  (global as any).crypto.randomUUID = () => `mock-uuid-${++uuidCounter}`;
}

// Test helper function
export const runTest = async (
  testName: string,
  testFn: () => Promise<void>
) => {
  try {
    await testFn();
    console.log(`✅ ${testName} - PASSED`);
  } catch (error) {
    console.error(`❌ ${testName} - FAILED:`, error);
  }
};

// Test data factories
export const createTestAccountData = () => ({
  name: 'Test Account',
  icon: '🐱',
  derivationIndex: 0,
  source: 'seedPhrase' as const,
  seedPhraseId: 'test-seed-phrase-id',
});

export const createTestSeedPhraseData = () => ({
  encryptedData: {
    digest: 'test-digest',
    encrypted: 'encrypted-mnemonic-data',
    iterations: 100000,
    kdf: 'pbkdf2',
    nonce: 'test-nonce',
    salt: 'test-salt',
  },
  currentDerivationIndex: 0,
  accountIds: ['test-account-id'],
});

export const createTestPasswordData = () => ({
  data: 'hashed-password-data',
  salt: 'password-salt',
});

export const createTestDataEncryption = () => ({
  digest: 'test-digest',
  encrypted: 'encrypted-data',
  iterations: 100000,
  kdf: 'pbkdf2',
  nonce: 'test-nonce',
  salt: 'test-salt',
});

export const createTestWalletData = () => ({
  eip155: {
    address: '0x1234567890123456789012345678901234567890',
    publicKey:
      '0x04abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    pathType: 'bip44' as const,
  },
  solana: null,
  sui: null,
});

// Helper functions
export const clearStorage = async () => {
  await mockStorage.clear();
};

export const getStorageData = () => {
  return mockStorage.getAllData();
};

export const setStorageData = async (data: Record<string, any>) => {
  await mockStorage.set(data);
};

// Test constants
export const TEST_MNEMONIC =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
export const TEST_PASSWORD = 'test-password-123';
export const TEST_PRIVATE_KEY =
  '0x1234567890123456789012345678901234567890123456789012345678901234';
export const TEST_ACCOUNT_ID = 'test-account-id';
export const TEST_SEED_PHRASE_ID = 'test-seed-phrase-id';
export const TEST_PRIVATE_KEY_ID = 'test-private-key-id';
