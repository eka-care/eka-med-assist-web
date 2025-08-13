import { create } from "zustand";
import type { TMedAssistStore} from "./types";

const storeInitialState = {
  sessionId: "",
  sessionToken: "",
  isSocketIOConnected: false,
  isConnectionEstablished: false,
};

const useMedAssistStore = create<TMedAssistStore>((set) => ({
  sessionId: "",
  setSessionId: (sessionId) => set({ sessionId }),

  sessionToken: "",
  setSessionToken: (sessionToken) => set({ sessionToken }),

  isSocketIOConnected: false,
  setSocketIOConnected: (connected: boolean) => set({ isSocketIOConnected: connected }),

  isConnectionEstablished: false,
  setConnectionEstablished: (established: boolean) => set({ isConnectionEstablished: established }),

  clearSession: () => set(storeInitialState),
}));

export default useMedAssistStore;
