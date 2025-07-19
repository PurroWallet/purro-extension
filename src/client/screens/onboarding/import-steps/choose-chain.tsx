import { Button } from "@/client/components/ui";
import useCreateWalletStore from "@/client/hooks/use-create-wallet-store";
import { ChevronRight } from "lucide-react";
import hyperliquidLogo from "@/assets/logo/hl-mint-logo.png";
import ethereumLogo from "@/assets/logo/ethereum-eth-logo.png";
import baseLogo from "@/assets/logo/base-logo-in-blue.svg";
import arbitrumLogo from "@/assets/logo/arbitrum-arb-logo.png";
import solanaLogo from "@/assets/logo/solana-sol-logo.png";
import suiLogo from "@/assets/logo/sui-white-logo.png";

const ChooseChain = () => {
  const { chain, setChain } = useCreateWalletStore();
  return (
    <div className="flex flex-col items-center justify-center size-full p-4">
      <div className="flex-1 size-full gap-4 space-y-2">
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-center">Choose chain</h1>
          <p className="text-base text-gray-500 text-center">
            {chain == null && "Select the chain"}
            {chain === "ethereum" && "Enter your Ethereum private key"}
            {chain === "solana" && "Enter your Solana private key"}
            {chain === "sui" && "Enter your Sui private key"}
            {chain === "hyperevm" && "Enter your Hyperliquid private key"}
            {chain === "base" && "Enter your Base private key"}
            {chain === "arbitrum" && "Enter your Arbitrum private key"}
          </p>
        </div>
        {chain == null && (
          <div className="space-y-2">
            <Button
              onClick={() => setChain("hyperevm")}
              className="w-full bg-[var(--card-color)] text-[var(--primary-color-light)] hover:bg-[var(--card-color)]/80 justify-between py-4"
            >
              <div className="flex items-center gap-3">
                <img src={hyperliquidLogo} className="size-6" /> Hyperliquid
              </div>
              <ChevronRight className="size-5" />
            </Button>
            <Button
              onClick={() => setChain("ethereum")}
              className="w-full bg-[var(--card-color)] text-[var(--primary-color-light)] hover:bg-[var(--card-color)]/80 justify-between py-4"
            >
              <div className="flex items-center gap-3">
                <img src={ethereumLogo} className="size-6" /> Ethereum
              </div>
              <ChevronRight className="size-5" />
            </Button>
            <Button
              onClick={() => setChain("base")}
              className="w-full bg-[var(--card-color)] text-[var(--primary-color-light)] hover:bg-[var(--card-color)]/80 justify-between py-4"
            >
              <div className="flex items-center gap-3">
                <img src={baseLogo} className="size-6" /> Base
              </div>
              <ChevronRight className="size-5" />
            </Button>
            <Button
              onClick={() => setChain("arbitrum")}
              className="w-full bg-[var(--card-color)] text-[var(--primary-color-light)] hover:bg-[var(--card-color)]/80 justify-between py-4"
            >
              <div className="flex items-center gap-3">
                <img src={arbitrumLogo} className="size-6" /> Arbitrum
              </div>
              <ChevronRight className="size-5" />
            </Button>
            <Button
              onClick={() => setChain("solana")}
              className="w-full bg-[var(--card-color)] text-[var(--primary-color-light)] hover:bg-[var(--card-color)]/80 justify-between py-4"
              disabled
            >
              <div className="flex items-center gap-3">
                <img src={solanaLogo} className="size-6" /> Solana{" "}
                <span className="text-xs text-gray-500">(Coming Soon)</span>
              </div>
              <ChevronRight className="size-5" />
            </Button>
            <Button
              onClick={() => setChain("sui")}
              className="w-full bg-[var(--card-color)] text-[var(--primary-color-light)] hover:bg-[var(--card-color)]/80 justify-between py-4"
              disabled
            >
              <div className="flex items-center gap-3">
                <img src={suiLogo} className="size-6 object-contain" /> Sui
                <span className="text-xs text-gray-500">(Coming Soon)</span>
              </div>
              <ChevronRight className="size-5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChooseChain;
