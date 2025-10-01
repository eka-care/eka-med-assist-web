import { useEffect, useRef } from "react";
import useMedAssistStore from "../stores/medAssistStore";
import {
  ContentType,
  type ChatResponseMessage,
  type WebSocketConfig,
  type EndOfStreamMessage,
  type StreamResponseMessage,
  ERROR_MESSAGES,
  ErrorMessage,
  SOCKET_ERROR_CODES,
  type CommonContentCallback,
  type CommonHandlerData,
} from "@/types/socket";
import {
  WEBSOCKET_CUSTOM_EVENTS,
  WEBSOCKET_SERVER_EVENTS,
} from "@/configs/enums";

import type { AudioData } from "@/services/audioService";
import { WebSocketService } from "@/services/WebSocketService";
import { CONNECTION_STATUS } from "@/types/widget";

export function useWebSocket(
  config: WebSocketConfig | null,
  onTextMessage?: (message: string) => void,
  onProgressMessage?: (message: string) => void,
  onTipsMessage?: (tips: string[]) => void,
  onCommonContent?: CommonContentCallback,
  onInlineText?: (inlineMessage: string) => void
) {
  const wsRef = useRef<WebSocketService | null>(null);
  const retryAttempts = useRef(0);
  const lastSentMessageRef = useRef<{
    content: string;
    tool_use_id?: string;
    type: "text" | "audio" | "file";
    audioData?: AudioData;
    files?: File[];
    message?: string;
    tool_use_params?: any;
  } | null>(null);
  const setError = useMedAssistStore((state) => state.setError);
  const setShowRetryButton = useMedAssistStore(
    (state) => state.setShowRetryButton
  );
  const setStartNewConnection = useMedAssistStore(
    (state) => state.setStartNewConnection
  );
  const refreshSession = useMedAssistStore((state) => state.refreshSession);
  const setSessionId = useMedAssistStore((state) => state.setSessionId);
  const setSessionToken = useMedAssistStore((state) => state.setSessionToken);
  const isAudioStreaming = useRef(false);
  const {
    setIsStreaming,
    isStreaming,
    connectionStatus,
    setConnectionStatus,
    clearResponseTimeout,
    clearStreamingTimeout,
    setLastStreamingActivity,
  } = useMedAssistStore();

  useEffect(() => {
    if (!config || !config.sessionId || !config.auth?.token) {
      console.log("No config provided", config);
      setConnectionStatus(CONNECTION_STATUS.CONNECTING);
      return;
    }
    if (wsRef.current?.isConnected()) {
      console.log("WebSocket already connected, skipping connection");
      return;
    }
    // Create WebSocket service
    const service = new WebSocketService(config);
    console.log("WebSocket service  created:", service);
    wsRef.current = service;

    // Set up event listeners
    wsRef.current?.on(
      WEBSOCKET_SERVER_EVENTS.CONNECTION_ESTABLISHED,
      (connected: boolean) => {
        console.log("WebSocket connection:", connected);
        setConnectionStatus(CONNECTION_STATUS.CONNECTED);
        if (connected) {
          setShowRetryButton(false);
          setStartNewConnection(false);
          setError(null);
          retryAttempts.current = 0;
        } else {
          setShowRetryButton(true);
          setError(ERROR_MESSAGES.CONNECTION_LOST);
          setConnectionStatus(CONNECTION_STATUS.DISCONNECTED);
        }
      }
    );

    wsRef.current?.on(WEBSOCKET_SERVER_EVENTS.PONG, (_: any) => {
      //TODO: Handle PONG
    });

    wsRef.current.on(WEBSOCKET_SERVER_EVENTS.SYNC, (_: any) => {
      //TODO: Handle SYNC
    });

    wsRef.current?.on(
      WEBSOCKET_SERVER_EVENTS.CHAT,
      (message: ChatResponseMessage) => {
        if (
          message.ct === ContentType.FILE &&
          message.data &&
          "url" in message.data
        ) {
          service
            .uploadFilesToPresignedUrl(message.data?.url || "")
            .then(() => {
              // setPendingFiles([]);
            })
            .catch((error) => {
              console.error("Failed to upload files:", error);
            });
        } else if (
          (message.ct === ContentType.PILL ||
            message.ct === ContentType.MULTI ||
            message.ct === ContentType.DOCTOR_CARD ||
            message.ct === ContentType.MOBILE_VERIFICATION) &&
          message.data.tool_use_id
        ) {
          // Call the common callback to handle all content types
          if (onCommonContent) {
            const commonData: CommonHandlerData = {
              type: message.ct,
              tool_use_id: message.data.tool_use_id,
              data: {
                choices: message.data.choices,
                doctor_details: message.data.doctor_details,
                callbacks: message.data.callbacks,
                additional_option: message.data.additional_option,
                url: message.data.url,
                mobile_number: message.data.mobile_number,
              },
            };
            onCommonContent(commonData);
          }
        } else if (
          message.ct === ContentType.TEXT &&
          message.data &&
          message.data.text
        ) {
          //just is streaming is not live inside event callbacks
          const currentStreaming = useMedAssistStore.getState().isStreaming;
          if (!currentStreaming) {
            setIsStreaming(true);
            // Clear response timeout when streaming starts
            clearResponseTimeout();
            setError(null);
          }
          // Update streaming activity timestamp
          setLastStreamingActivity(Date.now());
          if (onTextMessage) {
            onTextMessage(message.data.text);
          }
          setTimeout(() => {
            if (useMedAssistStore.getState().isStreaming) {
              setIsStreaming(false);
            }
          }, 0);
        } else if (
          message.ct === ContentType.INLINE_TEXT &&
          message.data &&
          message.data.text
        ) {
          const currentStreaming = useMedAssistStore.getState().isStreaming;
          if (!currentStreaming) {
            setIsStreaming(true);
            // Clear response timeout when streaming starts
            clearResponseTimeout();
          }
          // Update streaming activity timestamp
          setLastStreamingActivity(Date.now());
          //handle inline text
          if (onInlineText) {
            onInlineText(message.data.text);
          }
          setTimeout(() => {
            if (useMedAssistStore.getState().isStreaming) {
              setIsStreaming(false);
            }
          }, 0);
        }
      }
    );

    wsRef.current?.on(
      WEBSOCKET_SERVER_EVENTS.STREAM,
      (message: StreamResponseMessage) => {
        const currentStreaming = useMedAssistStore.getState().isStreaming;
        if (!currentStreaming) {
          setIsStreaming(true);
          // Clear response timeout when streaming starts
          clearResponseTimeout();
          setError(null);
        }
        // Update streaming activity timestamp
        setLastStreamingActivity(Date.now());
        if (
          message.ct === ContentType.TEXT &&
          message.data &&
          message.data.text &&
          onTextMessage
        ) {
          // Call the callback to display the bot response
          onTextMessage(message.data.text);
        }
      }
    );

    // Listen to the accumulated streaming text instead of individual fragments
    wsRef.current?.on("stream_chunk", (accumulatedText: string) => {
      if (!isStreaming) {
        setIsStreaming(true);
        // Clear response timeout when streaming starts
        clearResponseTimeout();
        setError(null);
      }
      // Update streaming activity timestamp
      setLastStreamingActivity(Date.now());
      if (onTextMessage) {
        // Call the callback with the accumulated text
        onTextMessage(accumulatedText);
      }
    });

    wsRef.current?.on(
      WEBSOCKET_SERVER_EVENTS.END_OF_STREAM,
      (_: EndOfStreamMessage) => {
        setIsStreaming(false);
        // Clear streaming timeout when streaming ends properly
        clearStreamingTimeout();

        // Clear the last sent message data when response is complete
        lastSentMessageRef.current = null;

        // Call the callback to display the end of stream message
        if (onProgressMessage) {
          onProgressMessage("");
        }
      }
    );

    //handle error differenty ,send entire errorMessage instance
    wsRef.current?.on(WEBSOCKET_SERVER_EVENTS.ERROR, (error: ErrorMessage) => {
      console.error("WebSocket error:", error);
      switch (error.code) {
        case SOCKET_ERROR_CODES.SESSION_INACTIVE: {
          setShowRetryButton(false);
          setStartNewConnection(true);
          setError(ERROR_MESSAGES.SESSION_INACTIVE);
          break;
        }
        case SOCKET_ERROR_CODES.SESSION_EXPIRED: {
          console.log("Session expired from useWebSocket");
          triggerSessionRefresh();
          setError(ERROR_MESSAGES.SESSION_EXPIRED);
          break;
        }
        case SOCKET_ERROR_CODES.INVALID_EVENT: {
          // setShowRetryButton(true);
          setError(ERROR_MESSAGES.INVALID_EVENT);
          break;
        }
        case SOCKET_ERROR_CODES.INVALID_CONTENT_TYPE: {
          // setShowRetryButton(true);
          setError(ERROR_MESSAGES.INVALID_CONTENT_TYPE);
          break;
        }
        case SOCKET_ERROR_CODES.PARSING_ERROR: {
          if (retryAttempts.current < 2) {
            console.log("Retrying...");
            retryAttempts.current++;
            setShowRetryButton(true);
            setError(ERROR_MESSAGES.PARSING_ERROR);
          } else {
            setShowRetryButton(false);
            setStartNewConnection(true);
            retryAttempts.current = 0;
            setError(ERROR_MESSAGES.ERROR_PROCESSING_MESSAGE);
          }
          break;
        }

        case SOCKET_ERROR_CODES.SERVER_ERROR: {
          setShowRetryButton(true);
          setError(ERROR_MESSAGES.SERVER_ERROR);
          break;
        }
        case SOCKET_ERROR_CODES.TIMEOUT: {
          setError(ERROR_MESSAGES.TIMEOUT);
          setShowRetryButton(true);
          break;
        }
        case SOCKET_ERROR_CODES.SESSION_TOKEN_MISMATCH: {
          setError(ERROR_MESSAGES.SESSION_TOKEN_MISMATCH);
          setShowRetryButton(false);
          setStartNewConnection(true);
          break;
        }
        default: {
          setError({ title: error.msg });
          setShowRetryButton(true);
          break;
        }
      }
    });

    wsRef.current?.on(
      WEBSOCKET_CUSTOM_EVENTS.SESSION_INACTIVE,
      (error: Error) => {
        console.error("Session inactive:", error);
        setShowRetryButton(false);
        setStartNewConnection(true);
        setError(ERROR_MESSAGES.SESSION_INACTIVE); //Already handled in WebSocketService
      }
    );

    // Handle progress messages
    wsRef.current?.on("progress_message", (progressMessage: string) => {
      // Update streaming activity timestamp for progress messages
      setLastStreamingActivity(Date.now());
      const currentStreaming = useMedAssistStore.getState().isStreaming;
      if (!currentStreaming) {
        // setIsStreaming(true);
        // Clear response timeout when streaming starts
        clearResponseTimeout();
        setError(null);
      }
      if (onProgressMessage) {
        onProgressMessage(progressMessage);
        setError(null);
      }
    });

    wsRef.current?.on(WEBSOCKET_CUSTOM_EVENTS.TIPS, (tips: string[]) => {
      // Update streaming activity timestamp for tips
      setLastStreamingActivity(Date.now());
      if (onTipsMessage) {
        onTipsMessage(tips);
      }
    });

    // Handle progressive text updates
    wsRef.current?.on("stream_chunk", (progressiveText: string) => {
      setError(null);
      if (onTextMessage) {
        // Call the callback with the progressive text
        onTextMessage(progressiveText);
      }
      if (!isStreaming) {
        setIsStreaming(true);
      }
    });

    wsRef.current?.on("message", (message: any) => {
      if (message.metadata?.isStreaming === false) {
        setIsStreaming(false);
        // Clear streaming timeout when streaming ends
        clearStreamingTimeout();
        setError(null);
      }
    });

    wsRef.current?.on(
      WEBSOCKET_CUSTOM_EVENTS.MAX_CONNECTION_ATTEMPTS_EXCEEDED,
      (data: any) => {
        console.log("MAX_CONNECTION_ATTEMPTS_EXCEEDED received:", data);
        // If connection attempts exceeded → set showRetry = true
        setShowRetryButton(true);
        setError(ERROR_MESSAGES.CONNECTION_ATTEMPTS_EXCEEDED);
      }
    );

    wsRef.current?.on(
      WEBSOCKET_CUSTOM_EVENTS.MAX_RECONNECTION_ATTEMPTS_EXCEEDED,
      (data: any) => {
        console.log("MAX_RECONNECTION_ATTEMPTS_EXCEEDED received:", data);
        // If max reconnection attempts exceeded → show new session error
        setShowRetryButton(false);
        setStartNewConnection(true);
      }
    );

    wsRef.current?.on(
      WEBSOCKET_CUSTOM_EVENTS.CONNECTION_TIMEOUT_ERROR,
      (data: any) => {
        console.log("CONNECTION_TIMEOUT_ERROR received:", data);
        // If connection timeout error → show retry button
        setShowRetryButton(true);
        setError(ERROR_MESSAGES.CONNECTION_LOST);
      }
    );

    // Handle session refresh events
    wsRef.current?.on(
      WEBSOCKET_CUSTOM_EVENTS.SESSION_REFRESHED,
      (success: boolean) => {
        console.log("SESSION_REFRESHED received:", success);
        if (success) {
          // Session was refreshed successfully, update the store
          const currentState = useMedAssistStore.getState();
          if (currentState.sessionId && currentState.sessionToken) {
            setSessionId(currentState.sessionId);
            setSessionToken(currentState.sessionToken);

            // Also update the WebSocket service config
            if (wsRef.current) {
              wsRef.current.updateConfig({
                sessionId: currentState.sessionId,
                auth: { token: currentState.sessionToken },
              });
            }

            console.log("Session store updated after refresh");
          }
        }
      }
    );

    // Handle start new session event
    wsRef.current?.on(WEBSOCKET_CUSTOM_EVENTS.START_NEW_SESSION, (_: Error) => {
      setShowRetryButton(false);
      setStartNewConnection(true);
      setError(ERROR_MESSAGES.SESSION_INACTIVE);
    });

    wsRef.current?.on(WEBSOCKET_CUSTOM_EVENTS.SESSION_EXPIRED, (_: Error) => {
      setShowRetryButton(false);
      triggerSessionRefresh();
      setError(ERROR_MESSAGES.SESSION_EXPIRED);
    });

    // Connect to WebSocket
    service.connect().catch((error) => {
      console.error("Failed to connect to WebSocket:", error);
      setError(ERROR_MESSAGES.CONNECTION_LOST);
      setConnectionStatus(CONNECTION_STATUS.DISCONNECTED);
      // setConnectionEstablished(false);
    });

    // Cleanup function
    return () => {
      if (wsRef.current) {
        wsRef.current.disconnect();
        wsRef.current = null;
      }
      setIsStreaming(false);
      clearStreamingTimeout();
      clearResponseTimeout();
      setError(null);
      setLastStreamingActivity(null);
      lastSentMessageRef.current = null;
      setShowRetryButton(false);
      setStartNewConnection(false);
      setConnectionStatus(CONNECTION_STATUS.DISCONNECTED);
    };
  }, [config?.sessionId, config?.auth?.token, setConnectionStatus]);

  // Send chat message (alias for sendTextMessage)
  const sendChatMessage = ({
    message,
    tool_use_id,
    tool_use_params,
  }: {
    message: string;
    tool_use_id?: string;
    tool_use_params?: any;
  }) => {
    if (wsRef.current?.isConnected()) {
      try {
        // Store the last sent message data for potential retry
        lastSentMessageRef.current = {
          content: message,
          tool_use_id,
          type: "text",
        };

        wsRef.current.sendChatMessage({
          message: message,
          tool_use_id: tool_use_id,
          tool_use_params: tool_use_params,
        });
      } catch (error) {
        console.error("Failed to send text message:", error);
        setError(
          error instanceof Error
            ? { title: error.message }
            : { title: "Failed to send message" }
        );
      }
    } else {
      console.error("WebSocket not connected");
      setError(ERROR_MESSAGES.CONNECTION_LOST);
      setConnectionStatus(CONNECTION_STATUS.DISCONNECTED);
      setShowRetryButton(true);
    }
  };

  const sendHiddenChatMessage = ({
    message,
    tool_use_id,
    tool_use_params,
  }: {
    message: string;
    tool_use_id?: string;
    tool_use_params?: any;
  }) => {
    if (wsRef.current?.isConnected()) {
      try {
        wsRef.current.sendChatMessage({
          message: message,
          tool_use_id: tool_use_id,
          hidden: true,
          tool_use_params: tool_use_params,
        });
      } catch (error) {
        console.error("Failed to send hidden text message:", error);
      }
    } else {
      console.error("WebSocket not connected");
      setError(ERROR_MESSAGES.CONNECTION_LOST);
      setConnectionStatus(CONNECTION_STATUS.DISCONNECTED);
      setShowRetryButton(true);
    }
  };

  // Send full audio data (AudioServiceV2 format)
  const sendAudioData = (audioData: AudioData) => {
    if (wsRef.current?.isConnected()) {
      try {
        if (!isAudioStreaming.current) {
          isAudioStreaming.current = true;
        }

        // Store the last sent message data for potential retry
        lastSentMessageRef.current = {
          content: "🎤 Voice message sent",
          type: "audio",
          audioData,
        };

        wsRef.current.sendAudioData(audioData);
        isAudioStreaming.current = false;
      } catch (error) {
        console.error("Failed to send audio data:", error);
        setError(
          error instanceof Error
            ? { title: error.message }
            : { title: "Failed to send audio" }
        );
      }
    } else {
      console.error("WebSocket not connected");
      setError(ERROR_MESSAGES.CONNECTION_LOST);
      setConnectionStatus(CONNECTION_STATUS.DISCONNECTED);
      setShowRetryButton(true);
    }
  };

  // Send file upload request
  const sendFileUploadRequest = () => {
    if (wsRef.current && connectionStatus === CONNECTION_STATUS.CONNECTED) {
      wsRef.current.sendFileUploadRequest();
    }
  };

  // Send file upload completion
  const sendFileUploadComplete = (s3Url: string) => {
    if (wsRef.current && connectionStatus === CONNECTION_STATUS.CONNECTED) {
      wsRef.current.sendFileUploadComplete(s3Url);
    }
  };

  // Set files for upload when presigned URL is received
  const setFilesForUpload = (files: File[], message?: string) => {
    // Store the last sent message data for potential retry
    lastSentMessageRef.current = {
      content:
        message ||
        `📎 ${files.length > 1 ? `${files.length} files` : "File"} uploaded`,
      type: "file",
      files,
      message,
    };

    // setPendingFiles(files);
    if (wsRef.current) {
      wsRef.current.setFilesForUpload(files, message);
    }
  };

  // Clear pending files
  const clearPendingFiles = () => {
    // setPendingFiles([]);
    if (wsRef.current) {
      wsRef.current.clearPendingFiles();
    }
  };

  // Regenerate response for a specific chat
  const regenerateResponse = (originalUserMessage: string) => {
    if (wsRef.current && connectionStatus === CONNECTION_STATUS.CONNECTED) {
      // Clear streaming state when regenerating
      setIsStreaming(false);
      wsRef.current.regenerateResponse(originalUserMessage);
    }
  };

  // Clear error
  const clearError = () => {
    setError(null);
  };

  // Manual session refresh
  const triggerSessionRefresh = async (): Promise<boolean> => {
    try {
      if (wsRef.current) {
        wsRef.current.disconnect();
      }
      const status = await refreshSession();
      if (status) {
        console.log("Manual session refresh successful");
      } else {
        setShowRetryButton(false);
        setStartNewConnection(true);
        setError(ERROR_MESSAGES.SESSION_EXPIRED);
        console.log("Manual session refresh failed");
      }
      return status;
    } catch (error) {
      console.error("Error during manual session refresh:", error);
      return false;
    }
  };

  // Retry the last sent message
  const retryLastMessage = async () => {
    if (!wsRef.current?.isConnected()) {
      console.error("WebSocket not connected, cannot retry message");
      setError(ERROR_MESSAGES.CONNECTION_LOST);
      setConnectionStatus(CONNECTION_STATUS.DISCONNECTED);
      setShowRetryButton(true);
      return false;
    }
    if (!lastSentMessageRef.current) {
      console.error("No last message to retry");
      // setError({ title: "No message to retry" });
      return false;
    }

    const lastMessage = lastSentMessageRef.current;

    try {
      switch (lastMessage.type) {
        case "text":
          await sendChatMessage({
            message: lastMessage.content,
            tool_use_id: lastMessage.tool_use_id,
            tool_use_params: lastMessage.tool_use_params,
          });
          break;
        case "audio":
          if (lastMessage.audioData) {
            await sendAudioData(lastMessage.audioData);
          }
          break;
        case "file":
          if (lastMessage.files) {
            await setFilesForUpload(lastMessage.files, lastMessage.message);
            await sendFileUploadRequest();
          }
          break;
        default:
          console.error("Unknown message type for retry:", lastMessage.type);
          return false;
      }
      return true;
    } catch (error) {
      console.error("Failed to retry last message:", error);
      setError({ title: "Failed to retry message. Please try again." });
      return false;
    }
  };

  // Check if WebSocket is connected
  const isConnected = () => {
    return wsRef.current?.isConnected() || false;
  };

  // Get connection state
  const getConnectionState = () => {
    return wsRef.current?.getConnectionState() || null;
  };

  return {
    // State
    isAudioStreaming: isAudioStreaming.current,
    isConnected: isConnected(),
    connectionState: getConnectionState(),

    // Actions
    sendChatMessage,
    sendAudioData,
    sendFileUploadRequest,
    sendFileUploadComplete,
    setFilesForUpload,
    clearPendingFiles,
    clearError,
    regenerateResponse,
    triggerSessionRefresh,
    retryLastMessage,
    sendHiddenChatMessage,
    // WebSocket service reference (for advanced usage)
    webSocketService: wsRef.current,
  };
}
