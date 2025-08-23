import { useState, useEffect } from 'react';
import { X, Pin } from 'lucide-react';

const PinExtensionNotification = () => {
  const [isVisible, setIsVisible] = useState(true);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);
  const [timeLeft, setTimeLeft] = useState(10);

  // Check if user has chosen not to show again
  useEffect(() => {
    const hasDismissed = localStorage.getItem(
      'purro-pin-notification-dismissed'
    );
    if (hasDismissed === 'true') {
      setIsVisible(false);
      return;
    }
  }, []);

  // Auto-hide countdown
  useEffect(() => {
    if (!isVisible) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          handleClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isVisible]);

  const handleClose = () => {
    setIsAnimatingOut(true);
    setTimeout(() => {
      setIsVisible(false);
    }, 200);
  };

  const handleDontShowAgain = () => {
    localStorage.setItem('purro-pin-notification-dismissed', 'true');
    handleClose();
  };

  if (!isVisible) return null;

  return (
    <div
      className={`fixed top-4 right-4 z-50 md:top-6 md:right-6 ${
        isAnimatingOut ? 'fade-out' : 'animate-in slide-in-from-right'
      }`}
    >
      <div className="bg-[var(--card-color)]/90 backdrop-blur-md border border-white/10 rounded-lg p-4 shadow-lg max-w-xs md:max-w-sm">
        {/* Progress bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-white/10 rounded-t-lg overflow-hidden">
          <div
            className="h-full bg-[var(--primary-color)] transition-all duration-1000 ease-linear"
            style={{ width: `${(timeLeft / 10) * 100}%` }}
          />
        </div>

        <div className="flex items-start gap-3 mt-1">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-[var(--primary-color)] rounded-full flex items-center justify-center">
              <Pin className="w-4 h-4 text-black" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-white mb-1">
              Pin Purro Wallet
            </h3>
            <p className="text-xs text-gray-300 leading-relaxed mb-2">
              Click the extension icon in your browser toolbar and pin Purro
              Wallet for quick access
            </p>
            <button
              onClick={handleDontShowAgain}
              className="text-xs text-gray-400 hover:text-white transition-colors underline"
            >
              Don't show again
            </button>
          </div>
          <button
            onClick={handleClose}
            className="flex-shrink-0 text-gray-400 hover:text-white transition-colors p-1 rounded hover:bg-white/10"
            aria-label="Close notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default PinExtensionNotification;
