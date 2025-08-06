import React, { useState } from "react";
import { ShadCnButton, cn } from "../atoms";

interface MessageInputProps {
  onSendMessage: (message: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  placeholder = "Type your message...",
  disabled = false,
  className,
}) => {
  const [inputText, setInputText] = useState("");

  const handleSendMessage = () => {
    if (inputText.trim() && !disabled) {
      onSendMessage(inputText.trim());
      setInputText("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div
      className={cn(
        "flex items-end gap-3 p-4 bg-white border-t border-gray-200",
        className
      )}>
      <div className="flex-1 relative">
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            "w-full min-h-[44px] max-h-32 px-4 py-3 border border-gray-300 rounded-2xl",
            "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
            "resize-none placeholder-gray-400",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
          rows={1}
        />
      </div>
      <ShadCnButton
        onClick={handleSendMessage}
        disabled={!inputText.trim() || disabled}
        size="lg"
        className="px-6 rounded-2xl">
        Send
      </ShadCnButton>
    </div>
  );
};
