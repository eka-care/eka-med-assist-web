import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { TMedAssistStore } from "./types";
import refreshSession from "@/api/get-refresh-session";
import { CONNECTION_STATUS } from "@/types/widget";

const storeInitialState = {
  sessionId: "",
  sessionToken: "",
  isStreaming: false,
  error: null,
  isTimeoutError: false,
  startNewConnection: false,
  showRetryButton: false,
  chats: {},
  inlineText: null,
  isRefreshingSession: false,
  ConnectionStatus: CONNECTION_STATUS.CONNECTING,
  streamingTimeoutId: null,
  responseTimeoutId: null,
  lastStreamingActivity: null,
};

const useMedAssistStore = create<TMedAssistStore>()(
  persist(
    (set, get) => ({
      sessionId: "",
      setSessionId: (sessionId) => set({ sessionId }),

      sessionToken: "",
      setSessionToken: (sessionToken) => set({ sessionToken }),

      connectionStatus: CONNECTION_STATUS.CONNECTING,
      setConnectionStatus: (status) => set({ connectionStatus: status }),

      isStreaming: false,
      setIsStreaming: (streaming) => set({ isStreaming: streaming }),

      startNewConnection: false,
      setStartNewConnection: (startNewConnection) =>
        set({ startNewConnection }),

      inlineText: null,
      setInlineText: (inlineText) => set({ inlineText }),

      isBotIconAnimating: false,
      setIsBotIconAnimating: (isBotIconAnimating) =>
        set({ isBotIconAnimating }),

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

      clearSession: async () => {
        set(storeInitialState);
        console.log("Clearing session");
        // Clear persisted data from localStorage
        await localStorage.removeItem("med-assist-store");
      },

      // Timeout management
      streamingTimeoutId: null,
      setStreamingTimeoutId: (timeoutId) =>
        set({ streamingTimeoutId: timeoutId }),
      clearStreamingTimeout: () => {
        const state = get();
        if (state.streamingTimeoutId) {
          clearTimeout(state.streamingTimeoutId);
          set({ streamingTimeoutId: null });
        }
      },

      responseTimeoutId: null,
      setResponseTimeoutId: (timeoutId) =>
        set({ responseTimeoutId: timeoutId }),
      clearResponseTimeout: () => {
        const state = get();
        if (state.responseTimeoutId) {
          clearTimeout(state.responseTimeoutId);
          set({ responseTimeoutId: null });
        }
      },

      lastStreamingActivity: null,
      setLastStreamingActivity: (timestamp) =>
        set({ lastStreamingActivity: timestamp }),

      // Session refresh functionality
      isRefreshingSession: false,
      refreshSession: async (): Promise<boolean> => {
        const state = get();
        const { sessionId, sessionToken } = state;

        if (!sessionId || !sessionToken) {
          console.warn("No session ID available for refresh");
          return false;
        }

        if (state.isRefreshingSession) {
          console.log("Session refresh already in progress");
          return false;
        }

        set({
          isRefreshingSession: true,
          connectionStatus: CONNECTION_STATUS.CONNECTING,
        });

        try {
          console.log("Refreshing session:", sessionId);
          const response = await refreshSession(sessionId, sessionToken);

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
            set({
              isRefreshingSession: false,
              connectionStatus: CONNECTION_STATUS.DISCONNECTED,
            });
            return false;
          }
        } catch (error: any) {
          console.error("Failed to refresh session:", error);
          set({
            isRefreshingSession: false,
            connectionStatus: CONNECTION_STATUS.DISCONNECTED,
          });
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
        connectionStatus: state.connectionStatus,
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
