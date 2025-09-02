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

export function useWebSocket(
  config: WebSocketConfig | null,
  onTextMessage?: (message: string) => void,
  onProgressMessage?: (message: string) => void,
  onCommonContent?: CommonContentCallback
  //   onAudioData?: (audioData: AudioData) => void
) {
  const wsRef = useRef<WebSocketService | null>(null);
  const setError = useMedAssistStore((state) => state.setError);
  const setShowRetryButton = useMedAssistStore(
    (state) => state.setShowRetryButton
  );
  const setStartNewConnection = useMedAssistStore(
    (state) => state.setStartNewConnection
  );
  // const [isStreaming, setIsStreaming] = useState(false);
  const isAudioStreaming = useRef(false);
  // const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const {
    isConnectionEstablished,
    setConnectionEstablished,
    setIsStreaming,
    isStreaming,
  } = useMedAssistStore();

  useEffect(() => {
    console.log("hi use web socket");
    if (!config || !config.sessionId || !config.auth?.token) {
      console.log("No config provided", config);
      setConnectionEstablished(false);
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
        setConnectionEstablished(connected);
        if (connected) {
          setShowRetryButton(false);
          setStartNewConnection(false);
        }
      }
    );

    wsRef.current?.on(WEBSOCKET_SERVER_EVENTS.PONG, (data: any) => {
      console.log("PONG received:", data);
      //TODO: Handle PONG
    });

    wsRef.current.on(WEBSOCKET_SERVER_EVENTS.SYNC, (data: any) => {
      console.log("SYNC received:", data);
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
          console.log("File upload URL received:", message.data);
          service
            .uploadFilesToPresignedUrl(message.data?.url || "")
            .then(() => {
              // setPendingFiles([]);
              console.log("Files uploaded successfully");
            })
            .catch((error) => {
              console.error("Failed to upload files:", error);
            });
        }
        console.log("message.ct", message.ct);
        if (
          (message.ct === ContentType.PILL ||
            message.ct === ContentType.MULTI ||
            message.ct === ContentType.DOCTOR_CARD) &&
          message.data.tool_use_id
        ) {
          console.log(`${message.ct} message received:`, message.data);
          // Call the common callback to handle all content types
          if (onCommonContent) {
            const commonData: CommonHandlerData = {
              type: message.ct,
              tool_use_id: message.data.tool_use_id,
              data: {
                choices: message.data.choices,
                doctor_details: message.data.doctor_details,
                additional_option: message.data.additional_option,
                url: message.data.url,
              },
            };
            onCommonContent(commonData);
          }
        }
      }
    );

    wsRef.current?.on(
      WEBSOCKET_SERVER_EVENTS.STREAM,
      (message: StreamResponseMessage) => {
        if (!isStreaming) {
          setIsStreaming(true);
        }
        console.log("STREAM received:", message);
        if (
          message.ct === ContentType.TEXT &&
          message.data &&
          message.data.text &&
          onTextMessage
        ) {
          console.log("Text message received:", message.data.text);
          // Call the callback to display the bot response
          onTextMessage(message.data.text);
        }
      }
    );

    // Listen to the accumulated streaming text instead of individual fragments
    wsRef.current?.on("stream_chunk", (accumulatedText: string) => {
      if (!isStreaming) {
        setIsStreaming(true);
      }
      console.log("Stream chunk (accumulated) received:", accumulatedText);
      if (onTextMessage) {
        // Call the callback with the accumulated text
        onTextMessage(accumulatedText);
      }
    });

    wsRef.current?.on(
      WEBSOCKET_SERVER_EVENTS.END_OF_STREAM,
      (message: EndOfStreamMessage) => {
        console.log("END_OF_STREAM received:", message);
        setIsStreaming(false);
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
          setShowRetryButton(false);
          setStartNewConnection(true);
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
          setShowRetryButton(true);
          setError(ERROR_MESSAGES.PARSING_ERROR);
          break;
        }
        case SOCKET_ERROR_CODES.FILE_UPLOAD_INPROGRESS: {
          // setShowRetryButton(true);
          //TODO: handle this case
          setError(ERROR_MESSAGES.FILE_UPLOAD_INPROGRESS);
          break;
        }
        case SOCKET_ERROR_CODES.SERVER_ERROR: {
          // setShowRetryButton(true);
          setError(ERROR_MESSAGES.SERVER_ERROR);
          break;
        }
        default: {
          setError({ title: error.msg });
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
      console.log("Progress message received:", progressMessage);
      if (onProgressMessage) {
        onProgressMessage(progressMessage);
      }
    });

    // Handle progressive text updates
    wsRef.current?.on("stream_chunk", (progressiveText: string) => {
      console.log("Progressive text received:", progressiveText);
      if (onTextMessage) {
        // Call the callback with the progressive text
        onTextMessage(progressiveText);
      }
      if (!isStreaming) {
        console.log("Setting isStreaming to true");
        setIsStreaming(true);
      }
    });

    wsRef.current?.on("message", (message: any) => {
      console.log("Message received:", message);
      if (message.metadata?.isStreaming === false) {
        setIsStreaming(false);
      }
    });

    wsRef.current?.on(
      WEBSOCKET_CUSTOM_EVENTS.MAX_CONNECTION_ATTEMPTS_EXCEEDED,
      (data: any) => {
        console.log("MAX_CONNECTION_ATTEMPTS_EXCEEDED received:", data);
        // If connection attempts exceeded → set showRetry = true
        setShowRetryButton(true);
        console.log("setting error to CONNECTION_ATTEMPTS_EXCEEDED");
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

    // Connect to WebSocket
    service
      .connect()
      .then(() => {
        console.log("WebSocket connected successfully");
      })
      .catch((error) => {
        console.error("Failed to connect to WebSocket:", error);
        setError(ERROR_MESSAGES.CONNECTION_LOST);
        setConnectionEstablished(false);
      });

    // Cleanup function
    return () => {
      if (wsRef.current) {
        wsRef.current.disconnect();
        wsRef.current = null;
      }
      setConnectionEstablished(false);
    };
  }, [config?.sessionId, config?.auth?.token, setConnectionEstablished]);



  // Send chat message (alias for sendTextMessage)
  const sendChatMessage = (message: string, tool_use_id?: string) => {
    if (wsRef.current?.isConnected()) {
      try {
        wsRef.current.sendChatMessage(message, tool_use_id);
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
    }
  };

  // // Send pill message
  // const sendPillMessage = (pillMessage: string, tool_use_id: string) => {
  //   if (wsRef.current && isConnectionEstablished) {
  //     wsRef.current.sendChatMessage(pillMessage, tool_use_id);
  //     console.log(
  //       "Pill message sent:",
  //       pillMessage,
  //       "tool_use_id:",
  //       tool_use_id
  //     );
  //   }
  // };
  // Send full audio data (AudioServiceV2 format)
  const sendAudioData = (audioData: AudioData) => {
    if (wsRef.current?.isConnected()) {
      try {
        if (!isAudioStreaming.current) {
          wsRef.current?.sendAudioStreamStart();
          isAudioStreaming.current = true;
        }
        console.log("Sending audio data via WebSocket:", audioData);
        wsRef.current.sendAudioData(audioData);
        isAudioStreaming.current = true;
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
    }
  };

  // Send end of audio stream
  const sendEndOfAudioStream = () => {
    if (wsRef.current?.isConnected()) {
      try {
        wsRef.current.sendAudioEndOfStream();
        isAudioStreaming.current = false;
      } catch (error) {
        console.error("Failed to send end of audio stream:", error);
        setError(
          error instanceof Error
            ? { title: error.message }
            : { title: "Failed to end audio stream" }
        );
      }
    } else {
      console.error("WebSocket not connected");
      setError(ERROR_MESSAGES.CONNECTION_LOST);
    }
  };

  // Send file upload request
  const sendFileUploadRequest = () => {
    if (wsRef.current && isConnectionEstablished) {
      wsRef.current.sendFileUploadRequest();
      console.log("File upload request sent");
    }
  };

  //   // Send file upload (alias for sendFileUploadRequest)
  //   const sendFileUpload = (files: FileList) => {
  //     if (wsRef.current && isConnectionEstablished) {
  //       const fileArray = Array.from(files);
  //       setPendingFiles(fileArray);
  //       wsRef.current.setFilesForUpload(fileArray);
  //       wsRef.current.sendFileUploadRequest();
  //       console.log("File upload sent:", fileArray.length, "files");
  //     }
  //   };

  // Send file upload completion
  const sendFileUploadComplete = (s3Url: string) => {
    if (wsRef.current && isConnectionEstablished) {
      wsRef.current.sendFileUploadComplete(s3Url);
      console.log("File upload complete sent:", s3Url);
    }
  };

  // Set files for upload when presigned URL is received
  const setFilesForUpload = (files: File[], message?: string) => {
    console.log("setFilesForUpload called with:", files);
    // setPendingFiles(files);
    if (wsRef.current) {
      wsRef.current.setFilesForUpload(files, message);
    }
    console.log(`Set ${files.length} files for upload`);
  };

  // Clear pending files
  const clearPendingFiles = () => {
    // setPendingFiles([]);
    if (wsRef.current) {
      wsRef.current.clearPendingFiles();
    }
    console.log("Cleared pending files");
  };

  // Send PING function
  const sendPing = () => {
    if (wsRef.current && isConnectionEstablished) {
      wsRef.current.sendPing();
      console.log("Manual PING sent");
    }
  };

  // Regenerate response for a specific chat
  const regenerateResponse = (originalUserMessage: string) => {
    if (wsRef.current && isConnectionEstablished) {
      // Clear streaming state when regenerating
      setIsStreaming(false);
      wsRef.current.regenerateResponse(originalUserMessage);
      console.log("Regenerate response sent for:", originalUserMessage);
    }
  };

  // Clear error
  const clearError = () => {
    setError(null);
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
    sendEndOfAudioStream,
    sendFileUploadRequest,
    sendFileUploadComplete,
    setFilesForUpload,
    clearPendingFiles,
    clearError,
    sendPing,
    regenerateResponse,
    // WebSocket service reference (for advanced usage)
    webSocketService: wsRef.current,
  };
}
