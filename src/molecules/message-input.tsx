import { useState, useRef, useMemo, useEffect, useCallback } from "react";
import { Mic, Send, Plus, Trash2, Check, Loader2 } from "lucide-react";
import { Button, Input, voiceListeningGif } from "@ui/index";
import { useAudioService } from "@/custom-hooks/useAudioService";
import formatTime from "@/utils/formatTime";
import useSessionStore from "@/stores/medAssistStore";
import type { AudioData } from "@/services/audioService";
import { ErrorMessageUI } from "@/types/socket";

// Constants
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB in bytes

enum RECODING_PHASE {
  IDLE = "idle",
  PROCESSING = "processing",
  TRANSCRIBING = "transcribing",
}
// Helper function to format file size
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

interface MessageInputProps {
  onSendMessage: (message: string) => void;
  onFinalAudioStream: (audioData: AudioData) => void;
  onFileUpload: (files: FileList, message?: string) => void;
  onInputChange?: (value: string) => void;
  onInputFocus?: () => void;
  onInputBlur?: () => void;
  inlineText?: string;
  placeholder?: string;
  disabled?: boolean;
  setError: (error: ErrorMessageUI) => void;
}

export function MessageInput({
  onSendMessage,
  onFinalAudioStream,
  onFileUpload,
  onInputChange,
  inlineText,
  placeholder = "Message Apollo Assist...",
  disabled = false,
  setError,
}: MessageInputProps) {
  const [message, setMessage] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isAudioStreaming, setIsAudioStreaming] = useState(false);
  const [recordingPhase, setRecordingPhase] = useState<RECODING_PHASE>(
    RECODING_PHASE.IDLE
  );
  const [recordingTime, setRecordingTime] = useState(0);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [currentAudioData, setCurrentAudioData] = useState<AudioData | null>(
    null
  );
  const [isSending, setIsSending] = useState(false); // New state for send button loading
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isConnectionEstablished = useSessionStore(
    (state) => state.isConnectionEstablished
  );
  const isStreaming = useSessionStore((state) => state.isStreaming);
  const error = useSessionStore((state) => state.error);
  const {
    isRecording,
    error: audioServiceError,
    recordingDuration,
    start,
    stop,
    cancel,
    reinitialize,
  } = useAudioService();

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      // The useAudioService hook manages its own cleanup
    };
  }, []);

  // Reset sending state when streaming starts or stops
  useEffect(() => {
    console.log("isStreaming from input", isStreaming);
    if (isStreaming || error) {
      setIsSending(false); // Reset sending state when streaming starts
    }
    if (
      !isStreaming &&
      !disabled &&
      isConnectionEstablished &&
      messageInputRef.current
    ) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        console.log("Focusing input now");
        messageInputRef.current?.focus();
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [isStreaming, error]);

  useEffect(() => {
    if (inlineText) {
      setMessage(inlineText);
      setRecordingPhase(RECODING_PHASE.IDLE);
    }
  }, [inlineText]);

  useEffect(() => {
    if (audioServiceError) {
      console.log("Audio error detected:", audioServiceError);
      setIsListening(false);
      // setShowEndButton(false);
      setAudioError(audioServiceError.message);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }
  }, [audioServiceError, setError]);

  // Handle audio reinitialization when widget reopens
  useEffect(() => {
    // Clear audio errors when widget reopens
    if (!disabled && !isStreaming) {
      setAudioError(null);
      // Try to reinitialize AudioService if there was an error
      if (audioServiceError && reinitialize) {
        console.log("Attempting to reinitialize AudioService...");
        reinitialize().then((success) => {
          if (success) {
            console.log("AudioService reinitialized successfully");
            setAudioError(null);
          }
        });
      }
    }
  }, [disabled, isStreaming, audioServiceError, reinitialize]);

  // Update recording time from the hook's duration tracking
  useEffect(() => {
    if (isRecording) {
      setRecordingTime(Math.floor(recordingDuration / 1000));
    }
  }, [recordingDuration, isRecording]);

  useEffect(() => {
    if (isAudioStreaming) {
      if (isListening) {
        //in case of auto pause after 10 seconds call stop recording
        stopRecording();
      }
      sendRecording();
    }
  }, [isAudioStreaming]);

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
          setError({
            title: "Microphone access is blocked.",
            description: "Enable it in your browser settings.",
          });
        } else {
          const errorMsg =
            "Microphone access denied. Please allow microphone permissions when prompted.";
          console.log("Setting error:", errorMsg);
          setError({
            title: "Microphone access is denied.",
            description: " Please allow microphone permissions when prompted.",
          });
        }
      } else {
        console.error("Error checking microphone permission:", error);
        setError({
          title: "Unable to access microphone.",
          description: " Please check your device and try again.",
        });
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
    !isConnectionEstablished ||
    disabled ||
    isStreaming ||
    isSending ||
    (!!error && !error.title.length && isConnectionEstablished); //enable if a valid error comes

  // Start recording with AudioService
  const startRecording = async () => {
    try {
      setRecordingTime(0);
      setCurrentAudioData(null);

      await start((audioData) => {
        console.log("audio data arrived");
        setCurrentAudioData(audioData);
        setIsAudioStreaming(true);
        // Auto-pause will handle stopping, but we can also handle it here
      });

      // Start timer for UI updates
      intervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Error starting recording:", error);
      // If it's an initialization error, try to reinitialize
      if (error instanceof Error && error.message.includes("Not initialized")) {
        console.log(
          "AudioService not initialized in startRecording, attempting reinitialization..."
        );
        try {
          const success = await reinitialize();
          if (success) {
            console.log(
              "AudioService reinitialized in startRecording, trying again..."
            );
            // Retry recording after reinitialization
            await startRecording();
          } else {
            throw new Error("Failed to reinitialize AudioService");
          }
        } catch (reinitError) {
          console.error(
            "Failed to reinitialize AudioService in startRecording:",
            reinitError
          );
          throw new Error("Audio service unavailable");
        }
      } else {
        throw error;
      }
    }
  };

  // Stop recording manually
  const stopRecording = () => {
    console.log("called stop recording");

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    setIsListening(false);
    setRecordingPhase(RECODING_PHASE.PROCESSING);
    stop();
  };

  // Cancel recording
  const cancelRecording = () => {
    cancel();
    setIsListening(false);
    setCurrentAudioData(null);
  };

  // Send recording with full audio data
  const sendRecording = useCallback(async () => {
    if (!isAudioStreaming) {
      console.log("isAudiostreaming is false");
      return;
    }
    if (!currentAudioData) {
      console.error("No audio available");
      return;
    }
    try {
      setIsSending(true); // Disable send button
      setIsAudioStreaming(false);
      setRecordingPhase(RECODING_PHASE.TRANSCRIBING);
      const audioData = await new Promise<AudioData>((resolve, reject) => {
        const t = setTimeout(
          () => reject(new Error("Timed out waiting for audio")),
          5000
        );
        const poll = () => {
          if (currentAudioData) {
            clearTimeout(t);
            resolve(currentAudioData);
          } else setTimeout(poll, 100);
        };
        poll();
      });
      await onFinalAudioStream(audioData);
    } catch (error) {
      console.error("Error sending recording:", error);
      setError({ title: "Failed to send audio message. Please try again." });
      // Fallback: create empty audio data
      //CHECK!!!!!!!!!!!!!!!!!!!
      setIsSending(false);
      setRecordingPhase(RECODING_PHASE.IDLE);
      const emptyAudioData: AudioData = {
        audio: "",
        format: "audio/mp4",
        duration: 0,
        timestamp: Date.now(),
      };
      await onFinalAudioStream(emptyAudioData);
    }
  }, [isAudioStreaming]);

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
        if (message.trim() && uploadedFiles.length === 0) {
          onSendMessage(message.trim());
        }

        // Send files if any
        if (uploadedFiles.length > 0) {
          // Check total size of all files (they will be zipped if multiple)
          const totalFileSize = uploadedFiles.reduce(
            (acc, file) => acc + file.size,
            0
          );

          if (totalFileSize > MAX_FILE_SIZE) {
            setError({
              title: `Total file size (${formatFileSize(
                totalFileSize
              )}) exceeds the ${formatFileSize(
                MAX_FILE_SIZE
              )} limit. Please select smaller files.`,
            });
            setUploadedFiles([]);
            return;
          }

          const fileList = new DataTransfer();
          uploadedFiles.forEach((file) => fileList.items.add(file));
          onFileUpload(fileList.files, message.trim());
          setUploadedFiles([]);
        }
        setMessage("");
        setUploadedFiles([]);
        setIsListening(false);
      } catch (error) {
        console.error("Error in handleSend:", error);
        setError({ title: "Failed to send message. Please try again." });
      } finally {
        // setIsSending(false);
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

  const handleMicClick = async () => {
    if (!isListening && !isRecording) {
      try {
        // Check microphone permissions first
        await checkMicrophonePermission();
        if (!audioError) {
          setIsListening(true);
          await startRecording();
        }
      } catch (error) {
        console.error("Error starting recording:", error);
        // If it's an initialization error, try to reinitialize
        if (
          error instanceof Error &&
          error.message.includes("Not initialized")
        ) {
          console.log(
            "AudioService not initialized, attempting reinitialization..."
          );
          try {
            const success = await reinitialize();
            if (success) {
              console.log(
                "AudioService reinitialized, trying to start recording again..."
              );
              setIsListening(true);
              await startRecording();
            } else {
              setError({
                title: "Failed to initialize audio service. Please try again.",
              });
            }
          } catch (reinitError) {
            console.error("Failed to reinitialize AudioService:", reinitError);
            setError({ title: "Audio service unavailable. Please try again." });
          }
        } else {
          setError({ title: "Failed to start recording. Please try again." });
        }
      }
    } else if (isRecording) {
      console.log("called mic click and recording is true");

      stopRecording();
    }
  };

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log("handleFileChange called");
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      setUploadedFiles((prev) => [...prev, ...files]);
      e.target.value = ""; // Reset input
    }
  };

  return (
    <div className="flex items-center gap-2 px-2 py-1 bg-[var(--color-background)] rounded-full border border-[var(--color-primary)] mx-4 flex-shrink-0">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
        onChange={handleFileChange}
        className="hidden"
        data-max-size={MAX_FILE_SIZE.toString()}
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
        {isListening || isRecording ? (
          <div className="flex items-center justify-center px-3 py-2">
            {isRecording && (
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
            )}
          </div>
        ) : (
          <div className="relative w-full">
            <Input
              ref={messageInputRef}
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                onInputChange?.(e.target.value);
              }}
              onKeyPress={handleKeyPress}
              // onFocus={onFocus}
              // onBlur={onBlur}
              autoFocus={!disabled && isConnectionEstablished && !isStreaming}
              placeholder={
                isStreaming
                  ? "Please wait for response..."
                  : isSending
                  ? recordingPhase === RECODING_PHASE.PROCESSING
                    ? "Processing your voice..."
                    : recordingPhase === RECODING_PHASE.TRANSCRIBING
                    ? "Transcribing recording.."
                    : "Sending message..."
                  : placeholder
              }
              disabled={isInputDisabled}
              className="border-0 shadow-none px-0 focus-visible:ring-0 focus-visible:outline-none focus-visible:border-0 focus-visible:ring-transparent focus-visible:ring-offset-0 text-sm"
            />
          </div>
        )}

        {/* File Preview */}
        {uploadedFiles.length > 0 && (
          <div className="absolute -top-8 left-0 right-0 flex flex-wrap gap-1 max-w-full overflow-hidden">
            {uploadedFiles.map((file, index) => (
              <div
                key={index}
                className={`flex items-center gap-1 bg-[var(--color-accent)] text-[var(--color-primary)] px-2 py-1 rounded-md text-xs max-w-40 ${
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
      {(isListening || isRecording) && (
        <div className="flex flex-col items-end text-sm font-mono text-[var(--color-primary)]">
          <span className={isSending ? "opacity-50" : ""}>
            {formatTime(recordingTime)}
          </span>
        </div>
      )}

      {/* Voice Recording Controls */}
      {isListening || isRecording ? (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            className="h-8 w-8 p-0 bg-blue-500 hover:bg-blue-600 flex-shrink-0 rounded-full"
            onClick={handleMicClick}
            disabled={isSending}>
            <Check className="h-4 w-4 white" />
          </Button>
        </div>
      ) : (
        <>
          {hasContent ? (
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
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 hover:bg-[var(--color-accent)] flex-shrink-0"
              onClick={handleMicClick}
              disabled={disabled || isStreaming || !!audioError || isSending}>
              <Mic className="h-4 w-4 text-[var(--color-primary)]" />
            </Button>
          )}
        </>
      )}
    </div>
  );
}
