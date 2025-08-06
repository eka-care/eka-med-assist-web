import React from "react";
import { cn } from "../atoms";

interface MessageBubbleProps {
  message: string;
  sender: "user" | "bot";
  timestamp: Date;
  className?: string;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  sender,
  timestamp,
  className,
}) => {
  const isUser = sender === "user";

  return (
    <div
      className={cn(
        "flex w-full",
        isUser ? "justify-end" : "justify-start",
        className
      )}>
      <div
        className={cn(
          "max-w-xs lg:max-w-md px-4 py-3 rounded-2xl shadow-sm",
          isUser
            ? "bg-blue-600 text-white rounded-br-md"
            : "bg-gray-100 text-gray-900 rounded-bl-md"
        )}>
        <p className="text-sm leading-relaxed">{message}</p>
        <p
          className={cn(
            "text-xs mt-2 opacity-70",
            isUser ? "text-blue-100" : "text-gray-500"
          )}>
          {timestamp.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
    </div>
  );
};
