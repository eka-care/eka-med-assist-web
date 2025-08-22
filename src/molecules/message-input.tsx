import { useState, useRef, useMemo, useEffect } from "react";
import { Mic, Send, Plus, Trash2, Check, Loader2 } from "lucide-react";
import { Button, Input, voiceListeningGif } from "@ui/index";
import { useAudioService } from "@/custom-hooks/useAudioService";
import formatTime from "@/utils/formatTime";
import useSessionStore from "@/stores/medAssistStore";
import type { AudioData } from "@/services/audioService";

interface MessageInputProps {
  onSendMessage: (message: string) => void;
  onFinalAudioStream: (audioData: AudioData) => void;
  onFileUpload: (files: FileList) => void;
  onInputChange?: (value: string) => void;
  onInputFocus?: () => void;
  onInputBlur?: () => void;
  onAudioStream?: (audioData: AudioData) => void;
  placeholder?: string;
  disabled?: boolean;
  isStreaming?: boolean;
  setError: (error: string) => void;
}

export function MessageInput({
  onSendMessage,
  onFinalAudioStream,
  onFileUpload,
  onInputChange,
  // onFocus,
  // onBlur,
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
  const [currentAudioData, setCurrentAudioData] = useState<AudioData | null>(
    null
  );
  const [isSending, setIsSending] = useState(false); // New state for send button loading
  const fileInputRef = useRef<HTMLInputElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isConnectionEstablished = useSessionStore(
    (state) => state.isConnectionEstablished
  );

  // AudioService hook - full MP3 audio with auto-pause
  const {
    isRecording,
    error: audioServiceError,
    recordingDuration,
    remainingTime,
    start,
    stop,
  } = useAudioService();

  // Reset sending state when streaming starts or stops
  useEffect(() => {
    if (isStreaming) {
      setIsSending(false); // Reset sending state when streaming starts
    }
  }, [isStreaming]);

  useEffect(() => {
    if (audioServiceError) {
      console.log("Audio error detected:", audioServiceError);
      setIsListening(false);
      setShowEndButton(false);
      setAudioError(audioServiceError.message);
      setError(audioServiceError.message);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }
  }, [audioServiceError, setError]);

  // Update recording time from the hook's duration tracking
  useEffect(() => {
    if (isRecording) {
      setRecordingTime(Math.floor(recordingDuration / 1000));
    }
  }, [recordingDuration, isRecording]);

  useEffect(() => {
    console.log("file uploads", uploadedFiles);
  }, [uploadedFiles]);

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

  // Check if input should be disabled (either disabled prop, streaming, or sending)
  const isInputDisabled =
    disabled || isStreaming || !isConnectionEstablished || isSending;

  // Start recording with AudioService
  const startRecording = async () => {
    try {
      console.log("Starting recording with AudioService");
      setShowEndButton(false);
      setRecordingTime(0);
      setCurrentAudioData(null);

      await start((audioData) => {
        console.log("Received full audio data:", audioData);
        setCurrentAudioData(audioData);

        if (onAudioStream) {
          console.log("Calling onAudioStream with full audio data");
          onAudioStream(audioData);
        }

        // Auto-pause will handle stopping, but we can also handle it here
        setIsAudioStreaming(true);
      });

      // Start timer for UI updates
      intervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Error starting recording:", error);
    }
  };

  // Stop recording manually
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
    setCurrentAudioData(null);
  };

  // Send recording with full audio data
  const sendRecording = async () => {
    try {
      setIsSending(true); // Disable send button

      if (currentAudioData) {
        console.log("Sending full audio data:", currentAudioData);
        await onFinalAudioStream(currentAudioData);
        setShowEndButton(false);
        setIsListening(false);
        setIsAudioStreaming(false);
        setCurrentAudioData(null);
      } else {
        console.warn("No audio data available to send");
        // Fallback: create empty audio data
        const emptyAudioData: AudioData = {
          audio: "",
          format: "audio/mp4",
          duration: 0,
          timestamp: Date.now(),
        };
        await onFinalAudioStream(emptyAudioData);
      }
    } catch (error) {
      console.error("Error sending recording:", error);
      setError("Failed to send audio message. Please try again.");
      // Fallback: create empty audio data
      const emptyAudioData: AudioData = {
        audio: "",
        format: "audio/mp4",
        duration: 0,
        timestamp: Date.now(),
      };
      await onFinalAudioStream(emptyAudioData);
    } finally {
      console.log("finally called in sendRecording and re-enabling send button");
      //setIsSending(false); // Re-enable send button
    }
  };

  const handleSend = async () => {
    console.log("called handle send", isStreaming);

    if (
      (message.trim() || uploadedFiles.length > 0 || isAudioStreaming) &&
      !disabled &&
      !isSending
    ) {
      try {
        setIsSending(true); // Disable send button immediately

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

        // Send audio if any
        if (isAudioStreaming) {
          console.log("called sendRecording in message-input-copy-v2");
          await sendRecording();
        }

        // Clear inputs
        setMessage("");
        setUploadedFiles([]);
        setShowEndButton(false);
        setIsListening(false);
      } catch (error) {
        console.error("Error in handleSend:", error);
        setError("Failed to send message. Please try again.");
      } finally {
        // Note: We don't set isSending to false here because:
        // 1. For text messages: The button will be re-enabled when streaming starts
        // 2. For audio/files: The button is re-enabled in sendRecording
        // This prevents double-clicking and provides better UX
      }
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
      // The useAudioService hook manages its own cleanup
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
          onClick={cancelRecording}
          disabled={isSending}>
          <Trash2 className="h-4 w-4" />
        </Button>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 hover:bg-[var(--color-accent)] flex-shrink-0"
          onClick={handleFileClick}
          disabled={isInputDisabled}>
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
                {showEndButton
                  ? isSending
                    ? "Sending message..."
                    : "Recording Paused"
                  : "Listening..."}
              </span>
            )}
          </div>
        ) : (
          <div className="relative w-full">
            <Input
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                onInputChange?.(e.target.value);
              }}
              onKeyPress={handleKeyPress}
              // onFocus={onFocus}
              // onBlur={onBlur}
              placeholder={
                isStreaming
                  ? "Please wait for response..."
                  : isSending
                  ? "Sending message..."
                  : placeholder
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
                className={`flex items-center gap-1 bg-[var(--color-accent)] text-[var(--color-primary)] px-2 py-1 rounded-md text-xs max-w-32 ${
                  isSending ? "opacity-50" : ""
                }`}>
                <span className="truncate">{file.name}</span>
                <button
                  onClick={() =>
                    setUploadedFiles((prev) =>
                      prev.filter((_, i) => i !== index)
                    )
                  }
                  className="text-[var(--color-primary)] hover:text-[var(--color-primary)]/80 ml-1"
                  disabled={isSending}>
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Timer and Remaining Time */}
      {(isListening || isRecording || showEndButton) && (
        <div className="flex flex-col items-end text-sm font-mono text-[var(--color-primary)]">
          <span className={isSending ? "opacity-50" : ""}>
            {formatTime(recordingTime)}
          </span>
          {isRecording && remainingTime > 0 && (
            <span
              className={`text-xs text-orange-600 ${
                isSending ? "opacity-50" : ""
              }`}>
              {Math.floor(remainingTime / 60000)}:
              {(Math.floor(remainingTime / 1000) % 60)
                .toString()
                .padStart(2, "0")}
            </span>
          )}
        </div>
      )}

      {/* Voice Recording Controls */}
      {isListening || isRecording || showEndButton ? (
        <div className="flex items-center gap-2">
          {showEndButton ? (
            <Button
              size="sm"
              className="h-8 w-8 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 flex-shrink-0 rounded-full"
              onClick={handleSend}
              disabled={isInputDisabled || isSending}>
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin text-[var(--color-primary-foreground)]" />
              ) : (
                <Send className="h-4 w-4 text-[var(--color-primary-foreground)]" />
              )}
            </Button>
          ) : (
            <Button
              size="sm"
              className="h-8 w-8 p-0 bg-blue-500 hover:bg-blue-600 flex-shrink-0 rounded-full"
              onClick={handleMicClick}
              disabled={isSending}>
              <Check className="h-4 w-4 white" />
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
            disabled={disabled || isStreaming || !!audioError || isSending}>
            <Mic className="h-4 w-4 text-[var(--color-primary)]" />
          </Button>

          {hasContent && (
            <Button
              size="sm"
              className="h-8 w-8 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 flex-shrink-0 rounded-full"
              onClick={handleSend}
              disabled={isInputDisabled || isSending}>
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin text-[var(--color-primary-foreground)]" />
              ) : (
                <Send className="h-4 w-4 text-[var(--color-primary-foreground)]" />
              )}
            </Button>
          )}
        </>
      )}
    </div>
  );
}
