import logo from "@/assets/icon.png";
import { Button } from "@/client/component/ui";
import { ArrowRight } from "lucide-react";

interface OnboardDisplayProps {
  onComplete?: () => void;
}

const OnboardDisplay = ({ onComplete }: OnboardDisplayProps) => {
  const handleGetStarted = () => {
    window.open(chrome.runtime.getURL("onboarding.html"), "_blank");
    onComplete?.();
  };

  return (
    <div className="bg-[var(--background-color)] size-full absolute inset-0 z-50 overflow-hidden">
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center justify-center size-full p-6 text-center">
          <div className="flex-1 flex flex-col items-center justify-center gap-6">
            <img src={logo} alt="logo" className="size-24" />
            <div className="space-y-3">
              <h1 className="text-3xl font-bold">Welcome to Purro</h1>
              <p className="text-lg text-gray-400">
                Your Gateway to Hyperliquid
              </p>
            </div>

            <div className="space-y-4 max-w-sm">
              <div className="flex items-start gap-3">
                <div className="size-2 rounded-full bg-[var(--primary-color-light)] mt-2 flex-shrink-0"></div>
                <p className="text-sm text-gray-300 text-left">
                  Secure wallet for Hyperliquid ecosystem
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="size-2 rounded-full bg-[var(--primary-color-light)] mt-2 flex-shrink-0"></div>
                <p className="text-sm text-gray-300 text-left">
                  Trade, manage assets, and interact with dApps
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="size-2 rounded-full bg-[var(--primary-color-light)] mt-2 flex-shrink-0"></div>
                <p className="text-sm text-gray-300 text-left">
                  Your keys, your crypto - fully non-custodial
                </p>
              </div>
            </div>
          </div>

          <div className="w-full">
            <Button
              onClick={handleGetStarted}
              className="w-full bg-[var(--primary-color)] hover:bg-[var(--primary-color)]/80 text-white flex items-center gap-2 justify-center py-3 text-lg font-semibold"
            >
              Get Started
              <ArrowRight className="size-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardDisplay;
