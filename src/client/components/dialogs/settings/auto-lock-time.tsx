import {
  Button,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogWrapper,
} from '@/client/components/ui';

import { useState, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import { useSessionDuration } from '@/client/hooks/use-session-duration';

const AutoLockTime = ({ onBack }: { onBack: () => void }) => {
  const { duration, limits, loading, error, updateSessionDuration } =
    useSessionDuration();

  const [selectedDuration, setSelectedDuration] = useState(duration);
  const [saving, setSaving] = useState(false);

  // Update local state when duration loads
  useEffect(() => {
    setSelectedDuration(duration);
  }, [duration]);

  // Predefined duration options (in minutes)
  const durationOptions = [
    { value: 5, label: '5 minutes' },
    { value: 15, label: '15 minutes' },
    { value: 30, label: '30 minutes' },
    { value: 60, label: '1 hour' },
    { value: 120, label: '2 hours' },
    { value: 240, label: '4 hours' },
    { value: 480, label: '8 hours' },
    { value: 1440, label: '24 hours' },
  ];

  const handleSave = async () => {
    try {
      setSaving(true);

      await updateSessionDuration(selectedDuration);
      onBack(); // Close dialog on success
    } catch {
    } finally {
      setSaving(false);
    }
  };

  const isChanged = selectedDuration !== duration;

  if (loading) {
    return (
      <DialogWrapper>
        <DialogHeader title="Auto Lock Time" onClose={onBack} />
        <DialogContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
        </DialogContent>
      </DialogWrapper>
    );
  }

  return (
    <DialogWrapper>
      <DialogHeader title="Auto Lock Time" onClose={onBack} />
      <DialogContent>
        <div className="space-y-4">
          {/* Description */}
          <div className="text-sm text-white/80">
            <p>
              Choose how long your wallet stays unlocked before automatically
              locking for security.
            </p>
          </div>

          {/* Duration Options */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {durationOptions.map(option => (
                <button
                  key={option.value}
                  onClick={() => setSelectedDuration(option.value)}
                  className={`p-3 rounded-lg border transition-all duration-200 text-left ${
                    selectedDuration === option.value
                      ? 'border-[var(--primary-color)] bg-[var(--primary-color)]/20 text-white'
                      : 'border-white/20 bg-[var(--card-color)] text-white/80 hover:border-white/40'
                  }`}
                >
                  <span className="text-sm font-medium">{option.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* General Error */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
              <AlertCircle className="size-4 text-red-400" />
              <span className="text-sm text-red-400">{error}</span>
            </div>
          )}
        </div>
      </DialogContent>
      <DialogFooter>
        <div className="flex gap-3 w-full">
          <Button
            onClick={onBack}
            className="flex-1 bg-gray-600 hover:bg-gray-700 text-white"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={
              saving ||
              !isChanged ||
              selectedDuration < limits.minMinutes ||
              selectedDuration > limits.maxMinutes
            }
            className="flex-1"
          >
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </DialogFooter>
    </DialogWrapper>
  );
};

export default AutoLockTime;
