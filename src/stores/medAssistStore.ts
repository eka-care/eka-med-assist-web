import { create } from "zustand";
import type { TMedAssistStore} from "./types";

const storeInitialState = {
  sessionId: "",
  sessionToken: "",
  isConnectionEstablished: false,
  error: null,
  isTimeoutError: false,
};

const useMedAssistStore = create<TMedAssistStore>((set) => ({
  sessionId: "",
  setSessionId: (sessionId) => set({ sessionId }),

  sessionToken: "",
  setSessionToken: (sessionToken) => set({ sessionToken }),

  isConnectionEstablished: false,
  setConnectionEstablished: (established: boolean) => set({ isConnectionEstablished: established }),

  // Error handling
  error: null,
  setError: (error: string | null) => set({ error }),
  clearError: () => set({ error: null, isTimeoutError: false }),
  isTimeoutError: false,
  setTimeoutError: (isTimeout: boolean) => set({ isTimeoutError: isTimeout }),

  clearSession: () => set(storeInitialState),
}));

export default useMedAssistStore;
