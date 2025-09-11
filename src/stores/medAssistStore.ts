import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { TMedAssistStore } from "./types";
import refreshSession from "@/api/get-refresh-session";

const storeInitialState = {
  sessionId: "",
  sessionToken: "",
  isConnectionEstablished: false,
  isStreaming: false,
  error: null,
  isTimeoutError: false,
  startNewConnection: false,
  showRetryButton: false,
  chats: {},
  inlineText:null,
  isRefreshingSession: false,
};

const useMedAssistStore = create<TMedAssistStore>()(
  persist(
    (set, get) => ({
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

      inlineText: null,
      setInlineText: (inlineText)=> set({inlineText}),
      
      chats: {},

      addMessageToSession: (sessionId, message) =>
        set((state) => ({
          chats: {
            ...state.chats,
            [sessionId]: [...(state.chats[sessionId] || []), message],
          },
        })),
      updateMessageInSession: (sessionId, messageId, updates) =>
        set((state) => ({
          chats: {
            ...state.chats,
            [sessionId]: (state.chats[sessionId] || []).map((m) =>
              m.id === messageId ? { ...m, ...updates } : m
            ),
          },
        })),

      getMessagesForSession: (sessionId: string) => {
        const state = get();
        return state.chats[sessionId] || [];
      },

      clearMessagesForSession: (sessionId: string) =>
        set((state) => ({
          chats: {
            ...state.chats,
            [sessionId]: [],
          },
        })),

      clearAllChats: () => set({ chats: {} }),

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

      // Session refresh functionality
      isRefreshingSession: false,
      refreshSession: async (): Promise<boolean> => {
        const state = get();
        const { sessionId } = state;

        if (!sessionId) {
          console.warn("No session ID available for refresh");
          return false;
        }

        if (state.isRefreshingSession) {
          console.log("Session refresh already in progress");
          return false;
        }

        set({ isRefreshingSession: true });

        try {
          console.log("Refreshing session:", sessionId);
          const response = await refreshSession(sessionId);

          if (response.session_id && response.session_token) {
            // Update session with new token
            set({
              sessionId: response.session_id,
              sessionToken: response.session_token,
              isRefreshingSession: false,
            });
            console.log("Session refreshed successfully");
            return true;
          } else {
            console.error("Invalid refresh response:", response);
            set({ isRefreshingSession: false });
            return false;
          }
        } catch (error: any) {
          console.error("Failed to refresh session:", error);
          set({ isRefreshingSession: false });

          // Handle specific error codes
          if (
            error.code === "session_expired" ||
            error.code === "session_not_found"
          ) {
            // Session is no longer valid, clear it
            set({
              sessionId: "",
              sessionToken: "",
              isConnectionEstablished: false,
            });
            console.log("Session expired or not found, cleared session");
          }

          return false;
        }
      },
    }),
    {
      name: "med-assist-store", // unique name for localStorage key
      storage: createJSONStorage(() => localStorage), // use localStorage
      partialize: (state) => ({
        // Only persist these fields, exclude methods and sensitive data
        chats: state.chats,
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
