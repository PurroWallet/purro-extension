import { AccountIcon, AccountName } from '@/client/components/account';
import AccountSheet from '@/client/components/account-sheet/account-sheet';
import { LoadingDisplay, LockDisplay } from '@/client/components/display';
import { Dialog, DialogFooter } from '@/client/components/ui';
import { Button } from '@/client/components/ui/button';
import useAccountSheetStore from '@/client/hooks/use-account-sheet-store';
import useInit from '@/client/hooks/use-init';
import useWalletStore from '@/client/hooks/use-wallet-store';
import { sendMessage } from '@/client/utils/extension-message-utils';
import { formatTime, getTimeColor } from '@/client/utils/formatters';
import {
  Check,
  Clock,
  FileText,
  Globe,
  Shield,
  X,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';

export interface SignRequest {
  origin: string;
  favicon?: string;
  title?: string;
  message: string;
  address: string;
  timestamp: number;
}

const TIMEOUT_DURATION = 1 * 60; // 1 minute in seconds

// Error retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

const approveSign = async (
  origin: string,
  message: string,
  address: string
) => {
  return await sendMessage('ETH_APPROVE_SIGN', { origin, message, address });
};

const rejectSign = async (origin: string) => {
  return await sendMessage('ETH_REJECT_SIGN', { origin });
};

export const SignScreen = () => {
  useInit();

  const { activeAccount } = useWalletStore();
  const [signRequest, setSignRequest] = useState<SignRequest | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number>(TIMEOUT_DURATION);
  const { open: openAccountSheet } = useAccountSheetStore();

  // Check if current account is watch-only
  const isWatchOnlyAccount = activeAccount?.source === 'watchOnly';

  useEffect(() => {
    // Get sign request from URL params
    const urlParams = new URLSearchParams(window.location.search);
    const origin = urlParams.get('origin');
    const favicon = urlParams.get('favicon');
    const title = urlParams.get('title');
    const message = urlParams.get('message');
    const address = urlParams.get('address');

    if (origin && message && address) {
      setSignRequest({
        origin,
        favicon: favicon || undefined,
        title: title || undefined,
        message: decodeURIComponent(message),
        address: decodeURIComponent(address),
        timestamp: Date.now(),
      });

      // Debug: print typed data payload if it is valid JSON
      try {
        const parsed = JSON.parse(decodeURIComponent(message));
        console.log('[Purro] 🔍 TypedData payload:', parsed);
      } catch (_) {
        // Not JSON, ignore
      }
    }
  }, []);

  useEffect(() => {
    if (!signRequest) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          // Auto-close when timeout
          window.close();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [signRequest]);

  const handleApprove = async () => {
    if (!signRequest || !activeAccount) return;

    setLoading(true);
    setError(null);

    try {
      console.log(
        '🔄 Approving sign for:',
        signRequest.origin,
        'message:',
        signRequest.message
      );

      // Send approval to background script - signature will be generated there
      const result = await approveSign(
        signRequest.origin,
        signRequest.message,
        signRequest.address
      );

      console.log('✅ Sign approval result:', result);

      // Small delay to ensure message is processed
      await new Promise(resolve => setTimeout(resolve, 100));

      // Close popup
      window.close();
    } catch (error) {
      console.error('❌ Error approving sign:', error);

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      setError(errorMessage);

      // Check if it's a retryable error (session/connection issues)
      const isRetryableError =
        errorMessage.includes('session') ||
        errorMessage.includes('unlock') ||
        errorMessage.includes('storage') ||
        errorMessage.includes('timeout');

      if (isRetryableError && retryCount < MAX_RETRIES) {
        console.log(
          `🔄 Retryable error detected, attempting retry ${
            retryCount + 1
          }/${MAX_RETRIES}`
        );
        setRetryCount(prev => prev + 1);

        // Auto-retry after delay
        setTimeout(
          () => {
            handleApprove();
          },
          RETRY_DELAY * (retryCount + 1)
        ); // Exponential backoff
      }

      // Don't close popup on error so user can retry or see error message
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!signRequest) return;

    try {
      // Send rejection to background script
      await rejectSign(signRequest.origin);

      // Close popup
      window.close();
    } catch (error) {
      console.error('Error rejecting sign:', error);
      // Still close popup even on rejection error
      window.close();
    }
  };

  const handleRetry = () => {
    setError(null);
    setRetryCount(0);
    handleApprove();
  };

  if (!signRequest) {
    return (
      <main className="bg-[var(--background-color)] flex flex-col h-screen">
        <LoadingDisplay />
      </main>
    );
  }

  const domain = new URL(signRequest.origin).hostname;
  const displayMessage =
    signRequest.message.length > 200
      ? signRequest.message.substring(0, 200) + '...'
      : signRequest.message;

  // Watch-Only Overlay Screen
  if (isWatchOnlyAccount) {
    return (
      <main className="bg-[var(--background-color)] flex flex-col h-screen">
        <LockDisplay />
        <Dialog />
        <AccountSheet />

        {/* Header */}
        <div className="p-3 flex items-center justify-between border-b border-white/10">
          <div
            className="flex items-center gap-2 pr-3 hover:bg-white/10 rounded-full transition-all duration-300 cursor-pointer"
            onClick={openAccountSheet}
          >
            <div className="size-8 rounded-full bg-white/10 flex items-center justify-center cursor-pointer">
              <AccountIcon icon={activeAccount?.icon} alt="Account" />
            </div>
            <AccountName name={activeAccount?.name} />
          </div>
        </div>

        {/* Site Info */}
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            {signRequest.favicon ? (
              <img
                src={signRequest.favicon}
                alt="Site favicon"
                className="size-8 rounded"
                onError={e => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <Globe className="size-8 text-[var(--primary-color)]" />
            )}
            <div className="flex-1">
              <h1 className="text-lg font-semibold">Sign Message</h1>
              <p className="text-sm text-white/60">{domain}</p>
            </div>
          </div>
        </div>

        {/* Watch-Only Content */}
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center max-w-sm">
            <div className="mb-6">
              <Shield className="size-16 text-yellow-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-yellow-400 mb-2">
                Watch-Only Wallet
              </h2>
              <p className="text-sm text-white/70 leading-relaxed">
                This is a watch-only wallet. You can view balances and
                transaction history, but cannot sign messages or send
                transactions.
              </p>
            </div>
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
              <p className="text-xs text-yellow-200">
                Only the private key holder can sign messages from this address.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10">
          <Button
            onClick={() => window.close()}
            className="w-full bg-[var(--card-color)] text-[var(--primary-color-light)] hover:bg-[var(--card-color)]/80"
          >
            <X className="size-4" />
            Close
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="bg-[var(--background-color)] flex flex-col h-screen">
      <LockDisplay />
      <Dialog />
      <AccountSheet />

      <div className="p-3 flex items-center justify-between border-b border-white/10">
        <div
          className="flex items-center gap-2 pr-3 hover:bg-white/10 rounded-full transition-all duration-300 cursor-pointer"
          onClick={openAccountSheet}
        >
          <div className="size-8 rounded-full bg-white/10 flex items-center justify-center cursor-pointer">
            <AccountIcon icon={activeAccount?.icon} alt="Account" />
          </div>
          <AccountName name={activeAccount?.name} />
        </div>
      </div>

      <div className="p-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          {signRequest.favicon ? (
            <img
              src={signRequest.favicon}
              alt="Site favicon"
              className="size-8 rounded"
              onError={e => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <Globe className="size-8 text-[var(--primary-color)]" />
          )}
          <div className="flex-1">
            <h1 className="text-lg font-semibold">Sign Message</h1>
            <p className="text-sm text-white/60">{domain}</p>
          </div>
          <div
            className={`flex items-center gap-1 text-sm ${getTimeColor(
              timeLeft
            )}`}
          >
            <Clock className="size-4" />
            <span>{formatTime(timeLeft)}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 p-4 overflow-y-auto">
        {error && (
          <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="size-5 text-red-400" />
              <span className="text-base font-medium text-red-400">
                Signing Failed
              </span>
            </div>
            <p className="text-sm text-red-200 mb-3">{error}</p>
            {retryCount < MAX_RETRIES && (
              <Button
                onClick={handleRetry}
                disabled={loading}
                className="bg-red-500/20 text-red-200 hover:bg-red-500/30 border border-red-500/30"
              >
                <RefreshCw className="size-4" />
                Retry ({retryCount}/{MAX_RETRIES})
              </Button>
            )}
          </div>
        )}

        <div className="bg-[var(--primary-color)]/20 border border-[var(--primary-color)]/30 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="size-5 text-[var(--primary-color)]" />
            <span className="text-base font-medium">Signature Request</span>
          </div>
          <p className="text-sm text-white/80">
            This site is requesting you to sign a message. Only sign messages
            from sites you trust.
          </p>
        </div>

        <div className="bg-[var(--card-color)] border border-white/10 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="size-5 text-[var(--primary-color)]" />
            <span className="text-base font-medium">Message to Sign:</span>
          </div>
          <div className="bg-black/20 rounded-lg p-3 border border-white/10">
            <pre className="text-sm text-white/90 whitespace-pre-wrap break-words font-mono">
              {displayMessage}
            </pre>
            {signRequest.message.length > 200 && (
              <p className="text-xs text-white/50 mt-2">
                Message truncated for display. Full message will be signed.
              </p>
            )}
          </div>
        </div>
      </div>

      <DialogFooter className="flex-col gap-2">
        <div className="text-sm text-white/60 text-center">
          Only sign messages from trusted sites
          <br />
          Signing does not cost any gas fees
        </div>

        <div className="flex gap-2 w-full">
          <Button
            onClick={handleReject}
            disabled={loading}
            className="bg-[var(--card-color)] text-[var(--primary-color-light)] hover:bg-[var(--card-color)]/80"
          >
            <X className="size-4" />
            Cancel
          </Button>
          <Button
            onClick={handleApprove}
            disabled={loading || !activeAccount}
            className="w-full"
          >
            {loading ? (
              <>
                <RefreshCw className="size-4 animate-spin" />
                {retryCount > 0
                  ? `Retrying... (${retryCount}/${MAX_RETRIES})`
                  : 'Signing...'}
              </>
            ) : (
              <>
                <Check className="size-4" />
                Sign
              </>
            )}
          </Button>
        </div>
      </DialogFooter>
    </main>
  );
};

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<SignScreen />);
}
