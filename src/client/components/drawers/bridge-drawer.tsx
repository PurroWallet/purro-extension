import { deBridgeLogo, hyperliquidLogo, hyperUnit } from "@/assets/logo";

export const BridgeDrawer = () => {
  return (
    <div className="p-4">
      <p className="text-sm text-white/80 mb-4">
        We are currently still building In-App Bridge. However, you can still
        bridge token to Hyperliquid & HyperEVM right on DEX or some the DApps
        below. Curious? Check out our{" "}
        <a
          href="https://docs.purro.xyz/roadmap"
          target="_blank"
          className="text-[var(--primary-color-light)]"
        >
          roadmap.
        </a>
      </p>
      <div className="flex flex-col gap-2">
        <div
          className="w-full bg-[var(--primary-color)]/60 rounded-lg px-4 py-3 flex items-center justify-start border border-[var(--primary-color)]/20 hover:border-[var(--primary-color)]/40 cursor-pointer transition-all hover:bg-[var(--primary-color)]/80 gap-2"
          onClick={() => {
            window.open("https://app.hyperliquid.xyz/trade", "_blank");
          }}
        >
          <img src={hyperliquidLogo} alt="Hyperliquid" className="size-8" />
          <p className="text-base font-semibold">Hyperliquid DEX</p>
        </div>
        <div
          className="w-full bg-[var(--primary-color)]/60 rounded-lg px-4 py-3 flex items-center justify-start border border-[var(--primary-color)]/20 hover:border-[var(--primary-color)]/40 cursor-pointer transition-all hover:bg-[var(--primary-color)]/80 gap-2"
          onClick={() => {
            window.open("https://app.hyperunit.xyz", "_blank");
          }}
        >
          <img src={hyperUnit} alt="Hyperliquid" className="size-8" />
          <p className="text-base font-semibold">HyperUnit</p>
        </div>
        <div
          className="w-full bg-[var(--primary-color)]/60 rounded-lg px-4 py-3 flex items-center justify-start border border-[var(--primary-color)]/20 hover:border-[var(--primary-color)]/40 cursor-pointer transition-all hover:bg-[var(--primary-color)]/80 gap-2"
          onClick={() => {
            window.open(
              "https://app.debridge.finance/?inputChain=8453&outputChain=999",
              "_blank"
            );
          }}
        >
          <img src={deBridgeLogo} alt="Hyperliquid" className="size-8" />
          <p className="text-base font-semibold">DeBridge</p>
        </div>
      </div>
    </div>
  );
};
