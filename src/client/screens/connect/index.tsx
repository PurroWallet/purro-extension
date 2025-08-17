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
import { Check, Clock, Globe, Shield, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';

export interface ConnectionRequest {
  origin: string;
  favicon?: string;
  timestamp: number;
}

const approveConnection = (
  origin: string,
  accountId: string,
  favicon?: string
) => sendMessage('ETH_APPROVE_CONNECTION', { origin, accountId, favicon });

const rejectConnection = (origin: string) =>
  sendMessage('ETH_REJECT_CONNECTION', { origin });

export const ConnectScreen = () => {
  useInit();

  const { activeAccount } = useWalletStore();
  const [connectionRequest, setConnectionRequest] =
    useState<ConnectionRequest | null>(null);
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(1 * 60); // 1 minutes in seconds
  const { open: openAccountSheet } = useAccountSheetStore();

  useEffect(() => {
    // Get connection request from URL params
    const urlParams = new URLSearchParams(window.location.search);
    const origin = urlParams.get('origin');
    const favicon = urlParams.get('favicon');

    if (origin) {
      setConnectionRequest({
        origin,
        favicon: favicon || undefined,
        timestamp: Date.now(),
      });
    }
  }, []);

  useEffect(() => {
    if (!connectionRequest) return;

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
  }, [connectionRequest]);

  const handleApprove = async () => {
    if (!connectionRequest || !activeAccount) return;

    setLoading(true);
    try {
      // Send approval to background script with active account
      const result = await approveConnection(
        connectionRequest.origin,
        activeAccount.id,
        connectionRequest.favicon
      );

      // Small delay to ensure message is processed
      await new Promise(resolve => setTimeout(resolve, 100));

      // Close popup
      window.close();
    } catch (error) {
      console.error('❌ Error approving connection:', error);
      // Don't close popup on error so user can retry
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!connectionRequest) return;

    try {
      // Send rejection to background script
      await rejectConnection(connectionRequest.origin);

      // Close popup
      window.close();
    } catch (error) {
      console.error('Error rejecting connection:', error);
    }
  };

  if (!connectionRequest) {
    return (
      <main className="bg-[var(--background-color)] flex flex-col h-screen">
        <LoadingDisplay />
      </main>
    );
  }

  const domain = new URL(connectionRequest.origin).hostname;
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
          {connectionRequest.favicon ? (
            <img
              src={connectionRequest.favicon}
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
            <h1 className="text-lg font-semibold">Connect</h1>
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
        {/* Timeout warning */}
        {/* {timeLeft <= 120 && (
          <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3 mb-4">
            <div className="flex items-center gap-2 text-red-400">
              <Clock className="size-4" />
              <span className="text-sm font-medium">
                {timeLeft <= 60
                  ? "Connection will timeout in less than 1 minute!"
                  : "Connection will timeout soon. Please approve or cancel."}
              </span>
            </div>
          </div>
        )} */}

        <div className="bg-[var(--primary-color)]/20 border border-[var(--primary-color)]/30 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="size-5 text-[var(--primary-color)]" />
            <span className="text-base font-medium">This site wants to:</span>
          </div>
          <ul className="text-base text-white/80 space-y-1">
            <li>• View your wallet address & balance</li>
            <li>• Request approval for signing transactions</li>
          </ul>
        </div>

        <div className="mt-4">
          <p className="text-base font-medium text-white/80 mb-1">
            Connect with account:
          </p>

          {activeAccount && (
            <div className="p-3 rounded-lg border border-[var(--primary-color)]/50 bg-[var(--primary-color)]/10">
              <div className="flex items-center gap-3">
                <div className="size-8 rounded-full bg-white/10 flex items-center justify-center">
                  <AccountIcon
                    icon={activeAccount.icon}
                    alt={activeAccount.name}
                  />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-base">
                    {activeAccount.name}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <DialogFooter className="flex-col gap-2">
        <div className="text-sm text-white/60 text-center">
          Only connect to trusted sites
          <br />
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
            <Check className="size-4" />
            Connect
          </Button>
        </div>
      </DialogFooter>
    </main>
  );
};

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<ConnectScreen />);
}
