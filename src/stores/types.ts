export type TMedAssistStore = {
  sessionId: string;
  setSessionId: (sessionId: string) => void;

  sessionToken: string;
  setSessionToken: (sessionToken: string) => void;

  isSocketIOConnected: boolean;
  setSocketIOConnected: (connected: boolean) => void;

  isConnectionEstablished: boolean;
  setConnectionEstablished: (established: boolean) => void;

  clearSession: () => void;
};
