import {
  hyperSwapLogo,
  kittenswapLogo,
  laminarLogo,
  liquidSwapLogo,
} from "@/assets/logo";

export const SwapDrawer = () => {
  return (
    <div className="p-4">
      <p className="text-sm text-white/80 mb-4">
        We are currently still building In-App Swap. However, you can still swap
        on HyperEVM with some of the DApps below. Curious? Check out our{" "}
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
            window.open("https://app.hyperswap.exchange/#/swap", "_blank");
          }}
        >
          <img src={hyperSwapLogo} alt="Hyperliquid" className="size-8" />
          <p className="text-base font-semibold">HyperSwap</p>
        </div>
        <div
          className="w-full bg-[var(--primary-color)]/60 rounded-lg px-4 py-3 flex items-center justify-start border border-[var(--primary-color)]/20 hover:border-[var(--primary-color)]/40 cursor-pointer transition-all hover:bg-[var(--primary-color)]/80 gap-2"
          onClick={() => {
            window.open("https://laminar.xyz/swap", "_blank");
          }}
        >
          <img src={laminarLogo} alt="Hyperliquid" className="size-8" />
          <p className="text-base font-semibold">Laminar</p>
        </div>
        <div
          className="w-full bg-[var(--primary-color)]/60 rounded-lg px-4 py-3 flex items-center justify-start border border-[var(--primary-color)]/20 hover:border-[var(--primary-color)]/40 cursor-pointer transition-all hover:bg-[var(--primary-color)]/80 gap-2"
          onClick={() => {
            window.open("https://app.kittenswap.finance/swap", "_blank");
          }}
        >
          <img src={kittenswapLogo} alt="Hyperliquid" className="size-8" />
          <p className="text-base font-semibold">Kittenswap</p>
        </div>
        <div
          className="w-full bg-[var(--primary-color)]/60 rounded-lg px-4 py-3 flex items-center justify-start border border-[var(--primary-color)]/20 hover:border-[var(--primary-color)]/40 cursor-pointer transition-all hover:bg-[var(--primary-color)]/80 gap-2"
          onClick={() => {
            window.open("http://liqd.ag/swap", "_blank");
          }}
        >
          <img src={liquidSwapLogo} alt="Hyperliquid" className="size-8" />
          <p className="text-base font-semibold">LiquidSwap</p>
        </div>
      </div>
    </div>
  );
};

export default SwapDrawer;
