// Blacklist management for tokens that return 404 errors
const BLACKLIST_STORAGE_KEY = 'token_logo_blacklist';

interface BlacklistEntry {
  networkId: string;
  tokenAddress: string;
  timestamp: number;
}

export class BlacklistTokenLogoCacheLib {
  // Get blacklisted tokens from localStorage
  static getBlacklist(): BlacklistEntry[] {
    try {
      const stored = localStorage.getItem(BLACKLIST_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error reading blacklist from localStorage:', error);
      return [];
    }
  }

  // Add token to blacklist
  static addToBlacklist(networkId: string, tokenAddress: string): void {
    try {
      const blacklist = this.getBlacklist();
      const key = `${networkId}:${tokenAddress.toLowerCase()}`;

      // Check if already blacklisted
      const exists = blacklist.some(entry =>
        `${entry.networkId}:${entry.tokenAddress.toLowerCase()}` === key
      );

      if (!exists) {
        blacklist.push({
          networkId,
          tokenAddress: tokenAddress.toLowerCase(),
          timestamp: Date.now()
        });

        localStorage.setItem(BLACKLIST_STORAGE_KEY, JSON.stringify(blacklist));
      }
    } catch (error) {
      console.error('Error adding token to blacklist:', error);
    }
  }

  // Check if token is blacklisted
  static isBlacklisted(networkId: string, tokenAddress: string): boolean {
    try {
      const blacklist = this.getBlacklist();
      const key = `${networkId}:${tokenAddress.toLowerCase()}`;

      return blacklist.some(entry =>
        `${entry.networkId}:${entry.tokenAddress.toLowerCase()}` === key
      );
    } catch (error) {
      console.error('Error checking blacklist:', error);
      return false;
    }
  }

  // Clean old blacklist entries (optional - remove entries older than 7 days)
  static cleanBlacklist(): void {
    try {
      const blacklist = this.getBlacklist();
      const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);

      const cleaned = blacklist.filter(entry => entry.timestamp > sevenDaysAgo);

      if (cleaned.length !== blacklist.length) {
        localStorage.setItem(BLACKLIST_STORAGE_KEY, JSON.stringify(cleaned));
      }
    } catch (error) {
      console.error('Error cleaning blacklist:', error);
    }
  }

  // Remove token from blacklist (useful for manual cleanup or testing)
  static removeFromBlacklist(networkId: string, tokenAddress: string): void {
    try {
      const blacklist = this.getBlacklist();
      const key = `${networkId}:${tokenAddress.toLowerCase()}`;

      const filtered = blacklist.filter(entry =>
        `${entry.networkId}:${entry.tokenAddress.toLowerCase()}` !== key
      );

      if (filtered.length !== blacklist.length) {
        localStorage.setItem(BLACKLIST_STORAGE_KEY, JSON.stringify(filtered));
      }
    } catch (error) {
      console.error('Error removing token from blacklist:', error);
    }
  }

  // Clear entire blacklist (useful for testing or manual reset)
  static clearBlacklist(): void {
    try {
      localStorage.removeItem(BLACKLIST_STORAGE_KEY);
    } catch (error) {
      console.error('Error clearing blacklist:', error);
    }
  }

  // Get blacklist statistics
  static getBlacklistStats(): { total: number; oldestEntry: number | null; newestEntry: number | null } {
    try {
      const blacklist = this.getBlacklist();

      if (blacklist.length === 0) {
        return { total: 0, oldestEntry: null, newestEntry: null };
      }

      const timestamps = blacklist.map(entry => entry.timestamp);

      return {
        total: blacklist.length,
        oldestEntry: Math.min(...timestamps),
        newestEntry: Math.max(...timestamps)
      };
    } catch (error) {
      console.error('Error getting blacklist stats:', error);
      return { total: 0, oldestEntry: null, newestEntry: null };
    }
  }
}
