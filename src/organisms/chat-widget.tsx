import { useEffect, useMemo, useRef, useState } from "react";

import { getAvailabilityDates } from "@/api/post-availability-dates";
import { getAvailabilitySlots } from "@/api/post-availability-slots";
import { getSessionDetails } from "@/api/get-session-details";
import {
  IMobileVerificationResponse,
  TUhidDetails,
} from "@/api/post-mobile-verification";
import { useWebSocket } from "@/custom-hooks/useWebSocket";
import type { AudioData } from "@/services/audioService";
import useMedAssistStore from "@/stores/medAssistStore";
import { ContentType, type CommonHandlerData } from "@/types/socket";
import {
  CONNECTION_STATUS,
  Message,
  MOBILE_VERIFICATION_ERROR_MESSAGES,
  RESPONSE_TIMEOUT,
  STREAMING_TIMEOUT,
} from "@/types/widget";
import { Card } from "@ui/index";
import ApolloAssistIcon from "../components/ApollossistIcon";
import { ChatHeader } from "../molecules/chat-header";
import { ConnectionStatus } from "../molecules/connection-status";
import { MessageBubble } from "../molecules/message-bubble";
import { MessageInput } from "../molecules/message-input";
import { ERROR_MESSAGES, type WebSocketConfig } from "../types/socket";
import { MobileNumberInput } from "@/molecules/mobile-number-input";
import { OTPInput } from "@/molecules/otp-input";
import handleMobileVerification from "@/utils/handleMobileVerification";
import handleOtpVerification from "@/utils/handleOtpVerification";
import handleUhidVerification from "@/utils/handleUhidVerification";

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
  className?: string;
  onClose?: () => void;
  onExpand?: () => void;
  onStartSession?: (newSession?: boolean) => void;
  isExpanded?: boolean;
  isMobile?: boolean;
  isLoading?: boolean;
  isOnline?: boolean;
}

export function ChatWidget({
  title = "Apollo Assist",
  className = "",
  onClose,
  onStartSession,
  onExpand,
  isExpanded = false,
  isMobile = false,
  isLoading = false,
  isOnline = true,
}: ChatWidgetProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      content:
        "Hi, I'm Apollo Assist, your personal support for all medical needs. How can I help you?",
      isBot: true,
      isStored: true,
    },
  ]);
  const [tips, setTips] = useState<string[] | null>(null);
  const [progressMessage, setProgressMessage] = useState<string | null>(null);
  const [isWaitingForResponse, setIsWaitingForResponse] =
    useState<boolean>(false);
  const [isSessionValidated, setIsSessionValidated] = useState<boolean>(false);
  const [mobVerificationStatus, setMobVerificationStatus] =
    useState<TMobileVerificationStatus>({
      active: false,
      isSending: false,
      stage: MOBILE_VERIFICATION_STAGE.MOBILE_NUMBER,
      uhids: [],
      tool_use_id: null,
      mobile_number: null,
    });
  const mobVerificationStatusRef = useRef(mobVerificationStatus); //using ref to get rid of state updates issues

  const {
    connectionStatus,
    showRetryButton,
    startNewConnection,
    error,
    clearError,
    setError,
    isStreaming,
    sessionId,
    sessionToken,
    clearSession,
    refreshSession,
    getMessagesForSession,
    addMessageToSession,
    updateMessageInSession,
    setInlineText,
    inlineText,
    setResponseTimeoutId,
    clearResponseTimeout,
    setStreamingTimeoutId,
    clearStreamingTimeout,
    setLastStreamingActivity,
    isBotIconAnimating,
    setIsBotIconAnimating,
  } = useMedAssistStore();

  // Auto-start session when widget mounts if no session exists
  useEffect(() => {
    if (!sessionId && !sessionToken && onStartSession) {
      console.log("No session found, starting new session...");
      onStartSession();
      // For new sessions, we don't need validation
      setIsSessionValidated(true);
    } else if (sessionId && sessionToken) {
      console.log("Session already exists:");

      // Check if session is still valid - AWAIT this before proceeding
      const validateSession = async () => {
        try {
          const isValid = await getSessionDetails(sessionId);
          console.log("isValid", isValid);
          if (!isValid.success && !isValid.retry) {
            console.log("Session is invalid, starting new session");
            clearSession();
            await onStartSession?.(true);
            //For new sessions, we don't need validation
            setIsSessionValidated(true);
          } else if (!isValid.success && isValid.retry) {
            console.log("Session expired, refreshing session");
            const success = await refreshSession();
            if (success) {
              setIsSessionValidated(true);
            } else {
              clearSession();
              await onStartSession?.(true);
              //For new sessions, we don't need validation
              setIsSessionValidated(true);
            }
          } else {
            console.log("Session is valid, allowing WebSocket connection");
            setIsSessionValidated(true);
          }
        } catch (error) {
          console.error("Error checking session details:", error);
          // If there's an error checking session, start a new one
          clearSession();
          await onStartSession?.(true);
          //For new sessions, we don't need validation
          setIsSessionValidated(true);
        }
      };

      validateSession();
    }
  }, []); // Only run on mount

  //load previous messages on unmout
  useEffect(() => {
    if (sessionId) {
      //TODO: add a loading state here
      const previousMessages = getMessagesForSession(sessionId);
      if (previousMessages.length > 0) {
        setMessages(previousMessages);
      } else {
        const welcomeMessage = {
          id: "1",
          content:
            "Hi, I'm Apollo Assist, your personal support for all medical needs. How can I help you?",
          isBot: true,
          isStored: true,
        };

        addMessageToSession(sessionId, welcomeMessage);
        setMessages([welcomeMessage]);
      }
    }
  }, [sessionId]);
  // Create socket configuration when session data is available AND validated
  const socketConfig: WebSocketConfig | null = useMemo(() => {
    if (sessionId && sessionToken && isSessionValidated) {
      console.log(
        "usememo for socket connection triggered:",
        sessionId,
        sessionToken
      );
      return {
        sessionId,
        auth: { token: sessionToken },
      };
    }
    console.log("WebSocket config not created - session not validated yet");
    return null;
  }, [sessionId, sessionToken, isSessionValidated]);

  // Use WebSocketV2 hook
  const {
    webSocketService: wsService,
    setFilesForUpload,
    sendFileUploadRequest,
    sendAudioData,
    regenerateResponse,
    sendChatMessage,
    retryLastMessage,
    sendHiddenChatMessage,
  } = useWebSocket(
    socketConfig,
    (botMessage: string) => {
      // Clear waiting state when we receive a bot response
      setIsWaitingForResponse(false);
      setProgressMessage(null);
      // Handle bot response messages
      setMessages((prev) => {
        // Check if there's already a bot message at the end
        const lastMessage = prev[prev.length - 1];

        // If we have a bot message and it's shorter than the incoming text, update it
        if (
          lastMessage &&
          lastMessage.isBot &&
          botMessage?.length > lastMessage?.content?.length
        ) {
          // Update the existing bot message with progressive text
          const updatedMessages = [...prev];
          updatedMessages[updatedMessages.length - 1] = {
            ...lastMessage,
            content: botMessage,
            isRegenerating: false, // Clear regenerating state
            isStored: false,
          };

          return updatedMessages;
        } else if (
          lastMessage &&
          lastMessage.isBot &&
          botMessage.length <= lastMessage.content.length
        ) {
          // If the incoming text is shorter or equal, it might be a duplicate, skip
          return prev;
        } else {
          // Create a new bot message
          const newMessage: Message = {
            id: Date.now().toString(),
            content: botMessage,
            isBot: true,
            isStored: false,
          }; // Will be stored when streaming ends
          return [...prev, newMessage];
        }
      });
    },
    (progressMsg: string) => {
      // Clear waiting state when we receive progress messages
      setIsWaitingForResponse(false);

      // Handle progress messages
      setProgressMessage(progressMsg);
    },
    (tips: string[]) => {
      console.log("Tips message received:", tips);
      setIsWaitingForResponse(false);
      setTips(tips);
    },
    async (commonContentData: CommonHandlerData) => {
      // Clear waiting state when we receive common content data
      setIsWaitingForResponse(false);

      // Handle common content messages - merge with existing bot message
      console.log("Common content message received:", commonContentData);
      setMessages((prev) => {
        // Find the last bot message to attach content to it
        let lastBotMessageIndex = -1;
        for (let i = prev.length - 1; i >= 0; i--) {
          if (prev[i].isBot) {
            lastBotMessageIndex = i;
            break;
          }
        }

        if (
          lastBotMessageIndex !== -1 &&
          !prev[lastBotMessageIndex].isResponded
        ) {
          console.log(
            "Bot message found and not responded, updating with common content data",
            commonContentData
          );
          // Update the last bot message with common content data only if it hasn't been responded to
          const updatedMessages = [...prev];
          updatedMessages[lastBotMessageIndex] = {
            ...updatedMessages[lastBotMessageIndex],
            commonContentData: commonContentData, // Attach common content to the existing bot message
          };
          return updatedMessages;
        } else {
          console.log(
            lastBotMessageIndex === -1
              ? "No bot message found, creating a new one"
              : "Last bot message already responded, creating a new one",
            commonContentData
          );
          // If no bot message found or the last bot message has been responded to, create a new one
          const newMessage: Message = {
            id: Date.now().toString(),
            content: "",
            isBot: true,
            commonContentData: commonContentData,
            isStored: true,
          };
          console.log(
            "Adding common content message to session store",
            newMessage
          );
          addMessageToSession(sessionId, newMessage);
          return [...prev, newMessage];
        }
      });
      // Handle mobile verification content type
      if (
        commonContentData.type === "mobile_verification" &&
        commonContentData?.data?.callbacks?.tool_callback_mobile_verification
      ) {
        console.log("Mobile verification message received:", commonContentData);

        if (commonContentData?.data?.mobile_number) {
          // Mobile number provided - disable input and send OTP automatically
          setMobVerificationStatus((p) => ({
            ...p,
            active: true,
            isSending: true,
            tool_use_id: commonContentData?.tool_use_id,
            mobile_number: commonContentData?.data?.mobile_number || null,
          }));
          setProgressMessage("Sending OTP to your mobile number...");

          let responseMessage = "";
          let isSuccess = false;

          try {
            const response = await handleMobileVerification(
              commonContentData?.data?.mobile_number,
              sessionId
            );

            if (response?.success && response?.data?.message) {
              responseMessage =
                response?.data?.message ||
                "OTP sent successfully to your mobile number, please enter 6 digit OTP";
              isSuccess = true;
            } else {
              responseMessage =
                (response?.data as any)?.error?.msg ||
                "Failed to send OTP. Please try again.";
              isSuccess = false;
            }
          } catch (error) {
            responseMessage = "Failed to send OTP. Please try again.";
            isSuccess = false;
          } finally {
            setProgressMessage(null);

            setMobVerificationStatus((p) => ({
              ...p,
              active: isSuccess,
              isSending: false,
              stage: isSuccess
                ? MOBILE_VERIFICATION_STAGE.OTP
                : MOBILE_VERIFICATION_STAGE.MOBILE_NUMBER,
            }));

            // Update messages with the response
            setMessages((prev) => {
              const updatedMessages = [...prev];
              const lastMessageIndex = updatedMessages.length - 1;

              if (
                updatedMessages.length > 0 &&
                updatedMessages[lastMessageIndex].isBot
              ) {
                const existingContent =
                  updatedMessages[lastMessageIndex].content;
                const newContent = `${existingContent}\n\n${responseMessage}`;

                updatedMessages[updatedMessages.length - 1] = {
                  ...updatedMessages[updatedMessages.length - 1],
                  content: newContent,
                };
                updateMessageInSession(
                  sessionId,
                  updatedMessages[updatedMessages.length - 1].id,
                  updatedMessages[updatedMessages.length - 1]
                );
              } else {
                const newMessage: Message = {
                  id: Date.now().toString(),
                  content: responseMessage,
                  isBot: true,
                  isStored: true,
                };
                updatedMessages.push(newMessage);
                addMessageToSession(sessionId, newMessage);
              }
              return updatedMessages;
            });
          }
        } else {
          // No mobile number provided - ask user to enter mobile number
          setMobVerificationStatus((p) => ({
            ...p,
            active: true,
            tool_use_id: commonContentData?.tool_use_id,
          }));
        }
      }
    },
    (inlineMessage) => {
      setInlineText(inlineMessage);
    }
  );

  const [quickActions] = useState([
    { id: "doctor", label: "Help me find a doctor" },
    { id: "appointment", label: "I want to book appointment" },
    { id: "emergency", label: "I have an emergency" },
  ]);

  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      // Use setTimeout to ensure DOM is fully updated
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
      // setProgressMessage(null);
      setIsWaitingForResponse(false); // Clear waiting state when streaming starts
    }
  }, [messages, isStreaming]);

  useEffect(() => {
    if (!isStreaming && sessionId && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.isBot && !lastMessage.isStored) {
        // Mark as stored to prevent duplicate storage
        const updatedMessage = { ...lastMessage, isStored: true };
        setMessages((prev) =>
          prev.map((msg, index) =>
            index === prev.length - 1 ? updatedMessage : msg
          )
        );
        addMessageToSession(sessionId, updatedMessage);
      }
    }
  }, [isStreaming, sessionId]);
  // Clear waiting state when there are errors
  useEffect(() => {
    if (error) {
      setIsWaitingForResponse(false);
      // Clear any pending timeouts when there's an error
      clearResponseTimeout();
      clearStreamingTimeout();
    }
  }, [error]);

  // Timeout logic for waiting for response
  useEffect(() => {
    if (isWaitingForResponse && !isStreaming) {
      // Set a timeout for waiting for response
      const timeoutId = setTimeout(() => {
        console.log("Response timeout: No response received within 30 seconds");
        setIsWaitingForResponse(false);
      }, RESPONSE_TIMEOUT);

      setResponseTimeoutId(timeoutId);

      return () => {
        clearTimeout(timeoutId);
        clearResponseTimeout();
      };
    } else {
      // Clear timeout if not waiting for response
      clearResponseTimeout();
    }
  }, [isWaitingForResponse, isStreaming]);

  // Timeout logic for streaming interruption
  useEffect(() => {
    if (isStreaming) {
      // Update last streaming activity timestamp
      setLastStreamingActivity(Date.now());

      // Set a 5-second timeout for streaming interruption
      const timeoutId = setTimeout(() => {
        const currentState = useMedAssistStore.getState();
        // Only trigger timeout if we're still streaming AND no activity in the last 5 seconds
        if (currentState.isStreaming && currentState.lastStreamingActivity) {
          const timeSinceLastActivity =
            Date.now() - currentState.lastStreamingActivity;
          if (timeSinceLastActivity >= STREAMING_TIMEOUT) {
            console.log(
              "Streaming timeout: No streaming activity for 5 seconds"
            );
            setIsWaitingForResponse(false);
          }
        }
      }, STREAMING_TIMEOUT);

      setStreamingTimeoutId(timeoutId);

      return () => {
        clearTimeout(timeoutId);
        clearStreamingTimeout();
      };
    } else {
      // Clear timeout if not streaming
      clearStreamingTimeout();
      setLastStreamingActivity(null);
    }
  }, [isStreaming]);

  // Control bot icon animation based on progress message and waiting for response
  useEffect(() => {
    const shouldAnimate = !!progressMessage || isWaitingForResponse;
    setIsBotIconAnimating(shouldAnimate);
  }, [progressMessage, isWaitingForResponse]);

  // Clear mobile verification when session changes
  useEffect(() => {
    if (!sessionId) {
      clearMobileVerification();
    }
  }, [sessionId]);

  const showErrorMessage = useMemo(() => {
    return (
      connectionStatus === CONNECTION_STATUS.CONNECTED &&
      isOnline &&
      !error &&
      !showRetryButton &&
      !startNewConnection
    );
  }, [connectionStatus, isOnline, error, showRetryButton, startNewConnection]);

  // Update the ref whenever the state changes
  useEffect(() => {
    mobVerificationStatusRef.current = mobVerificationStatus;
  }, [mobVerificationStatus]);

  const handleSendMessage = async (content: string, tool_use_id?: string) => {
    // Block sending if currently streaming
    if (isStreaming) {
      console.log("Cannot send message while streaming");
      return;
    }

    if (!isOnline) {
      setError(ERROR_MESSAGES.OFFLINE);
      setIsWaitingForResponse(false);
      return;
    }

    if (connectionStatus !== CONNECTION_STATUS.CONNECTED) {
      setError(ERROR_MESSAGES.CONNECTION_LOST);
      setIsWaitingForResponse(false);
      return;
    }
    // Clear any errors when sending a message
    clearError();

    // Clear progress message and tips when sending new message
    setProgressMessage(null);
    setTips(null);

    if (inlineText) {
      setInlineText("");
    }
    try {
      let response: {
        success: boolean;
        data: IMobileVerificationResponse | null;
      } | null = null;

      // Use the ref to get the current state
      if (mobVerificationStatusRef.current.active) {
        if (
          mobVerificationStatusRef.current.stage ===
          MOBILE_VERIFICATION_STAGE.MOBILE_NUMBER
        ) {
          // User is entering mobile number
          const mobileNumber =
            mobVerificationStatusRef.current.mobile_number || content;
          response = await handleMobileVerification(mobileNumber, sessionId);

          if (response?.success) {
            setMobVerificationStatus((prev) => ({
              ...prev,
              isSending: false,
              mobile_number: mobileNumber,
              stage: MOBILE_VERIFICATION_STAGE.OTP,
            }));
          } else {
            clearMobileVerification();
            await sendHiddenChatMessage({
              message:
                response?.data?.error?.msg ||
                "Mobile number verification failed",
              tool_use_id: tool_use_id,
              tool_use_params: {
                mobile_number: mobileNumber,
              },
            });
          }
        } else if (
          mobVerificationStatusRef.current.stage ===
            MOBILE_VERIFICATION_STAGE.OTP &&
          mobVerificationStatusRef.current.mobile_number
        ) {
          // User is entering OTP
          response = await handleOtpVerification(
            content,
            mobVerificationStatusRef.current.mobile_number,
            sessionId
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
          } else if (response?.success) {
            setMobVerificationStatus((prev) => ({
              ...prev,
              active: true,
              isSending: false,
              uhids: response?.data?.uhids || [],
              stage: MOBILE_VERIFICATION_STAGE.UHID,
            }));
          } else {
            //send a hidden message chat messsage to BE
            await sendHiddenChatMessage({
              message: "Otp verification failed",
              tool_use_id: tool_use_id,
              tool_use_params: {
                mobile_number: mobVerificationStatusRef.current.mobile_number,
              },
            });
            //if response is sucess/other otp error / normal message if sent
            clearMobileVerification();
          }
        } else if (
          mobVerificationStatusRef.current.stage ===
          MOBILE_VERIFICATION_STAGE.UHID
        ) {
          response = await handleUhidVerification(content, sessionId);
          //update the last message as responded
          setMessages((prev) => {
            const updatedMessages = [...prev];
            updatedMessages[updatedMessages.length - 1] = {
              ...updatedMessages[updatedMessages.length - 1],
              isResponded: true,
              isStored: true,
            };
            updateMessageInSession(
              sessionId,
              updatedMessages[updatedMessages.length - 1].id,
              updatedMessages[updatedMessages.length - 1]
            );
            return updatedMessages;
          });
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
            await handleSendMessage(
              mobVerificationStatusRef.current.mobile_number || "",
              tool_use_id
            );
          } else {
            const message =
              response?.data?.status === "success"
                ? `Verification successful ,selected uhid: ${content}`
                : response?.data?.error?.msg || "Verification failed";

            const uhid_details = mobVerificationStatusRef.current?.uhids?.find(
              (uhid) => uhid?.uhid === content
            );
            await sendChatMessage({
              message: message,
              tool_use_id: tool_use_id,
              tool_use_params: {
                mobile_number: mobVerificationStatusRef.current.mobile_number,
                ...(uhid_details && { ...uhid_details }),
              },
            });
            clearMobileVerification();
          }
        }

        // Add user message
        const userMessage: Message = {
          id: Date.now().toString(),
          content,
          isBot: false,
          originalUserMessage: content,
          isStored: true,
        };
        setMessages((prev) => [...prev, userMessage]);
        addMessageToSession(sessionId, userMessage);

        // Add bot response if we have one
        if (response) {
          const botMessage: Message = {
            id: (Date.now() + 1).toString(),
            content: response?.success
              ? response?.data?.message || "Success!"
              : response?.data?.error?.msg || "Failed. Please try again.",
            isBot: true,
            isStored: true,
            ...(response?.data?.uhids?.length &&
              mobVerificationStatusRef.current?.tool_use_id && {
                commonContentData: {
                  type: ContentType.MOBILE_VERIFICATION,
                  tool_use_id: mobVerificationStatusRef.current?.tool_use_id,
                  data: {
                    uhids: response?.data?.uhids,
                  },
                },
              }),
          };
          setMessages((prev) => [...prev, botMessage]);
          addMessageToSession(sessionId, botMessage);
        }

        return;
      } else {
        // Normal chat flow - clear mobile verification if active
        await sendChatMessage({ message: content, tool_use_id: tool_use_id });
      }

      // Mark the bot message as responded if it has pills or multiselect
      setMessages((prev) => {
        const updatedMessages = [...prev];
        // Find the last bot message and mark it as responded if it has interactive elements
        for (let i = updatedMessages.length - 1; i >= 0; i--) {
          if (
            updatedMessages[i].isBot &&
            updatedMessages[i].commonContentData
          ) {
            updatedMessages[i] = {
              ...updatedMessages[i],
              isResponded: true,
            };
            updateMessageInSession(
              sessionId,
              updatedMessages[i].id,
              updatedMessages[i]
            );
            break;
          }
        }
        return updatedMessages;
      });

      const newMessage: Message = {
        id: Date.now().toString(),
        content,
        isBot: false,
        originalUserMessage: content, // Store for potential regeneration
        isStored: true,
      };

      setMessages((prev) => [...prev, newMessage]);

      // Set waiting state immediately when message is sent
      setIsWaitingForResponse(true);
      addMessageToSession(sessionId, newMessage);
    } catch (error) {
      console.error("Failed to send message:", error);
      setError({ title: "Failed to send message. Please try again." });
      setIsWaitingForResponse(false); // Clear waiting state on error
      throw error; // Re-throw to let MessageInput handle the error state
    }
  };

  // CHANGED: Now handles AudioData instead of Blob
  const handleFinalAudioStream = async (audioData: AudioData) => {
    if (!isOnline) {
      setError(ERROR_MESSAGES.OFFLINE);
      setIsWaitingForResponse(false);
      return;
    }

    if (connectionStatus !== CONNECTION_STATUS.CONNECTED) {
      setError(ERROR_MESSAGES.CONNECTION_LOST);
      setIsWaitingForResponse(false);
      return;
    }

    // Clear tips when sending final audio stream
    setTips(null);

    // Mark the bot message as responded if it has pills or multiselect
    setMessages((prev) => {
      const updatedMessages = [...prev];
      // Find the last bot message and mark it as responded if it has interactive elements
      for (let i = updatedMessages.length - 1; i >= 0; i--) {
        if (updatedMessages[i].isBot && updatedMessages[i].commonContentData) {
          updatedMessages[i] = {
            ...updatedMessages[i],
            isResponded: true,
          };
          updateMessageInSession(
            sessionId,
            updatedMessages[i].id,
            updatedMessages[i]
          );
          break;
        }
      }
      return updatedMessages;
    });

    try {
      // Send the full audio data
      await sendAudioData(audioData);
      // Send end of stream signal
      if (mobVerificationStatus.active) {
        clearMobileVerification();
        return;
      }
    } catch (error) {
      console.error("Failed to send audio:", error);
      setError({ title: "Failed to send audio message. Please try again." });
      throw error;
    }
  };

  const handleFileUpload = async (files: FileList, message?: string) => {
    // Block file upload if currently streaming
    if (isStreaming) {
      console.log("Cannot upload file while streaming");
      return;
    }

    if (!isOnline) {
      setError(ERROR_MESSAGES.OFFLINE);
      setIsWaitingForResponse(false);
      return;
    }

    if (connectionStatus !== CONNECTION_STATUS.CONNECTED) {
      setError(ERROR_MESSAGES.CONNECTION_LOST);
      setIsWaitingForResponse(false);
      return;
    }
    // Clear any errors when uploading files
    clearError();

    // Mark the bot message as responded if it has pills or multiselect
    setMessages((prev) => {
      const updatedMessages = [...prev];
      // Find the last bot message and mark it as responded if it has interactive elements
      for (let i = updatedMessages.length - 1; i >= 0; i--) {
        if (updatedMessages[i].isBot && updatedMessages[i].commonContentData) {
          updatedMessages[i] = {
            ...updatedMessages[i],
            isResponded: true,
          };
          updateMessageInSession(
            sessionId,
            updatedMessages[i].id,
            updatedMessages[i]
          );
          break;
        }
      }
      return updatedMessages;
    });

    const fileArray = Array.from(files);

    const newMessage: Message = {
      id: Date.now().toString(),
      content:
        message ||
        `📎 ${
          fileArray?.length > 1 ? `${fileArray.length} files` : "File"
        } uploaded`, // Cleaner text
      isBot: false,
      files: fileArray,
      isStored: true,
    };

    setMessages((prev) => [...prev, newMessage]);

    try {
      // Set waiting state immediately when file upload request is sent
      setIsWaitingForResponse(true);

      // Set files for upload when presigned URL is received
      setFilesForUpload(fileArray, message);
      await sendFileUploadRequest();
      addMessageToSession(sessionId, newMessage);
      if (mobVerificationStatus.active) {
        clearMobileVerification();
        return;
      }
    } catch (error) {
      console.error("Failed to upload file:", error);
      setError({ title: "Failed to upload file. Please try again." });
      setIsWaitingForResponse(false); // Clear waiting state on error
      throw error;
    }
  };

  const handleQuickAction = async (actionId: string) => {
    // Block quick actions if currently streaming
    if (isStreaming) {
      console.log("Cannot use quick action while streaming");
      return;
    }

    if (!isOnline) {
      setError(ERROR_MESSAGES.OFFLINE);
      setIsWaitingForResponse(false);
      return;
    }

    if (connectionStatus !== CONNECTION_STATUS.CONNECTED) {
      setError(ERROR_MESSAGES.CONNECTION_LOST);
      setIsWaitingForResponse(false);
      return;
    }
    // Clear any errors when using quick actions
    clearError();

    // Clear progress message and tips when using quick action
    setProgressMessage(null);
    setTips(null);

    const action = quickActions.find((a) => a.id === actionId);
    if (action) {
      try {
        await handleSendMessage(action.label);
      } catch (error) {
        console.error("Failed to send quick action:", error);
      }
    }
  };

  const handleMenuAction = (action: string) => {
    if (action === "clear") {
      setMessages([messages[0]]);
      clearError(); // Clear any errors when clearing chat
      setIsWaitingForResponse(false); // Clear waiting state when clearing chat
    }
  };

  const handleRegenerate = async (messageId: string) => {
    // Find the message to regenerate
    if (!isOnline) {
      setError(ERROR_MESSAGES.OFFLINE);
      setIsWaitingForResponse(false);
      return;
    }

    if (connectionStatus !== CONNECTION_STATUS.CONNECTED) {
      setError(ERROR_MESSAGES.CONNECTION_LOST);
      setIsWaitingForResponse(false);
      return;
    }
    const messageIndex = messages.findIndex((msg) => msg.id === messageId);
    if (messageIndex === -1) {
      console.error("Message not found for regeneration");
      return;
    }

    const message = messages[messageIndex];

    // Only regenerate bot messages
    if (!message.isBot) {
      console.error("Cannot regenerate user messages");
      return;
    }

    // Find the previous user message
    let userMessageIndex = messageIndex - 1;
    while (userMessageIndex >= 0 && messages[userMessageIndex].isBot) {
      userMessageIndex--;
    }

    if (userMessageIndex < 0) {
      console.error("No user message found for regeneration");
      return;
    }

    const userMessage = messages[userMessageIndex];
    if (!userMessage.originalUserMessage) {
      console.error("No original user message found for regeneration");
      return;
    }

    // Block regeneration if currently streaming
    if (isStreaming) {
      console.log("Cannot regenerate while streaming");
      return;
    }

    // Clear any errors when regenerating
    clearError();

    // Clear progress message when regenerating
    setProgressMessage(null);

    console.log("Regenerating response for message:", messageId);
    console.log("Original user message:", userMessage.originalUserMessage);

    // Mark the current bot message as regenerating
    setMessages((prev) => {
      const updatedMessages = [...prev];
      updatedMessages[messageIndex] = {
        ...updatedMessages[messageIndex],
        isRegenerating: true,
        content: "Regenerating response...", // Show regenerating state
      };
      return updatedMessages;
    });

    try {
      // Send regenerate request
      await regenerateResponse(userMessage.originalUserMessage);
      // For now, just clear the regenerating state since regenerateResponse is not available
      console.log("Regenerate requested for:", userMessage.originalUserMessage);
      setMessages((prev) => {
        const updatedMessages = [...prev];
        updatedMessages[messageIndex] = {
          ...updatedMessages[messageIndex],
          isRegenerating: false,
          content: "Regeneration not implemented in V2 yet",
        };
        return updatedMessages;
      });
    } catch (error) {
      console.error("Failed to regenerate:", error);
      // setError({ title: "Failed to regenerate response. Please try again." });
      // Reset the message on error
      setMessages((prev) => {
        const updatedMessages = [...prev];
        updatedMessages[messageIndex] = {
          ...updatedMessages[messageIndex],
          isRegenerating: false,
          content: message.content, // Restore original content
        };
        return updatedMessages;
      });
    }
  };

  const handleStartNewSession = () => {
    try {
      setMessages([messages[0]]);
      clearSession();
      setIsWaitingForResponse(false); // Clear waiting state when starting new session
      onStartSession?.(true);
    } catch (error) {
      console.error("Failed to start new session:", error);
      // setError({ title: "Failed to start new session. Please try again." });
      throw error;
    }
  };

  const handleRetry = async () => {
    if (connectionStatus !== CONNECTION_STATUS.CONNECTED) {
      if (wsService) {
        clearError();
        wsService.reconnect(true, "manual reconnect");
      }
    } else {
      // If socket throws an error (e.g., parsing / code-related error) → retry last message
      try {
        const success = await retryLastMessage();
        if (success) {
          clearError();
          setIsWaitingForResponse(true);
        }
      } catch (error) {
        console.error("Failed to retry last message:", error);
        setError({ title: "Failed to retry message. Please try again." });
      }
    }
  };

  const exitMobileVerification = async () => {
    const exitMessage = `Exit ${mobVerificationStatus?.stage || "Mobile"} verification ${
            mobVerificationStatusRef?.current?.mobile_number
              ? "for mobile number:" +
                mobVerificationStatusRef.current?.mobile_number
              : ""
          }`
    const tool_use_id = mobVerificationStatusRef.current?.tool_use_id;
    await clearMobileVerification();

    await handleSendMessage(exitMessage, tool_use_id || "");
  };

  //TODO: add a wrapper for all too callbackes with trigger refresh session

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
  // New handlers for appointment-card to use
  const handleGetAvailabilityDatesForAppointment = async (doctorData: {
    doctor_id: string;
    hospital_id?: string;
    region_id?: string;
  }) => {
    if (!doctorData?.doctor_id) {
      return { success: false, data: null };
    }
    try {
      const response = await getAvailabilityDates(sessionId, {
        doctor_id: doctorData.doctor_id,
        hospital_id: doctorData.hospital_id || "",
        region_id: doctorData.region_id || "",
      });
      if (!response?.available_dates?.length) {
        console.error("Available dates are not coming in response", response);
        return { success: false, data: null };
      }
      return { success: true, data: response };
    } catch (error) {
      console.error("Error loading availability dates:", error);
      return { success: false, data: null };
    }
  };

  const handleGetAvailableSlotsForAppointment = async (
    appointment_date: string,
    doctorData: {
      doctor_id: string;
      hospital_id?: string;
      region_id?: string;
    }
  ) => {
    if (!doctorData?.doctor_id || !appointment_date) {
      return { success: false, data: null };
    }
    try {
      const response = await getAvailabilitySlots(sessionId, {
        doctor_id: doctorData.doctor_id,
        appointment_date: appointment_date,
        hospital_id: doctorData.hospital_id || "",
        region_id: doctorData.region_id || "",
      });
      if (!response?.slots?.length) {
        console.error("Available slots are not coming in response", response);
        return { success: false, data: null };
      }
      return { success: true, data: response };
    } catch (error) {
      console.error("Error loading slots for date:", error);
      return { success: false, data: null };
    }
  };

  // Mobile full-screen styles
  const containerStyles = isMobile
    ? "fixed inset-0 z-[2147483647] bg-[var(--color-card)] border-border rounded-none flex flex-col h-[100dvh] w-screen py-0 gap-1 overflow-hidden"
    : isExpanded
    ? "fixed inset-4 z-[2147483647] bg-[var(--color-card)] border-border rounded-lg shadow-2xl flex flex-col max-h-[calc(100vh-2rem)] py-0 pt-1 gap-1"
    : `w-full max-w-sm bg-[var(--color-card)] border-border shadow-lg rounded-lg py-0 pt-1 gap-1${className} `;
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
      />

      {/* Loading State */}
      {isLoading && (
        <div
          className={`${chatHeight} flex items-center justify-center py-8 px-4`}>
          <div className="text-center w-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
            <p className="text-sm text-[var(--color-muted-foreground)] break-words">
              Starting session...
            </p>
          </div>
        </div>
      )}

      {/* {!isLoading && (
        <div className="text-xs text-[var(--color-muted-foreground)] text-center">
          {getCurrentTimestamp()}
        </div>
      )} */}
      {!isLoading && (
        <div
          className={`${chatHeight} flex flex-col overflow-hidden max-h-screen`}>
          <div
            ref={scrollAreaRef}
            className="flex-1 min-h-0 overflow-y-auto"
            style={{
              scrollBehavior: "smooth",
              scrollbarWidth: "thin",
              scrollbarColor: "var(--color-border) transparent",
            }}>
            <div className="space-y-1">
              {messages.map((message, index) => (
                <MessageBubble
                  key={message.id}
                  messageId={message.id}
                  message={message.content}
                  isBot={message.isBot}
                  showActions={messages.length === 1}
                  handleQuickAction={handleQuickAction}
                  quickActions={quickActions}
                  isQuickActionsDisabled={
                    connectionStatus !== CONNECTION_STATUS.CONNECTED ||
                    isStreaming ||
                    !isOnline
                  }
                  isStreaming={
                    message.isBot &&
                    isStreaming &&
                    index === messages.length - 1
                  }
                  progressMessage={
                    message.isBot && index === messages.length - 1
                      ? progressMessage
                      : null
                  }
                  getAvailabilityDatesForAppointment={
                    handleGetAvailabilityDatesForAppointment
                  }
                  getAvailableSlotsForAppointment={
                    handleGetAvailableSlotsForAppointment
                  }
                  tips={
                    message.isBot && index === messages.length - 1 ? tips : null
                  }
                  verificationStatus={
                    mobVerificationStatus.active &&
                    index === messages.length - 1
                  }
                  clearMobileVerification={exitMobileVerification}
                  onTipsExpire={() => setTips(null)}
                  isRegenerating={message.isRegenerating}
                  commonContentData={message.commonContentData}
                  onContentClick={handleSendMessage}
                  onRegenerate={handleRegenerate}
                  audioData={message.audioData} // Pass audio data to MessageBubble
                  isResponded={message.isResponded}
                  files={message.files}
                />
              ))}

              {/* Show loading indicator when waiting for response */}
              {isWaitingForResponse && !isStreaming && (
                <div className="px-2 py-4">
                  <div className="flex gap-1 items-start justify-center">
                    <div className="flex-shrink-0">
                      <ApolloAssistIcon
                        size={32}
                        isAnimating={isBotIconAnimating}
                      />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm leading-relaxed px-3 rounded-lg text-[var(--color-foreground)] bg-[var(--color-card)]">
                        <span className="animate-pulse">...</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {progressMessage && !isStreaming && (
                <div className="px-2 py-4">
                  <div className="flex gap-1 items-start justify-center">
                    <div className="flex-shrink-0">
                      <ApolloAssistIcon
                        size={32}
                        isAnimating={isBotIconAnimating}
                      />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm leading-relaxed px-3 rounded-lg text-[var(--color-foreground)] bg-[var(--color-card)]">
                        <div className="ml-2 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent font-medium">
                          {progressMessage}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
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
              />
            ) : mobVerificationStatus.stage === MOBILE_VERIFICATION_STAGE.OTP &&
              mobVerificationStatus.mobile_number ? (
              <OTPInput
                mobileNumber={mobVerificationStatus.mobile_number}
                onSendOTP={handleSendMessage}
                // onEditMobile={handleEditMobile}
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
