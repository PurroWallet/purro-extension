import { create } from "zustand";

interface SwapTimerState {
  timeLeft: number;
  isTimerActive: boolean;
  timerRef: NodeJS.Timeout | null;
  intervalRef: NodeJS.Timeout | null;
  
  // Actions
  setTimeLeft: (timeLeft: number) => void;
  setIsTimerActive: (isActive: boolean) => void;
  setTimerRef: (ref: NodeJS.Timeout | null) => void;
  setIntervalRef: (ref: NodeJS.Timeout | null) => void;
  
  // Timer control methods
  startTimer: (refetchRoute: () => Promise<void>) => void;
  resetTimer: () => void;
  cleanup: () => void;
}

const useSwapTimerStore = create<SwapTimerState>((set, get) => ({
  timeLeft: 20,
  isTimerActive: false,
  timerRef: null,
  intervalRef: null,

  // Actions
  setTimeLeft: (timeLeft) => set({ timeLeft }),
  setIsTimerActive: (isTimerActive) => set({ isTimerActive }),
  setTimerRef: (timerRef) => set({ timerRef }),
  setIntervalRef: (intervalRef) => set({ intervalRef }),

  // Timer control methods
  startTimer: (refetchRoute) => {
    const state = get();
    
    // Clear existing timers
    if (state.timerRef) clearTimeout(state.timerRef);
    if (state.intervalRef) clearInterval(state.intervalRef);

    set({ 
      timeLeft: 20, 
      isTimerActive: true,
      timerRef: null,
      intervalRef: null
    });

    // Update timer every second
    const newIntervalRef = setInterval(() => {
      const currentState = get();
      const newTimeLeft = currentState.timeLeft - 1;
      
      if (newTimeLeft <= 0) {
        // Timer finished, refetch route
        refetchRoute().then(() => {});
        set({ timeLeft: 20 }); // Reset timer
      } else {
        set({ timeLeft: newTimeLeft });
      }
    }, 1000);

    set({ intervalRef: newIntervalRef });
  },

  resetTimer: () => {
    const state = get();
    
    if (state.timerRef) clearTimeout(state.timerRef);
    if (state.intervalRef) clearInterval(state.intervalRef);
    
    set({ 
      timeLeft: 20, 
      isTimerActive: false,
      timerRef: null,
      intervalRef: null
    });
  },

  cleanup: () => {
    const state = get();
    
    if (state.timerRef) clearTimeout(state.timerRef);
    if (state.intervalRef) clearInterval(state.intervalRef);
    
    set({ 
      timerRef: null,
      intervalRef: null
    });
  },
}));

export default useSwapTimerStore;
