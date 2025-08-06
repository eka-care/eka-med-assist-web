import React from "react";
import { cn } from "../atoms";

interface ChatHeaderProps {
  title?: string;
  subtitle?: string;
  avatar?: string;
  online?: boolean;
  className?: string;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  title = "Apollo AI Chat",
  subtitle = "Your AI assistant",
  avatar,
  online = true,
  className,
}) => {
  return (
    <header
      className={cn("bg-white border-b border-gray-200 px-6 py-4", className)}>
      <div className="flex items-center gap-4">
        {avatar ? (
          <div className="relative">
            <img
              src={avatar}
              alt="AI Assistant"
              className="w-10 h-10 rounded-full object-cover"
            />
            {online && (
              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
            )}
          </div>
        ) : (
          <div className="relative">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <span className="text-white font-semibold text-sm">AI</span>
            </div>
            {online && (
              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
            )}
          </div>
        )}

        <div className="flex-1">
          <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
          <p className="text-sm text-gray-500 flex items-center gap-2">
            <span>{subtitle}</span>
            {online && (
              <>
                <span className="w-1 h-1 bg-green-500 rounded-full" />
                <span className="text-green-600">Online</span>
              </>
            )}
          </p>
        </div>
      </div>
    </header>
  );
};
