import React, { useState } from "react";
import { X, Settings, Percent, Clock } from "lucide-react";
import useSwapStore from "@/client/hooks/use-swap-store";
import useDrawerStore from "@/client/hooks/use-drawer-store";

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

    if (!isNaN(newDeadline) && newDeadline > 0 && newDeadline <= 4320) { // Max 3 days
      setDeadline(newDeadline);
    }

    closeDrawer();
  };

  const handleSlippagePreset = (value: number) => {
    setLocalSlippage(value.toString());
  };

  return (
    <div className="flex flex-col h-full max-h-[80vh]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="flex items-center">
          <Settings className="size-5 text-white mr-2" />
          <h2 className="text-lg font-semibold text-white">Swap Settings</h2>
        </div>
        <button
          onClick={closeDrawer}
          className="size-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
        >
          <X className="size-4 text-white" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 space-y-6 overflow-y-auto">
        {/* Slippage Tolerance */}
        <div className="space-y-3">
          <div className="flex items-center">
            <Percent className="size-4 text-yellow-500 mr-2" />
            <h3 className="text-white font-medium">Slippage Tolerance</h3>
          </div>
          <p className="text-sm text-gray-400">
            Your transaction will revert if the price changes unfavorably by more than this percentage.
          </p>
          
          {/* Preset buttons */}
          <div className="flex gap-2">
            {predefinedSlippages.map((preset) => (
              <button
                key={preset}
                onClick={() => handleSlippagePreset(preset)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  parseFloat(localSlippage) === preset
                    ? "bg-blue-600 text-white"
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                }`}
              >
                {preset}%
              </button>
            ))}
          </div>
          
          {/* Custom input */}
          <div className="relative">
            <input
              type="number"
              placeholder="0.50"
              value={localSlippage}
              onChange={(e) => setLocalSlippage(e.target.value)}
              className="w-full pr-8 py-3 px-4 bg-gray-800 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="0.01"
              max="50"
              step="0.01"
            />
            <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">
              %
            </span>
          </div>
          
          {/* Warning for high slippage */}
          {parseFloat(localSlippage) > 5 && (
            <p className="text-xs text-yellow-400">
              ⚠️ High slippage may result in unfavorable rates
            </p>
          )}
        </div>

        {/* Transaction Deadline */}
        <div className="space-y-3">
          <div className="flex items-center">
            <Clock className="size-4 text-blue-500 mr-2" />
            <h3 className="text-white font-medium">Transaction Deadline</h3>
          </div>
          <p className="text-sm text-gray-400">
            Your transaction will revert if it is pending for more than this long.
          </p>
          
          <div className="relative">
            <input
              type="number"
              placeholder="20"
              value={localDeadline}
              onChange={(e) => setLocalDeadline(e.target.value)}
              className="w-full pr-20 py-3 px-4 bg-gray-800 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="1"
              max="4320"
              step="1"
            />
            <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">
              minutes
            </span>
          </div>
          
          {/* Info for deadline */}
          <p className="text-xs text-gray-500">
            Recommended: 20 minutes
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-white/10 flex gap-3">
        <button
          onClick={closeDrawer}
          className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
        >
          Save Settings
        </button>
      </div>
    </div>
  );
};

export default SwapSettingsDrawer;
