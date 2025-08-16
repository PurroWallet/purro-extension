import { useState, useEffect } from 'react';

/**
 * Simple countdown timer hook that calculates remaining time based on last refresh timestamp
 */
export const useCountdownTimer = (
    lastRefreshTimestamp: number,
    intervalMs: number = 10000 // 10 seconds
) => {
    const [timeLeft, setTimeLeft] = useState(10);

    useEffect(() => {
        if (!lastRefreshTimestamp) {
            setTimeLeft(10);
            return;
        }

        const updateTimer = () => {
            const now = Date.now();
            const elapsed = now - lastRefreshTimestamp;
            const remaining = Math.max(0, Math.ceil((intervalMs - elapsed) / 1000));
            setTimeLeft(remaining || 10); // Reset to 10 when reaches 0
        };

        // Update immediately
        updateTimer();

        // Update every second
        const interval = setInterval(updateTimer, 1000);

        return () => clearInterval(interval);
    }, [lastRefreshTimestamp, intervalMs]);

    return timeLeft;
};

export default useCountdownTimer; 