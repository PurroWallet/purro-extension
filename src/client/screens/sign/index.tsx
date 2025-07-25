import { AccountIcon, AccountName } from "@/client/components/account";
import AccountSheet from "@/client/components/account-sheet/account-sheet";
import { LoadingDisplay, LockDisplay } from "@/client/components/display";
import { Dialog, DialogFooter } from "@/client/components/ui";
import { Button } from "@/client/components/ui/button";
import useAccountSheetStore from "@/client/hooks/use-account-sheet-store";
import useInit from "@/client/hooks/use-init";
import useWalletStore from "@/client/hooks/use-wallet-store";
import { sendMessage } from "@/client/utils/extension-message-utils";
import { formatTime, getTimeColor } from "@/client/utils/formatters";
import { Check, Clock, FileText, Globe, Shield, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";

export interface SignRequest {
  origin: string;
  favicon?: string;
  title?: string;
  message: string;
  address: string;
  timestamp: number;
}

const TIMEOUT_DURATION = 1 * 60; // 1 minute in seconds

const approveSign = (origin: string, message: string, address: string) =>
  sendMessage("ETH_APPROVE_SIGN", { origin, message, address });

const rejectSign = (origin: string) =>
  sendMessage("ETH_REJECT_SIGN", { origin });

export const SignScreen = () => {
  useInit();

  const { activeAccount } = useWalletStore();
  const [signRequest, setSignRequest] = useState<SignRequest | null>(null);
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(TIMEOUT_DURATION);
  const { open: openAccountSheet } = useAccountSheetStore();

  useEffect(() => {
    // Get sign request from URL params
    const urlParams = new URLSearchParams(window.location.search);
    const origin = urlParams.get("origin");
    const favicon = urlParams.get("favicon");
    const title = urlParams.get("title");
    const message = urlParams.get("message");
    const address = urlParams.get("address");

    if (origin && message && address) {
      setSignRequest({
        origin,
        favicon: favicon || undefined,
        title: title || undefined,
        message: decodeURIComponent(message),
        address: decodeURIComponent(address),
        timestamp: Date.now(),
      });
    }
  }, []);

  useEffect(() => {
    if (!signRequest) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
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
    try {
      console.log(
        "🔄 Approving sign for:",
        signRequest.origin,
        "message:",
        signRequest.message
      );

      // Send approval to background script - signature will be generated there
      const result = await approveSign(
        signRequest.origin,
        signRequest.message,
        signRequest.address
      );

      console.log("✅ Sign approval result:", result);

      // Small delay to ensure message is processed
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Close popup
      window.close();
    } catch (error) {
      console.error("❌ Error approving sign:", error);
      // Don't close popup on error so user can retry
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
      console.error("Error rejecting sign:", error);
    }
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
      ? signRequest.message.substring(0, 200) + "..."
      : signRequest.message;

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
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
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
            <Check className="size-4" />
            {loading ? "Signing..." : "Sign"}
          </Button>
        </div>
      </DialogFooter>
    </main>
  );
};

const container = document.getElementById("root");
if (container) {
  const root = createRoot(container);
  root.render(<SignScreen />);
}
