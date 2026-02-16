import { ErrorMessageUI } from "@/types/socket";
import { CONNECTION_STATUS, Message } from "@/types/widget";
import type { TInitialMessage, TContext } from "@eka-care/medassist-core";

export type TMedAssistStore = {
  sessionId: string;
  setSessionId: (sessionId: string) => void;

  sessionToken: string;
  setSessionToken: (sessionToken: string) => void;

  agentId: string;
  setAgentId: (agentId: string) => void;

  userId: string;
  setUserId: (userId: string) => void;

  context: TContext | null;
  setContext: (context: TContext) => void;

  initialMessage: TInitialMessage | null;
  setInitialMessage: (initialMessage: TInitialMessage) => void;

  connectionStatus: CONNECTION_STATUS;
  setConnectionStatus: (status: CONNECTION_STATUS) => void;

  isStreaming: boolean;
  setIsStreaming: (streaming: boolean) => void;

  isWaitingForResponse: boolean;
  setIsWaitingForResponse: (isWaitingForResponse: boolean) => void;

  progressMessage: string | null;
  setProgressMessage: (progressMessage: string | null) => void;

  startNewConnection: boolean;
  setStartNewConnection: (startNewConnection: boolean) => void;

  showRetryButton: boolean;
  setShowRetryButton: (showRetry: boolean) => void;

  inlineText: string | null;
  setInlineText: (inlineText: string) => void;

  chats: { [sessionId: string]: Message[] };

  isBotIconAnimating: boolean;
  setIsBotIconAnimating: (isBotIconAnimating: boolean) => void;

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

  // Timeout management
  streamingTimeoutId: ReturnType<typeof setTimeout> | null;
  setStreamingTimeoutId: (timeoutId: ReturnType<typeof setTimeout> | null) => void;
  clearStreamingTimeout: () => void;
  responseTimeoutId: ReturnType<typeof setTimeout> | null;
  setResponseTimeoutId: (timeoutId: ReturnType<typeof setTimeout> | null) => void;
  clearResponseTimeout: () => void;
  lastStreamingActivity: number | null;
  setLastStreamingActivity: (timestamp: number | null) => void;

  // Session refresh functionality
  refreshSession: () => Promise<boolean>;
  isRefreshingSession: boolean;
};
