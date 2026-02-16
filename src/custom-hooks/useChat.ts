import { useEffect, useRef, useState } from "react";
import {
  SYNAPSE_REALTIME_EVENTS,
  SynapseError,
  SynapseSDK,
  SynapseErrorCode,
  SYNAPSE_REALTIME_ERROR_CODES,
  USER_FEEDBACK,
  type ToolCallResponse,
  type SendMessageOptions,
  type SessionResponse,
  type SynapseRealTimeEventData,
  type ToolCallData,
  type TContext,
  type Environment,
} from "@eka-care/medassist-core";
import useMedAssistStore from "@/stores/medAssistStore";
import { useNetworkStatus } from "@/custom-hooks/useNetworkStatus";
import {
  type Message,
  type ExtendedToolEscalationData,
  MessageSender,
  CONNECTION_STATUS,
} from "@/types/widget";

export const useChat = ({
  environment,
  baseUrl,
  context,
  auth,
}: {
  environment?: Environment;
  onInlineText?: (text: string) => void;
  baseUrl?: string;
  context?: TContext;
  auth?: string;
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [retryAttempts, setRetryAttempts] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [initialPrompts, setInitialPrompts] = useState<
    { role: string; text: string }[]
  >([]);
  const synapseRef = useRef<SynapseSDK | null>(null);
  const responseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { isOnline } = useNetworkStatus();
  const {
    agentId,
    setSessionId,
    setSessionToken,
    sessionId,
    sessionToken,
    setError,
    setConnectionStatus,
    setShowRetryButton,
    setStartNewConnection,
    setIsStreaming,
    setIsWaitingForResponse,
    isStreaming,
    initialMessage,
    isWaitingForResponse,
    setProgressMessage,
    clearSession,
    addMessageToSession,
    getMessagesForSession,
    updateMessageInSession,
    setInitialMessage,
    userId,
  } = useMedAssistStore();

  useEffect(() => {
    if (!isOnline) {
      setConnectionStatus(CONNECTION_STATUS.DISCONNECTED);
    } else if (!isReady) {
      setConnectionStatus(CONNECTION_STATUS.CONNECTING);
    } else if (isConnected()) {
      setConnectionStatus(CONNECTION_STATUS.CONNECTED);
      resetConnectionStates();
    }
  }, [isOnline, isReady]);

  useEffect(() => {
    // load messages from session
    if (sessionId) {
      const storedMessages = getMessagesForSession(sessionId) || [];
      setMessages(storedMessages);
      setInitialPrompts([]);
    }
  }, [sessionId]);

  useEffect(() => {
    setIsReady(false);

    if (!agentId) {
      console.warn("useChat: Agent ID is required but not provided");
      return;
    }

    const synapse = new SynapseSDK({
      agentId,
      environment,
      userId: userId,
      callbacks: {
        onError: (error) => {
          console.error("useChat: Error thrown from SDK", error);
          if (error instanceof SynapseError) {
            switch (error.code) {
              case SynapseErrorCode.SESSION: {
                const errorContext = (error as any).context;
                const isRefreshFailure =
                  errorContext?.stage === "handleSessionExpiry" ||
                  errorContext?.stage === "refreshSession";

                if (isRefreshFailure) {
                  if (!isOnline) {
                    setError({
                      title: "Session expired",
                      description:
                        "Please check your connection and try again",
                    });
                    setShowRetryButton(true);
                  } else {
                    setError({
                      title: "Session not found",
                      description: "Please start a new session",
                    });
                    setStartNewConnection(true);
                  }
                } else {
                  setConnectionStatus(CONNECTION_STATUS.DISCONNECTED);
                  setShowRetryButton(true);
                }
                break;
              }
              case SynapseErrorCode.CONNECTION:
                setError({
                  title: "Connecting...",
                });
                setShowRetryButton(true);
                break;
              default:
                console.error(
                  "useChat: Error from SDK from onError callback",
                  error.code,
                  error
                );
                setError({
                  title: "Something went wrong",
                  description: "Please try again later",
                });
                setShowRetryButton(true);
                break;
            }
          }
        },
        onSessionRefreshed: (session: SessionResponse) => {
          if (session?.session_id && session?.session_token) {
            setSessionId(session.session_id);
            setSessionToken(session.session_token);
          }
        },
      },
      ...(baseUrl && { serverUrl: baseUrl }),
      ...(context && { context: context }),
      ...(auth && { auth }),
    });
    synapseRef.current = synapse;
    setIsReady(true);

    return () => {
      setIsReady(false);
      console.log("unmounting useChat", agentId, environment, userId, auth);
      synapseRef.current?.endSession();
      synapseRef.current = null;
      if (responseTimeoutRef.current) {
        clearTimeout(responseTimeoutRef.current);
        responseTimeoutRef.current = null;
      }
    };
  }, [agentId, environment, userId, auth]);

  // Persist messages to store
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage?.role || !sessionId) {
      return;
    }
    if (lastMessage?.role === MessageSender.USER) {
      addMessageToSession(sessionId, lastMessage);
    } else if (!isStreaming && !lastMessage.isStored) {
      setMessages((prev) => {
        const updatedMessages = [...prev];
        updatedMessages[updatedMessages.length - 1] = {
          ...lastMessage,
          isStored: true,
        };
        return updatedMessages;
      });
      addMessageToSession(sessionId, { ...lastMessage, isStored: true });
    }
  }, [messages, isStreaming]);

  // On unmount, persist last message
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    return () => {
      if (lastMessage && !lastMessage?.isStored && sessionId) {
        addMessageToSession(sessionId, { ...lastMessage, isStored: true });
      }
    };
  }, []);

  // Timeout for waiting for response: 30 seconds
  useEffect(() => {
    if (responseTimeoutRef.current) {
      clearTimeout(responseTimeoutRef.current);
      responseTimeoutRef.current = null;
    }

    if (isWaitingForResponse && !isStreaming) {
      const TIMEOUT_DURATION = 30 * 1000;

      responseTimeoutRef.current = setTimeout(() => {
        setIsWaitingForResponse(false);
        responseTimeoutRef.current = null;
      }, TIMEOUT_DURATION);
    } else if (isStreaming) {
      if (responseTimeoutRef.current) {
        clearTimeout(responseTimeoutRef.current);
        responseTimeoutRef.current = null;
      }
    }

    return () => {
      if (responseTimeoutRef.current) {
        clearTimeout(responseTimeoutRef.current);
        responseTimeoutRef.current = null;
      }
    };
  }, [isWaitingForResponse, isStreaming, setIsWaitingForResponse]);

  const startSession = async (forceNewSession: boolean = false) => {
    try {
      if (!synapseRef.current) {
        console.error(
          "SynapseSDK instance not initialized. Make sure agentId is set."
        );
        setError({
          title: "SDK not initialized",
          description: "Please ensure agentId is configured",
        });
        setLoading(false);
        return;
      }

      setLoading(true);

      let session: SessionResponse | undefined;

      if (forceNewSession) {
        await clearSession();
        resetConnectionStates();
        session = await synapseRef.current.startSession();
      } else {
        session = await synapseRef.current.startSession({
          session_id: sessionId || "",
          session_token: sessionToken || "",
        });
      }

      if (session?.session_id && session?.session_token) {
        setSessionId(session.session_id);
        setSessionToken(session.session_token);
        if (
          session?.initial_message?.text ||
          session?.initial_message?.suggestions?.length
        ) {
          setInitialMessage(session.initial_message);
        }
      } else {
        console.warn(
          "useChat: Session response missing session_id or session_token",
          session
        );
      }

      setUpEventListeners();
    } catch (error) {
      console.error("useChat: Error starting session", error);
      setError({
        title: "Something Went wrong!",
        description: "Please try again later.",
      });
      setLoading(false);
      return;
    } finally {
      setLoading(false);
    }
  };

  const isConnected = (): boolean => {
    return synapseRef.current?.isConnected() ?? false;
  };

  const resetConnectionStates = () => {
    setRetryAttempts(0);
    setShowRetryButton(false);
    setStartNewConnection(false);
    setError(null);
  };

  const setUpEventListeners = () => {
    synapseRef.current?.on(SYNAPSE_REALTIME_EVENTS.MESSAGE_CHUNK, (data) => {
      const messsageData = data as SynapseRealTimeEventData;
      if (messsageData.data?.text && messsageData.messageId) {
        if (!isStreaming) {
          setIsWaitingForResponse(false);
          setIsStreaming(true);
        }

        const text = messsageData.data.text;
        const messageId = messsageData.messageId;

        setMessages((prevMessages) => {
          const lastMessage = prevMessages[prevMessages.length - 1];

          if (
            lastMessage &&
            lastMessage.id === messageId &&
            lastMessage.role === MessageSender.ASSISTANT
          ) {
            const updatedMessages = [...prevMessages];
            updatedMessages[updatedMessages.length - 1] = {
              ...lastMessage,
              content: lastMessage.content + text,
              isBot: true,
            };
            return updatedMessages;
          } else {
            return [
              ...prevMessages,
              {
                id: messageId,
                content: text,
                role: MessageSender.ASSISTANT,
                isBot: true,
                isStored: false,
              },
            ];
          }
        });
      }
    });

    synapseRef.current?.on(SYNAPSE_REALTIME_EVENTS.END_OF_STREAM, () => {
      setIsStreaming(false);
      setProgressMessage(null);
    });

    synapseRef.current?.on(SYNAPSE_REALTIME_EVENTS.CONNECTED, () => {
      resetConnectionStates();
      setConnectionStatus(CONNECTION_STATUS.CONNECTED);
    });

    synapseRef.current?.on(
      SYNAPSE_REALTIME_EVENTS.TOOL_CALL,
      (toolCallMessage) => {
        const toolCallData = toolCallMessage as SynapseRealTimeEventData;

        if (
          !toolCallData?.messageId ||
          !toolCallData?.data ||
          !toolCallData?.data?.details?.component
        ) {
          console.warn(
            "Tool escalation event missing messageId or data",
            toolCallData
          );
          return;
        }

        if (isWaitingForResponse) {
          setIsWaitingForResponse(false);
        }
        const messageId = toolCallData.messageId;

        setMessages((prevMessages) => {
          const previousMessage = prevMessages[prevMessages.length - 1];
          if (
            previousMessage &&
            previousMessage.id === messageId &&
            previousMessage.role === MessageSender.ASSISTANT
          ) {
            const updatedMessages = [...prevMessages];
            const updatedMessage = {
              ...previousMessage,
              toolEscalationData: {
                ...(toolCallData.data as ToolCallData),
                isResponded: false,
              } as ExtendedToolEscalationData,
              isResponseFromTool: true,
              isBot: true,
            };
            updatedMessages[prevMessages.length - 1] = updatedMessage;
            updateMessageInSession(sessionId, messageId, updatedMessage);
            return updatedMessages;
          } else {
            const newMessage: Message = {
              id: messageId,
              content: toolCallData.data?.details?.input?.text || "",
              role: MessageSender.ASSISTANT,
              isBot: true,
              toolEscalationData: {
                ...(toolCallData.data as ToolCallData),
                isResponded: false,
              } as ExtendedToolEscalationData,
              isResponseFromTool: true,
              isStored: false,
            };
            return [...prevMessages, newMessage];
          }
        });
      }
    );

    synapseRef.current?.on(SYNAPSE_REALTIME_EVENTS.DISCONNECTED, (details) => {
      console.log("disconnect details", details, retryAttempts);
      setConnectionStatus(CONNECTION_STATUS.DISCONNECTED);
      if (retryAttempts < 2) {
        setRetryAttempts((p) => p + 1);
        setShowRetryButton(true);
      } else {
        setStartNewConnection(true);
      }
    });

    synapseRef.current?.on(SYNAPSE_REALTIME_EVENTS.ERROR, (error) => {
      console.log("error from sdk on ERROR event", error);

      const errorCode = (error as any)?.data?.code;

      switch (errorCode) {
        case SYNAPSE_REALTIME_ERROR_CODES.SESSION_INACTIVE:
          setError({
            title: "Session not found",
            description: "Please start a new session",
          });
          setStartNewConnection(true);
          return;

        case SYNAPSE_REALTIME_ERROR_CODES.SESSION_EXPIRED:
          if (!isOnline) {
            setError({
              title: "Session expired",
              description: "Please check your connection and try again",
            });
            setShowRetryButton(true);
          } else {
            setError({
              title: "Session not found",
              description: "Please start a new session",
            });
            setStartNewConnection(true);
          }
          return;

        case SYNAPSE_REALTIME_ERROR_CODES.SESSION_TOKEN_MISMATCH:
          setError({
            title: "Session not found",
            description: "Please start a new session",
          });
          setStartNewConnection(true);
          return;

        case SYNAPSE_REALTIME_ERROR_CODES.INVALID_EVENT:
          console.log("invalid event error", error);
          return;

        case SYNAPSE_REALTIME_ERROR_CODES.INVALID_CONTENT_TYPE:
          console.log("invalid content type error", error);
          return;

        case SYNAPSE_REALTIME_ERROR_CODES.PARSING_ERROR:
          setError({
            title: "Error parsing request",
            description: "please try again",
          });
          setShowRetryButton(true);
          return;

        case SYNAPSE_REALTIME_ERROR_CODES.TIMEOUT:
          setError({
            title: "Request timed out",
            description: "please try again",
          });
          setShowRetryButton(true);
          return;

        default:
          setError({
            title: "Something went wrong",
            description: "please try again",
          });
          setShowRetryButton(true);
          return;
      }
    });

    synapseRef.current?.on(
      SYNAPSE_REALTIME_EVENTS.AUDIO_TRANSCRIPT,
      async (data) => {
        const inlineTextData = data as SynapseRealTimeEventData;
        if (inlineTextData?.data?.text) {
          setMessages((prevMessages) => {
            return [
              ...prevMessages,
              {
                id: Date.now().toString(),
                content: inlineTextData.data.text || "",
                role: MessageSender.USER,
                isBot: false,
                isStored: true,
              },
            ];
          });
        }
        setIsStreaming(false);
        setIsWaitingForResponse(false);
        setProgressMessage(null);
      }
    );

    synapseRef.current?.on(
      SYNAPSE_REALTIME_EVENTS.PROGRESS_MESSAGE,
      (data) => {
        const progressMessageData = data as SynapseRealTimeEventData;
        if (progressMessageData.data?.text) {
          setIsWaitingForResponse(false);
          setProgressMessage(progressMessageData.data.text);
        }
      }
    );

    synapseRef.current?.on(SYNAPSE_REALTIME_EVENTS.TOOL_START, (data) => {
      const toolStartData = data as SynapseRealTimeEventData;
      if (toolStartData.data?.name && toolStartData.messageId) {
        const messageId = toolStartData.messageId;

        setMessages((prevMessages) => {
          const lastMessage = prevMessages[prevMessages.length - 1];

          if (
            lastMessage &&
            lastMessage.id === messageId &&
            lastMessage.role === MessageSender.ASSISTANT
          ) {
            const updatedMessages = [...prevMessages];
            updatedMessages[updatedMessages.length - 1] = {
              ...lastMessage,
              toolCallStatus: `Calling tool: ${toolStartData.data.name}...`,
            };

            if (sessionId) {
              updateMessageInSession(sessionId, messageId, {
                toolCallStatus: `Calling tool: ${toolStartData.data.name}...`,
              });
            }

            return updatedMessages;
          }

          return prevMessages;
        });
      }
    });

    synapseRef.current?.on(SYNAPSE_REALTIME_EVENTS.TOOL_END, (data) => {
      const toolEndData = data as SynapseRealTimeEventData;
      if (toolEndData.data?.name && toolEndData.messageId) {
        const messageId = toolEndData.messageId;

        setMessages((prevMessages) => {
          const lastMessage = prevMessages[prevMessages.length - 1];

          if (
            lastMessage &&
            lastMessage.id === messageId &&
            lastMessage.role === MessageSender.ASSISTANT
          ) {
            const updatedMessages = [...prevMessages];
            updatedMessages[updatedMessages.length - 1] = {
              ...lastMessage,
              toolCallStatus: "Tool call completed.",
            };

            if (sessionId) {
              updateMessageInSession(sessionId, messageId, {
                toolCallStatus: "Tool call completed.",
              });
            }

            return updatedMessages;
          }

          return prevMessages;
        });
      }
    });
  };

  const sendMessage = async ({
    message,
    messageId,
    files,
    audio,
    toolCalled,
  }: SendMessageOptions): Promise<void> => {
    if (!isConnected()) {
      return;
    }
    if (files && files.length < 0 && message?.trim() === "" && !audio?.audio) {
      return;
    }

    setError(null);
    setShowRetryButton(false);
    const prevContext =
      messages.length == 2 && initialPrompts.length == 2
        ? initialPrompts
        : null;

    // Calculate isResponseFromTool from current messages state BEFORE updating
    const lastIndex = messages.length - 1;
    const lastMessage = lastIndex >= 0 ? messages[lastIndex] : null;
    const isResponseFromTool = lastMessage
      ? lastMessage?.isResponseFromTool ||
        (lastMessage.role === MessageSender.ASSISTANT &&
          lastMessage.toolEscalationData)
      : null;

    await synapseRef.current?.sendMessage({
      message,
      files,
      audio,
      ...(prevContext && { initial_prompts: prevContext }),
      ...(isResponseFromTool && !toolCalled
        ? {
            tool_declined: true,
            tool_id: lastMessage?.toolEscalationData?.tool_id || "",
          }
        : {}),
    });
    if (message || (files && files.length > 0)) {
      setMessages((prev) => {
        const previousMessage = [...prev];
        const prevLastIndex = previousMessage.length - 1;

        if (
          isResponseFromTool &&
          prevLastIndex >= 0 &&
          previousMessage[prevLastIndex].toolEscalationData
        ) {
          previousMessage[prevLastIndex] = {
            ...previousMessage[prevLastIndex],
            toolEscalationData: {
              ...previousMessage[prevLastIndex].toolEscalationData!,
              tool_id: null,
              isResponded: true,
            },
          };
          updateMessageInSession(
            sessionId,
            previousMessage[lastIndex].id || Date.now().toString(),
            previousMessage[lastIndex]
          );
        }
        return [
          ...previousMessage,
          {
            id: messageId || Date.now().toString(),
            content: message || "",
            files: files || [],
            role: MessageSender.USER,
            isBot: false,
            isStored: true,
          },
        ];
      });
      setIsWaitingForResponse(true);
    }
  };

  const isValidFile = (file: File): boolean => {
    const mimeType = file.type.toLowerCase();

    const allowedMimeTypes = [
      "application/pdf",
      "image/jpeg",
      "image/jpg",
      "image/png",
    ];

    if (mimeType && !allowedMimeTypes.includes(file.type)) {
      setError({
        title: `File type not supported: ${file.name}`,
        description: "Only PDF, images (JPG, JPEG, PNG) are allowed.",
      });
      return false;
    }

    if (file.size > 3 * 1024 * 1024) {
      setError({
        title: "File size limit of 3MB exceeded",
        description:
          "Please reduce the size of the file or try again with a smaller file",
      });
      return false;
    }

    return true;
  };

  const startRecording = async () => {
    if (!isConnected()) {
      throw new Error("Not connected to the server");
    }
    try {
      await synapseRef.current?.startRecording({
        onChunks: async (chunks) => {
          await sendMessage({ audio: chunks });
        },
        onError(error) {
          console.log("error from recording", error);
        },
      });
    } catch (error) {
      throw error;
    }
  };

  const stopRecording = () => {
    if (!isConnected()) {
      return;
    }
    synapseRef.current?.endRecording();
  };

  const callTool = async <R extends ToolCallResponse = ToolCallResponse>(
    toolName: string,
    toolParams?: Record<string, unknown>
  ): Promise<R> => {
    try {
      if (!isConnected()) {
        throw new Error("Not connected to the server");
      }
      const response = await synapseRef.current?.callTool<R>(
        toolName,
        toolParams
      );
      if (!response) {
        throw new Error("Failed to call tool");
      }
      return response;
    } catch (error) {
      throw error;
    }
  };

  const handleStartNewConnection = async () => {
    resetConnectionStates();
    await clearSession();
    await startSession(true);
  };

  const handleRetry = async () => {
    if (!isConnected()) {
      resetConnectionStates();
      await startSession(false);
    } else {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage && lastMessage.role === MessageSender.USER) {
        synapseRef.current?.sendMessage({
          message: lastMessage.content,
          files: lastMessage.files || [],
          messageId: lastMessage.id,
        });
      }
    }
  };

  const handleInitialTaskClick = async (message: string) => {
    if (!initialMessage?.suggestions?.length || !message) {
      return;
    }
    const selectedMessage = initialMessage.suggestions.find(
      (sug: any) => sug.value === message
    );

    if (!selectedMessage || !(selectedMessage as any).response) {
      await sendMessage({ message });
      return;
    }
    setMessages((prev) => {
      return [
        ...prev,
        {
          id: Date.now().toString(),
          content: message,
          role: MessageSender.USER,
          isBot: false,
          isStored: true,
        },
      ];
    });

    setIsWaitingForResponse(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsWaitingForResponse(false);

    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        content: (selectedMessage as any).response || "Please try again",
        role: MessageSender.ASSISTANT,
        isBot: true,
        isStored: false,
      },
    ]);
    setInitialPrompts([
      { role: "user", text: message },
      { role: "assistant", text: (selectedMessage as any).response },
    ]);
  };

  const handleToggleFeedback = async (
    feedback: USER_FEEDBACK,
    messageId: string,
    reason?: string
  ) => {
    if (!isConnected()) {
      return;
    }
    try {
      await synapseRef.current?.sendFeedback(messageId, feedback, reason);
    } catch (error) {
      console.log("Error sending feedback", error);
    }
  };

  return {
    sendMessage,
    startSession,
    incomingMessages: messages,
    loading,
    isReady,
    startRecording,
    stopRecording,
    handleRetry,
    isValidFile,
    handleStartNewConnection,
    callTool,
    handleInitialTaskClick,
    handleToggleFeedback,
  };
};

