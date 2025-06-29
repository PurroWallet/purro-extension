import { encryption } from './encryption';

// Test helper function
const runTest = async (testName: string, testFn: () => Promise<void>) => {
    try {
        await testFn();
        console.log(`✅ ${testName} - PASSED`);
    } catch (error) {
        console.error(`❌ ${testName} - FAILED:`, error);
    }
};

// Test suite
export const runEncryptionTests = async () => {
    console.log('🧪 Running Encryption Tests...\n');

    // Test 1: Password hashing and verification
    await runTest('Password hashing and verification', async () => {
        const password = 'TestPassword123!';

        // Hash password
        const hashedData = await encryption.hashPassword(password);
        console.log('Hashed password data:', hashedData);

        // Verify correct password
        const isValidCorrect = await encryption.verifyPassword(password, hashedData.data, hashedData.salt);
        if (!isValidCorrect) {
            throw new Error('Valid password verification failed');
        }

        // Verify incorrect password
        const isValidIncorrect = await encryption.verifyPassword('WrongPassword', hashedData.data, hashedData.salt);
        if (isValidIncorrect) {
            throw new Error('Invalid password verification should have failed');
        }

        console.log('✓ Password verification works correctly');
    });

    // Test 2: Data encryption and decryption
    await runTest('Data encryption and decryption', async () => {
        const data = 'Sensitive data to encrypt';
        const password = 'EncryptionPassword123!';

        // Encrypt data
        const encrypted = await encryption.encrypt(data, password);
        console.log('Encrypted data structure:', encrypted);

        // Decrypt data
        const decrypted = await encryption.decrypt(encrypted, password);
        if (decrypted !== data) {
            throw new Error('Decrypted data does not match original');
        }

        console.log('✓ Data encryption/decryption works correctly');
    });

    // Test 3: Wrong password decryption should fail
    await runTest('Wrong password decryption failure', async () => {
        const data = 'Secret data';
        const password = 'CorrectPassword123!';
        const wrongPassword = 'WrongPassword123!';

        const encrypted = await encryption.encrypt(data, password);

        try {
            await encryption.decrypt(encrypted, wrongPassword);
            throw new Error('Decryption should have failed with wrong password');
        } catch (error) {
            if (!(error as Error).message.includes('Decryption failed')) {
                throw error;
            }
            console.log('✓ Wrong password correctly rejected');
        }
    });

    // Test 4: Password strength validation
    await runTest('Password strength validation', async () => {
        const weakPassword = 'weak';
        const strongPassword = 'StrongPassword123!';

        const weakResult = encryption.validatePasswordStrength(weakPassword);
        const strongResult = encryption.validatePasswordStrength(strongPassword);

        if (weakResult.isValid) {
            throw new Error('Weak password should not be valid');
        }

        if (!strongResult.isValid) {
            throw new Error('Strong password should be valid');
        }

        console.log('Weak password errors:', weakResult.errors);
        console.log('✓ Password strength validation works correctly');
    });

    // Test 5: Secure compare function
    await runTest('Secure compare function', async () => {
        const str1 = 'identical';
        const str2 = 'identical';
        const str3 = 'different';

        if (!encryption.secureCompare(str1, str2)) {
            throw new Error('Identical strings should be equal');
        }

        if (encryption.secureCompare(str1, str3)) {
            throw new Error('Different strings should not be equal');
        }

        console.log('✓ Secure compare works correctly');
    });

    // Test 6: Salt and nonce generation
    await runTest('Salt and nonce generation', async () => {
        const salt1 = encryption.generateSalt();
        const salt2 = encryption.generateSalt();
        const nonce1 = encryption.generateNonce();
        const nonce2 = encryption.generateNonce();

        if (salt1.length !== 16) {
            throw new Error('Salt should be 16 bytes');
        }

        if (nonce1.length !== 12) {
            throw new Error('Nonce should be 12 bytes');
        }

        // Check randomness (should be different)
        if (salt1.toString() === salt2.toString()) {
            throw new Error('Salts should be random');
        }

        if (nonce1.toString() === nonce2.toString()) {
            throw new Error('Nonces should be random');
        }

        console.log('✓ Salt and nonce generation works correctly');
    });

    // Test 7: Data hashing
    await runTest('Data hashing', async () => {
        const data = 'Data to hash';
        const hash1 = await encryption.hashData(data);
        const hash2 = await encryption.hashData(data);

        if (hash1 !== hash2) {
            throw new Error('Same data should produce same hash');
        }

        const differentHash = await encryption.hashData('Different data');
        if (hash1 === differentHash) {
            throw new Error('Different data should produce different hash');
        }

        console.log('✓ Data hashing works correctly');
    });

    // Test 8: Complete workflow test
    await runTest('Complete encryption workflow', async () => {
        const originalPassword = 'UserPassword123!';
        const sensitiveData = JSON.stringify({
            privateKey: 'abc123def456',
            mnemonic: 'word1 word2 word3 word4',
            accounts: ['account1', 'account2']
        });

        // Step 1: Hash password for storage
        const passwordHash = await encryption.hashPassword(originalPassword);
        console.log('Password hash created');

        // Step 2: Encrypt sensitive data
        const encryptedData = await encryption.encrypt(sensitiveData, originalPassword);
        console.log('Data encrypted');

        // Step 3: Simulate user login - verify password
        const isPasswordValid = await encryption.verifyPassword(
            originalPassword,
            passwordHash.data,
            passwordHash.salt
        );

        if (!isPasswordValid) {
            throw new Error('Password verification failed');
        }
        console.log('Password verified successfully');

        // Step 4: Decrypt data after successful login
        const decryptedData = await encryption.decrypt(encryptedData, originalPassword);
        const parsedData = JSON.parse(decryptedData);

        if (parsedData.privateKey !== 'abc123def456') {
            throw new Error('Decrypted data is corrupted');
        }

        console.log('✓ Complete workflow successful');
    });

    console.log('\n🎉 All encryption tests completed!');
};

// Demo function to show how password verification works
export const demonstratePasswordVerification = async () => {
    console.log('\n📋 Password Verification Demo:\n');

    // Simulate user registration
    const userPassword = 'MySecurePassword123!';
    console.log('1. User registers with password:', userPassword);

    // Hash password for storage (this would be stored in database/storage)
    const hashedPassword = await encryption.hashPassword(userPassword);
    console.log('2. Password hashed and stored:', {
        data: hashedPassword.data.substring(0, 20) + '...',
        salt: hashedPassword.salt.substring(0, 20) + '...'
    });

    // Simulate user login attempts
    console.log('\n3. Login attempts:');

    // Correct password
    const correctAttempt = await encryption.verifyPassword(
        userPassword,
        hashedPassword.data,
        hashedPassword.salt
    );
    console.log('   Correct password:', correctAttempt ? '✅ ACCEPTED' : '❌ REJECTED');

    // Wrong password
    const wrongAttempt = await encryption.verifyPassword(
        'WrongPassword123!',
        hashedPassword.data,
        hashedPassword.salt
    );
    console.log('   Wrong password:', wrongAttempt ? '✅ ACCEPTED' : '❌ REJECTED');

    // Empty password
    const emptyAttempt = await encryption.verifyPassword(
        '',
        hashedPassword.data,
        hashedPassword.salt
    );
    console.log('   Empty password:', emptyAttempt ? '✅ ACCEPTED' : '❌ REJECTED');
};

// Run tests if this file is executed directly
if (typeof window === 'undefined') {
    // Node.js environment
    runEncryptionTests().then(() => {
        return demonstratePasswordVerification();
    }).catch(console.error);
}