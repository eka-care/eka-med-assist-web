import { useEffect, useRef, useState } from "react";

import { useWebSocket } from "@/custom-hooks/useWebSocket";
import type { AudioData } from "@/services/audioService";
import useSessionStore from "@/stores/medAssistStore";
import type { WebSocketConfig } from "@/types/socket";
import getCurrentTimestamp from "@/utils/getCurrentTimestamp";
import { Card } from "@ui/index";
import { ChatHeader } from "./chat-header";
import { MessageBubble } from "./message-bubble";
import { MessageInput } from "./message-input";
import { PillAction } from "./quick-actions";

interface Message {
  id: string;
  content: string;
  isBot: boolean;
  files?: File[];
  originalUserMessage?: string; // Store the original user message for regeneration
  isRegenerating?: boolean; // Track if this message is being regenerated
  pillData?: PillAction;
  multiData?: PillAction;
  audioData?: AudioData; // Add audio data support
  isResponded?: boolean; // Track if this bot message has been responded to
}

interface ChatWidgetProps {
  title?: string;
  className?: string;
  onClose?: () => void;
  onExpand?: () => void;
  onStartSession?: (newSession?: boolean) => void;
  isExpanded?: boolean;
  isMobile?: boolean;
  isLoading?: boolean;
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
}: ChatWidgetProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      content:
        "Hi, I'm Apollo Assist, your personal support for all medical needs. How can I help you?",
      isBot: true,
    },
  ]);
  const [progressMessage, setProgressMessage] = useState<string | null>(null);
  const sessionId = useSessionStore((state) => state.sessionId);
  const sessionToken = useSessionStore((state) => state.sessionToken);
  const isConnectionEstablished = useSessionStore(
    (state) => state.isConnectionEstablished
  );

  // Auto-start session when widget mounts if no session exists
  useEffect(() => {
    console.log("ChatWidget mounted - checking session", {
      sessionId,
      sessionToken,
    });
    if (!sessionId && !sessionToken && onStartSession) {
      console.log("No session found, starting new session...");
      onStartSession();
    } else if (sessionId && sessionToken) {
      console.log("Session already exists:", { sessionId, sessionToken });
    }
  }, []); // Only run on mount

  // Error handling from store
  const error = useSessionStore((state) => state.error);
  const isTimeoutError = useSessionStore((state) => state.isTimeoutError);
  const setError = useSessionStore((state) => state.setError);
  const clearError = useSessionStore((state) => state.clearError);
  const clearSession = useSessionStore((state) => state.clearSession);
  const isStreaming = useSessionStore((state) => state.isStreaming);
  // Create socket configuration when session data is available
  const socketConfig: WebSocketConfig | null =
    sessionId && sessionToken
      ? {
          sessionId,
          auth: { token: sessionToken },
        }
      : null;

  // Use WebSocketV2 hook
  const {
    webSocketService: wsService,
    sendTextMessage: sendChatMessage,
    setFilesForUpload,
    sendFileUploadRequest,
    sendEndOfAudioStream: sendAudioEndOfStream,
    sendAudioData,
    sendPillMessage,
    regenerateResponse,
  } = useWebSocket(
    socketConfig,
    (botMessage: string) => {
      // Handle bot response messages
      setMessages((prev) => {
        // Check if there's already a bot message at the end
        const lastMessage = prev[prev.length - 1];
        console.log("lastMessage", lastMessage);

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
          };
          return updatedMessages;
        } else if (
          lastMessage &&
          lastMessage.isBot &&
          botMessage.length <= lastMessage.content.length
        ) {
          // If the incoming text is shorter or equal, it might be a duplicate, skip
          console.log(
            "Skipping duplicate or shorter text:",
            botMessage,
            "vs",
            lastMessage.content
          );
          return prev;
        } else {
          console.log("Creating new bot message because:", {
            hasLastMessage: !!lastMessage,
            isLastMessageBot: lastMessage?.isBot,
            botMessageLength: botMessage.length,
            lastMessageLength: lastMessage?.content?.length || 0,
          });

          // Check if we need to replace a regenerating message
          const regeneratingMessageIndex = prev.findIndex(
            (msg) => msg.isRegenerating
          );
          if (regeneratingMessageIndex !== -1) {
            // Replace the regenerating message
            const updatedMessages = [...prev];
            updatedMessages[regeneratingMessageIndex] = {
              ...updatedMessages[regeneratingMessageIndex],
              content: botMessage,
              isRegenerating: false,
            };
            return updatedMessages;
          } else {
            // Create a new bot message
            const newMessage: Message = {
              id: Date.now().toString(),
              content: botMessage,
              isBot: true,
            };
            return [...prev, newMessage];
          }
        }
      });
    },
    (progressMsg: string) => {
      // Handle progress messages
      console.log("Progress message received:", progressMsg);
      setProgressMessage(progressMsg);
    },
    (pillData: PillAction) => {
      // Handle pill messages - merge with existing bot message
      console.log("Pill message received:", pillData);

      setMessages((prev) => {
        // Find the last bot message to attach pills to it
        let lastBotMessageIndex = -1;
        for (let i = prev.length - 1; i >= 0; i--) {
          if (prev[i].isBot) {
            lastBotMessageIndex = i;
            break;
          }
        }

        if (lastBotMessageIndex !== -1) {
          console.log("Bot message found, updating with pill data", pillData);
          // Update the last bot message with pill data
          const updatedMessages = [...prev];
          updatedMessages[lastBotMessageIndex] = {
            ...updatedMessages[lastBotMessageIndex],
            pillData: pillData, // Attach pills to the existing bot message
          };
          return updatedMessages;
        } else {
          console.log("No bot message found, creating a new one", pillData);
          // If no bot message found, create a new one (fallback)
          const newMessage: Message = {
            id: Date.now().toString(),
            content: "Here are some options:",
            isBot: true,
            pillData: pillData,
          };
          return [...prev, newMessage];
        }
      });
    },
    (multiData: PillAction) => {
      // Handle multi messages - merge with existing bot message
      console.log("Multi message received:", multiData);
      setMessages((prev) => {
        // Find the last bot message to attach pills to it
        let lastBotMessageIndex = -1;
        for (let i = prev.length - 1; i >= 0; i--) {
          if (prev[i].isBot) {
            lastBotMessageIndex = i;
            break;
          }
        }

        if (lastBotMessageIndex !== -1) {
          console.log("Bot message found, updating with multi data", multiData);
          // Update the last bot message with multi data
          const updatedMessages = [...prev];
          updatedMessages[lastBotMessageIndex] = {
            ...updatedMessages[lastBotMessageIndex],
            multiData: multiData, // Attach multi data to the existing bot message
          };
          return updatedMessages;
        } else {
          console.log("No bot message found, creating a new one", multiData);
          // If no bot message found, create a new one (fallback)
          const newMessage: Message = {
            id: Date.now().toString(),
            content: "Here are some options:",
            isBot: true,
            multiData: multiData,
          };
          return [...prev, newMessage];
        }
      });
    }
  );

  const [quickActions] = useState([
    { id: "doctor", label: "Help me find a doctor" },
    { id: "appointment", label: "I want to book appointment" },
    { id: "emergency", label: "I have an emergency" },
  ]);

  useEffect(() => {
    if (wsService && isConnectionEstablished) {
      console.log("WebSocket connection ready for chat");
    }
  }, [wsService, isConnectionEstablished]);

  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    console.log("scrollToBottom called");
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
  }, [messages, isStreaming]);

  // Clear progress message when streaming starts or ends
  useEffect(() => {
    if (isStreaming) {
      setProgressMessage(null);
    }
  }, [isStreaming]);

  // CHANGED: Now handles AudioData instead of Blob
  const handleAudioStream = (audioData: AudioData) => {
    console.log("called on Audio stream in chat widget V2");
    if (isStreaming) {
      console.log("Cannot send voice while streaming");
      return;
    }

    // Clear any errors when starting audio streaming
    clearError();

    console.log("Audio stream received:", audioData);

    if (isConnectionEstablished) {
      // Send full audio data to WebSocket
      console.log("called on sendAudioData of socket in chat widget V2");
      sendAudioData(audioData);
    } else {
      console.log("WebSocket not connected, cannot stream audio");
    }
  };

  const handleSendMessage = async (content: string) => {
    // Block sending if currently streaming
    if (isStreaming) {
      console.log("Cannot send message while streaming");
      return;
    }

    // Clear any errors when sending a message
    clearError();

    // Clear progress message when sending new message
    setProgressMessage(null);

    // Mark the bot message as responded if it has pills or multiselect
    setMessages((prev) => {
      const updatedMessages = [...prev];
      // Find the last bot message and mark it as responded if it has interactive elements
      for (let i = updatedMessages.length - 1; i >= 0; i--) {
        if (
          updatedMessages[i].isBot &&
          (updatedMessages[i].pillData || updatedMessages[i].multiData)
        ) {
          updatedMessages[i] = {
            ...updatedMessages[i],
            isResponded: true,
          };
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
    };

    setMessages((prev) => [...prev, newMessage]);

    try {
      if (isConnectionEstablished) {
        await sendChatMessage(content);
        console.log("Message sent successfully");
      } else {
        console.log("WebSocket not connected, cannot send message");
        setError("Connection lost. Please wait for reconnection.");
        throw new Error("WebSocket not connected");
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      setError("Failed to send message. Please try again.");
      throw error; // Re-throw to let MessageInput handle the error state
    }
  };

  // CHANGED: Now handles AudioData instead of Blob
  const handleFinalAudioStream = async (audioData: AudioData) => {
    console.log("Final audio stream received:", audioData);

    // Mark the bot message as responded if it has pills or multiselect
    setMessages((prev) => {
      const updatedMessages = [...prev];
      // Find the last bot message and mark it as responded if it has interactive elements
      for (let i = updatedMessages.length - 1; i >= 0; i--) {
        if (
          updatedMessages[i].isBot &&
          (updatedMessages[i].pillData || updatedMessages[i].multiData)
        ) {
          updatedMessages[i] = {
            ...updatedMessages[i],
            isResponded: true,
          };
          break;
        }
      }
      return updatedMessages;
    });

    // Create user message with audio data
    const newMessage: Message = {
      id: Date.now().toString(),
      content: "🎤 Voice message sent", // Cleaner, simpler text
      isBot: false,
      audioData: audioData, // Store the audio data
    };

    setMessages((prev) => [...prev, newMessage]);

    try {
      if (isConnectionEstablished) {
        // Send the full audio data
        await sendAudioData(audioData);
        // Send end of stream signal
        await sendAudioEndOfStream();
        console.log("Audio sent successfully");
      } else {
        console.log("WebSocket not connected, cannot stream audio");
        setError("Connection lost. Please wait for reconnection.");
        throw new Error("WebSocket not connected");
      }
    } catch (error) {
      console.error("Failed to send audio:", error);
      setError("Failed to send audio message. Please try again.");
      throw error;
    }
  };

  const handleFileUpload = async (files: FileList, message?: string) => {
    // Block file upload if currently streaming
    if (isStreaming) {
      console.log("Cannot upload file while streaming");
      return;
    }

    // Clear any errors when uploading files
    clearError();

    // Mark the bot message as responded if it has pills or multiselect
    setMessages((prev) => {
      const updatedMessages = [...prev];
      // Find the last bot message and mark it as responded if it has interactive elements
      for (let i = updatedMessages.length - 1; i >= 0; i--) {
        if (
          updatedMessages[i].isBot &&
          (updatedMessages[i].pillData || updatedMessages[i].multiData)
        ) {
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
      content: message || `📎 ${
        fileArray.length > 1 ? `${fileArray.length} files` : "File"
      } uploaded`, // Cleaner text
      isBot: false,
      files: fileArray,
    };

    setMessages((prev) => [...prev, newMessage]);

    try {
      // Send file upload request via WebSocket
      if (isConnectionEstablished) {
        // Set files for upload when presigned URL is received
        setFilesForUpload(fileArray, message);
        await sendFileUploadRequest();
        console.log("File upload request sent successfully");
      } else {
        console.log("WebSocket not connected, cannot upload file");
        setError("Connection lost. Please wait for reconnection.");
        throw new Error("WebSocket not connected");
      }
    } catch (error) {
      console.error("Failed to upload file:", error);
      setError("Failed to upload file. Please try again.");
      throw error;
    }
  };

  const handleQuickAction = async (actionId: string) => {
    // Block quick actions if currently streaming
    if (isStreaming) {
      console.log("Cannot use quick action while streaming");
      return;
    }

    // Clear any errors when using quick actions
    clearError();

    // Clear progress message when using quick action
    setProgressMessage(null);

    // Mark the bot message as responded if it has pills or multiselect
    setMessages((prev) => {
      const updatedMessages = [...prev];
      // Find the last bot message and mark it as responded if it has interactive elements
      for (let i = updatedMessages.length - 1; i >= 0; i--) {
        if (
          updatedMessages[i].isBot &&
          (updatedMessages[i].pillData || updatedMessages[i].multiData)
        ) {
          updatedMessages[i] = {
            ...updatedMessages[i],
            isResponded: true,
          };
          break;
        }
      }
      return updatedMessages;
    });

    const action = quickActions.find((a) => a.id === actionId);
    if (action) {
      try {
        await handleSendMessage(action.label);
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
    }
  };

  const handleRegenerate = async (messageId: string) => {
    // Find the message to regenerate
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
      if (isConnectionEstablished) {
        await regenerateResponse(userMessage.originalUserMessage);
        // For now, just clear the regenerating state since regenerateResponse is not available
        console.log(
          "Regenerate requested for:",
          userMessage.originalUserMessage
        );
        setMessages((prev) => {
          const updatedMessages = [...prev];
          updatedMessages[messageIndex] = {
            ...updatedMessages[messageIndex],
            isRegenerating: false,
            content: "Regeneration not implemented in V2 yet",
          };
          return updatedMessages;
        });
      } else {
        console.log("WebSocket not connected, cannot regenerate");
        setError("Connection lost. Please wait for reconnection.");
        // Reset the message if connection failed
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
    } catch (error) {
      console.error("Failed to regenerate:", error);
      setError("Failed to regenerate response. Please try again.");
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

  const handlePillClick = async (pillText: string, tool_use_id: string) => {
    console.log("Pill clicked:", pillText, "tool_use_id:", tool_use_id);

    // Block pill clicks if currently streaming
    if (isStreaming) {
      console.log("Cannot use pill while streaming");
      return;
    }

    // Clear any errors when using pills
    clearError();

    // Clear progress message when using pill
    setProgressMessage(null);

    // Mark the bot message as responded
    setMessages((prev) => {
      const updatedMessages = [...prev];
      // Find the last bot message and mark it as responded
      for (let i = updatedMessages.length - 1; i >= 0; i--) {
        if (updatedMessages[i].isBot) {
          updatedMessages[i] = {
            ...updatedMessages[i],
            isResponded: true,
          };
          break;
        }
      }
      return updatedMessages;
    });

    // Add user message showing the pill selection
    const newMessage: Message = {
      id: Date.now().toString(),
      content: `${pillText}`, // Cleaner text with checkmark
      isBot: false,
      originalUserMessage: pillText,
    };

    setMessages((prev) => [...prev, newMessage]);

    try {
      // Send pill message via WebSocket
      if (isConnectionEstablished) {
        await sendPillMessage(pillText, tool_use_id);
        // For now, just log since sendPillMessage is not available in V2
        console.log("Pill message would be sent:", pillText, tool_use_id);
      } else {
        console.log("WebSocket not connected, cannot send pill message");
        setError("Connection lost. Please wait for reconnection.");
        throw new Error("WebSocket not connected");
      }
    } catch (error) {
      console.error("Failed to send pill message:", error);
      setError("Failed to send selection. Please try again.");
      throw error;
    }
  };

  const handleStartNewSession = () => {
    try {
      setMessages([messages[0]]);
      clearSession();
      onStartSession?.(true);
    } catch (error) {
      console.error("Failed to start new session:", error);
      setError("Failed to start new session. Please try again.");
      throw error;
    }
  };

  // Mobile full-screen styles
  const containerStyles = isMobile
    ? "fixed inset-0 z-50 bg-[var(--color-card)] flex flex-col h-screen w-screen"
    : isExpanded
    ? "fixed inset-4 z-50 bg-[var(--color-card)] rounded-lg shadow-2xl flex flex-col max-h-[calc(100vh-2rem)]"
    : `w-full max-w-sm bg-[var(--color-card)] shadow-lg rounded-lg py-2 pb-4 ${className}`;

  const chatHeight = isMobile
    ? "flex-1 min-h-0"
    : isExpanded
    ? "flex-1 min-h-0"
    : "h-96";

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
        isConnected={isConnectionEstablished}
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

      {/* Single timestamp at top */}
      <div className="text-xs text-[var(--color-muted-foreground)] text-center">
        {getCurrentTimestamp()}
      </div>

      {!isLoading && (
        <div className={`${chatHeight} flex flex-col overflow-hidden`}>
          <div
            ref={scrollAreaRef}
            className="flex-1 min-h-0 overflow-y-auto px-4"
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
                    !isConnectionEstablished || isStreaming
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
                  isRegenerating={message.isRegenerating}
                  pillAction={message.pillData}
                  onPillClick={handlePillClick}
                  showRetry={isTimeoutError}
                  onRetry={() => {
                    if (wsService) {
                      clearError();
                      wsService.reconnect("quick action retry after timeout");
                    }
                  }}
                  onRegenerate={handleRegenerate}
                  multiData={message.multiData}
                  onMultiClick={handlePillClick}
                  audioData={message.audioData} // Pass audio data to MessageBubble
                  isResponded={message.isResponded}
                  files={message.files}
                />
              ))}
            </div>
          </div>

          {/* Connection Status */}
          {!isConnectionEstablished && (
            <div className="px-4 py-2 text-center text-sm">
              {!sessionId || !sessionToken ? (
                <div className="text-orange-600 bg-orange-50">
                  Waiting for session...
                </div>
              ) : (
                <div className="text-orange-600 bg-orange-50">
                  <span> Connecting to WebSocket server...</span>
                  {/* <button
                    onClick={() => {
                      if (wsService) {
                        wsService.reconnect("connection error retry");
                      }
                    }}
                    className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700">
                    Retry
                  </button> */}
                </div>
              )}
            </div>
          )}

          {/* Simple Error Display */}
          {error && (
            <div className="mx-4 mb-3 p-3 bg-red-50 border border-red-200 rounded-md">
              <div className="flex items-center gap-2 text-red-700">
                <svg
                  className="w-4 h-4 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
                <span className="text-sm">{error}</span>
                {isTimeoutError ? (
                  <div className="ml-auto flex gap-2">
                    <button
                      onClick={() => {
                        if (wsService) {
                          clearError();
                          // The service will automatically handle ping test and reconnection
                          // Just trigger a manual reconnection attempt
                          wsService.reconnect("manual retry after timeout");
                        }
                      }}
                      className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700">
                      Retry
                    </button>
                    <button
                      onClick={clearError}
                      className="text-red-500 hover:text-red-700">
                      ×
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={clearError}
                    className="ml-auto text-red-500 hover:text-red-700">
                    ×
                  </button>
                )}
              </div>
            </div>
          )}

          <MessageInput
            onSendMessage={handleSendMessage}
            onFinalAudioStream={handleFinalAudioStream}
            onAudioStream={handleAudioStream}
            onFileUpload={handleFileUpload}
            disabled={!isConnectionEstablished}
            setError={setError}
          />
        </div>
      )}
    </Card>
  );
}
