import { useEffect, useMemo, useRef, useState } from "react";

import { useWebSocket } from "@/custom-hooks/useWebSocket";
import { type CommonHandlerData } from "@/types/socket";
import type { AudioData } from "@/services/audioService";
import useMedAssistStore from "@/stores/medAssistStore";
import { ERROR_MESSAGES, type WebSocketConfig } from "../types/socket";
import { Card } from "@ui/index";
import { ChatHeader } from "../molecules/chat-header";
import { MessageBubble } from "../molecules/message-bubble";
import { MessageInput } from "../molecules/message-input";
import { ConnectionStatus } from "../molecules/connection-status";
import ApolloAssistIcon from "../components/ApollossistIcon";
import { Message } from "@/types";
import { config } from "@/configs/constants";
import { getSessionDetails } from "@/api/get-session-details";
import { CONNECTION_STATUS } from "@/types/widget";

interface ChatWidgetProps {
  title?: string;
  className?: string;
  onClose?: () => void;
  onExpand?: () => void;
  onStartSession?: (newSession?: boolean) => void;
  isExpanded?: boolean;
  isMobile?: boolean;
  isLoading?: boolean;
  isOnline?: boolean;
}

export function ChatWidget({
  title = "Apollo Assist",
  className = "",
  onClose,
  onStartSession,
  onExpand,
  isExpanded = false,
  isMobile = false,
  isLoading = false,
  isOnline = true,
}: ChatWidgetProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      content:
        "Hi, I'm Apollo Assist, your personal support for all medical needs. How can I help you?",
      isBot: true,
      isStored: true,
    },
  ]);
  const [tips, setTips] = useState<string[] | null>(null);
  const [progressMessage, setProgressMessage] = useState<string | null>(null);
  const [isWaitingForResponse, setIsWaitingForResponse] =
    useState<boolean>(false);
  const [isSessionValidated, setIsSessionValidated] = useState<boolean>(false);
  const {
    connectionStatus,
    showRetryButton,
    startNewConnection,
    error,
    clearError,
    setError,
    isStreaming,
    sessionId,
    sessionToken,
    clearSession,
    getMessagesForSession,
    addMessageToSession,
    updateMessageInSession,
    setInlineText,
    inlineText,
  } = useMedAssistStore();

  const [disableInput, setDisableInput] = useState<boolean>(
    connectionStatus !== CONNECTION_STATUS.CONNECTED || !isOnline
  );
  // Auto-start session when widget mounts if no session exists
  useEffect(() => {
    console.log("ChatWidget mounted - checking session");
    if (!sessionId && !sessionToken && onStartSession) {
      console.log("No session found, starting new session...");
      onStartSession();
      // For new sessions, we don't need validation
      setIsSessionValidated(true);
    } else if (sessionId && sessionToken) {
      console.log("Session already exists:");

      // Check if session is still valid - AWAIT this before proceeding
      const validateSession = async () => {
        try {
          const isValid = await getSessionDetails(sessionId);
          console.log("isValid", isValid);
          if (!isValid) {
            console.log("Session is invalid, starting new session");
            clearSession();
            await onStartSession?.(true);
            //For new sessions, we don't need validation
            setIsSessionValidated(true);
          } else {
            console.log("Session is valid, allowing WebSocket connection");
            setIsSessionValidated(true);
          }
        } catch (error) {
          console.error("Error checking session details:", error);
          // If there's an error checking session, start a new one
          clearSession();
          await onStartSession?.(true);
          //For new sessions, we don't need validation
          setIsSessionValidated(true);
        }
      };

      validateSession();
    }
  }, []); // Only run on mount

  //load previous messages on unmout
  useEffect(() => {
    if (sessionId) {
      //TODO: add a loading state here
      const previousMessages = getMessagesForSession(sessionId);
      if (previousMessages.length > 0) {
        console.log("previousMessages", previousMessages);
        setMessages(previousMessages);
      } else {
        const welcomeMessage = {
          id: "1",
          content:
            "Hi, I'm Apollo Assist, your personal support for all medical needs. How can I help you?",
          isBot: true,
          isStored: true,
        };

        addMessageToSession(sessionId, welcomeMessage);
        setMessages([welcomeMessage]);
        console.log("cleared inline text");
      }
    }
  }, [sessionId]);
  // Create socket configuration when session data is available AND validated
  const socketConfig: WebSocketConfig | null = useMemo(() => {
    if (sessionId && sessionToken && isSessionValidated) {
      console.log(
        "Creating WebSocket config with validated session:",
        sessionId
      );
      return {
        sessionId,
        auth: { token: sessionToken },
      };
    }
    console.log("WebSocket config not created - session not validated yet");
    return null;
  }, [sessionId, sessionToken, isSessionValidated]);

  // Use WebSocketV2 hook
  const {
    webSocketService: wsService,
    setFilesForUpload,
    sendFileUploadRequest,
    sendAudioData,
    regenerateResponse,
    sendChatMessage,
    retryLastMessage,
  } = useWebSocket(
    socketConfig,
    (botMessage: string) => {
      // Clear waiting state when we receive a bot response
      setIsWaitingForResponse(false);
      // Handle bot response messages
      setMessages((prev) => {
        // Check if there's already a bot message at the end
        const lastMessage = prev[prev.length - 1];

        // If we have a bot message and it's shorter than the incoming text, update it
        if (
          lastMessage &&
          lastMessage.isBot &&
          botMessage.length > lastMessage.content.length
        ) {
          // Update the existing bot message with progressive text
          const updatedMessages = [...prev];
          updatedMessages[updatedMessages.length - 1] = {
            ...lastMessage,
            content: botMessage,
            isRegenerating: false, // Clear regenerating state
            isStored: false,
          };

          return updatedMessages;
        } else if (
          lastMessage &&
          lastMessage.isBot &&
          botMessage.length <= lastMessage.content.length
        ) {
          // If the incoming text is shorter or equal, it might be a duplicate, skip
          return prev;
        } else {
          console.log("Creating new bot message because:", {
            hasLastMessage: !!lastMessage,
            isLastMessageBot: lastMessage?.isBot,
            botMessageLength: botMessage.length,
            lastMessageLength: lastMessage?.content?.length || 0,
          });
          // Check if we need to replace a regenerating message
          // const regeneratingMessageIndex = prev.findIndex(
          //   (msg) => msg.isRegenerating
          // );
          // if (regeneratingMessageIndex !== -1) {
          //   // Replace the regenerating message
          //   const updatedMessages = [...prev];
          //   updatedMessages[regeneratingMessageIndex] = {
          //     ...updatedMessages[regeneratingMessageIndex],
          //     content: botMessage,
          //     isRegenerating: false,
          //   }; // Will be stored when streaming ends
          //   return updatedMessages;
          // } else {
          // Create a new bot message
          const newMessage: Message = {
            id: Date.now().toString(),
            content: botMessage,
            isBot: true,
            isStored: false,
          }; // Will be stored when streaming ends
          return [...prev, newMessage];
        }
      });
    },
    (progressMsg: string) => {
      // Clear waiting state when we receive progress messages
      setIsWaitingForResponse(false);

      // Handle progress messages
      setProgressMessage(progressMsg);
    },
    (tips: string[]) => {
      console.log("Tips message received:", tips);
      setIsWaitingForResponse(false);
      setTips(tips);
    },
    (commonContentData: CommonHandlerData) => {
      // Clear waiting state when we receive common content data
      setIsWaitingForResponse(false);

      // Handle common content messages - merge with existing bot message
      console.log("Common content message received:", commonContentData);
      setDisableInput(true);
      setMessages((prev) => {
        // Find the last bot message to attach content to it
        let lastBotMessageIndex = -1;
        for (let i = prev.length - 1; i >= 0; i--) {
          if (prev[i].isBot) {
            lastBotMessageIndex = i;
            break;
          }
        }

        if (lastBotMessageIndex !== -1) {
          console.log(
            "Bot message found, updating with common content data",
            commonContentData
          );
          // Update the last bot message with common content data
          const updatedMessages = [...prev];
          updatedMessages[lastBotMessageIndex] = {
            ...updatedMessages[lastBotMessageIndex],
            commonContentData: commonContentData, // Attach common content to the existing bot message
          };
          return updatedMessages;
        } else {
          console.log(
            "No bot message found, creating a new one",
            commonContentData
          );
          // If no bot message found, create a new one (fallback)
          const newMessage: Message = {
            id: Date.now().toString(),
            content: "Here are some options:",
            isBot: true,
            commonContentData: commonContentData,
            isStored: true,
          };
          console.log(
            "Adding common content message to session store",
            newMessage
          );
          addMessageToSession(sessionId, newMessage);
          return [...prev, newMessage];
        }
      });
    },
    (inlineMessage) => {
      setInlineText(inlineMessage);
    }
  );

  const [quickActions] = useState([
    { id: "doctor", label: "Help me find a doctor" },
    { id: "appointment", label: "I want to book appointment" },
    { id: "emergency", label: "I have an emergency" },
  ]);

  useEffect(() => {
    if (connectionStatus === CONNECTION_STATUS.CONNECTED && isOnline) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage?.isBot && lastMessage?.commonContentData) {
        console.log("disabling input", lastMessage);
        setDisableInput(true);
      } else {
        setDisableInput(false);
      }
    } else {
      setDisableInput(true);
      setIsWaitingForResponse(false); // Clear waiting state when connection is lost
    }
  }, [connectionStatus, isOnline, messages]);

  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      // Use setTimeout to ensure DOM is fully updated
      setTimeout(() => {
        scrollAreaRef.current?.scrollTo({
          top: scrollAreaRef.current.scrollHeight,
          behavior: "smooth",
        });
      }, 0);
    }
  };

  // Scroll to bottom whenever messages change
  useEffect(() => {
    scrollToBottom();
    if (isStreaming) {
      setProgressMessage(null);
      setIsWaitingForResponse(false); // Clear waiting state when streaming starts
    }
  }, [messages, isStreaming]);

  useEffect(() => {
    if (!isStreaming && sessionId && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.isBot && !lastMessage.isStored) {
        // Mark as stored to prevent duplicate storage
        const updatedMessage = { ...lastMessage, isStored: true };
        setMessages((prev) =>
          prev.map((msg, index) =>
            index === prev.length - 1 ? updatedMessage : msg
          )
        );
        addMessageToSession(sessionId, updatedMessage);
      }
    }
  }, [isStreaming, sessionId]);
  // Clear waiting state when there are errors
  useEffect(() => {
    if (error) {
      setIsWaitingForResponse(false);
    }
  }, [error]);

  const showErrorMessage = useMemo(() => {
    return (
      connectionStatus === CONNECTION_STATUS.CONNECTED &&
      isOnline &&
      !error &&
      !showRetryButton &&
      !startNewConnection
    );
  }, [connectionStatus, isOnline, error, showRetryButton, startNewConnection]);

  const handleSendMessage = async (content: string, tool_use_id?: string) => {
    // Block sending if currently streaming
    if (isStreaming) {
      console.log("Cannot send message while streaming");
      return;
    }

    if (!isOnline) {
      setError(ERROR_MESSAGES.OFFLINE);
      setIsWaitingForResponse(false);
      return;
    }

    if (connectionStatus !== CONNECTION_STATUS.CONNECTED) {
      setError(ERROR_MESSAGES.CONNECTION_LOST);
      setIsWaitingForResponse(false);
      return;
    }
    // Clear any errors when sending a message
    clearError();

    // Clear progress message and tips when sending new message
    setProgressMessage(null);
    setTips(null);
    try {
      await sendChatMessage(content, tool_use_id);
      // Mark the bot message as responded if it has pills or multiselect
      setMessages((prev) => {
        const updatedMessages = [...prev];
        // Find the last bot message and mark it as responded if it has interactive elements
        for (let i = updatedMessages.length - 1; i >= 0; i--) {
          if (
            updatedMessages[i].isBot &&
            updatedMessages[i].commonContentData
          ) {
            updatedMessages[i] = {
              ...updatedMessages[i],
              isResponded: true,
            };
            updateMessageInSession(
              sessionId,
              updatedMessages[i].id,
              updatedMessages[i]
            );
            break;
          }
        }
        return updatedMessages;
      });

      const newMessage: Message = {
        id: Date.now().toString(),
        content,
        isBot: false,
        originalUserMessage: content, // Store for potential regeneration
        isStored: true,
      };

      setMessages((prev) => [...prev, newMessage]);

      // Set waiting state immediately when message is sent
      setIsWaitingForResponse(true);
      addMessageToSession(sessionId, newMessage);
      if (disableInput) {
        setDisableInput(false);
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      setError({ title: "Failed to send message. Please try again." });
      setIsWaitingForResponse(false); // Clear waiting state on error
      throw error; // Re-throw to let MessageInput handle the error state
    }
  };

  // CHANGED: Now handles AudioData instead of Blob
  const handleFinalAudioStream = async (audioData: AudioData) => {
    if (!isOnline) {
      setError(ERROR_MESSAGES.OFFLINE);
      setIsWaitingForResponse(false);
      return;
    }

    if (connectionStatus !== CONNECTION_STATUS.CONNECTED) {
      setError(ERROR_MESSAGES.CONNECTION_LOST);
      setIsWaitingForResponse(false);
      return;
    }

    // Clear tips when sending final audio stream
    setTips(null);
    // Mark the bot message as responded if it has pills or multiselect
    try {
      // Send the full audio data
      await sendAudioData(audioData);
      // Send end of stream signal
    } catch (error) {
      console.error("Failed to send audio:", error);
      setError({ title: "Failed to send audio message. Please try again." });
      throw error;
    }
  };

  const handleFileUpload = async (files: FileList, message?: string) => {
    // Block file upload if currently streaming
    if (isStreaming) {
      console.log("Cannot upload file while streaming");
      return;
    }

    if (!isOnline) {
      setError(ERROR_MESSAGES.OFFLINE);
      setIsWaitingForResponse(false);
      return;
    }

    if (connectionStatus !== CONNECTION_STATUS.CONNECTED) {
      setError(ERROR_MESSAGES.CONNECTION_LOST);
      setIsWaitingForResponse(false);
      return;
    }
    // Clear any errors when uploading files
    clearError();

    // Mark the bot message as responded if it has pills or multiselect
    setMessages((prev) => {
      const updatedMessages = [...prev];
      // Find the last bot message and mark it as responded if it has interactive elements
      for (let i = updatedMessages.length - 1; i >= 0; i--) {
        if (updatedMessages[i].isBot && updatedMessages[i].commonContentData) {
          updatedMessages[i] = {
            ...updatedMessages[i],
            isResponded: true,
          };
          break;
        }
      }
      return updatedMessages;
    });

    const fileArray = Array.from(files);

    const newMessage: Message = {
      id: Date.now().toString(),
      content:
        message ||
        `📎 ${
          fileArray.length > 1 ? `${fileArray.length} files` : "File"
        } uploaded`, // Cleaner text
      isBot: false,
      files: fileArray,
      isStored: true,
    };

    setMessages((prev) => [...prev, newMessage]);

    try {
      // Set waiting state immediately when file upload request is sent
      setIsWaitingForResponse(true);

      // Set files for upload when presigned URL is received
      setFilesForUpload(fileArray, message);
      await sendFileUploadRequest();
      addMessageToSession(sessionId, newMessage);
    } catch (error) {
      console.error("Failed to upload file:", error);
      setError({ title: "Failed to upload file. Please try again." });
      setIsWaitingForResponse(false); // Clear waiting state on error
      throw error;
    }
  };

  const handleQuickAction = async (actionId: string) => {
    // Block quick actions if currently streaming
    if (isStreaming) {
      console.log("Cannot use quick action while streaming");
      return;
    }

    if (!isOnline) {
      setError(ERROR_MESSAGES.OFFLINE);
      setIsWaitingForResponse(false);
      return;
    }

    if (connectionStatus !== CONNECTION_STATUS.CONNECTED) {
      setError(ERROR_MESSAGES.CONNECTION_LOST);
      setIsWaitingForResponse(false);
      return;
    }
    // Clear any errors when using quick actions
    clearError();

    // Clear progress message and tips when using quick action
    setProgressMessage(null);
    setTips(null);

    // Mark the bot message as responded if it has pills or multiselect
    setMessages((prev) => {
      const updatedMessages = [...prev];
      // Find the last bot message and mark it as responded if it has interactive elements
      for (let i = updatedMessages.length - 1; i >= 0; i--) {
        if (updatedMessages[i].isBot && updatedMessages[i].commonContentData) {
          updatedMessages[i] = {
            ...updatedMessages[i],
            isResponded: true,
            isStored: true,
          };

          addMessageToSession(sessionId, updatedMessages[i]);
          break;
        }
      }
      return updatedMessages;
    });

    const action = quickActions.find((a) => a.id === actionId);
    if (action) {
      try {
        await handleSendMessage(action.label);
        setDisableInput(true);
      } catch (error) {
        console.error("Failed to send quick action:", error);
        // Error is already handled in handleSendMessage
      }
    }
  };

  const handleMenuAction = (action: string) => {
    if (action === "clear") {
      setMessages([messages[0]]);
      clearError(); // Clear any errors when clearing chat
      setIsWaitingForResponse(false); // Clear waiting state when clearing chat
    }
  };

  const handleRegenerate = async (messageId: string) => {
    // Find the message to regenerate
    if (!isOnline) {
      setError(ERROR_MESSAGES.OFFLINE);
      setIsWaitingForResponse(false);
      return;
    }

    if (connectionStatus !== CONNECTION_STATUS.CONNECTED) {
      setError(ERROR_MESSAGES.CONNECTION_LOST);
      setIsWaitingForResponse(false);
      return;
    }
    const messageIndex = messages.findIndex((msg) => msg.id === messageId);
    if (messageIndex === -1) {
      console.error("Message not found for regeneration");
      return;
    }

    const message = messages[messageIndex];

    // Only regenerate bot messages
    if (!message.isBot) {
      console.error("Cannot regenerate user messages");
      return;
    }

    // Find the previous user message
    let userMessageIndex = messageIndex - 1;
    while (userMessageIndex >= 0 && messages[userMessageIndex].isBot) {
      userMessageIndex--;
    }

    if (userMessageIndex < 0) {
      console.error("No user message found for regeneration");
      return;
    }

    const userMessage = messages[userMessageIndex];
    if (!userMessage.originalUserMessage) {
      console.error("No original user message found for regeneration");
      return;
    }

    // Block regeneration if currently streaming
    if (isStreaming) {
      console.log("Cannot regenerate while streaming");
      return;
    }

    // Clear any errors when regenerating
    clearError();

    // Clear progress message when regenerating
    setProgressMessage(null);

    console.log("Regenerating response for message:", messageId);
    console.log("Original user message:", userMessage.originalUserMessage);

    // Mark the current bot message as regenerating
    setMessages((prev) => {
      const updatedMessages = [...prev];
      updatedMessages[messageIndex] = {
        ...updatedMessages[messageIndex],
        isRegenerating: true,
        content: "Regenerating response...", // Show regenerating state
      };
      return updatedMessages;
    });

    try {
      // Send regenerate request
      await regenerateResponse(userMessage.originalUserMessage);
      // For now, just clear the regenerating state since regenerateResponse is not available
      console.log("Regenerate requested for:", userMessage.originalUserMessage);
      setMessages((prev) => {
        const updatedMessages = [...prev];
        updatedMessages[messageIndex] = {
          ...updatedMessages[messageIndex],
          isRegenerating: false,
          content: "Regeneration not implemented in V2 yet",
        };
        return updatedMessages;
      });
    } catch (error) {
      console.error("Failed to regenerate:", error);
      // setError({ title: "Failed to regenerate response. Please try again." });
      // Reset the message on error
      setMessages((prev) => {
        const updatedMessages = [...prev];
        updatedMessages[messageIndex] = {
          ...updatedMessages[messageIndex],
          isRegenerating: false,
          content: message.content, // Restore original content
        };
        return updatedMessages;
      });
    }
  };

  const handleStartNewSession = () => {
    try {
      setMessages([messages[0]]);
      clearSession();
      setIsWaitingForResponse(false); // Clear waiting state when starting new session
      onStartSession?.(true);
    } catch (error) {
      console.error("Failed to start new session:", error);
      // setError({ title: "Failed to start new session. Please try again." });
      throw error;
    }
  };

  const handleRetry = async () => {
    if (connectionStatus !== CONNECTION_STATUS.CONNECTED) {
      if (wsService) {
        clearError();
        wsService.reconnect(true, "manual reconnect");
      }
    } else {
      // If socket throws an error (e.g., parsing / code-related error) → retry last message
      try {
        const success = await retryLastMessage();
        if (success) {
          clearError();
          setIsWaitingForResponse(true);
        }
      } catch (error) {
        console.error("Failed to retry last message:", error);
        setError({ title: "Failed to retry message. Please try again." });
      }
    }
  };

  // Mobile full-screen styles
  const containerStyles = isMobile
    ? "fixed inset-0 z-50 bg-[var(--color-card)] border-border rounded-none flex flex-col h-[100dvh] w-screen py-0 gap-1 overflow-hidden"
    : isExpanded
    ? "fixed inset-4 z-50 bg-[var(--color-card)] border-border rounded-lg shadow-2xl flex flex-col max-h-[calc(100vh-2rem)] py-0 pt-1 gap-1"
    : `w-full max-w-sm bg-[var(--color-card)] border-border shadow-lg rounded-lg py-0 pt-1 gap-1${className} `;

  const chatHeight = isMobile
    ? "flex-1 min-h-0"
    : isExpanded
    ? "flex-1 min-h-0"
    : "h-[500px]";

  return (
    <Card className={containerStyles}>
      <ChatHeader
        title={title}
        onClose={onClose}
        onExpand={onExpand}
        onMenuAction={handleMenuAction}
        isExpanded={isExpanded}
        isMobile={isMobile}
        onStartSession={handleStartNewSession}
        connectionStatus={connectionStatus}
        isOnline={isOnline}
      />

      {/* Loading State */}
      {isLoading && (
        <div
          className={`${chatHeight} flex items-center justify-center py-8 px-4`}>
          <div className="text-center w-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
            <p className="text-sm text-[var(--color-muted-foreground)] break-words">
              Starting session...
            </p>
          </div>
        </div>
      )}

      {/* {!isLoading && (
        <div className="text-xs text-[var(--color-muted-foreground)] text-center">
          {getCurrentTimestamp()}
        </div>
      )} */}
      {!isLoading && (
        <div className={`${chatHeight} flex flex-col overflow-hidden`}>
          <div
            ref={scrollAreaRef}
            className="flex-1 min-h-0 overflow-y-auto"
            style={{
              scrollBehavior: "smooth",
              scrollbarWidth: "thin",
              scrollbarColor: "var(--color-border) transparent",
            }}>
            <div className="space-y-1">
              {messages.map((message, index) => (
                <MessageBubble
                  key={message.id}
                  messageId={message.id}
                  message={message.content}
                  isBot={message.isBot}
                  showActions={messages.length === 1}
                  handleQuickAction={handleQuickAction}
                  quickActions={quickActions}
                  isQuickActionsDisabled={
                    connectionStatus !== CONNECTION_STATUS.CONNECTED ||
                    isStreaming ||
                    !isOnline
                  }
                  isStreaming={
                    message.isBot &&
                    isStreaming &&
                    index === messages.length - 1
                  }
                  progressMessage={
                    message.isBot && index === messages.length - 1
                      ? progressMessage
                      : null
                  }
                  tips={
                    message.isBot && index === messages.length - 1 ? tips : null
                  }
                  onTipsExpire={() => setTips(null)}
                  isRegenerating={message.isRegenerating}
                  commonContentData={message.commonContentData}
                  onContentClick={handleSendMessage}
                  onRegenerate={handleRegenerate}
                  audioData={message.audioData} // Pass audio data to MessageBubble
                  isResponded={message.isResponded}
                  files={message.files}
                />
              ))}

              {/* Show loading indicator when waiting for response */}
              {isWaitingForResponse && !isStreaming && (
                <div className="px-4 py-2">
                  <div className="flex gap-1 items-start justify-center">
                    <div className="flex-shrink-0">
                      <ApolloAssistIcon size={32} />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm leading-relaxed px-3 rounded-lg text-[var(--color-foreground)] bg-[var(--color-card)]">
                        <span className="animate-pulse">...</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Connection Status */}
          {!showErrorMessage && (
            <ConnectionStatus
              onRetry={handleRetry}
              onStartNewSession={handleStartNewSession}
              showRetryButton={showRetryButton}
              startNewConnection={startNewConnection}
              clearError={clearError}
              error={error}
              isConnected={
                connectionStatus === CONNECTION_STATUS.CONNECTED && isOnline
              }
            />
          )}

          <div className={isMobile ? "pb-safe" : ""}>
            <MessageInput
              onSendMessage={handleSendMessage}
              onFinalAudioStream={handleFinalAudioStream}
              inlineText={inlineText || ""}
              onFileUpload={handleFileUpload}
              disabled={disableInput}
              setError={setError}
            />
          </div>

          {/* Powered by eka.care branding */}
          <div
            className={`flex items-center justify-center py-1.5 px-4 ${
              isMobile ? "pb-safe" : ""
            }`}>
            <div className="flex items-center gap-1 text-xs text-[var(--color-muted-foreground)]">
              <img
                src={`${config.CDN_BASE_URL}/assets/powered-by-eka-care.svg`}
                alt="eka.care"
                className="h-3.5"
              />
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
