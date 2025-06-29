import { storageHandler } from '../storage-handler';
import {
    runTest,
    clearStorage,
    getStorageData,
    setStorageData,
    createTestAccountData,
    createTestSeedPhraseData,
    createTestPasswordData,
    createTestDataEncryption,
    createTestWalletData,
    TEST_ACCOUNT_ID,
    TEST_SEED_PHRASE_ID,
    TEST_PRIVATE_KEY_ID
} from './test-utils';

// Test suite for storage handler
export const runStorageHandlerTests = async () => {
    console.log('🧪 Running Storage Handler Tests...\n');

    // Test 1: Save and get password
    await runTest('Save and get password', async () => {
        await clearStorage();

        const passwordData = createTestPasswordData();
        await storageHandler.savePassword(passwordData);

        const retrievedPassword = await storageHandler.getStoredPassword();
        if (!retrievedPassword || retrievedPassword.data !== passwordData.data) {
            throw new Error('Password not saved or retrieved correctly');
        }

        console.log('✓ Password save/get works correctly');
    });

    // Test 2: Prevent duplicate password save
    await runTest('Prevent duplicate password save', async () => {
        await clearStorage();

        const passwordData = createTestPasswordData();
        await storageHandler.savePassword(passwordData);

        try {
            await storageHandler.savePassword(passwordData);
            throw new Error('Should not allow duplicate password save');
        } catch (error) {
            if (!(error as Error).message.includes('Password already exists')) {
                throw error;
            }
            console.log('✓ Duplicate password save correctly prevented');
        }
    });

    // Test 3: Save and get account
    await runTest('Save and get account', async () => {
        await clearStorage();

        const accountData = createTestAccountData();
        await storageHandler.saveAccountById(TEST_ACCOUNT_ID, accountData);

        const retrievedAccount = await storageHandler.getAccountById(TEST_ACCOUNT_ID);
        if (!retrievedAccount || retrievedAccount.name !== accountData.name) {
            throw new Error('Account not saved or retrieved correctly');
        }

        console.log('✓ Account save/get works correctly');
    });

    // Test 4: Save and get accounts list
    await runTest('Save and get accounts list', async () => {
        await clearStorage();

        const accountIds = await storageHandler.saveAccounts(TEST_ACCOUNT_ID);
        if (!accountIds.includes(TEST_ACCOUNT_ID)) {
            throw new Error('Account ID not added to list');
        }

        const storageData = getStorageData();
        const accountsList = storageData['purro:accounts'];
        if (!Array.isArray(accountsList) || !accountsList.includes(TEST_ACCOUNT_ID)) {
            throw new Error('Accounts list not stored correctly');
        }

        console.log('✓ Accounts list save works correctly');
    });

    // Test 5: Prevent duplicate account in list
    await runTest('Prevent duplicate account in list', async () => {
        await clearStorage();

        await storageHandler.saveAccounts(TEST_ACCOUNT_ID);

        try {
            await storageHandler.saveAccounts(TEST_ACCOUNT_ID);
            throw new Error('Should not allow duplicate account in list');
        } catch (error) {
            if (!(error as Error).message.includes('Account already exists')) {
                throw error;
            }
            console.log('✓ Duplicate account in list correctly prevented');
        }
    });

    // Test 6: Save and get seed phrase
    await runTest('Save and get seed phrase', async () => {
        await clearStorage();

        const seedPhraseData = createTestSeedPhraseData();
        await storageHandler.saveSeedPhrase(TEST_SEED_PHRASE_ID, seedPhraseData);

        const retrievedSeedPhrase = await storageHandler.getSeedPhraseById(TEST_SEED_PHRASE_ID);
        if (!retrievedSeedPhrase || retrievedSeedPhrase.currentDerivationIndex !== seedPhraseData.currentDerivationIndex) {
            throw new Error('Seed phrase not saved or retrieved correctly');
        }

        console.log('✓ Seed phrase save/get works correctly');
    });

    // Test 7: Save and get private key
    await runTest('Save and get private key', async () => {
        await clearStorage();

        const privateKeyData = createTestDataEncryption();
        await storageHandler.savePrivateKey(TEST_PRIVATE_KEY_ID, privateKeyData);

        const retrievedPrivateKey = await storageHandler.getPrivateKeyById(TEST_PRIVATE_KEY_ID);
        if (!retrievedPrivateKey || retrievedPrivateKey.encrypted !== privateKeyData.encrypted) {
            throw new Error('Private key not saved or retrieved correctly');
        }

        console.log('✓ Private key save/get works correctly');
    });

    // Test 8: Save and get wallet
    await runTest('Save and get wallet', async () => {
        await clearStorage();

        const walletData = createTestWalletData();
        await storageHandler.saveWallet(TEST_ACCOUNT_ID, walletData);

        const retrievedWallet = await storageHandler.getWalletById(TEST_ACCOUNT_ID);
        if (!retrievedWallet || retrievedWallet.eip155?.address !== walletData.eip155.address) {
            throw new Error('Wallet not saved or retrieved correctly');
        }

        console.log('✓ Wallet save/get works correctly');
    });

    // Test 9: Update seed phrase
    await runTest('Update seed phrase', async () => {
        await clearStorage();

        const seedPhraseData = createTestSeedPhraseData();
        await storageHandler.saveSeedPhrase(TEST_SEED_PHRASE_ID, seedPhraseData);

        const updatedData = { ...seedPhraseData, currentDerivationIndex: 5 };
        await storageHandler.updateSeedPhrase(TEST_SEED_PHRASE_ID, updatedData, ['new-account-id']);

        const retrievedSeedPhrase = await storageHandler.getSeedPhraseById(TEST_SEED_PHRASE_ID);
        if (!retrievedSeedPhrase || retrievedSeedPhrase.currentDerivationIndex !== 5) {
            throw new Error('Seed phrase not updated correctly');
        }

        console.log('✓ Seed phrase update works correctly');
    });

    // Test 10: Remove account from list
    await runTest('Remove account from list', async () => {
        await clearStorage();

        await storageHandler.saveAccounts(TEST_ACCOUNT_ID);
        await storageHandler.saveAccounts('another-account-id');

        await storageHandler.removeAccountFromList(TEST_ACCOUNT_ID);

        const storageData = getStorageData();
        const accountsList = storageData['purro:accounts'];
        if (!accountsList || accountsList.includes(TEST_ACCOUNT_ID)) {
            throw new Error('Account not removed from list');
        }
        if (!accountsList.includes('another-account-id')) {
            throw new Error('Other accounts should remain in list');
        }

        console.log('✓ Account removal from list works correctly');
    });

    // Test 11: Get all seed phrases
    await runTest('Get all seed phrases', async () => {
        await clearStorage();

        // Setup test data
        const accountData = createTestAccountData();
        await storageHandler.saveAccountById(TEST_ACCOUNT_ID, accountData);
        await storageHandler.saveAccounts(TEST_ACCOUNT_ID);

        const seedPhraseData = createTestSeedPhraseData();
        await storageHandler.saveSeedPhrase(TEST_SEED_PHRASE_ID, seedPhraseData);

        const allSeedPhrases = await storageHandler.getAllSeedPhrases();
        if (allSeedPhrases.length !== 1 || allSeedPhrases[0].id !== TEST_SEED_PHRASE_ID) {
            throw new Error('All seed phrases not retrieved correctly');
        }

        console.log('✓ Get all seed phrases works correctly');
    });

    // Test 12: Get all private keys
    await runTest('Get all private keys', async () => {
        await clearStorage();

        // Setup test data
        const accountData = { ...createTestAccountData(), source: 'privateKey' as const, privateKeyId: TEST_PRIVATE_KEY_ID };
        delete (accountData as any).seedPhraseId;
        delete (accountData as any).derivationIndex;

        await storageHandler.saveAccountById(TEST_ACCOUNT_ID, accountData);
        await storageHandler.saveAccounts(TEST_ACCOUNT_ID);

        const privateKeyData = createTestDataEncryption();
        await storageHandler.savePrivateKey(TEST_PRIVATE_KEY_ID, privateKeyData);

        const allPrivateKeys = await storageHandler.getAllPrivateKeys();
        if (allPrivateKeys.length !== 1 || allPrivateKeys[0].id !== TEST_PRIVATE_KEY_ID) {
            throw new Error('All private keys not retrieved correctly');
        }

        console.log('✓ Get all private keys works correctly');
    });

    // Test 13: Reset wallet
    await runTest('Reset wallet', async () => {
        await clearStorage();

        // Add some test data
        await setStorageData({
            'purro:accounts': [TEST_ACCOUNT_ID],
            [`purro:account:id:${TEST_ACCOUNT_ID}`]: createTestAccountData(),
            'purro:account:password': createTestPasswordData()
        });

        await storageHandler.resetWallet();

        const allData = getStorageData();
        if (Object.keys(allData).length !== 0) {
            throw new Error('Wallet not reset completely');
        }

        console.log('✓ Wallet reset works correctly');
    });

    console.log('\n🎉 All storage handler tests completed!');
};

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runStorageHandlerTests();
} 