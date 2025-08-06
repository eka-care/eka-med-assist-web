import React, { useState, useRef, useEffect } from "react";
import { MessageBubble, MessageInput } from "../molecules";
import { cn } from "../atoms";

interface Message {
  id: string;
  text: string;
  sender: "user" | "bot";
  timestamp: Date;
}

interface ChatConversationProps {
  className?: string;
  onSendMessage?: (message: string) => void;
  messages?: Message[];
  isLoading?: boolean;
}

export const ChatConversation: React.FC<ChatConversationProps> = ({
  className,
  onSendMessage,
  messages: externalMessages,
  isLoading = false,
}) => {
  const [internalMessages, setInternalMessages] = useState<Message[]>([
    {
      id: "1",
      text: "Hello! I'm Apollo AI, your intelligent assistant. How can I help you today?",
      sender: "bot",
      timestamp: new Date(),
    },
  ]);

  const messages = externalMessages || internalMessages;
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = (messageText: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      text: messageText,
      sender: "user",
      timestamp: new Date(),
    };

    if (externalMessages && onSendMessage) {
      onSendMessage(messageText);
    } else {
      setInternalMessages((prev) => [...prev, newMessage]);

      // Simulate bot response
      setTimeout(() => {
        const botResponse: Message = {
          id: (Date.now() + 1).toString(),
          text: "Thanks for your message! I'm processing your request. This is a demo response.",
          sender: "bot",
          timestamp: new Date(),
        };
        setInternalMessages((prev) => [...prev, botResponse]);
      }, 1000);
    }
  };

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message.text}
            sender={message.sender}
            timestamp={message.timestamp}
          />
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 text-gray-900 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <div
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: "0.1s" }}
                />
                <div
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: "0.2s" }}
                />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <MessageInput
        onSendMessage={handleSendMessage}
        disabled={isLoading}
        placeholder="Type your message..."
      />
    </div>
  );
};
