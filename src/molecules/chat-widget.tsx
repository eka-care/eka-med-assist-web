import { useState, useRef, useEffect } from "react";

import { ChatHeader } from "./chat-header";
import { MessageBubble } from "./message-bubble";
import { Card, ScrollArea } from "@ui/index";
import { MessageInput } from "./message-input";
import useSessionStore from "@/stores/medAssistStore";
import { useSocketIO } from "@/hooks/useSocketIO";
import type { SocketIOConfig } from "@/services/SocketIOService";

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
  const sessionId = useSessionStore((state) => state.sessionId);
  const sessionToken = useSessionStore((state) => state.sessionToken);
  const isSocketIOConnected = useSessionStore(
    (state) => state.isSocketIOConnected
  );
  const isConnectionEstablished = useSessionStore(
    (state) => state.isConnectionEstablished
  );

  // Create socket configuration when session data is available
  const socketConfig: SocketIOConfig | null =
    sessionId && sessionToken
      ? {
          sessionId,
          auth: { token: sessionToken },
        }
      : null;

  // Use Socket.IO hook
  const {
    socketService,
    sendPing,
    sendChatMessage,
    sendFileUploadRequest,
    sendFileUploadComplete,
    isStreaming,
  } = useSocketIO(socketConfig);

  const [quickActions] = useState([
    { id: "doctor", label: "Help me find a doctor" },
    { id: "appointment", label: "I want to book appointment" },
    { id: "emergency", label: "I have an emergency" },
  ]);

  useEffect(() => {
    if (socketService && isConnectionEstablished) {
      console.log("Socket.IO connection ready for chat");
    }
  }, [socketService, isConnectionEstablished]);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

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
  }, [messages]);

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

    const newMessage: Message = {
      id: Date.now().toString(),
      content,
      isBot: false,
    };

    setMessages((prev) => [...prev, newMessage]);
    // // Simulate bot response
    // setTimeout(() => {
    //     const botResponse: Message = {
    //       id: (Date.now() + 1).toString(),
    //       content:
    //         "I understand you need assistance. Let me help you with that. Could you please provide more details about your specific needs?",
    //       isBot: true,
    //     };
    //     setMessages((prev) => [...prev, botResponse]);
    //   }, 1000);
    // Send message via Socket.IO
    if (isConnectionEstablished) {
      sendChatMessage(content);
    } else {
      console.log("Socket not connected, cannot send message");
    }
  };

  const handleVoiceMessage = (audioBlob: Blob) => {
    // Block voice if currently streaming
    if (isStreaming) {
      console.log("Cannot send voice while streaming");
      return;
    }

    console.log("Voice message received:", audioBlob);
    // TODO: Implement audio streaming via Socket.IO
    handleSendMessage("Voice message received");
  };

  const handleFileUpload = (files: FileList) => {
    // Block file upload if currently streaming
    if (isStreaming) {
      console.log("Cannot upload file while streaming");
      return;
    }

    const fileArray = Array.from(files);
    const fileNames = fileArray.map((f) => f.name).join(", ");

    const newMessage: Message = {
      id: Date.now().toString(),
      content: `Uploaded files: ${fileNames}`,
      isBot: false,
      files: fileArray,
    };

    setMessages((prev) => [...prev, newMessage]);

    // Send file upload request via Socket.IO
    if (isConnectionEstablished) {
      sendFileUploadRequest();
      // TODO: Handle S3 upload and completion
    } else {
      console.log("Socket not connected, cannot upload file");
    }
  };

  const handleQuickAction = (actionId: string) => {
    // Block quick actions if currently streaming
    if (isStreaming) {
      console.log("Cannot use quick action while streaming");
      return;
    }

    const action = quickActions.find((a) => a.id === actionId);
    if (action) {
      handleSendMessage(action.label);
    }
  };

  const handleMenuAction = (action: string) => {
    if (action === "clear") {
      setMessages([messages[0]]);
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
      />

      {/* Single timestamp at top */}
      <div className="text-xs text-[var(--color-muted-foreground)] text-center">
        {getCurrentTimestamp()}
      </div>

      <div className={`${chatHeight} flex flex-col overflow-hidden`}>
        <ScrollArea ref={scrollAreaRef} className="flex-1 min-h-0">
          <div className="space-y-1">
            
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message.content}
                isBot={message.isBot}
                showActions={messages.length === 1}
                handleQuickAction={handleQuickAction}
                quickActions={quickActions}
                isQuickActionsDisabled={!isConnectionEstablished || isStreaming}
              />
            ))}
          </div>
        </ScrollArea>

        

        {/* Connection Status */}
        {!isConnectionEstablished && (
          <div className="px-4 py-2 text-center text-sm text-orange-600 bg-orange-50 border-t">
            {!sessionId || !sessionToken
              ? "Waiting for session..."
              : !isSocketIOConnected
              ? "Connecting to server..."
              : "Establishing connection..."}
          </div>
        )}

        {/* Streaming Status */}
        {isStreaming && (
          <div className="px-4 py-2 text-center text-sm text-blue-600 bg-blue-50 border-t">
            <div className="flex items-center justify-center gap-2">
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
              <span>Bot is responding...</span>
            </div>
          </div>
        )}

        {/* Test PING when connected */}
        {isConnectionEstablished && !isStreaming && (
          <div className="px-4 py-2 text-center text-sm text-green-600 bg-green-50 border-t">
            <span>Connected! </span>
            <button
              onClick={sendPing}
              className="ml-2 px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700">
              Test PING
            </button>
          </div>
        )}

        <MessageInput
          onSendMessage={handleSendMessage}
          onVoiceMessage={handleVoiceMessage}
          onFileUpload={handleFileUpload}
            // disabled={!isConnectionEstablished}
          isStreaming={isStreaming}
        />
      </div>
    </Card>
  );
}
