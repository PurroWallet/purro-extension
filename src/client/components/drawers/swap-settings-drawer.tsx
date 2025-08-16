import React, { useState } from 'react';
import { X, Settings, Percent, Clock } from 'lucide-react';
import { Button, IconButton } from '@/client/components/ui/button';
import useSwapStore from '@/client/hooks/use-swap-store';
import useDrawerStore from '@/client/hooks/use-drawer-store';

const SwapSettingsDrawer: React.FC = () => {
  const { slippage, deadline, setSlippage, setDeadline } = useSwapStore();
  const { closeDrawer } = useDrawerStore();
  const [localSlippage, setLocalSlippage] = useState(slippage.toString());
  const [localDeadline, setLocalDeadline] = useState(deadline.toString());

  const predefinedSlippages = [0.1, 0.5, 1.0, 3.0];

  const handleSave = () => {
    const newSlippage = parseFloat(localSlippage);
    const newDeadline = parseInt(localDeadline);

    if (!isNaN(newSlippage) && newSlippage > 0 && newSlippage <= 50) {
      setSlippage(newSlippage);
    }

    if (!isNaN(newDeadline) && newDeadline > 0 && newDeadline <= 4320) {
      // Max 3 days
      setDeadline(newDeadline);
    }

    closeDrawer();
  };

  const handleSlippagePreset = (value: number) => {
    setLocalSlippage(value.toString());
  };

  return (
    <div className="flex flex-col h-full max-h-[80vh] bg-[var(--background-color)] rounded-t-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-white/10 bg-[var(--card-color)]/50">
        <div className="flex items-center">
          <Settings className="size-5 text-[var(--primary-color-light)] mr-2" />
          <h2 className="text-lg font-semibold text-[var(--text-color)]">
            Swap Settings
          </h2>
        </div>
        <IconButton onClick={closeDrawer}>
          <X className="size-4 text-[var(--text-color)]" />
        </IconButton>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 space-y-6 overflow-y-auto bg-[var(--background-color)]">
        {/* Slippage Tolerance */}
        <div className="space-y-3">
          <div className="flex items-center">
            <Percent className="size-4 text-[var(--primary-color-light)] mr-2" />
            <h3 className="text-[var(--text-color)] font-medium">
              Slippage Tolerance
            </h3>
          </div>
          <p className="text-sm text-white/60">
            Your transaction will revert if the price changes unfavorably by
            more than this percentage.
          </p>

          {/* Preset buttons */}
          <div className="flex gap-2">
            {predefinedSlippages.map(preset => (
              <Button
                key={preset}
                onClick={() => handleSlippagePreset(preset)}
                variant={
                  parseFloat(localSlippage) === preset ? 'primary' : 'secondary'
                }
                className="px-3 py-2 text-sm"
              >
                {preset}%
              </Button>
            ))}
          </div>

          {/* Custom input */}
          <div className="relative">
            <input
              type="number"
              placeholder="0.50"
              value={localSlippage}
              onChange={e => setLocalSlippage(e.target.value)}
              className="w-full pr-8 py-3 px-4 bg-[var(--card-color)]/50 border border-[var(--primary-color)]/20 rounded-lg text-[var(--text-color)] placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[var(--primary-color-light)] focus:border-[var(--primary-color-light)] transition-all duration-300"
              min="0.01"
              max="50"
              step="0.01"
            />
            <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/60 text-sm">
              %
            </span>
          </div>

          {/* Warning for high slippage */}
          {parseFloat(localSlippage) > 5 && (
            <p className="text-xs text-[var(--button-color-destructive)]">
              ⚠️ High slippage may result in unfavorable rates
            </p>
          )}
        </div>

        {/* Transaction Deadline */}
        <div className="space-y-3">
          <div className="flex items-center">
            <Clock className="size-4 text-[var(--primary-color-light)] mr-2" />
            <h3 className="text-[var(--text-color)] font-medium">
              Transaction Deadline
            </h3>
          </div>
          <p className="text-sm text-white/60">
            Your transaction will revert if it is pending for more than this
            long.
          </p>

          <div className="relative">
            <input
              type="number"
              placeholder="20"
              value={localDeadline}
              onChange={e => setLocalDeadline(e.target.value)}
              className="w-full pr-20 py-3 px-4 bg-[var(--card-color)]/50 border border-[var(--primary-color)]/20 rounded-lg text-[var(--text-color)] placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[var(--primary-color-light)] focus:border-[var(--primary-color-light)] transition-all duration-300"
              min="1"
              max="4320"
              step="1"
            />
            <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/60 text-sm">
              minutes
            </span>
          </div>

          {/* Info for deadline */}
          <p className="text-xs text-white/40">Recommended: 20 minutes</p>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-white/10 bg-[var(--card-color)]/50">
        <Button onClick={handleSave} variant="primary" className="w-full">
          Save Settings
        </Button>
      </div>
    </div>
  );
};

export default SwapSettingsDrawer;
