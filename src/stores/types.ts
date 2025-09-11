import { Message } from "@/types";
import { ErrorMessageUI } from "@/types/socket";

export type TMedAssistStore = {
  sessionId: string;
  setSessionId: (sessionId: string) => void;

  sessionToken: string;
  setSessionToken: (sessionToken: string) => void;

  isConnectionEstablished: boolean;
  setConnectionEstablished: (established: boolean) => void;

  isStreaming: boolean;
  setIsStreaming: (streaming: boolean) => void;

  startNewConnection: boolean;
  setStartNewConnection: (startNewConnection: boolean) => void;

  showRetryButton: boolean;
  setShowRetryButton: (showRetry: boolean) => void;

  inlineText: string | null;
  setInlineText: (inlineText: string) => void;

  chats: { [sessionId: string]: Message[] };

  // Message actions
  addMessageToSession: (sessionId: string, message: Message) => void;
  updateMessageInSession: (
    sessionId: string,
    messageId: string,
    updates: Partial<Message>
  ) => void;
  getMessagesForSession: (sessionId: string) => Message[];
  clearMessagesForSession: (sessionId: string) => void;
  clearAllChats: () => void;
  // Error handling
  error: ErrorMessageUI | null;
  setError: (error: ErrorMessageUI | null) => void;
  clearError: () => void;
  isTimeoutError: boolean;
  setTimeoutError: (isTimeout: boolean) => void;

  clearSession: () => void;

  // Session refresh functionality
  refreshSession: () => Promise<boolean>;
  isRefreshingSession: boolean;
};
