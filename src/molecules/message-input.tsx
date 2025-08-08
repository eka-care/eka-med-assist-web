import { useState, useRef, useMemo } from "react";

import { Mic, Send, Plus, Paperclip } from "lucide-react";
import { VoiceRecorder } from "./voice-recorder";
import { Button, Input } from "@ui/index";

interface MessageInputProps {
  onSendMessage: (message: string) => void;
  onVoiceMessage: (audioBlob: Blob) => void;
  onFileUpload: (files: FileList) => void;
  onInputChange?: (value: string) => void;
  onInputFocus?: () => void;
  onInputBlur?: () => void;
  placeholder?: string;
  disabled?: boolean;
}

export function MessageInput({
  onSendMessage,
  onVoiceMessage,
  onFileUpload,
  onInputChange,
  onInputFocus,
  onInputBlur,
  placeholder = "Message Apollo Assist...",
  disabled = false,
}: MessageInputProps) {
  const [message, setMessage] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    if ((message.trim() || uploadedFiles.length > 0) && !disabled) {
      // Send text message
      onSendMessage(message.trim());

      // Send files if any
      if (uploadedFiles.length > 0) {
        const fileList = new DataTransfer();
        uploadedFiles.forEach((file) => fileList.items.add(file));
        onFileUpload(fileList.files);
      }

      setMessage("");
      setUploadedFiles([]);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Check if there's any content to send
  const hasContent = useMemo(() => {
    return message.trim() || uploadedFiles.length > 0;
  }, [message, uploadedFiles]);

  const handleVoiceRecording = (audioBlob: Blob) => {
    onVoiceMessage(audioBlob);
    setIsRecording(false);
  };

  const handleCancelRecording = () => {
    setIsRecording(false);
  };

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      setUploadedFiles((prev) => [...prev, ...files]);
      e.target.value = ""; // Reset input
    }
  };

  if (isRecording) {
    return (
      <VoiceRecorder
        onRecordingComplete={handleVoiceRecording}
        onCancel={handleCancelRecording}
      />
    );
  }

  return (
    <div className="flex items-center gap-2 px-4 py-1 bg-[var(--color-input)] rounded-full border border-[var(--color-primary)] mx-4">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
        onChange={handleFileChange}
        className="hidden"
      />

      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0 hover:bg-[var(--color-accent)] flex-shrink-0"
        onClick={handleFileClick}
        disabled={disabled}>
        <Plus className="h-4 w-4 text-[var(--color-primary)]" />
      </Button>

      <div className="flex-1 relative">
        <Input
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
            onInputChange?.(e.target.value);
          }}
          onKeyPress={handleKeyPress}
          onFocus={onInputFocus}
          onBlur={onInputBlur}
          placeholder={placeholder}
          disabled={disabled}
          className="border-0 shadow-none focus-visible:ring-0 text-sm"
        />

        {/* File Preview */}
        {uploadedFiles.length > 0 && (
          <div className="absolute -top-8 left-0 right-0 flex flex-wrap gap-1">
            {uploadedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-1 bg-[var(--color-accent)] text-[var(--color-primary)] px-2 py-1 rounded-md text-xs max-w-32">
                <span className="truncate">{file.name}</span>
                <button
                  onClick={() =>
                    setUploadedFiles((prev) =>
                      prev.filter((_, i) => i !== index)
                    )
                  }
                  className="text-[var(--color-primary)] hover:text-[var(--color-primary)]/80 ml-1">
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0 hover:bg-[var(--color-accent)] flex-shrink-0"
        onClick={() => setIsRecording(true)}
        disabled={disabled}>
        <Mic className="h-4 w-4 text-[var(--color-primary)]" />
      </Button>

      {hasContent && (
        <Button
          size="sm"
          className="h-8 w-8 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 flex-shrink-0"
          onClick={handleSend}
          disabled={disabled}>
          <Send className="h-4 w-4 text-[var(--color-primary-foreground)]" />
        </Button>
      )}
    </div>
  );
}
