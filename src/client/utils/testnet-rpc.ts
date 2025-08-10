import { ethers } from 'ethers';

const HYPEREVM_TESTNET_RPC = 'https://rpc.hyperliquid-testnet.xyz/evm';

// Create provider for testnet
const createTestnetProvider = () => {
    return new ethers.JsonRpcProvider(HYPEREVM_TESTNET_RPC);
};

// Get native HYPE balance
export const getTestnetNativeBalance = async (address: string): Promise<{ balance: string; balanceFormatted: number }> => {
    try {
        const provider = createTestnetProvider();
        const balance = await provider.getBalance(address);
        const balanceFormatted = parseFloat(ethers.formatEther(balance));

        return {
            balance: balance.toString(),
            balanceFormatted
        };
    } catch (error) {
        console.error('Failed to get testnet native balance:', error);
        throw error;
    }
};

// Get ERC-20 token balance
export const getTestnetTokenBalance = async (
    tokenAddress: string,
    walletAddress: string,
    decimals: number = 18
): Promise<{ balance: string; balanceFormatted: number }> => {
    try {
        const provider = createTestnetProvider();

        // ERC-20 balanceOf function signature
        const abi = ['function balanceOf(address owner) view returns (uint256)'];
        const contract = new ethers.Contract(tokenAddress, abi, provider);

        const balance = await contract.balanceOf(walletAddress);
        const balanceFormatted = parseFloat(ethers.formatUnits(balance, decimals));

        return {
            balance: balance.toString(),
            balanceFormatted
        };
    } catch (error) {
        console.error('Failed to get testnet token balance:', error);
        throw error;
    }
};

// Get token metadata (name, symbol, decimals)
export const getTestnetTokenMetadata = async (tokenAddress: string): Promise<{
    name: string;
    symbol: string;
    decimals: number;
}> => {
    try {
        const provider = createTestnetProvider();

        // ERC-20 metadata functions
        const abi = [
            'function name() view returns (string)',
            'function symbol() view returns (string)',
            'function decimals() view returns (uint8)'
        ];
        const contract = new ethers.Contract(tokenAddress, abi, provider);

        const [name, symbol, decimals] = await Promise.all([
            contract.name(),
            contract.symbol(),
            contract.decimals()
        ]);

        return {
            name,
            symbol,
            decimals: Number(decimals)
        };
    } catch (error) {
        console.error('Failed to get testnet token metadata:', error);
        throw error;
    }
}; 