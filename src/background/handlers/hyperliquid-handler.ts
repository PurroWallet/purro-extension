import { Hyperliquid } from "hyperliquid";
import { storageHandler } from "./storage-handler";
import { accountHandler } from "./account-handler";
import { authHandler } from "./auth-handler";

class HyperliquidHandler {
  private hyperliquid: Hyperliquid | null = null;
  private hyperliquidTestnet: Hyperliquid | null = null;

  async init() {
    this.hyperliquid = await this.getHyperliquid();
    this.hyperliquidTestnet = await this.getHyperliquidTestnet();
  }

  private async getHyperliquid(): Promise<Hyperliquid | null> {
    try {
      const activeAccount = await storageHandler.getActiveAccount();
      if (!activeAccount) {
        console.error("[Purro] ❌ No active account found");
        return null;
      }

      let privateKey: string;
      try {
        console.log("[Purro] 🔄 Retrieving private key...");
        privateKey = await accountHandler.getPrivateKeyByAccountId(
          activeAccount.id
        );
        console.log("[Purro] ✅ Private key retrieved successfully");
      } catch (error) {
        console.error("[Purro] ❌ Failed to retrieve private key:", error);

        // Check if it's a session issue
        const session = await authHandler.getSession();
        if (!session) {
          console.error("[Purro] ❌ Session not found or expired");
          return null;
        }

        // Generic private key error
        return null;
      }

      const hyperliquid = new Hyperliquid({
        enableWs: true, // boolean (OPTIONAL) - Enable/disable WebSocket functionality, defaults to true
        privateKey,
        testnet: false,
      });

      return hyperliquid;
    } catch (error) {
      console.error("[Purro] ❌ Failed to get Hyperliquid:", error);
      return null;
    }
  }

  /**
   * Gets a configured Hyperliquid instance for testnet
   * @returns Promise<Hyperliquid | null> - Configured Hyperliquid testnet instance or null if failed
   */
  private async getHyperliquidTestnet(): Promise<Hyperliquid | null> {
    try {
      const activeAccount = await storageHandler.getActiveAccount();
      if (!activeAccount) {
        console.error("[Purro] ❌ No active account found");
        return null;
      }

      let privateKey: string;
      try {
        console.log("[Purro] 🔄 Retrieving private key for testnet...");
        privateKey = await accountHandler.getPrivateKeyByAccountId(
          activeAccount.id
        );
        console.log(
          "[Purro] ✅ Private key retrieved successfully for testnet"
        );
      } catch (error) {
        console.error("[Purro] ❌ Failed to retrieve private key:", error);

        // Check if it's a session issue
        const session = await authHandler.getSession();
        if (!session) {
          console.error("[Purro] ❌ Session not found or expired");
          return null;
        }

        // Generic private key error
        return null;
      }

      const hyperliquid = new Hyperliquid({
        enableWs: true,
        privateKey,
        testnet: true, // Enable testnet mode
      });

      return hyperliquid;
    } catch (error) {
      console.error("[Purro] ❌ Failed to get Hyperliquid testnet:", error);
      return null;
    }
  }

  async transferBetweenSpotAndPerp(data: {
    amount: number;
    fromSpot: boolean;
  }): Promise<MessageResponse> {
    try {
      const hyperliquid = await this.hyperliquid;
      if (!hyperliquid) {
        return {
          success: false,
          error: "Hyperliquid not initialized",
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
        "[Purro] ❌ Failed to transfer between spot and perp:",
        error
      );
      return {
        success: false,
        error: "Failed to transfer between spot and perp",
      };
    }
  }
}

// Export singleton instance
export const hyperliquidHandler = new HyperliquidHandler();
