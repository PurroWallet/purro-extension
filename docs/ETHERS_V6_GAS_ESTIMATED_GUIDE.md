# Ethers.js v6 - Gas Estimation Guide

Hướng dẫn chi tiết về cách estimate gas cho các transaction trên EVM sử dụng ethers.js v6.

## Table of Contents
- [Cài đặt](#cài-đặt)
- [Khởi tạo Provider và Wallet](#khởi-tạo-provider-và-wallet)
- [Estimate Gas cho Contract Calls](#estimate-gas-cho-contract-calls)
- [Estimate Gas cho ETH Transfer](#estimate-gas-cho-eth-transfer)
- [Estimate Gas với Transaction Object](#estimate-gas-với-transaction-object)
- [Sử dụng Estimated Gas](#sử-dụng-estimated-gas)
- [Gas Price và Fee Calculation](#gas-price-và-fee-calculation)
- [Error Handling](#error-handling)
- [Best Practices](#best-practices)
- [Examples](#examples)

## Cài đặt

```bash
npm install ethers@6
```

## Khởi tạo Provider và Wallet

```javascript
import { ethers } from 'ethers';

// Mainnet
const provider = new ethers.JsonRpcProvider('https://mainnet.infura.io/v3/YOUR-API-KEY');

// Testnet (Sepolia)
const provider = new ethers.JsonRpcProvider('https://sepolia.infura.io/v3/YOUR-API-KEY');

// Polygon
const provider = new ethers.JsonRpcProvider('https://polygon-rpc.com');

// BSC
const provider = new ethers.JsonRpcProvider('https://bsc-dataseed.binance.org');

// Wallet
const wallet = new ethers.Wallet('YOUR-PRIVATE-KEY', provider);
```

## Estimate Gas cho Contract Calls

### Basic Contract Gas Estimation

```javascript
// Contract ABI (example)
const abi = [
    "function transfer(address to, uint256 amount) external returns (bool)",
    "function mint(address to, uint256 amount) external payable",
    "function burn(uint256 amount) external"
];

const contractAddress = "0x...";
const contract = new ethers.Contract(contractAddress, abi, wallet);

// Estimate gas cho function call
async function estimateTransferGas() {
    try {
        const estimatedGas = await contract.transfer.estimateGas(
            "0xRecipientAddress",
            ethers.parseUnits("100", 18) // 100 tokens
        );
        
        console.log("Estimated gas:", estimatedGas.toString());
        return estimatedGas;
    } catch (error) {
        console.error("Gas estimation failed:", error);
        throw error;
    }
}
```

### Payable Function Gas Estimation

```javascript
async function estimatePayableFunctionGas() {
    try {
        const estimatedGas = await contract.mint.estimateGas(
            "0xRecipientAddress",
            ethers.parseUnits("10", 18),
            {
                value: ethers.parseEther("0.1") // 0.1 ETH
            }
        );
        
        console.log("Estimated gas for payable function:", estimatedGas.toString());
        return estimatedGas;
    } catch (error) {
        console.error("Gas estimation failed:", error);
        throw error;
    }
}
```

## Estimate Gas cho ETH Transfer

```javascript
async function estimateETHTransferGas() {
    const tx = {
        to: "0xRecipientAddress",
        value: ethers.parseEther("1.0") // 1 ETH
    };

    try {
        const estimatedGas = await provider.estimateGas(tx);
        console.log("Estimated gas for ETH transfer:", estimatedGas.toString());
        return estimatedGas;
    } catch (error) {
        console.error("Gas estimation failed:", error);
        throw error;
    }
}
```

## Estimate Gas với Transaction Object

```javascript
async function estimateWithTransactionObject() {
    // Encode function data
    const functionData = contract.interface.encodeFunctionData("transfer", [
        "0xRecipientAddress",
        ethers.parseUnits("100", 18)
    ]);

    const txRequest = {
        to: contractAddress,
        data: functionData,
        from: wallet.address,
        value: 0 // hoặc ethers.parseEther("0.1") nếu payable
    };

    try {
        const estimatedGas = await provider.estimateGas(txRequest);
        console.log("Estimated gas:", estimatedGas.toString());
        return estimatedGas;
    } catch (error) {
        console.error("Gas estimation failed:", error);
        throw error;
    }
}
```

## Sử dụng Estimated Gas

### Với Gas Buffer

```javascript
async function executeTransactionWithBuffer() {
    // Estimate gas
    const estimatedGas = await contract.transfer.estimateGas(
        "0xRecipientAddress",
        ethers.parseUnits("100", 18)
    );

    // Thêm 20% buffer
    const gasLimit = estimatedGas * 120n / 100n;

    // Thực hiện transaction
    const tx = await contract.transfer(
        "0xRecipientAddress",
        ethers.parseUnits("100", 18),
        {
            gasLimit: gasLimit
        }
    );

    console.log("Transaction hash:", tx.hash);
    
    // Wait for confirmation
    const receipt = await tx.wait();
    console.log("Gas used:", receipt.gasUsed.toString());
    console.log("Gas limit:", receipt.gasLimit.toString());
    
    return receipt;
}
```

### Dynamic Gas Buffer

```javascript
function calculateGasBuffer(estimatedGas, networkId) {
    const buffers = {
        1: 110n,    // Ethereum mainnet: 10%
        137: 120n,  // Polygon: 20%
        56: 115n,   // BSC: 15%
        default: 120n // Default: 20%
    };
    
    const bufferPercent = buffers[networkId] || buffers.default;
    return estimatedGas * bufferPercent / 100n;
}
```

## Gas Price và Fee Calculation

### Get Current Gas Price

```javascript
async function getCurrentGasPrice() {
    try {
        const feeData = await provider.getFeeData();
        
        console.log("Gas Price:", ethers.formatUnits(feeData.gasPrice, "gwei"), "gwei");
        console.log("Max Fee Per Gas:", ethers.formatUnits(feeData.maxFeePerGas, "gwei"), "gwei");
        console.log("Max Priority Fee Per Gas:", ethers.formatUnits(feeData.maxPriorityFeePerGas, "gwei"), "gwei");
        
        return feeData;
    } catch (error) {
        console.error("Failed to get fee data:", error);
        throw error;
    }
}
```

### Calculate Transaction Cost

```javascript
async function calculateTransactionCost(to, functionName, params) {
    try {
        // Estimate gas
        const estimatedGas = await contract[functionName].estimateGas(...params);
        
        // Get fee data
        const feeData = await provider.getFeeData();
        
        // Calculate costs
        const legacyCost = estimatedGas * feeData.gasPrice;
        const eip1559Cost = estimatedGas * feeData.maxFeePerGas;
        
        return {
            estimatedGas: estimatedGas.toString(),
            gasPrice: ethers.formatUnits(feeData.gasPrice, "gwei"),
            maxFeePerGas: ethers.formatUnits(feeData.maxFeePerGas, "gwei"),
            legacyCost: ethers.formatEther(legacyCost),
            eip1559Cost: ethers.formatEther(eip1559Cost)
        };
    } catch (error) {
        console.error("Cost calculation failed:", error);
        throw error;
    }
}
```

## Error Handling

### Safe Gas Estimation

```javascript
async function safeEstimateGas(contract, functionName, params, overrides = {}) {
    try {
        const estimatedGas = await contract[functionName].estimateGas(...params, overrides);
        return {
            success: true,
            gasEstimate: estimatedGas,
            error: null
        };
    } catch (error) {
        console.error("Gas estimation failed:", error.message);
        
        // Handle specific errors
        if (error.code === 'UNPREDICTABLE_GAS_LIMIT') {
            console.log("Transaction may fail - using fallback gas limit");
            return {
                success: false,
                gasEstimate: 300000n, // Fallback gas limit
                error: 'UNPREDICTABLE_GAS_LIMIT'
            };
        }
        
        if (error.code === 'INSUFFICIENT_FUNDS') {
            return {
                success: false,
                gasEstimate: null,
                error: 'INSUFFICIENT_FUNDS'
            };
        }
        
        return {
            success: false,
            gasEstimate: null,
            error: error.message
        };
    }
}
```

### Retry Mechanism

```javascript
async function estimateGasWithRetry(estimateFunction, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            const result = await estimateFunction();
            return result;
        } catch (error) {
            console.log(`Attempt ${i + 1} failed:`, error.message);
            
            if (i === maxRetries - 1) {
                throw error;
            }
            
            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        }
    }
}
```

## Best Practices

### 1. Always Add Gas Buffer

```javascript
// ✅ Good
const gasLimit = estimatedGas * 120n / 100n; // 20% buffer

// ❌ Bad
const gasLimit = estimatedGas; // No buffer
```

### 2. Check Balance Before Transaction

```javascript
async function checkBalanceAndEstimate() {
    const balance = await provider.getBalance(wallet.address);
    const estimatedGas = await contract.transfer.estimateGas(to, amount);
    const feeData = await provider.getFeeData();
    
    const estimatedCost = estimatedGas * feeData.maxFeePerGas;
    
    if (balance < estimatedCost) {
        throw new Error("Insufficient balance for gas fee");
    }
    
    return estimatedGas;
}
```

### 3. Use Appropriate Gas Prices

```javascript
async function getOptimalGasPrice(priority = 'standard') {
    const feeData = await provider.getFeeData();
    
    const gasPrices = {
        slow: feeData.gasPrice * 80n / 100n,
        standard: feeData.gasPrice,
        fast: feeData.gasPrice * 120n / 100n,
        rapid: feeData.gasPrice * 150n / 100n
    };
    
    return gasPrices[priority] || gasPrices.standard;
}
```

## Examples

### Complete Transaction Flow

```javascript
async function completeTransactionFlow() {
    try {
        console.log("1. Checking balance...");
        const balance = await provider.getBalance(wallet.address);
        console.log("Balance:", ethers.formatEther(balance), "ETH");
        
        console.log("2. Estimating gas...");
        const gasResult = await safeEstimateGas(
            contract,
            'transfer',
            ["0xRecipientAddress", ethers.parseUnits("100", 18)]
        );
        
        if (!gasResult.success) {
            throw new Error(`Gas estimation failed: ${gasResult.error}`);
        }
        
        console.log("3. Getting fee data...");
        const feeData = await provider.getFeeData();
        
        console.log("4. Calculating costs...");
        const gasLimit = gasResult.gasEstimate * 120n / 100n;
        const estimatedCost = gasLimit * feeData.maxFeePerGas;
        
        console.log("Gas estimate:", gasResult.gasEstimate.toString());
        console.log("Gas limit (with buffer):", gasLimit.toString());
        console.log("Estimated cost:", ethers.formatEther(estimatedCost), "ETH");
        
        if (balance < estimatedCost) {
            throw new Error("Insufficient balance for transaction");
        }
        
        console.log("5. Sending transaction...");
        const tx = await contract.transfer(
            "0xRecipientAddress",
            ethers.parseUnits("100", 18),
            {
                gasLimit: gasLimit,
                maxFeePerGas: feeData.maxFeePerGas,
                maxPriorityFeePerGas: feeData.maxPriorityFeePerGas
            }
        );
        
        console.log("Transaction sent:", tx.hash);
        
        console.log("6. Waiting for confirmation...");
        const receipt = await tx.wait();
        
        console.log("Transaction confirmed!");
        console.log("Gas used:", receipt.gasUsed.toString());
        console.log("Effective gas price:", receipt.effectiveGasPrice.toString());
        console.log("Total cost:", ethers.formatEther(receipt.gasUsed * receipt.effectiveGasPrice), "ETH");
        
        return receipt;
        
    } catch (error) {
        console.error("Transaction failed:", error);
        throw error;
    }
}
```

### Batch Gas Estimation

```javascript
async function batchGasEstimation(transactions) {
    const results = [];
    
    for (let i = 0; i < transactions.length; i++) {
        const tx = transactions[i];
        console.log(`Estimating gas for transaction ${i + 1}/${transactions.length}...`);
        
        try {
            const estimatedGas = await provider.estimateGas(tx);
            results.push({
                index: i,
                transaction: tx,
                gasEstimate: estimatedGas,
                success: true
            });
        } catch (error) {
            results.push({
                index: i,
                transaction: tx,
                error: error.message,
                success: false
            });
        }
    }
    
    return results;
}
```

### Gas Price Monitoring

```javascript
class GasPriceMonitor {
    constructor(provider, interval = 10000) {
        this.provider = provider;
        this.interval = interval;
        this.isMonitoring = false;
        this.callbacks = [];
    }
    
    addCallback(callback) {
        this.callbacks.push(callback);
    }
    
    async start() {
        this.isMonitoring = true;
        
        while (this.isMonitoring) {
            try {
                const feeData = await this.provider.getFeeData();
                
                const gasInfo = {
                    timestamp: Date.now(),
                    gasPrice: feeData.gasPrice,
                    maxFeePerGas: feeData.maxFeePerGas,
                    maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
                    gasPriceGwei: ethers.formatUnits(feeData.gasPrice, "gwei")
                };
                
                this.callbacks.forEach(callback => callback(gasInfo));
                
            } catch (error) {
                console.error("Failed to fetch gas price:", error);
            }
            
            await new Promise(resolve => setTimeout(resolve, this.interval));
        }
    }
    
    stop() {
        this.isMonitoring = false;
    }
}

// Usage
const monitor = new GasPriceMonitor(provider, 30000); // Check every 30 seconds
monitor.addCallback((gasInfo) => {
    console.log(`Gas price: ${gasInfo.gasPriceGwei} gwei`);
});
monitor.start();
```

## Common Gas Limits

| Transaction Type | Typical Gas Limit |
| ---------------- | ----------------- |
| ETH Transfer     | 21,000            |
| ERC20 Transfer   | 65,000            |
| ERC20 Approve    | 45,000            |
| Uniswap Swap     | 150,000 - 300,000 |
| NFT Mint         | 100,000 - 200,000 |
| Contract Deploy  | 1,000,000+        |

## Network Specific Considerations

### Ethereum Mainnet
- High gas prices during congestion
- EIP-1559 support
- Use priority fees for faster confirmation

### Polygon
- Much lower gas costs
- Faster block times
- May need higher gas limits for complex operations

### BSC
- Lower gas costs than Ethereum
- 3-second block times
- Different gas price dynamics

### Arbitrum/Optimism
- L2 specific gas mechanics
- Data availability costs
- Different gas estimation patterns

## Troubleshooting

### Common Errors

1. **UNPREDICTABLE_GAS_LIMIT**
   - Transaction might fail
   - Check contract state and parameters
   - Use fallback gas limit

2. **INSUFFICIENT_FUNDS**
   - Not enough ETH for gas
   - Check wallet balance
   - Consider lower gas price

3. **REPLACEMENT_UNDERPRICED**
   - Gas price too low for replacement
   - Increase gas price by at least 10%

4. **NETWORK_ERROR**
   - RPC endpoint issues
   - Try different provider
   - Implement retry logic

### Debug Tips

```javascript
// Enable debug logging
const provider = new ethers.JsonRpcProvider('https://your-rpc-url', {
    name: 'custom',
    chainId: 1
});

// Log transaction details
provider.on('debug', (info) => {
    console.log('Debug:', info);
});
```

---

**Note**: Gas estimation có thể không chính xác 100% do state changes trên blockchain. Luôn thêm buffer và xử lý lỗi phù hợp.