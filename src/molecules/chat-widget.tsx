import { useState, useRef, useEffect } from "react";

import { ChatHeader } from "./chat-header";
import { MessageBubble } from "./message-bubble";
import { QuickActions } from "./quick-actions";
import { MessageInput } from "./message-input";
import { Card, ScrollArea } from "@ui/index";

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

  const [quickActions] = useState([
    { id: "doctor", label: "Help me find a doctor" },
    { id: "appointment", label: "I want to book appointment" },
    { id: "emergency", label: "I have an emergency" },
  ]);

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
    const newMessage: Message = {
      id: Date.now().toString(),
      content,
      isBot: false,
    };

    setMessages((prev) => [...prev, newMessage]);

    // Simulate bot response
    setTimeout(() => {
      const botResponse: Message = {
        id: (Date.now() + 1).toString(),
        content:
          "I understand you need assistance. Let me help you with that. Could you please provide more details about your specific needs?",
        isBot: true,
      };
      setMessages((prev) => [...prev, botResponse]);
    }, 1000);
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
    };

    setMessages((prev) => [...prev, newMessage]);
  };

  const handleQuickAction = (actionId: string) => {
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
              />
            ))}
          </div>
        </ScrollArea>

        {messages.length === 1 && (
          <QuickActions
            actions={quickActions}
            onActionClick={handleQuickAction}
          />
        )}

        <MessageInput
          onSendMessage={handleSendMessage}
          onVoiceMessage={handleVoiceMessage}
          onFileUpload={handleFileUpload}
        />
      </div>
    </Card>
  );
}
