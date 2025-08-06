import React from "react";
import { ChatHeader } from "../molecules";
import { ChatConversation } from "../organisms";
import { cn } from "../atoms";

interface ChatScreenProps {
  className?: string;
  title?: string;
  subtitle?: string;
  avatar?: string;
  onSendMessage?: (message: string) => void;
  messages?: any[];
  isLoading?: boolean;
}

export const ChatScreen: React.FC<ChatScreenProps> = ({
  className,
  title = "Apollo AI Chat",
  subtitle = "Your intelligent assistant",
  avatar,
  onSendMessage,
  messages,
  isLoading,
}) => {
  return (
    <div className={cn("flex flex-col h-screen bg-white", className)}>
      {/* Header */}
      <ChatHeader
        title={title}
        subtitle={subtitle}
        avatar={avatar}
        online={true}
      />

      {/* Chat Conversation */}
      <div className="flex-1 overflow-hidden">
        <ChatConversation
          onSendMessage={onSendMessage}
          messages={messages}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
};
