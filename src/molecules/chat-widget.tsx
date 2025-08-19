import { useState, useRef, useEffect } from "react";

import { ChatHeader } from "./chat-header";
import { MessageBubble } from "./message-bubble";
import { Card } from "@ui/index";
import useSessionStore from "@/stores/medAssistStore";
import { useWebSocket } from "@/custom-hooks/useWebSocket";
import type { WebSocketConfig } from "@/types/socket";
import { MessageInputCopy } from "./message-input-copy";

interface Message {
  id: string;
  content: string;
  isBot: boolean;
  files?: File[];
}

interface ChatWidgetProps {
  title?: string;
  className?: string;
  onClose?: () => void;
  onExpand?: () => void;
  isExpanded?: boolean;
  isMobile?: boolean;
}

export function ChatWidget({
  title = "Apollo Assist",
  className = "",
  onClose,
  onExpand,
  isExpanded = false,
  isMobile = false,
}: ChatWidgetProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      content:
        "Hi, I'm Apollo Assist, your personal support for all medical needs. How can I help you?",
      isBot: true,
    },
  ]);
  const [error, setError] = useState<string | null>(null);
  const sessionId = useSessionStore((state) => state.sessionId);
  const sessionToken = useSessionStore((state) => state.sessionToken);
  const isSocketIOConnected = useSessionStore(
    (state) => state.isSocketIOConnected
  );
  const isConnectionEstablished = useSessionStore(
    (state) => state.isConnectionEstablished
  );

  // Create socket configuration when session data is available
  const socketConfig: WebSocketConfig | null =
    sessionId && sessionToken
      ? {
          sessionId,
          auth: { token: sessionToken },
        }
      : null;

  // Use WebSocket hook
  const {
    wsService,
    sendChatMessage,
    sendFileUploadRequest,
    sendAudioEndOfStream,
    setFilesForUpload,
    sendAudioStream,
    isStreaming,
  } = useWebSocket(socketConfig, (botMessage: string) => {
    // Handle bot response messages
    console.log(
      "onTextMessage called with:",
      botMessage,
      "isStreaming:",
      isStreaming
    );

    setMessages((prev) => {
      // Check if there's already a bot message at the end
      const lastMessage = prev[prev.length - 1];
      console.log("lastMessage", lastMessage);
      console.log("isStreaming", isStreaming);

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
        // Create a new bot message
        const newMessage: Message = {
          id: Date.now().toString(),
          content: botMessage,
          isBot: true,
        };
        return [...prev, newMessage];
      }
    });
  });

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

  const handleAudioStream = (audioBlob: Blob) => {
    console.log("called on Audio stream in chat widget");
    if (isStreaming) {
      console.log("Cannot send voice while streaming");
      return;
    }

    // Clear any errors when starting audio streaming
    clearError();

    console.log("Audio stream received:", audioBlob);

    // Convert Blob to Uint8Array and stream to WebSocket
    audioBlob.arrayBuffer().then((buffer) => {
      const uint8Array = new Uint8Array(buffer);

      if (isConnectionEstablished) {
        // Stream audio data to WebSocket
        console.log("called on sendAudioStream of socket in chat widget");
        sendAudioStream(uint8Array);
      } else {
        console.log("WebSocket not connected, cannot stream audio");
      }
    });
  };

  const getCurrentTimestamp = () => {
    const now = new Date();
    return now.toLocaleString("en-US", {
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const handleSendMessage = (content: string) => {
    // Block sending if currently streaming
    if (isStreaming) {
      console.log("Cannot send message while streaming");
      return;
    }

    // Clear any errors when sending a message
    clearError();

    const newMessage: Message = {
      id: Date.now().toString(),
      content,
      isBot: false,
    };

    setMessages((prev) => [...prev, newMessage]);

    if (isConnectionEstablished) {
      sendChatMessage(content);
    } else {
      console.log("WebSocket not connected, cannot send message");
    }
  };

  const handleAudioEndOfStream = (audioData: Blob) => {
    console.log("Audio end of stream received:", audioData);
    // Convert Blob to Uint8Array and stream to WebSocket
    audioData.arrayBuffer().then((buffer) => {
      const uint8Array = new Uint8Array(buffer);

      if (isConnectionEstablished) {
        // Stream audio data to WebSocket
        sendAudioEndOfStream(uint8Array);
      } else {
        console.log("WebSocket not connected, cannot stream audio");
      }
    });
  };

  const handleFileUpload = (files: FileList) => {
    // Block file upload if currently streaming
    if (isStreaming) {
      console.log("Cannot upload file while streaming");
      return;
    }

    // Clear any errors when uploading files
    clearError();

    const fileArray = Array.from(files);
    const fileNames = fileArray.map((f) => f.name).join(", ");

    const newMessage: Message = {
      id: Date.now().toString(),
      content: `Uploaded files: ${fileNames}`,
      isBot: false,
      files: fileArray,
    };

    setMessages((prev) => [...prev, newMessage]);

    // Send file upload request via WebSocket
    if (isConnectionEstablished) {
      // Set files for upload when presigned URL is received
      setFilesForUpload(fileArray);
      sendFileUploadRequest();
    } else {
      console.log("WebSocket not connected, cannot upload file");
    }
  };

  const handleQuickAction = (actionId: string) => {
    // Block quick actions if currently streaming
    if (isStreaming) {
      console.log("Cannot use quick action while streaming");
      return;
    }

    // Clear any errors when using quick actions
    clearError();

    const action = quickActions.find((a) => a.id === actionId);
    if (action) {
      handleSendMessage(action.label);
    }
  };

  const handleMenuAction = (action: string) => {
    if (action === "clear") {
      setMessages([messages[0]]);
      clearError(); // Clear any errors when clearing chat
    }
  };

  const clearError = () => {
    setError(null);
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
        isConnected={isConnectionEstablished}
      />

      {/* Single timestamp at top */}
      <div className="text-xs text-[var(--color-muted-foreground)] text-center">
        {getCurrentTimestamp()}
      </div>

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
                message={message.content}
                isBot={message.isBot}
                showActions={messages.length === 1}
                handleQuickAction={handleQuickAction}
                quickActions={quickActions}
                isQuickActionsDisabled={!isConnectionEstablished || isStreaming}
                isStreaming={
                  message.isBot && isStreaming && index === messages.length - 1
                }
              />
            ))}
          </div>
        </div>

        {/* Connection Status */}
        {!isConnectionEstablished && (
          <div className="px-4 py-2 text-center text-sm border-t">
            {!sessionId || !sessionToken ? (
              <div className="text-orange-600 bg-orange-50">
                Waiting for session...
              </div>
            ) : !isSocketIOConnected ? (
              <div className="text-orange-600 bg-orange-50">
                Connecting to WebSocket server...
              </div>
            ) : (
              <div className="text-orange-600 bg-orange-50">
                Establishing WebSocket connection...
              </div>
            )}
          </div>
        )}

        {/* Connection Error Status */}
        {isSocketIOConnected && !isConnectionEstablished && (
          <div className="px-4 py-2 text-center text-sm text-red-600 bg-red-50 border-t">
            <div className="flex items-center justify-center gap-2">
              <div className="w-2 h-2 bg-red-600 rounded-full"></div>
              <span>Connection failed. </span>
              <button
                onClick={() => {
                  if (wsService) {
                    wsService.reconnect();
                  }
                }}
                className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700">
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Streaming Status */}
        {/* {isStreaming && (
          <div className="px-4 py-2 text-center text-sm text-blue-600 bg-blue-50 border-t">
            <div className="flex items-center justify-center gap-2">
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
              <span>Bot is responding...</span>
            </div>
          </div>
        )} */}

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
              <button
                onClick={clearError}
                className="ml-auto text-red-500 hover:text-red-700">
                ×
              </button>
            </div>
          </div>
        )}

        <MessageInputCopy
          onSendMessage={handleSendMessage}
          onFinalAudioStream={handleAudioEndOfStream}
          onAudioStream={handleAudioStream}
          onFileUpload={handleFileUpload}
          disabled={!isConnectionEstablished}
          isStreaming={isStreaming}
          setError={setError}
        />
      </div>
    </Card>
  );
}
