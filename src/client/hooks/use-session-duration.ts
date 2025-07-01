import { useState, useEffect, useCallback } from "react";
import { sendMessage } from "@/client/utils/extension-message-utils";

interface SessionDurationLimits {
    minMinutes: number;
    maxMinutes: number;
}

interface UseSessionDurationReturn {
    duration: number; // Current auto-lock duration in minutes
    limits: SessionDurationLimits;
    loading: boolean;
    error: string | null;
    updateSessionDuration: (minutes: number) => Promise<void>;
}

/**
 * useSessionDuration
 * -------------------
 * A convenience hook that communicates with the background script to read and
 * update the wallet auto-lock timeout. All values are exposed in *minutes* to
 * keep the UI simple, but get/set calls are converted to milliseconds (the
 * format expected by the background authHandler).
 */
export const useSessionDuration = (): UseSessionDurationReturn => {
    const [duration, setDuration] = useState<number>(30); // default 30 minutes
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // Limits are hard-coded to stay in sync with background/constants.
    const limits: SessionDurationLimits = {
        minMinutes: 5,
        maxMinutes: 24 * 60, // 24 hours
    };

    const fetchDuration = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const timeoutMs: number = await sendMessage("GET_SESSION_TIMEOUT");
            setDuration(Math.round(timeoutMs / 60_000));
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load session duration");
        } finally {
            setLoading(false);
        }
    }, []);

    const updateSessionDuration = useCallback(async (minutes: number) => {
        try {
            setLoading(true);
            setError(null);
            await sendMessage("SET_SESSION_TIMEOUT", minutes * 60_000);
            setDuration(minutes);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to update session duration");
            throw err; // Let caller handle errors as well
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchDuration();
    }, [fetchDuration]);

    return { duration, limits, loading, error, updateSessionDuration };
}; 