import { MessageResponse } from './background';
import { MessageRequest } from './background';
import { accountHandler } from './handlers/account-handler';
import { authHandler } from './handlers/auth-handler';
import { storageHandler } from './handlers/storage-handler';
import { evmHandler } from './handlers/evm-handler';
import { evmRpcHandler } from './handlers/evm-rpc-handler';
import { hyperliquidHandler } from './handlers/hyperliquid-handler';

export class MessageHandler {
  async handleMessage(
    message: MessageRequest,
    sender: chrome.runtime.MessageSender
  ): Promise<MessageResponse> {
    if (!message || !message.type) {
      throw new Error('Invalid message format: missing type');
    }

    const { type, data, id } = message;

    try {
      let result: any;

      switch (type) {
        // Get
        case 'GET_ACCOUNTS':
          result = await storageHandler.getAccounts();
          break;
        case 'GET_WALLET_STATE':
          result = await storageHandler.getWalletState();
          break;
        case 'IS_SEED_PHRASE_EXISTS':
          result = await accountHandler.isSeedPhraseAlreadyImported(
            data.seedPhrase
          );
          break;
        case 'IS_PRIVATE_KEY_EXISTS':
          result = await accountHandler.isPrivateKeyAlreadyImported(data);
          break;
        case 'GET_SEED_PHRASE_BY_ID':
          result = await storageHandler.getSeedPhraseById(data);
          break;
        case 'GET_ALL_SEED_PHRASES':
          result = await storageHandler.getAllSeedPhrases();
          break;
        case 'GET_ACTIVE_ACCOUNT':
          result = await storageHandler.getActiveAccount();
          break;
        case 'GET_CONNECTED_SITES':
          result = await storageHandler.getConnectedSites(data.accountId);
          break;
        case 'DELETE_CONNECTED_SITE':
          result = await storageHandler.deleteConnectedSite(data.accountId, data.origin);
          break;
        case 'DELETE_ALL_CONNECTED_SITES':
          result = await storageHandler.deleteAllConnectedSites(data.accountId);
          break;
        case 'GET_WALLET_BY_ID':
          result = await storageHandler.getWalletById(data.accountId);
          break;

        // Write
        case 'CREATE_WALLET':
          result = await accountHandler.createWallet(data);
          break;
        case 'CREATE_ACCOUNT_FROM_SEED_PHRASE':
          result = await accountHandler.createAccountBySeedPhrase(data);
          break;
        case 'IMPORT_PRIVATE_KEY':
          result = await accountHandler.importAccountByPrivateKey(data);
          break;
        case 'IMPORT_SEED_PHRASE':
          result = await accountHandler.importSeedPhrase(data);
          break;
        case 'UNLOCK_WALLET':
          result = await authHandler.unlock(data);
          break;
        case 'LOCK_WALLET':
          result = await authHandler.lock();
          break;
        case 'GET_SESSION_TIMEOUT':
          result = await authHandler.getSessionTimeout();
          break;
        case 'SET_SESSION_TIMEOUT':
          result = await authHandler.setSessionTimeout(data);
          break;
        case 'RESET_WALLET':
          result = await storageHandler.resetWallet();
          break;
        case 'REORDER_ACCOUNTS':
          result = await storageHandler.reorderAccounts(data);
          break;
        case 'SET_ACTIVE_ACCOUNT':
          result = await storageHandler.setActiveAccount(data);
          break;
        case 'CHANGE_ACCOUNT_ICON':
          result = await storageHandler.changeAccountIcon(data);
          break;
        case 'CHANGE_ACCOUNT_NAME':
          result = await storageHandler.changeAccountName(data);
          break;
        case 'REMOVE_ACCOUNT':
          result = await accountHandler.removeAccount(data);
          break;
        case 'EXPORT_SEED_PHRASE':
          result = await accountHandler.exportSeedPhrase(
            data.seedPhraseId,
            data.password
          );
          break;
        case 'EXPORT_PRIVATE_KEY':
          result = await accountHandler.exportPrivateKey(
            data.privateKeyId,
            data.chain,
            data.password
          );
          break;
        case 'IMPORT_WATCH_ONLY_WALLET':
          result = await accountHandler.importWatchOnlyWallet(
            data.address,
            data.chain,
            data.accountName
          );
          break;
        case 'IS_WATCH_ONLY_ADDRESS_EXISTS':
          result = await accountHandler.isWalletAddressExists(data.address);
          break;
        case 'CHANGE_PASSWORD':
          result = await accountHandler.changePassword(data);
          break;
        case 'REMOVE_SEED_PHRASE':
          result = await accountHandler.removeSeedPhrase(data);
          break;
        case 'ETH_REQUEST_ACCOUNTS':
          result = await evmHandler.handleEthRequestAccounts(sender);
          break;
        case 'ETH_APPROVE_CONNECTION':
          result = await evmHandler.handleApproveConnection(data);
          break;
        case 'ETH_REJECT_CONNECTION':
          result = await evmHandler.handleRejectConnection(data);
          break;
        case 'GET_CURRENT_CHAIN_ID':
          result = await evmHandler.handleGetCurrentChainId();
          break;
        case 'SWITCH_ETHEREUM_CHAIN':
          result = await evmHandler.handleSwitchEthereumChain(data);
          break;
        case 'CHECK_CONNECTION_STATUS':
          result = await evmHandler.handleCheckConnectionStatus(data, sender);
          break;
        case 'CONNECT_WALLET':
          result = await evmHandler.handleConnectWallet(sender);
          break;
        case 'DISCONNECT_WALLET':
          result = await evmHandler.handleDisconnectWallet(data, sender);
          break;
        case 'EVM_GET_BALANCE':
          result = await evmRpcHandler.handleEvmGetBalance(data);
          break;
        case 'EVM_PERSONAL_SIGN':
          result = await evmHandler.handlePersonalSign(data, sender);
          break;
        case 'EVM_SIGN_TYPED_DATA':
          result = await evmHandler.handleSignTypedData(data, sender);
          break;
        case 'EVM_SIGN_TRANSACTION':
          result = await evmHandler.handleSignTransaction(data, sender);
          break;
        case 'ETH_APPROVE_SIGN':
          result = await evmHandler.handleApproveSign(data);
          break;
        case 'ETH_REJECT_SIGN':
          result = await evmHandler.handleRejectSign(data);
          break;
        case 'EVM_SEND_TRANSACTION':
          result = await evmHandler.handleSendTransaction(data, sender);
          break;
        case 'ETH_APPROVE_TRANSACTION':
          result = await evmHandler.handleApproveTransaction(data);
          break;
        case 'ETH_REJECT_TRANSACTION':
          result = await evmHandler.handleRejectTransaction(data);
          break;
        case 'EVM_CALL':
          result = await evmRpcHandler.handleEvmCall(data);
          break;
        case 'EVM_GET_BLOCK_NUMBER':
          result = await evmRpcHandler.handleEvmGetBlockNumber(data);
          break;
        case 'EVM_ESTIMATE_GAS':
          result = await evmRpcHandler.handleEvmEstimateGas(data);
          break;
        case 'EVM_GET_GAS_PRICE':
          result = await evmRpcHandler.handleEvmGetGasPrice(data);
          break;
        case 'EVM_GET_TRANSACTION_BY_HASH':
          result = await evmRpcHandler.handleEvmGetTransactionByHash(data);
          break;
        case 'EVM_GET_TRANSACTION_RECEIPT':
          result = await evmRpcHandler.handleEvmGetTransactionReceipt(data);
          break;
        case 'EVM_SEND_TOKEN':
          result = await evmHandler.handleSendToken(data);
          break;

        // Swap
        case 'EVM_SWAP_HYPERLIQUID_TOKEN':
          result = await evmHandler.handleSwapHyperliquidToken(data);
          break;
        case 'EVM_CHECK_TOKEN_ALLOWANCE':
          result = await evmHandler.checkTokenAllowance(data);
          break;
        case 'EVM_APPROVE_TOKEN':
          result = await evmHandler.approveToken(data);
          break;

        // Hyperliquid DEX
        case 'HYPERLIQUID_TRANSFER_BETWEEN_SPOT_AND_PERP':
          result = await hyperliquidHandler.transferBetweenSpotAndPerp(data);
          break;
        case 'HYPERLIQUID_SEND_TOKEN':
          result = await hyperliquidHandler.sendToken(data);
          break;

        default:
          throw new Error(`Unknown message type: ${type}`);
      }

      return {
        success: true,
        data: result,
        id,
      };
    } catch (error) {
      console.error(`Error handling message type ${type}:`, error);
      throw error;
    }
  }
}
