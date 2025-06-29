import { PurroEVMProvider } from '../providers/evm-provider';
import { ProviderError, ProviderErrorCode } from '../types/evm-provider';

export class ProviderTester {
    private provider: PurroEVMProvider;

    constructor(provider: PurroEVMProvider) {
        this.provider = provider;
    }

    // Test basic provider functionality
    async testBasicFunctionality(): Promise<boolean> {
        try {
            console.log('🧪 Testing basic provider functionality...');

            // Test provider info
            const info = this.provider.info;
            console.log('Provider info:', info);

            // Test chain ID
            const chainId = await this.provider.request({ method: 'eth_chainId' });
            console.log('Chain ID:', chainId);

            // Test network version
            const networkVersion = await this.provider.request({ method: 'net_version' });
            console.log('Network version:', networkVersion);

            // Test accounts (should be empty initially)
            const accounts = await this.provider.request({ method: 'eth_accounts' });
            console.log('Accounts:', accounts);

            console.log('✅ Basic functionality test passed');
            return true;
        } catch (error) {
            console.error('❌ Basic functionality test failed:', error);
            return false;
        }
    }

    // Test EIP-6963 provider discovery
    testEIP6963Discovery(): boolean {
        try {
            console.log('🧪 Testing EIP-6963 provider discovery...');

            const providerDetail = this.provider.getProviderDetail();
            console.log('Provider detail:', providerDetail);

            // Validate provider detail structure
            if (!providerDetail.info || !providerDetail.provider) {
                throw new Error('Invalid provider detail structure');
            }

            // Validate provider info
            const { info } = providerDetail;
            if (!info.uuid || !info.name || !info.rdns) {
                throw new Error('Invalid provider info structure');
            }

            console.log('✅ EIP-6963 discovery test passed');
            return true;
        } catch (error) {
            console.error('❌ EIP-6963 discovery test failed:', error);
            return false;
        }
    }

    // Test event system
    testEventSystem(): boolean {
        try {
            console.log('🧪 Testing event system...');

            let eventReceived = false;

            // Test event listener
            const testListener = (event: any) => {
                console.log('Test event received:', event);
                eventReceived = true;
            };

            // Add listener
            this.provider.on('test', testListener);

            // Emit test event (using private method for testing)
            (this.provider as any).emit('test', { data: 'test' });

            // Remove listener
            this.provider.removeListener('test', testListener);

            if (!eventReceived) {
                throw new Error('Event not received');
            }

            console.log('✅ Event system test passed');
            return true;
        } catch (error) {
            console.error('❌ Event system test failed:', error);
            return false;
        }
    }

    // Test error handling
    async testErrorHandling(): Promise<boolean> {
        try {
            console.log('🧪 Testing error handling...');

            // Test unsupported method
            try {
                await this.provider.request({ method: 'unsupported_method' });
                throw new Error('Should have thrown an error for unsupported method');
            } catch (error) {
                if (!(error instanceof ProviderError) || error.code !== ProviderErrorCode.METHOD_NOT_FOUND) {
                    throw new Error('Wrong error type for unsupported method');
                }
            }

            // Test invalid parameters
            try {
                await this.provider.request({ method: 'eth_getBalance', params: [] });
                // This might not throw an error depending on implementation
            } catch (error) {
                console.log('Expected error for invalid parameters:', error);
            }

            console.log('✅ Error handling test passed');
            return true;
        } catch (error) {
            console.error('❌ Error handling test failed:', error);
            return false;
        }
    }

    // Test legacy methods
    async testLegacyMethods(): Promise<boolean> {
        try {
            console.log('🧪 Testing legacy methods...');

            // Test send method
            const chainId = await this.provider.send('eth_chainId');
            console.log('Chain ID via send:', chainId);

            // Test sendAsync method
            const sendAsyncPromise = new Promise((resolve, reject) => {
                this.provider.sendAsync(
                    {
                        id: 1,
                        jsonrpc: '2.0',
                        method: 'eth_chainId',
                        params: []
                    },
                    (error, result) => {
                        if (error) {
                            reject(error);
                        } else {
                            resolve(result);
                        }
                    }
                );
            });

            const asyncResult = await sendAsyncPromise;
            console.log('Chain ID via sendAsync:', asyncResult);

            console.log('✅ Legacy methods test passed');
            return true;
        } catch (error) {
            console.error('❌ Legacy methods test failed:', error);
            return false;
        }
    }

    // Run all tests
    async runAllTests(): Promise<boolean> {
        console.log('🚀 Starting Purro EVM Provider tests...');

        const tests = [
            this.testBasicFunctionality(),
            this.testEIP6963Discovery(),
            this.testEventSystem(),
            this.testErrorHandling(),
            this.testLegacyMethods()
        ];

        const results = await Promise.all(tests);
        const allPassed = results.every(result => result);

        if (allPassed) {
            console.log('🎉 All provider tests passed!');
        } else {
            console.log('💥 Some provider tests failed!');
        }

        return allPassed;
    }
}

// Helper function to create and run tests
export async function testProvider(provider: PurroEVMProvider): Promise<boolean> {
    const tester = new ProviderTester(provider);
    return await tester.runAllTests();
}

// Mock response helper for testing
export function createMockResponse(result: any, error?: string) {
    return {
        result: error ? undefined : result,
        error: error || undefined
    };
} 