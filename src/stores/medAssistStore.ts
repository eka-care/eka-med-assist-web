import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { TMedAssistStore } from "./types";

const storeInitialState = {
  sessionId: "",
  sessionToken: "",
  isConnectionEstablished: false,
  isStreaming: false,
  error: null,
  isTimeoutError: false,
  startNewConnection: false,
  showRetryButton: false,
};

const useMedAssistStore = create<TMedAssistStore>()(
  persist(
    (set) => ({
      sessionId: "",
      setSessionId: (sessionId) => set({ sessionId }),

      sessionToken: "",
      setSessionToken: (sessionToken) => set({ sessionToken }),

      isConnectionEstablished: false,
      setConnectionEstablished: (established: boolean) =>
        set({ isConnectionEstablished: established }),

      isStreaming: false,
      setIsStreaming: (streaming) => set({ isStreaming: streaming }),

      startNewConnection: false,
      setStartNewConnection: (startNewConnection) =>
        set({ startNewConnection }),

      // Error handling
      error: null,
      setError: (error) => set({ error: error }),
      clearError: () =>
        set({
          error: null,
          isTimeoutError: false,
          showRetryButton: false,
          startNewConnection: false,
        }),

      showRetryButton: false,
      setShowRetryButton: (showRetry) => set({ showRetryButton: showRetry }),

      isTimeoutError: false,
      setTimeoutError: (isTimeout: boolean) =>
        set({ isTimeoutError: isTimeout }),

      clearSession: () => set(storeInitialState),
    }),
    {
      name: "med-assist-store", // unique name for localStorage key
      storage: createJSONStorage(() => localStorage), // use localStorage
      partialize: (state) => ({
        // Only persist these fields, exclude methods and sensitive data
        sessionId: state.sessionId,
        sessionToken: state.sessionToken,
        isConnectionEstablished: state.isConnectionEstablished,
        // Note: error and isTimeoutError are not persisted as they're temporary states
      }),
      onRehydrateStorage: () => (state) => {
        // Optional: handle rehydration completion
        if (state) {
          console.log("MedAssist store rehydrated from localStorage");
        }
      },
    }
  )
);

export default useMedAssistStore;
