export type TMedAssistStore = {
  sessionId: string;
  setSessionId: (sessionId: string) => void;

  sessionToken: string;
  setSessionToken: (sessionToken: string) => void;

  isConnectionEstablished: boolean;
  setConnectionEstablished: (established: boolean) => void;

  isStreaming: boolean;
  setIsStreaming: (streaming: boolean) => void;

  // Error handling
  error: string | null;
  setError: (error: string | null) => void;
  clearError: () => void;
  isTimeoutError: boolean;
  setTimeoutError: (isTimeout: boolean) => void;

  clearSession: () => void;
};
