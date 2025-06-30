import { MessageResponse } from './background';
import { MessageRequest } from './background';
import { accountHandler } from './handlers/account-handler';
import { authHandler } from './handlers/auth-handler';
import { storageHandler } from './handlers/storage-handler';

export class MessageHandler {
    async handleMessage(message: MessageRequest, sender: chrome.runtime.MessageSender): Promise<MessageResponse> {
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
                    result = await accountHandler.isSeedPhraseAlreadyImported(data);
                    break;
                case 'IS_PRIVATE_KEY_EXISTS':
                    result = await accountHandler.isPrivateKeyAlreadyImported(data);
                    break;
                case "GET_SEED_PHRASE_BY_ID":
                    result = await storageHandler.getSeedPhraseById(data);
                    break;

                // Write
                case 'CREATE_WALLET':
                    result = await accountHandler.createWallet(data);
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
                    result = await accountHandler.exportSeedPhrase(data.seedPhraseId, data.password);
                    break;
                case 'EXPORT_PRIVATE_KEY':
                    result = await accountHandler.exportPrivateKey(data.privateKeyId, data.chain, data.password);
                    break;


                default:
                    throw new Error(`Unknown message type: ${type}`);
            }

            return {
                success: true,
                data: result,
                id
            };

        } catch (error) {
            console.error(`Error handling message type ${type}:`, error);
            throw error;
        }
    }
}