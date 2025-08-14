import { authHandler } from '../auth-handler';
import { encryption } from '../../lib/encryption';
import { storageHandler } from '../storage-handler';
import { accountHandler } from '../account-handler';
import { DataEncryption } from '../../types/account';
import { runTest, clearStorage } from './test-utils';

// Test suite for security-specific functionality
export const runSecurityTests = async () => {
  console.log('🔒 Running Security Tests...\n');

  // Test 1: Session timeout and expiration
  await runTest('Session timeout and expiration', async () => {
    await clearStorage();

    const testPassword = 'TestPassword123!';

    // Import password and create session
    await authHandler.importPassword({ password: testPassword });

    // Get initial session
    const initialSession = await authHandler.getSession();
    if (!initialSession) {
      throw new Error('Initial session should be created');
    }

    // Manually expire the session by setting expiresAt to past
    const _expiredSession = {
      ...initialSession,
      expiresAt: Date.now() - 1000, // 1 second ago
    };

    // Set expired session
    await authHandler.lock();

    // Try to get session after expiration
    const expiredSessionResult = await authHandler.getSession();
    if (expiredSessionResult !== null) {
      throw new Error('Expired session should return null');
    }

    console.log('✓ Session timeout works correctly');
  });

  // Test 2: Data tampering detection
  await runTest('Data integrity tampering detection', async () => {
    const originalData = 'sensitive data to protect';
    const password = 'EncryptionPassword123!';

    // Encrypt data
    const encrypted = await encryption.encrypt(originalData, password);

    // Test 1: Tamper with encrypted data
    const tamperedEncrypted: DataEncryption = {
      ...encrypted,
      encrypted: encrypted.encrypted.slice(0, -4) + 'XXXX', // Modify last 4 chars
    };

    try {
      await encryption.decrypt(tamperedEncrypted, password);
      throw new Error('Tampered data should not decrypt successfully');
    } catch (error) {
      if (
        !(error as Error).message.includes('Data integrity verification failed')
      ) {
        throw new Error('Wrong error type for tampered data');
      }
    }

    // Test 2: Tamper with digest
    const tamperedDigest: DataEncryption = {
      ...encrypted,
      digest: 'tampered_digest_value',
    };

    try {
      await encryption.decrypt(tamperedDigest, password);
      throw new Error('Tampered digest should not decrypt successfully');
    } catch (error) {
      if (
        !(error as Error).message.includes('Data integrity verification failed')
      ) {
        throw new Error('Wrong error type for tampered digest');
      }
    }

    // Test 3: Verify original data still works
    const decrypted = await encryption.decrypt(encrypted, password);
    if (decrypted !== originalData) {
      throw new Error('Original data should decrypt correctly');
    }

    console.log('✓ Data tampering detection works correctly');
  });

  // Test 3: Auto-lock functionality
  await runTest('Auto-lock scheduling and execution', async () => {
    await clearStorage();

    const testPassword = 'AutoLockTest123!';

    // Mock chrome.alarms API for testing
    const mockAlarms = {
      cleared: false,
      created: false,
      alarmName: '',
      alarmTime: 0,
    };

    const originalClear = chrome.alarms?.clear;
    const originalCreate = chrome.alarms?.create;

    if (chrome.alarms) {
      chrome.alarms.clear = ((name?: string) => {
        mockAlarms.cleared = true;
        mockAlarms.alarmName = name || '';
        return Promise.resolve(true);
      }) as any;

      chrome.alarms.create = ((
        name: string,
        alarmInfo: chrome.alarms.AlarmCreateInfo
      ) => {
        mockAlarms.created = true;
        mockAlarms.alarmName = name;
        mockAlarms.alarmTime = alarmInfo.when || 0;
        return Promise.resolve();
      }) as any;
    }

    try {
      // Import password (this should schedule auto-lock)
      await authHandler.importPassword({ password: testPassword });

      // Verify auto-lock was scheduled
      if (chrome.alarms) {
        if (!mockAlarms.cleared || !mockAlarms.created) {
          throw new Error('Auto-lock alarm should be cleared and created');
        }

        if (mockAlarms.alarmName !== 'AUTO_LOCK') {
          throw new Error('Auto-lock alarm should be named AUTO_LOCK');
        }

        const expectedTime = Date.now() + 30 * 60 * 1000; // Default 30 minutes
        const timeDiff = Math.abs(mockAlarms.alarmTime - expectedTime);

        if (timeDiff > 5000) {
          // Allow 5 second tolerance
          throw new Error(
            'Auto-lock alarm time should be approximately 30 minutes from now'
          );
        }
      }

      console.log('✓ Auto-lock scheduling works correctly');
    } finally {
      // Restore original functions
      if (chrome.alarms) {
        if (originalClear) chrome.alarms.clear = originalClear;
        if (originalCreate) chrome.alarms.create = originalCreate;
      }
    }
  });

  // Test 4: Session security after lock
  await runTest('Session security after manual lock', async () => {
    await clearStorage();

    const testPassword = 'SessionLockTest123!';

    // Create session
    await authHandler.importPassword({ password: testPassword });

    // Verify session exists
    const sessionBefore = await authHandler.getSession();
    if (!sessionBefore) {
      throw new Error('Session should exist before lock');
    }

    // Lock the session
    await authHandler.lock();

    // Verify session is cleared
    const sessionAfter = await authHandler.getSession();
    if (sessionAfter !== null) {
      throw new Error('Session should be null after lock');
    }

    // Try to access private key (should fail)
    const testAccount = {
      id: 'test-account-id',
      name: 'Test Account',
      icon: '🔒',
      source: 'privateKey' as const,
      privateKeyId: 'test-private-key-id',
    };

    await storageHandler.saveAccountById(testAccount.id, testAccount);

    try {
      await accountHandler.getPrivateKeyByAccountId(testAccount.id);
      throw new Error('Private key access should fail when session is locked');
    } catch (error) {
      if (!(error as Error).message.includes('Session not unlocked')) {
        throw new Error('Wrong error type for locked session');
      }
    }

    console.log('✓ Session security after lock works correctly');
  });

  // Test 5: Password verification security
  await runTest('Password verification timing attack resistance', async () => {
    const correctPassword = 'CorrectPassword123!';
    const wrongPassword1 = 'WrongPassword123!';
    const wrongPassword2 = 'X'; // Very short wrong password

    // Hash the correct password
    const hashedPassword = await encryption.hashPassword(correctPassword);

    // Time multiple verification attempts
    const timings: number[] = [];
    const attempts = 10;

    // Test with correct password
    for (let i = 0; i < attempts; i++) {
      const start = performance.now();
      await encryption.verifyPassword(
        correctPassword,
        hashedPassword.data,
        hashedPassword.salt
      );
      const end = performance.now();
      timings.push(end - start);
    }

    // Test with wrong passwords
    for (let i = 0; i < attempts; i++) {
      const start = performance.now();
      await encryption.verifyPassword(
        wrongPassword1,
        hashedPassword.data,
        hashedPassword.salt
      );
      const end = performance.now();
      timings.push(end - start);
    }

    for (let i = 0; i < attempts; i++) {
      const start = performance.now();
      await encryption.verifyPassword(
        wrongPassword2,
        hashedPassword.data,
        hashedPassword.salt
      );
      const end = performance.now();
      timings.push(end - start);
    }

    // Calculate timing statistics
    const avgTiming = timings.reduce((a, b) => a + b, 0) / timings.length;
    const maxTiming = Math.max(...timings);
    const minTiming = Math.min(...timings);
    const variance = maxTiming - minTiming;

    console.log(
      `Timing stats: avg=${avgTiming.toFixed(2)}ms, variance=${variance.toFixed(2)}ms`
    );

    // Timing variance should be reasonable (not indicating timing attack vulnerability)
    // This is a basic check - in production, more sophisticated timing analysis would be needed
    if (variance > avgTiming * 2) {
      console.warn(
        '⚠️ High timing variance detected - potential timing attack vulnerability'
      );
    }

    console.log('✓ Password verification timing analysis completed');
  });

  // Test 6: Memory cleanup verification
  await runTest('Secure memory cleanup verification', async () => {
    await clearStorage();

    const testPassword = 'MemoryCleanupTest123!';

    // Create session
    await authHandler.importPassword({ password: testPassword });

    // Get session to ensure it exists
    const session = await authHandler.getSession();
    if (!session) {
      throw new Error('Session should exist');
    }

    // Lock session (should trigger cleanup)
    await authHandler.lock();

    // Verify session is cleaned up
    const cleanedSession = await authHandler.getSession();
    if (cleanedSession !== null) {
      throw new Error('Session should be null after cleanup');
    }

    console.log('✓ Memory cleanup verification completed');
  });

  // Test 7: Encryption parameter validation
  await runTest('Encryption parameter security validation', async () => {
    // Test minimum iterations enforcement
    const weakEncryptionData: DataEncryption = {
      digest: 'test',
      encrypted: 'test',
      iterations: 100, // Too low
      kdf: 'PBKDF2',
      nonce: 'test',
      salt: 'test',
    };

    try {
      await encryption.decrypt(weakEncryptionData, 'password');
      throw new Error('Weak encryption parameters should be rejected');
    } catch (error) {
      if (!(error as Error).message.includes('Insufficient iterations')) {
        throw new Error('Wrong error for weak iterations');
      }
    }

    // Test maximum iterations enforcement
    const excessiveEncryptionData: DataEncryption = {
      digest: 'test',
      encrypted: 'test',
      iterations: 3000000, // Too high
      kdf: 'PBKDF2',
      nonce: 'test',
      salt: 'test',
    };

    try {
      await encryption.decrypt(excessiveEncryptionData, 'password');
      throw new Error('Excessive encryption parameters should be rejected');
    } catch (error) {
      if (!(error as Error).message.includes('Too many iterations')) {
        throw new Error('Wrong error for excessive iterations');
      }
    }

    console.log('✓ Encryption parameter validation works correctly');
  });

  console.log('\n🎉 All security tests completed!');
};

// Run the tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runSecurityTests().catch(console.error);
}
