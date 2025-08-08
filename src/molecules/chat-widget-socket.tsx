import { useState, useRef, useEffect } from "react";
import { useSocketIO, useTypingIndicator } from "../hooks/useSocketIO";
import type { SocketIOConfig } from "../types/socket";

import { ChatHeader } from "./chat-header";
import { MessageBubble } from "./message-bubble";
import { QuickActions } from "./quick-actions";
import { MessageInput } from "./message-input";
import { Card, ScrollArea, Button } from "@ui/index";
import { Wifi, WifiOff, AlertCircle, RefreshCw } from "lucide-react";

interface Message {
  id: string;
  content: string;
  isBot: boolean;
  files?: File[];
  timestamp?: Date;
}

interface ChatWidgetSocketProps {
  title?: string;
  className?: string;
  onClose?: () => void;
  onExpand?: () => void;
  isExpanded?: boolean;
  isMobile?: boolean;
  socketConfig: SocketIOConfig;
  welcomeMessage?: string;
  showConnectionStatus?: boolean;
}

export function ChatWidgetSocket({
  title = "Apollo Assist",
  className = "",
  onClose,
  onExpand,
  isExpanded = false,
  isMobile = false,
  socketConfig,
  welcomeMessage = "Hi, I'm Apollo Assist, your personal support for all medical needs. How can I help you?",
  showConnectionStatus = true,
}: ChatWidgetSocketProps) {
  const [localMessages, setLocalMessages] = useState<Message[]>([
    {
      id: "1",
      content: welcomeMessage,
      isBot: true,
      timestamp: new Date(),
    },
  ]);

  const [quickActions] = useState([
    { id: "doctor", label: "Help me find a doctor" },
    { id: "appointment", label: "I want to book appointment" },
    { id: "emergency", label: "I have an emergency" },
  ]);

  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Socket.IO integration
  const {
    isConnected,
    connectionState,
    isConnecting,
    isReconnecting,
    messages: socketMessages,
    sendMessage,
    typingUsers,
    sendTypingIndicator,
    error,
    clearError,
    connect,
    reconnect,
  } = useSocketIO({
    config: socketConfig,
    autoConnect: true,
    maxMessages: 100,
    enableTypingIndicator: true,
    enableUserStatus: false,
    enableRoomManagement: false,
  });

  // Typing indicator hook
  const { startTyping, stopTyping } = useTypingIndicator(
    sendTypingIndicator,
    500
  );

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector(
        "[data-radix-scroll-area-viewport]"
      );
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [localMessages, socketMessages]);

  // Sync socket messages with local messages
  useEffect(() => {
    if (socketMessages.length > 0) {
      const newMessages = socketMessages.map((msg) => ({
        id: msg.id,
        content: msg.content,
        isBot: msg.sender === "bot" || msg.sender === "system",
        timestamp: msg.timestamp,
      }));

      setLocalMessages((prev) => {
        // Filter out duplicate messages
        const existingIds = new Set(prev.map((m) => m.id));
        const uniqueNewMessages = newMessages.filter(
          (msg) => !existingIds.has(msg.id)
        );
        return [...prev, ...uniqueNewMessages];
      });
    }
  }, [socketMessages]);

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
    if (!content.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      content,
      isBot: false,
      timestamp: new Date(),
    };

    setLocalMessages((prev) => [...prev, newMessage]);

    // Send via Socket.IO if connected
    if (isConnected) {
      sendMessage(content, "text");
    } else {
      // Fallback: simulate bot response when offline
      setTimeout(() => {
        const botResponse: Message = {
          id: (Date.now() + 1).toString(),
          content:
            "I'm currently offline. Please check your connection and try again.",
          isBot: true,
          timestamp: new Date(),
        };
        setLocalMessages((prev) => [...prev, botResponse]);
      }, 1000);
    }
  };

  const handleVoiceMessage = (audioBlob: Blob) => {
    console.log("Voice message received:", audioBlob);
    handleSendMessage("Voice message received");
  };

  const handleFileUpload = (files: FileList) => {
    const fileArray = Array.from(files);
    const fileNames = fileArray.map((f) => f.name).join(", ");

    const newMessage: Message = {
      id: Date.now().toString(),
      content: `Uploaded files: ${fileNames}`,
      isBot: false,
      files: fileArray,
      timestamp: new Date(),
    };

    setLocalMessages((prev) => [...prev, newMessage]);
  };

  const handleQuickAction = (actionId: string) => {
    const action = quickActions.find((a) => a.id === actionId);
    if (action) {
      handleSendMessage(action.label);
    }
  };

  const handleMenuAction = (action: string) => {
    if (action === "clear") {
      setLocalMessages([localMessages[0]]);
    }
  };

  const handleInputChange = (value: string) => {
    if (value.length > 0) {
      startTyping();
    } else {
      stopTyping();
    }
  };

  const handleInputFocus = () => {
    startTyping();
  };

  const handleInputBlur = () => {
    stopTyping();
  };

  const getConnectionStatusIcon = () => {
    if (isConnecting || isReconnecting) {
      return <RefreshCw className="h-4 w-4 animate-spin text-yellow-500" />;
    }
    if (isConnected) {
      return <Wifi className="h-4 w-4 text-green-500" />;
    }
    return <WifiOff className="h-4 w-4 text-red-500" />;
  };

  const getConnectionStatusText = () => {
    if (isConnecting) return "Connecting...";
    if (isReconnecting) return "Reconnecting...";
    if (isConnected) return "Connected";
    return "Disconnected";
  };

  // Mobile full-screen styles
  const containerStyles = isMobile
    ? "fixed inset-0 z-50 bg-[var(--color-card)] flex flex-col h-screen w-screen"
    : isExpanded
    ? "fixed inset-4 z-50 bg-[var(--color-card)] rounded-lg shadow-2xl flex flex-col max-h-[calc(100vh-2rem)]"
    : `w-full max-w-sm bg-[var(--color-card)] shadow-lg rounded-lg ${className}`;

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
      />

      {/* Connection Status */}
      {showConnectionStatus && (
        <div className="px-4 py-2 border-b border-[var(--color-border)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getConnectionStatusIcon()}
              <span className="text-xs text-[var(--color-muted-foreground)]">
                {getConnectionStatusText()}
              </span>
            </div>
            {!isConnected && (
              <Button
                variant="ghost"
                size="sm"
                onClick={reconnect}
                className="h-6 px-2 text-xs"
                disabled={isConnecting || isReconnecting}>
                Retry
              </Button>
            )}
          </div>
          {error && (
            <div className="flex items-center gap-1 mt-1 text-xs text-red-500">
              <AlertCircle className="h-3 w-3" />
              <span>{error.message}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearError}
                className="h-4 px-1 text-xs">
                ×
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Single timestamp at top */}
      <div className="text-xs text-[var(--color-muted-foreground)] text-center py-1">
        {getCurrentTimestamp()}
      </div>

      <div className={`${chatHeight} flex flex-col overflow-hidden`}>
        <ScrollArea ref={scrollAreaRef} className="flex-1 min-h-0">
          <div className="space-y-1">
            {localMessages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message.content}
                isBot={message.isBot}
              />
            ))}
          </div>

          {/* Typing Indicators */}
          {typingUsers.length > 0 && (
            <div className="px-4 py-2">
              <div className="flex items-center gap-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-[var(--color-muted-foreground)] rounded-full animate-bounce"></div>
                  <div
                    className="w-2 h-2 bg-[var(--color-muted-foreground)] rounded-full animate-bounce"
                    style={{ animationDelay: "0.1s" }}></div>
                  <div
                    className="w-2 h-2 bg-[var(--color-muted-foreground)] rounded-full animate-bounce"
                    style={{ animationDelay: "0.2s" }}></div>
                </div>
                <span className="text-xs text-[var(--color-muted-foreground)]">
                  {typingUsers.length === 1
                    ? `${typingUsers[0].username} is typing...`
                    : `${typingUsers.length} people are typing...`}
                </span>
              </div>
            </div>
          )}
        </ScrollArea>

        {localMessages.length === 1 && (
          <QuickActions
            actions={quickActions}
            onActionClick={handleQuickAction}
          />
        )}

        <MessageInput
          onSendMessage={handleSendMessage}
          onVoiceMessage={handleVoiceMessage}
          onFileUpload={handleFileUpload}
          onInputChange={handleInputChange}
          onInputFocus={handleInputFocus}
          onInputBlur={handleInputBlur}
          disabled={!isConnected && !isConnecting}
          placeholder={
            isConnected ? "Message Apollo Assist..." : "Connecting..."
          }
        />
      </div>
    </Card>
  );
}
