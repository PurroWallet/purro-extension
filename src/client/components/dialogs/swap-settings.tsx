import React, { useState } from 'react';
import {
  Button,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogWrapper,
  Input,
} from '@/client/components/ui';
import { X, Settings, Clock, Percent } from 'lucide-react';
import useSwapStore from '@/client/hooks/use-swap-store';

interface SwapSettingsProps {
  onClose: () => void;
}

const SwapSettings: React.FC<SwapSettingsProps> = ({ onClose }) => {
  const { slippage, deadline, setSlippage, setDeadline } = useSwapStore();
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

    onClose();
  };

  const handleSlippagePreset = (value: number) => {
    setLocalSlippage(value.toString());
  };

  return (
    <DialogWrapper>
      <DialogHeader
        title="Swap Settings"
        onClose={onClose}
        icon={<Settings className="size-4 text-white" />}
        rightContent={
          <button
            onClick={onClose}
            className="size-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="size-4 text-white" />
          </button>
        }
      />

      <DialogContent>
        <div className="space-y-6">
          {/* Slippage Tolerance */}
          <div className="space-y-3">
            <div className="flex items-center">
              <Percent className="size-4 text-yellow-500 mr-2" />
              <h3 className="text-white font-medium">Slippage Tolerance</h3>
            </div>
            <p className="text-sm text-gray-400">
              Your transaction will revert if the price changes unfavorably by
              more than this percentage.
            </p>

            {/* Preset buttons */}
            <div className="flex gap-2">
              {predefinedSlippages.map(preset => (
                <button
                  key={preset}
                  onClick={() => handleSlippagePreset(preset)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    parseFloat(localSlippage) === preset
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {preset}%
                </button>
              ))}
            </div>

            {/* Custom input */}
            <div className="relative">
              <Input
                type="number"
                placeholder="0.50"
                value={localSlippage}
                onChange={e => setLocalSlippage(e.target.value)}
                className="pr-8"
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
              Your transaction will revert if it is pending for more than this
              long.
            </p>

            <div className="relative">
              <Input
                type="number"
                placeholder="20"
                value={localDeadline}
                onChange={e => setLocalDeadline(e.target.value)}
                className="pr-20"
                min="1"
                max="4320"
                step="1"
              />
              <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">
                minutes
              </span>
            </div>

            {/* Info for deadline */}
            <p className="text-xs text-gray-500">Recommended: 20 minutes</p>
          </div>
        </div>
      </DialogContent>

      <DialogFooter>
        <Button onClick={onClose} variant="secondary" className="flex-1">
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          className="flex-1 bg-blue-600 hover:bg-blue-700"
        >
          Save Settings
        </Button>
      </DialogFooter>
    </DialogWrapper>
  );
};

export default SwapSettings;
