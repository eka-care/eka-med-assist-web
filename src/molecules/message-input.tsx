import { useState, useRef, useMemo, useEffect, useCallback } from "react";
import { Mic, Send, Plus, Trash2, Check, Loader2 } from "lucide-react";
import { Button, Textarea, voiceListeningGif } from "@ui/index";
import { useAudioService } from "@/custom-hooks/useAudioService";
import formatTime from "@/utils/formatTime";
import useSessionStore from "@/stores/medAssistStore";
import type { AudioData } from "@/services/audioService";
import { ErrorMessageUI } from "@/types/socket";
import useMedAssistStore from "@/stores/medAssistStore";
import { CONNECTION_STATUS } from "@/types/widget";
import { useNetworkStatus } from "@/custom-hooks/useNetworkStatus";
import {
  MOBILE_VERIFICATION_STAGE,
  TMobileVerificationStatus,
} from "@/organisms/chat-widget";
import { FilePreviewList } from "./file-preview";

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
  onSendMessage: ({
    content,
    tool_use_id,
    tool_use_params,
  }: {
    content: string;
    tool_use_id?: string;
    tool_use_params?: any;
  }) => void;
  onFinalAudioStream: (audioData: AudioData) => void;
  onFileUpload: (files: FileList, message?: string) => void;
  onInputChange?: (value: string) => void;
  onInputFocus?: () => void;
  onInputBlur?: () => void;
  inlineText?: string;
  placeholder?: string;
  disabled?: boolean;
  setError: (error: ErrorMessageUI) => void;
  mobileVerificationStatus: TMobileVerificationStatus;
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
  mobileVerificationStatus,
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
  const [textareaHeight, setTextareaHeight] = useState(40); // Track textarea height
  const [reinitializationAttempted, setReinitializationAttempted] =
    useState(false); // Track if reinitialization was attempted
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const connectionStatus = useMedAssistStore((state) => state.connectionStatus);
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

  const { isOnline } = useNetworkStatus();
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
    if (isStreaming || error || !disabled) {
      setIsSending(false); // Reset sending state when streaming starts
    }
    // Remove auto focus on mobile devices
    if (
      !isStreaming &&
      !disabled &&
      connectionStatus === CONNECTION_STATUS.CONNECTED &&
      messageInputRef.current &&
      window.innerWidth &&
      window.innerWidth > 768 // Only auto focus on desktop
    ) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        messageInputRef.current?.focus();
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [isStreaming, error, disabled]);

  useEffect(() => {
    if (inlineText) {
      setMessage(inlineText);
      setRecordingPhase(RECODING_PHASE.IDLE);
    }
  }, [inlineText]);

  // Reset height when message is cleared
  useEffect(() => {
    if (!message.trim()) {
      setTextareaHeight(40);
      if (messageInputRef.current) {
        messageInputRef.current.style.height = "40px";
      }
    }
  }, [message]);

  // Handle initial height and mobile-specific adjustments
  useEffect(() => {
    if (messageInputRef.current && message.trim()) {
      const textarea = messageInputRef.current;
      textarea.style.height = "auto";
      textarea.style.overflow = "hidden";

      const scrollHeight = textarea.scrollHeight;
      const minHeight = 40;
      const maxHeight = 120;
      const newHeight = Math.max(minHeight, Math.min(scrollHeight, maxHeight));

      textarea.style.height = newHeight + "px";
      setTextareaHeight(newHeight);

      if (scrollHeight > maxHeight) {
        textarea.style.overflow = "auto";
      } else {
        textarea.style.overflow = "hidden";
      }
    }
  }, [message]);

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
      // Only reset reinitialization flag if there's no persistent audio service error
      if (!audioServiceError) {
        setReinitializationAttempted(false);
      }
      // Try to reinitialize AudioService if there was an error and we haven't attempted yet
      if (audioServiceError && reinitialize && !reinitializationAttempted) {
        console.log("Attempting to reinitialize AudioService...");
        setReinitializationAttempted(true); // Mark that we're attempting reinitialization
        reinitialize()
          .then((success) => {
            if (success) {
              console.log("AudioService reinitialized successfully");
              setAudioError(null);
              setReinitializationAttempted(false); // Reset flag on success
            } else {
              console.log(
                "AudioService reinitialization failed, will not retry"
              );
            }
          })
          .catch((error) => {
            console.error("AudioService reinitialization error:", error);
            // Don't reset the flag on error to prevent retries
          });
      }
    }
  }, [
    disabled,
    isStreaming,
    audioServiceError,
    reinitialize,
    reinitializationAttempted,
  ]);

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

  const mobVerificationPlaceholder = useMemo(() => {
    if (!mobileVerificationStatus.active) {
      return null;
    } else if (
      mobileVerificationStatus.active &&
      mobileVerificationStatus.isSending &&
      mobileVerificationStatus.stage === MOBILE_VERIFICATION_STAGE.MOBILE_NUMBER
    ) {
      return "Sending OTP to your mobile number...";
    }
    return null;
  }, [mobileVerificationStatus]);
  // Check if input should be disabled (either disabled prop, streaming, or sending)
  const isInputDisabled = useMemo(() => {
    if (connectionStatus !== CONNECTION_STATUS.CONNECTED || !isOnline) {
      return true;
    }
    if (
      !!error &&
      error?.title &&
      connectionStatus === CONNECTION_STATUS.CONNECTED
    ) {
      console.log("input enabled bcus of valid error");
      return false;
    }
    // Only disable input if mobile verification is actively sending (not just active)
    if (mobileVerificationStatus.isSending) {
      console.log("input disabled bcus of mobile verification is sending");
      return true;
    }
    console.log(
      "input enabled/disabled bcus ",
      disabled,
      isStreaming,
      isSending
    );
    // Otherwise, check other conditions
    return disabled || isStreaming || isSending;
  }, [
    error,
    connectionStatus,
    disabled,
    isStreaming,
    isSending,
    isOnline,
    mobileVerificationStatus.isSending,
  ]);

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
      // If it's an initialization error, try to reinitialize only once
      if (
        error instanceof Error &&
        error.message.includes("Not initialized") &&
        !reinitializationAttempted
      ) {
        console.log(
          "AudioService not initialized in startRecording, attempting reinitialization..."
        );
        setReinitializationAttempted(true); // Mark that we've attempted reinitialization
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
        if (!mobileVerificationStatus.active) {
          setIsSending(true); // Disable send button immediately
        }

        // Send text message
        if (message.trim() && uploadedFiles.length === 0) {
          onSendMessage({ content: message.trim() });
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
        // If it's an initialization error, try to reinitialize only once
        if (
          error instanceof Error &&
          error.message.includes("Not initialized") &&
          !reinitializationAttempted
        ) {
          console.log(
            "AudioService not initialized, attempting reinitialization..."
          );
          setReinitializationAttempted(true); // Mark that we've attempted reinitialization
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

      // Validate file types - only allow images and PDFs
      const validFiles = files.filter((file) => {
        console.log("file", file);
        const isValidImage = file?.type?.startsWith("image/");
        const isValidPDF = file.type === "application/pdf";

        if (!isValidImage && !isValidPDF) {
          setError({
            title: `File type not supported: ${file.name}`,
            description: "Only images and PDF files are allowed.",
          });
          return false;
        }
        return true;
      });

      if (validFiles.length > 0) {
        setUploadedFiles((prev) => [...prev, ...validFiles]);
      }
      e.target.value = ""; // Reset input
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    onInputChange?.(e.target.value);
  };

  const handleTextareaInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    // Update height tracking with proper calculation on every input
    const textarea = e.currentTarget;

    // Force a reflow to ensure accurate measurements
    textarea.style.height = "auto";
    textarea.style.overflow = "hidden";

    // Calculate height with proper constraints
    const scrollHeight = textarea.scrollHeight;
    const minHeight = 40;
    const maxHeight = 120;
    const newHeight = Math.max(minHeight, Math.min(scrollHeight, maxHeight));

    // Apply the new height
    textarea.style.height = newHeight + "px";
    setTextareaHeight(newHeight);

    // Restore overflow behavior
    if (scrollHeight > maxHeight) {
      textarea.style.overflow = "auto";
    } else {
      textarea.style.overflow = "hidden";
    }
  };

  const showFilePreview =
    uploadedFiles.length > 0 && !isListening && !isRecording;
  const shouldExpandInput = textareaHeight > 40 || showFilePreview;

  return (
    <div
      className={`bg-[var(--color-background)] border border-[var(--color-primary)] mx-4 flex-shrink-0 ${
        shouldExpandInput ? "rounded-lg px-3 py-2" : "rounded-full px-2 py-0.5"
      } flex flex-col ${showFilePreview ? "gap-2" : "gap-0"}`}>
      {showFilePreview && (
        <div className="w-full">
          <FilePreviewList
            files={uploadedFiles}
            onRemoveFile={(index) =>
              setUploadedFiles((prev) => prev.filter((_, i) => i !== index))
            }
            isPreview={true}
            className={`${isSending ? "opacity-50" : ""}`}
          />
        </div>
      )}

      <div
        className={`flex w-full gap-2 ${
          showFilePreview ? "items-end" : "items-center"
        }`}>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,.pdf"
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
            disabled={isInputDisabled || mobileVerificationStatus?.active}>
            <Plus className="h-4 w-4 text-[var(--color-primary)]" />
          </Button>
        )}

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
            <Textarea
              ref={messageInputRef}
              value={message}
              onChange={handleTextareaChange}
              onInput={handleTextareaInput}
              onKeyPress={handleKeyPress}
              // onFocus={onFocus}
              // onBlur={onBlur}
              autoFocus={
                !disabled &&
                connectionStatus === CONNECTION_STATUS.CONNECTED &&
                !isStreaming &&
                window.innerWidth > 768 // Only auto focus on desktop
              }
              placeholder={
                mobVerificationPlaceholder
                  ? mobVerificationPlaceholder
                  : isStreaming || disabled
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
              className="border-0 shadow-none px-0 focus-visible:ring-0 focus-visible:outline-none focus-visible:border-0 focus-visible:ring-transparent focus-visible:ring-offset-0 text-sm resize-none break-word overflow-hidden"
              rows={1}
              style={{
                minHeight: "40px",
                maxHeight: "120px",
                fontSize: window.innerWidth <= 768 ? "16px" : "14px", // Prevent iOS zoom
              }}
            />
          </div>
        )}
        {(isListening || isRecording) && (
          <div className="flex flex-col items-end text-sm font-mono text-[var(--color-primary)]">
            <span className={isSending ? "opacity-50" : ""}>
              {formatTime(recordingTime)}
            </span>
          </div>
        )}

        {isListening || isRecording ? (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="h-8 w-8 p-0 bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 flex-shrink-0 rounded-full"
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
                disabled={
                  disabled ||
                  isStreaming ||
                  !!audioError ||
                  isSending ||
                  mobileVerificationStatus?.active
                }>
                <Mic className="h-4 w-4 text-[var(--color-primary)]" />
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
