import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/client/lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { supportedEVMChains } from "@/background/constants/supported-chains";
import { hyperliquidLogo } from "@/assets/logo";

interface SupportedChainsDropdownProps {
  isOpen: boolean;
  onToggle: () => void;
  className?: string;
}

const SupportedChainsDropdown = ({
  isOpen,
  onToggle,
  className,
}: SupportedChainsDropdownProps) => {
  const [_selectedChain, setSelectedChain] = useState("ethereum");
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleChainSelect = (chainId: string) => {
    setSelectedChain(chainId);
    onToggle(); // Close dropdown after selection
  };

  // Calculate dropdown position when opened
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect();
      const dropdownWidth = 280; // min-w-[280px]
      const dropdownHeight = 240; // max-h-60 (240px)

      let top = buttonRect.bottom + 8; // 8px gap below button
      let left = buttonRect.left;

      // Adjust if dropdown would go off-screen horizontally
      if (left + dropdownWidth > window.innerWidth) {
        left = window.innerWidth - dropdownWidth - 8; // 8px margin from edge
      }

      // Adjust if dropdown would go off-screen vertically
      if (top + dropdownHeight > window.innerHeight) {
        top = buttonRect.top - dropdownHeight - 8; // Show above button instead
      }

      setDropdownPosition({ top, left });
    }
  }, [isOpen]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isOpen &&
        dropdownRef.current &&
        buttonRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        onToggle();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onToggle]);

  return (
    <>
      {/* Chain Dropdown Button */}
      <button
        ref={buttonRef}
        className={cn(
          "size-8 rounded-full hover:bg-white/10 transition-colors flex items-center justify-center cursor-pointer",
          className
        )}
        onClick={onToggle}
      >
        <img src={hyperliquidLogo} alt="Account" className="size-5" />
      </button>

      {/* Dropdown Menu - Using Portal to render outside overflow container */}
      {isOpen &&
        createPortal(
          <AnimatePresence>
            <motion.div
              ref={dropdownRef}
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="fixed bg-[var(--background-color)] border border-white/10 rounded-lg shadow-lg max-h-60 overflow-y-auto min-w-[280px] w-max z-[9999]"
              style={{
                top: `${dropdownPosition.top}px`,
                left: `${dropdownPosition.left}px`,
              }}
            >
              <p className="p-2 text-sm font-medium text-[var(--text-color)] border-b border-white/10">
                Supported Chains
              </p>
              {Object.values(supportedEVMChains).map((chain) => (
                <button
                  key={chain.chainId}
                  onClick={() => handleChainSelect(chain.chainId)}
                  className="w-full flex items-center justify-between p-3 hover:bg-white/5 transition-colors first:rounded-t-lg last:rounded-b-lg whitespace-nowrap cursor-pointer"
                >
                  <div className="flex items-center space-x-3">
                    <img
                      src={chain.logo}
                      alt={chain.chainName}
                      className="size-5"
                    />

                    <div className="text-left">
                      <p className="text-sm font-medium text-[var(--text-color)]">
                        {chain.chainName}
                      </p>
                      {/* <p className="text-xs text-[var(--text-color)]/60">
                        {chain.symbol}
                      </p> */}
                    </div>
                  </div>
                  {/* {selectedChain === chain.id && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{
                        delay: 0.1,
                        type: "spring",
                        stiffness: 500,
                      }}
                    >
                      <Check className="w-4 h-4 text-green-500" />
                    </motion.div>
                  )} */}
                </button>
              ))}
            </motion.div>
          </AnimatePresence>,
          document.body
        )}
    </>
  );
};

export default SupportedChainsDropdown;
