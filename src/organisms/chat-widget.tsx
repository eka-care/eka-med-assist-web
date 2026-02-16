import { useEffect, useMemo, useRef, useState } from "react";
import useMedAssistStore from "@/stores/medAssistStore";
import { useChat } from "@/custom-hooks/useChat";
import {
  CONNECTION_STATUS,
  type Message,
  MOBILE_VERIFICATION_ERROR_MESSAGES,
  MessageSender,
} from "@/types/widget";
import { Card } from "@ui/index";
import { ChatHeader } from "../molecules/chat-header";
import { ConnectionStatus } from "../molecules/connection-status";
import { ChatMessages } from "../molecules/chat-messages";
import { MessageInput } from "../molecules/message-input";
import { MobileNumberInput } from "@/molecules/mobile-number-input";
import { OTPInput } from "@/molecules/otp-input";
import handleMobileVerification from "@/utils/handleMobileVerification";
import handleOtpVerification from "@/utils/handleOtpVerification";
import handleUhidVerification from "@/utils/handleUhidVerification";
import type { IMobileVerificationResponse, TUhidDetails } from "@/types/api";
import { USER_FEEDBACK } from "@/configs/enums";

export enum MOBILE_VERIFICATION_STAGE {
  MOBILE_NUMBER = "mobile",
  OTP = "otp",
  UHID = "uhid",
}

export type TMobileVerificationStatus = {
  active: boolean;
  stage: MOBILE_VERIFICATION_STAGE;
  mobile_number: string | null;
  isSending: boolean;
  tool_use_id: string | null;
  uhids: TUhidDetails[];
};

interface ChatWidgetProps {
  title?: string;
  firstUserMessage?: string;
  className?: string;
  onClose?: () => void;
  onExpand?: () => void;
  onStartSession?: (newSession?: boolean) => void;
  isExpanded?: boolean;
  isMobile?: boolean;
  isLoading?: boolean;
  isOnline?: boolean;
  isFullMode?: boolean;
}

export function ChatWidget({
  title = "Apollo Assist",
  firstUserMessage = "",
  className = "",
  onClose,
  onExpand,
  isExpanded = false,
  isMobile = false,
  isLoading = false,
  isOnline = true,
  isFullMode = false,
}: ChatWidgetProps) {
  // Mobile verification state (kept as-is)
  const [mobVerificationStatus, setMobVerificationStatus] =
    useState<TMobileVerificationStatus>({
      active: false,
      isSending: false,
      stage: MOBILE_VERIFICATION_STAGE.MOBILE_NUMBER,
      uhids: [],
      tool_use_id: null,
      mobile_number: null,
    });

  const [isFirstUserMessageSent, setIsFirstUserMessageSent] = useState(false);
  const mobVerificationStatusRef = useRef(mobVerificationStatus);

  const {
    connectionStatus,
    showRetryButton,
    startNewConnection,
    error,
    clearError,
    setError,
    isStreaming,
    sessionId,
    inlineText,
    setInlineText,
    isWaitingForResponse,
    setIsWaitingForResponse,
    progressMessage,
    setProgressMessage,
    setIsBotIconAnimating,
  } = useMedAssistStore();

  // Use the new useChat hook (replaces useWebSocket)
  const {
    incomingMessages,
    loading,
    sendMessage,
    startSession,
    isReady,
    handleRetry: chatHandleRetry,
    handleStartNewConnection,
    isValidFile,
    callTool,
    handleToggleFeedback,
  } = useChat({
    environment: "production",
    onInlineText: (text) => {
      setInlineText(text);
    },
  });

  const [quickActions] = useState([
    { id: "doctor", label: "Help me find a doctor" },
    { id: "appointment", label: "I want to book appointment" },
    { id: "health_check", label: "I want to book health check" },
    { id: "emergency", label: "I have an emergency" },
  ]);

  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Initialize session when SDK is ready
  useEffect(() => {
    if (isReady) {
      startSession(false);
    }
  }, [isReady]);

  // Handle firstUserMessage from popup
  useMemo(() => {
    if (
      firstUserMessage?.trim() &&
      sessionId &&
      !loading &&
      connectionStatus === CONNECTION_STATUS.CONNECTED &&
      !isStreaming &&
      !isFirstUserMessageSent
    ) {
      const timer = setTimeout(() => {
        handleSendMessage({ content: firstUserMessage.trim() });
        setIsFirstUserMessageSent(true);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [firstUserMessage, sessionId, connectionStatus]);

  // Detect mobile verification tool calls from incoming messages
  useEffect(() => {
    if (incomingMessages.length === 0) return;
    const lastMessage = incomingMessages[incomingMessages.length - 1];
    if (
      lastMessage?.toolEscalationData &&
      (lastMessage.toolEscalationData.details?.component as string) ===
        "mobile_verification" &&
      !lastMessage.toolEscalationData.isResponded
    ) {
      const toolData = lastMessage.toolEscalationData;
      const mobileNumber = toolData.details?.input?.text || null;

      if (mobileNumber) {
        // Mobile number provided - auto-send OTP
        setMobVerificationStatus((prev) => ({
          ...prev,
          active: true,
          isSending: true,
          tool_use_id: toolData.tool_id || null,
          mobile_number: mobileNumber,
        }));
        handleAutoMobileVerification(mobileNumber);
      } else {
        // No mobile number - show input
        setMobVerificationStatus((prev) => ({
          ...prev,
          active: true,
          tool_use_id: toolData.tool_id || null,
        }));
      }
    }
  }, [incomingMessages]);

  const handleAutoMobileVerification = async (mobileNumber: string) => {
    setProgressMessage("Sending OTP to your mobile number...");
    try {
      const response = await handleMobileVerification(
        mobileNumber,
        sessionId,
        async () => true
      );
      if (response?.success && response?.data?.message) {
        setMobVerificationStatus((prev) => ({
          ...prev,
          active: true,
          isSending: false,
          stage: MOBILE_VERIFICATION_STAGE.OTP,
        }));
      } else {
        setMobVerificationStatus((prev) => ({
          ...prev,
          active: false,
          isSending: false,
        }));
      }
    } catch {
      setMobVerificationStatus((prev) => ({
        ...prev,
        active: false,
        isSending: false,
      }));
    } finally {
      setProgressMessage(null);
    }
  };

  // Scroll to bottom
  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      setTimeout(() => {
        scrollAreaRef.current?.scrollTo({
          top: scrollAreaRef.current.scrollHeight,
          behavior: "smooth",
        });
      }, 0);
    }
  };

  // Scroll to bottom whenever messages change
  useEffect(() => {
    scrollToBottom();
    if (isStreaming) {
      setProgressMessage(null);
      setIsWaitingForResponse(false);
    }
  }, [incomingMessages, isStreaming]);

  // Clear waiting state on error
  useEffect(() => {
    if (error) {
      setIsWaitingForResponse(false);
    }
  }, [error]);

  // Control bot icon animation
  useEffect(() => {
    const shouldAnimate = !!progressMessage || isWaitingForResponse;
    setIsBotIconAnimating(shouldAnimate);
  }, [progressMessage, isWaitingForResponse]);

  // Update mobile verification ref
  useEffect(() => {
    mobVerificationStatusRef.current = mobVerificationStatus;
  }, [mobVerificationStatus]);

  const showErrorMessage = useMemo(() => {
    return (
      connectionStatus === CONNECTION_STATUS.CONNECTED &&
      isOnline &&
      !error &&
      !showRetryButton &&
      !startNewConnection
    );
  }, [connectionStatus, isOnline, error, showRetryButton, startNewConnection]);

  // Compute display messages: prepend welcome message if no messages
  const displayMessages = useMemo(() => {
    const welcomeMessage: Message = {
      id: "1",
      content:
        "Hi, I'm Apollo Assist, your personal support for all medical needs. How can I help you?",
      isBot: true,
      role: MessageSender.ASSISTANT,
      isStored: true,
      feedback: USER_FEEDBACK.NONE,
    };

    if (incomingMessages.length === 0) {
      return [welcomeMessage];
    }

    // If the first message is not the welcome message, prepend it
    if (incomingMessages[0]?.id !== "1") {
      return [welcomeMessage, ...incomingMessages];
    }

    return incomingMessages;
  }, [incomingMessages]);

  // ---- Handlers ----

  const handleSendMessage = async ({
    content,
    tool_use_id,
    // tool_use_params,
  }: {
    content: string;
    tool_use_id?: string;
    tool_use_params?: any;
  }) => {
    if (isStreaming) return;

    if (!isOnline) {
      setError({ title: "You are offline" });
      setIsWaitingForResponse(false);
      return;
    }

    if (connectionStatus !== CONNECTION_STATUS.CONNECTED) {
      setError({ title: "Connection lost. Please try again." });
      setIsWaitingForResponse(false);
      return;
    }

    clearError();
    setProgressMessage(null);

    if (inlineText) {
      setInlineText("");
    }

    try {
      // === MOBILE VERIFICATION FLOW (kept as-is) ===
      if (mobVerificationStatusRef.current.active) {
        let response: {
          success: boolean;
          data: IMobileVerificationResponse | null;
        } | null = null;

        if (
          mobVerificationStatusRef.current.stage ===
          MOBILE_VERIFICATION_STAGE.MOBILE_NUMBER
        ) {
          setMobVerificationStatus((prev) => ({ ...prev, isSending: true }));
          const mobileNumber =
            mobVerificationStatusRef.current.mobile_number || content;
          response = await handleMobileVerification(
            mobileNumber,
            sessionId,
            async () => true
          );

          if (response?.success) {
            setMobVerificationStatus((prev) => ({
              ...prev,
              isSending: false,
              mobile_number: mobileNumber,
              stage: MOBILE_VERIFICATION_STAGE.OTP,
            }));
          } else {
            clearMobileVerification();
            await sendMessage({
              message:
                (response?.data as any)?.error?.msg ||
                "Mobile number verification failed",
              toolCalled: true,
            });
          }
        } else if (
          mobVerificationStatusRef.current.stage ===
            MOBILE_VERIFICATION_STAGE.OTP &&
          mobVerificationStatusRef.current.mobile_number
        ) {
          response = await handleOtpVerification(
            content,
            mobVerificationStatusRef.current.mobile_number,
            sessionId,
            async () => true
          );

          if (
            response?.data?.error?.code ===
            MOBILE_VERIFICATION_ERROR_MESSAGES.INVALID_OTP.code
          ) {
            setMobVerificationStatus((prev) => ({
              ...prev,
              active: true,
              isSending: false,
            }));
          } else if (
            !response?.success &&
            response?.data?.error?.code ===
              MOBILE_VERIFICATION_ERROR_MESSAGES.TOOL_ERROR.code
          ) {
            await sendMessage({
              message:
                response?.data?.error?.msg ||
                MOBILE_VERIFICATION_ERROR_MESSAGES.TOOL_ERROR.msg,
              toolCalled: true,
            });
            clearMobileVerification();
          } else if (response?.success && response?.data?.uhids?.length) {
            setMobVerificationStatus((prev) => ({
              ...prev,
              active: true,
              isSending: false,
              uhids: response?.data?.uhids || [],
              stage: MOBILE_VERIFICATION_STAGE.UHID,
            }));
          } else {
            const hiddenMessage = !response?.data?.uhids?.length
              ? "Otp verification successful, but Uhids not found"
              : "Otp verification failed";
            await sendMessage({
              message: hiddenMessage,
              toolCalled: true,
            });
            clearMobileVerification();
          }
        } else if (
          mobVerificationStatusRef.current.stage ===
          MOBILE_VERIFICATION_STAGE.UHID
        ) {
          response = await handleUhidVerification(
            content,
            sessionId,
            async () => true
          );

          if (
            response?.data?.error?.code ===
            MOBILE_VERIFICATION_ERROR_MESSAGES.USER_NOT_AUTHENTICATED.code
          ) {
            setMobVerificationStatus((prev) => ({
              ...prev,
              active: true,
              isSending: false,
              stage: MOBILE_VERIFICATION_STAGE.MOBILE_NUMBER,
            }));
            await handleSendMessage({
              content: mobVerificationStatusRef.current.mobile_number || "",
              tool_use_id,
            });
          } else {
            const message =
              response?.data?.status === "success"
                ? `Verification successful, selected uhid: ${content}`
                : response?.data?.error?.msg || "Verification failed";
            await sendMessage({
              message,
              toolCalled: true,
            });
            clearMobileVerification();
          }
        }
        return;
      }

      // === NORMAL CHAT FLOW ===
      await sendMessage({
        message: content,
        messageId: Date.now().toString(),
        toolCalled: !!tool_use_id,
      });
    } catch (error) {
      console.error("Failed to send message:", error);
      setError({ title: "Failed to send message. Please try again." });
      setIsWaitingForResponse(false);
    }
  };

  // File upload using SDK
  const handleFileUpload = async (files: FileList, message?: string) => {
    if (isStreaming) return;

    if (!isOnline) {
      setError({ title: "You are offline" });
      setIsWaitingForResponse(false);
      return;
    }
    if (connectionStatus !== CONNECTION_STATUS.CONNECTED) {
      setError({ title: "Connection lost" });
      setIsWaitingForResponse(false);
      return;
    }

    clearError();
    const fileArray = Array.from(files);
    const validFiles = fileArray.filter((f) => isValidFile(f));
    if (validFiles.length === 0) return;

    try {
      await sendMessage({
        message:
          message ||
          `📎 ${
            validFiles.length > 1 ? `${validFiles.length} files` : "File"
          } uploaded`,
        files: validFiles,
        messageId: Date.now().toString(),
      });

      if (mobVerificationStatus.active) {
        clearMobileVerification();
      }
    } catch (error) {
      console.error("Failed to upload file:", error);
      setError({ title: "Failed to upload file. Please try again." });
    }
  };

  // Audio handled via SDK (stub preserved)
  const handleFinalAudioStream = async (audioData: any) => {
    if (!isOnline || connectionStatus !== CONNECTION_STATUS.CONNECTED) {
      setError({ title: "Cannot send audio" });
      return;
    }

    try {
      await sendMessage({ audio: audioData });
      if (mobVerificationStatus.active) {
        clearMobileVerification();
      }
    } catch (error) {
      console.error("Failed to send audio:", error);
      setError({ title: "Failed to send audio message." });
    }
  };

  const handleQuickAction = async (actionId: string) => {
    if (isStreaming) return;
    if (!isOnline || connectionStatus !== CONNECTION_STATUS.CONNECTED) {
      setError({ title: "Cannot perform action" });
      return;
    }
    clearError();
    setProgressMessage(null);

    const action = quickActions.find((a) => a.id === actionId);
    if (action) {
      try {
        await handleSendMessage({ content: action.label });
      } catch (error) {
        console.error("Failed to send quick action:", error);
      }
    }
  };

  const handleMenuAction = (action: string) => {
    if (action === "clear") {
      clearError();
      setIsWaitingForResponse(false);
    }
  };

  const handleStartNewSession = async () => {
    try {
      setIsWaitingForResponse(false);
      clearMobileVerification();
      await handleStartNewConnection();
    } catch (error) {
      console.error("Failed to start new session:", error);
    }
  };

  const handleRetry = async () => {
    await chatHandleRetry();
  };

  const exitMobileVerification = async () => {
    const exitMessage = `Exit ${
      mobVerificationStatus?.stage || "Mobile"
    } verification`;
    // const toolId = mobVerificationStatusRef.current?.tool_use_id;
    clearMobileVerification();
    await sendMessage({
      message: exitMessage,
      toolCalled: true,
    });
  };

  const clearMobileVerification = () => {
    setMobVerificationStatus({
      active: false,
      isSending: false,
      mobile_number: null,
      uhids: [],
      tool_use_id: null,
      stage: MOBILE_VERIFICATION_STAGE.MOBILE_NUMBER,
    });
  };

  // Feedback via SDK (param order matches synapse: feedback, messageId, reason)
  const handleMessageFeedback = async (
    feedback: USER_FEEDBACK,
    messageId: string,
    feedbackReason?: string
  ) => {
    await handleToggleFeedback(feedback, messageId, feedbackReason);
  };

  // ---- UI ----
  const containerStyles = isMobile
    ? "fixed inset-0 z-[2147483647] bg-[var(--color-card)] border-border rounded-none flex flex-col h-[100dvh] w-screen py-0 gap-1 overflow-hidden"
    : isExpanded
    ? "fixed inset-4 z-[2147483647] bg-[var(--color-card)] border-border rounded-lg shadow-2xl flex flex-col max-h-[calc(100vh-2rem)] py-0 gap-1"
    : `w-full max-w-sm bg-[var(--color-card)] border-border shadow-lg rounded-lg flex flex-col py-0 gap-1${className} `;

  const chatHeight = isMobile
    ? "flex-1 overflow-y-auto overscroll-behavior-y-contain"
    : isExpanded
    ? "flex-1 min-h-0"
    : "h-[500px]";

  return (
    <Card className={containerStyles}>
      <ChatHeader
        title={title}
        onClose={onClose}
        onExpand={onExpand}
        onMenuAction={handleMenuAction}
        isExpanded={isExpanded}
        isMobile={isMobile}
        onStartSession={handleStartNewSession}
        connectionStatus={connectionStatus}
        isOnline={isOnline}
        isFullMode={isFullMode}
      />

      {/* Loading State */}
      {(isLoading || loading) && (
        <div className={`${chatHeight} flex items-center justify-center p-4`}>
          <div className="text-center w-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)] mx-auto mb-3"></div>
            <p className="text-sm text-[var(--color-muted-foreground)] break-words">
              Starting session...
            </p>
          </div>
        </div>
      )}

      {!isLoading && !loading && (
        <div
          className={`${chatHeight} flex flex-col overflow-hidden max-h-screen`}>
          <div
            ref={scrollAreaRef}
            className="flex-1 min-h-0 overflow-y-auto"
            style={{
              scrollBehavior: "smooth",
              scrollbarWidth: "thin",
              scrollbarColor: "var(--color-border) transparent",
              overscrollBehavior: "contain",
              WebkitOverflowScrolling: "touch",
            }}
            onTouchStart={(e) => isMobile && e.stopPropagation()}
            onTouchMove={(e) => isMobile && e.stopPropagation()}>
            <div
              className={`min-h-full flex flex-col justify-end ${
                isMobile ? "pb-4" : "pb-4"
              }`}>
              <div className="py-1 px-4 flex items-center justify-center">
                <div className="text-xs text-[var(--color-muted-foreground)] text-center">
                  {(() => {
                    const now = new Date();
                    return now.toLocaleString("en-US", {
                      weekday: "long",
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true,
                    });
                  })()}
                </div>
              </div>
              <div className="space-y-1">
                <ChatMessages
                  messages={displayMessages}
                  onSendMessage={sendMessage}
                  callTool={callTool}
                  onToggleFeedback={handleMessageFeedback}
                  quickActions={quickActions}
                  handleQuickAction={handleQuickAction}
                  mobVerificationStatus={mobVerificationStatus}
                  clearMobileVerification={exitMobileVerification}
                  onContentClick={handleSendMessage}
                  isOnline={isOnline}
                />
              </div>
            </div>
          </div>

          {/* Connection Status */}
          {!showErrorMessage && (
            <ConnectionStatus
              onRetry={handleRetry}
              onStartNewSession={handleStartNewSession}
              showRetryButton={showRetryButton}
              startNewConnection={startNewConnection}
              clearError={clearError}
              error={error}
              isConnected={
                connectionStatus === CONNECTION_STATUS.CONNECTED && isOnline
              }
            />
          )}

          {(!mobVerificationStatus.active ||
            mobVerificationStatus.stage === MOBILE_VERIFICATION_STAGE.UHID) && (
            <div className={isMobile ? "pb-safe" : ""}>
              <MessageInput
                onSendMessage={handleSendMessage}
                onFinalAudioStream={handleFinalAudioStream}
                inlineText={inlineText || ""}
                onFileUpload={handleFileUpload}
                disabled={
                  isWaitingForResponse ||
                  !!progressMessage?.length ||
                  connectionStatus !== CONNECTION_STATUS.CONNECTED ||
                  !isOnline
                }
                setError={setError}
                mobileVerificationStatus={mobVerificationStatus}
              />
            </div>
          )}

          {mobVerificationStatus.active &&
            (mobVerificationStatus.stage ===
            MOBILE_VERIFICATION_STAGE.MOBILE_NUMBER ? (
              <MobileNumberInput
                onSendMobile={handleSendMessage}
                isLoading={mobVerificationStatus.isSending}
                disabled={
                  mobVerificationStatus.isSending ||
                  isWaitingForResponse ||
                  !!progressMessage?.length ||
                  connectionStatus !== CONNECTION_STATUS.CONNECTED ||
                  !isOnline
                }
              />
            ) : mobVerificationStatus.stage ===
                MOBILE_VERIFICATION_STAGE.OTP &&
              mobVerificationStatus.mobile_number ? (
              <OTPInput
                mobileNumber={mobVerificationStatus.mobile_number}
                onSendOTP={handleSendMessage}
              />
            ) : null)}
          {/* Powered by eka.care branding */}
          <div
            className={`flex items-center justify-center py-1.5 px-4 ${
              isMobile ? "pb-safe" : ""
            }`}>
            <div className="flex items-center gap-1 text-xs text-[var(--color-muted-foreground)]">
              <img
                src={
                  import.meta.env.BASE_URL + "assets/powered-by-eka-care.svg"
                }
                alt="eka.care"
                className="h-3.5"
              />
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
