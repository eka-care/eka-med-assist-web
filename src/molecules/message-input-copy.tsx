import { useState, useRef, useMemo, useEffect } from "react";
import { Mic, Send, Plus, Trash2, Check } from "lucide-react";
import { Button, Input, voiceListeningGif } from "@ui/index";
import { useAudioChunking } from "@/custom-hooks/useAudioChunking";
import formatTime from "@/utils/formatTime";
import useSessionStore from "@/stores/medAssistStore";

interface MessageInputProps {
  onSendMessage: (message: string) => void;
  onFinalAudioStream: (audioBlob: Blob) => void;
  onFileUpload: (files: FileList) => void;
  onInputChange?: (value: string) => void;
  onInputFocus?: () => void;
  onInputBlur?: () => void;
  onAudioStream?: (audioBlob: Blob) => void;
  placeholder?: string;
  disabled?: boolean;
  isStreaming?: boolean;
  setError: (error: string) => void;
}

export function MessageInputCopy({
  onSendMessage,
  onFinalAudioStream,
  onFileUpload,
  onInputChange,
  // onInputFocus,
  // onInputBlur,
  onAudioStream,
  placeholder = "Message Apollo Assist...",
  disabled = false,
  isStreaming = false,
  setError,
}: MessageInputProps) {
  const [message, setMessage] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isAudioStreaming, setIsAudioStreaming] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showEndButton, setShowEndButton] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [audioError, setAudioError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isConnectionEstablished = useSessionStore(
    (state) => state.isConnectionEstablished
  );
  // Clean audio hook - only what we need
  const {
    isRecording,
    error: audioChunkingError,
    start,
    stop,
  } = useAudioChunking();

  useEffect(() => {
    if (audioChunkingError) {
      console.log("Audio error detected:", audioChunkingError);
      setIsListening(false);
      setShowEndButton(false);
      setAudioError(audioChunkingError.message);
      setError(audioChunkingError.message);
      // setRecordingTime(0);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }
  }, [audioChunkingError]);

  const checkMicrophonePermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      setAudioError(null); // Clear any previous errors
      console.log("Microphone permission granted, error cleared");
    } catch (error) {
      if (error instanceof DOMException && error.name === "NotAllowedError") {
        console.log("Microphone permission denied");
        // Check if it's blocked or just not granted yet
        const permissionState = await checkCurrentPermissionState();
        console.log("Permission state:", permissionState);
        if (permissionState === "denied") {
          const errorMsg =
            "Microphone access is blocked. You'll need to manually enable it in your browser settings.";
          console.log("Setting error:", errorMsg);
          setError(errorMsg);
        } else {
          const errorMsg =
            "Microphone access denied. Please allow microphone permissions when prompted.";
          console.log("Setting error:", errorMsg);
          setError(errorMsg);
        }
      } else {
        console.error("Error checking microphone permission:", error);
        const errorMsg =
          "Unable to access microphone. Please check your device and try again.";
        console.log("Setting error:", errorMsg);
        setError(errorMsg);
      }
    }
  };

  const checkCurrentPermissionState = async () => {
    try {
      const permission = await navigator.permissions.query({
        name: "microphone" as PermissionName,
      });
      return permission.state;
    } catch (error) {
      console.log("Could not check permission state:", error);
      return "unknown";
    }
  };
  // Check if there's any content to send
  const hasContent = useMemo(() => {
    return message.trim() || uploadedFiles.length > 0;
  }, [message, uploadedFiles]);

  // Check if input should be disabled (either disabled prop or streaming)
  const isInputDisabled = disabled || isStreaming || !isConnectionEstablished;

  // Start recording
  const startRecording = async () => {
    try {
      console.log("called on startRecording in message-input-copy");
      setShowEndButton(false);
      setRecordingTime(0);
      await start((uint8Array) => {
        if (onAudioStream) {
          console.log("Recieved chunk", uint8Array);
          setIsAudioStreaming(true);

          const blob = new Blob([uint8Array], { type: "audio/raw" });
          console.log("called on Audio stream");
          onAudioStream(blob);
        }
      });

      // Start timer
      intervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 100);
    } catch (error) {
      console.error("Error starting recording:", error);
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    setShowEndButton(true);
    stop();
  };

  // Cancel recording
  const cancelRecording = () => {
    stop();
    setShowEndButton(false);
    setIsListening(false);
  };

  // Send recording
  const sendRecording = () => {
    try {
      // For end-of-stream, we can send an empty blob or last chunk
      const emptyBlob = new Blob([], { type: "audio/raw" });
      onFinalAudioStream(emptyBlob);
      console.log("called on Final audio stream");
      setShowEndButton(false);
      setIsListening(false);
      setIsAudioStreaming(false);
    } catch (error) {
      console.error("Error sending recording:", error);
      // Fallback: create empty blob
      const emptyBlob = new Blob([], { type: "audio/raw" });
      onFinalAudioStream(emptyBlob);
    }
  };

  const handleSend = () => {
    console.log("called handle send", isStreaming);

    if (
      (message.trim() || uploadedFiles.length > 0 || isAudioStreaming) &&
      !disabled
    ) {
      // Send text message
      if (message.trim()) {
        onSendMessage(message.trim());
      }

      // Send files if any
      if (uploadedFiles.length > 0) {
        const fileList = new DataTransfer();
        uploadedFiles.forEach((file) => fileList.items.add(file));
        onFileUpload(fileList.files);
      }

      // // Send audio if any
      // if (getBufferedAudio().length > 0) {
      //   sendRecording();
      // }

      if (isAudioStreaming) {
        console.log("called sendRecording in message-input-copy");

        sendRecording();
      }

      setMessage("");
      setUploadedFiles([]);
      setShowEndButton(false);
      setIsListening(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleMicClick = () => {
    if (!isListening && !isRecording) {
      // Check microphone permissions first
      checkMicrophonePermission().then(() => {
        if (!audioError) {
          setIsListening(true);
          startRecording();
        }
      });
    } else if (isRecording) {
      stopRecording();
    }
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      // The useAudioChunking hook manages its own cleanup
    };
  }, []);

  return (
    <div className="flex items-center gap-2 px-4 py-1 bg-[var(--color-background)] rounded-full border border-[var(--color-primary)] mx-4">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
        onChange={handleFileChange}
        className="hidden"
      />

      {isListening || isRecording ? (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-red-600 hover:bg-red-100 flex-shrink-0"
          onClick={cancelRecording}>
          <Trash2 className="h-4 w-4" />
        </Button>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 hover:bg-[var(--color-accent)] flex-shrink-0"
          onClick={handleFileClick}
          disabled={disabled}>
          <Plus className="h-4 w-4 text-[var(--color-primary)]" />
        </Button>
      )}

      <div className="flex-1 relative">
        {isListening || isRecording || showEndButton ? (
          <div className="flex items-center justify-center px-3 py-2">
            {isRecording ? (
              <div className="relative">
                <img
                  src={voiceListeningGif}
                  alt="Voice listening"
                  className="h-6 w-56"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-transparent pointer-events-none">
                  <div className="absolute left-0 top-0 w-4 h-full bg-gradient-to-r from-white to-transparent"></div>
                  <div className="absolute right-0 top-0 w-4 h-full bg-gradient-to-l from-white to-transparent"></div>
                </div>
              </div>
            ) : (
              <span className="text-sm text-[var(--color-primary)]">
                {showEndButton ? "Recording Paused" : "Listening..."}
              </span>
            )}
          </div>
        ) : (
          <div className="relative w-full">
            {/* Streaming indicator */}
            {/* {isStreaming && (
              <div className="absolute -top-6 left-0 right-0 flex items-center gap-2 text-xs text-blue-600">
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                <span>Streaming response...</span>
              </div>
            )} */}
            <Input
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                onInputChange?.(e.target.value);
              }}
              onKeyPress={handleKeyPress}
              // onFocus={onInputFocus}
              // onBlur={onInputBlur}
              placeholder={
                isStreaming ? "Please wait for response..." : placeholder
              }
              disabled={isInputDisabled}
              className="border-0 shadow-none focus-visible:ring-0 focus-visible:outline-none focus-visible:border-0 focus-visible:ring-transparent focus-visible:ring-offset-0 text-sm"
            />
          </div>
        )}

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

      {/* Timer */}
      {(isListening || isRecording || showEndButton) && (
        <span className="text-sm font-mono text-[var(--color-primary)]">
          {formatTime(Math.floor(recordingTime / 10))}
        </span>
      )}

      {/* Voice Recording Controls */}
      {isListening || isRecording || showEndButton ? (
        <div className="flex items-center gap-2">
          {showEndButton ? (
            <Button
              size="sm"
              className="h-8 w-8 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 flex-shrink-0 rounded-full"
              onClick={handleSend}
              disabled={isInputDisabled}>
              <Send className="h-4 w-4 text-[var(--color-primary-foreground)]" />
            </Button>
          ) : (
            <Button
              size="sm"
              className="h-8 w-8 p-0 bg-blue-500 hover:bg-blue-600 flex-shrink-0 rounded-full"
              onClick={handleMicClick}>
              <Check className="h-4 w-4 text-white" />
            </Button>
          )}
        </div>
      ) : (
        <>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-[var(--color-accent)] flex-shrink-0"
            onClick={handleMicClick}
            disabled={disabled || isStreaming || !!audioError}>
            <Mic className="h-4 w-4 text-[var(--color-primary)]" />
          </Button>

          {hasContent && (
            <Button
              size="sm"
              className="h-8 w-8 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 flex-shrink-0 rounded-full"
              onClick={handleSend}
              disabled={isInputDisabled}>
              <Send className="h-4 w-4 text-[var(--color-primary-foreground)]" />
            </Button>
          )}
        </>
      )}
    </div>
  );
}
