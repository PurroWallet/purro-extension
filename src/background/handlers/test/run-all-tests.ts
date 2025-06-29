import { runStorageHandlerTests } from './storage-handler.test';
import { runAccountHandlerTests } from './account-handler.test';

// Main test runner for all handler tests
export const runAllHandlerTests = async () => {
    console.log('🚀 Starting All Handler Tests...\n');

    try {
        // Run storage handler tests
        await runStorageHandlerTests();
        console.log('\n' + '='.repeat(50) + '\n');

        // Run account handler tests
        await runAccountHandlerTests();
        console.log('\n' + '='.repeat(50) + '\n');

        console.log('🎉 All handler tests completed successfully!');

    } catch (error) {
        console.error('💥 Test suite failed:', error);
        process.exit(1);
    }
};

// Run all tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runAllHandlerTests();
} 