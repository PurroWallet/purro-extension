import { Hyperliquid } from 'hyperliquid';
import { storageHandler } from './storage-handler';
import { accountHandler } from './account-handler';
import { authHandler } from './auth-handler';

export const hyperliquidHandler = {
  async getHyperliquid(): Promise<Hyperliquid | null> {
    try {
      const activeAccount = await storageHandler.getActiveAccount();
      if (!activeAccount) {
        console.error('[Purro] ❌ No active account found');
        return null;
      }

      let privateKey: string;
      try {
        privateKey = await accountHandler.getPrivateKeyByAccountId(
          activeAccount.id
        );
      } catch (error) {
        console.error('[Purro] ❌ Failed to retrieve private key:', error);

        // Check if it's a session issue
        const session = await authHandler.getSession();
        if (!session) {
          console.error('[Purro] ❌ Session not found or expired');
          return null;
        }

        // Generic private key error
        return null;
      }

      const hyperliquid = new Hyperliquid({
        enableWs: false, // boolean (OPTIONAL) - Enable/disable WebSocket functionality, defaults to true
        privateKey,
        testnet: false,
      });

      return hyperliquid;
    } catch (error) {
      console.error('[Purro] ❌ Failed to get Hyperliquid:', error);
      return null;
    }
  },

  /**
   * Gets a configured Hyperliquid instance for testnet
   * @returns Promise<Hyperliquid | null> - Configured Hyperliquid testnet instance or null if failed
   */
  async getHyperliquidTestnet(): Promise<Hyperliquid | null> {
    try {
      const activeAccount = await storageHandler.getActiveAccount();
      if (!activeAccount) {
        console.error('[Purro] ❌ No active account found');
        return null;
      }

      let privateKey: string;
      try {
        privateKey = await accountHandler.getPrivateKeyByAccountId(
          activeAccount.id
        );
      } catch (error) {
        console.error('[Purro] ❌ Failed to retrieve private key:', error);

        // Check if it's a session issue
        const session = await authHandler.getSession();
        if (!session) {
          console.error('[Purro] ❌ Session not found or expired');
          return null;
        }

        // Generic private key error
        return null;
      }

      const hyperliquid = new Hyperliquid({
        enableWs: false,
        privateKey,
        testnet: true, // Enable testnet mode
      });

      return hyperliquid;
    } catch (error) {
      console.error('[Purro] ❌ Failed to get Hyperliquid testnet:', error);
      return null;
    }
  },

  async transferBetweenSpotAndPerp(data: {
    amount: number;
    fromSpot: boolean;
    isDevMode: boolean;
  }): Promise<MessageResponse> {
    try {
      const hyperliquid = data.isDevMode
        ? await this.getHyperliquidTestnet()
        : await this.getHyperliquid();
      if (!hyperliquid) {
        return {
          success: false,
          error: 'Hyperliquid not initialized',
        };
      }

      const transferResult =
        await hyperliquid.exchange.transferBetweenSpotAndPerp(
          data.amount,
          data.fromSpot
        );

      return {
        success: true,
        data: transferResult,
      };
    } catch (error) {
      console.error(
        '[Purro] ❌ Failed to transfer between spot and perp:',
        error
      );
      return {
        success: false,
        error: 'Failed to transfer between spot and perp',
      };
    }
  },

  async sendToken(data: {
    destination: string;
    amount: string;
    tokenName: string;
    tokenId: string;
    isDevMode: boolean;
  }): Promise<MessageResponse> {
    try {
      const hyperliquid = data.isDevMode
        ? await this.getHyperliquidTestnet()
        : await this.getHyperliquid();

      if (!hyperliquid) {
        return {
          success: false,
          error: 'Hyperliquid not initialized',
        };
      }

      const transferResult = await hyperliquid.exchange.spotTransfer(
        data.destination,
        `${data.tokenName}:${data.tokenId}`,
        data.amount
      );

      return {
        success: true,
        data: transferResult,
      };
    } catch (error) {
      console.error('[Purro] ❌ Failed to send token:', error);
      return {
        success: false,
        error: 'Failed to send token',
      };
    }
  },
};
