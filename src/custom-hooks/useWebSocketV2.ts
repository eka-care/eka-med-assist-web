import { useEffect, useRef, useState } from "react";
import useMedAssistStore from "../stores/medAssistStore";
import {
  ContentType,
  type ChatResponseMessage,
  type WebSocketConfig,
  type EndOfStreamMessage,
  type StreamResponseMessage,
} from "../types/socket";
import { WEBSOCKET_CUSTOM_EVENTS, WEBSOCKET_SERVER_EVENTS } from "@/configs/enums";
import { PillAction } from "@/molecules/quick-actions";
import type { AudioData } from "@/services/audioServiceV2";
import { WebSocketServiceV2 } from "@/services/WebSocketServiceV2";

export function useWebSocketV2(
  config: WebSocketConfig | null,
  onTextMessage?: (message: string) => void,
  onProgressMessage?: (message: string) => void,
  onPillMessage?: (pillData: PillAction) => void,
  onMultiMessage?: (multiData: PillAction) => void,
  onAudioData?: (audioData: AudioData) => void
) {
  const wsRef = useRef<WebSocketServiceV2 | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const isAudioStreaming = useRef(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const { isConnectionEstablished, setConnectionEstablished } =
    useMedAssistStore();

  useEffect(() => {
    if (!config) {
      console.log("No config provided");
      setConnectionEstablished(false);
      return;
    }
    if (wsRef.current?.isConnected()) {
      console.log("WebSocket already connected, skipping connection");
      return;
    }
    // Create WebSocket service
    const service = new WebSocketServiceV2(config);
    console.log("WebSocket service V2 created:", service);
    wsRef.current = service;

    // Set up event listeners
    wsRef.current?.on(
      WEBSOCKET_SERVER_EVENTS.CONNECTION_ESTABLISHED,
      (connected: boolean) => {
        console.log("WebSocket connection:", connected);
        setConnectionEstablished(connected);
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
        console.log("CHAT received:", message);
        if (
          message.ct === ContentType.FILE &&
          message.data &&
          "url" in message.data &&
          pendingFiles.length > 0
        ) {
          console.log("File upload URL received:", message.data);
          service
            .uploadFilesToPresignedUrl(message.data?.url || "", pendingFiles)
            .then(() => {
              setPendingFiles([]);
              console.log("Files uploaded successfully");
            })
            .catch((error) => {
              console.error("Failed to upload files:", error);
            });
        }
        console.log("message.ct", message.ct);
        if (
          message.ct === ContentType.PILL &&
          message.data.choices &&
          message.data.tool_use_id
        ) {
          console.log("Pill message received:", message.data?.choices);
          // Call the callback to display the pill message
          if (onPillMessage) {
            onPillMessage({
              choices: message.data.choices,
              tool_use_id: message.data.tool_use_id,
            });
          }
        } else if (
          message.ct === ContentType.MULTI &&
          message.data.choices &&
          message.data.tool_use_id
        ) {
          console.log("Multi message received:", message.data?.choices);
          // Call the callback to display the multi message
          if (onMultiMessage) {
            onMultiMessage({
              choices: message.data.choices,
              tool_use_id: message.data.tool_use_id,
            });
          }
        }
      }
    );
    wsRef.current?.on(WEBSOCKET_CUSTOM_EVENTS.SERVER_RESTART, (data: any) => {
      console.log("SERVER_RESTART received:", data);
      if (wsRef.current) {
        wsRef.current.reconnect("server restart");
      }
    });

    wsRef.current?.on(WEBSOCKET_CUSTOM_EVENTS.ABNORMAL_CLOSURE, (data: any) => {
      console.log("ABNORMAL_CLOSURE received:", data);
      if (wsRef.current) {
        wsRef.current.reconnect("abnormal closure");
      }
    });

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

    wsRef.current?.on(WEBSOCKET_SERVER_EVENTS.ERROR, (error: Error) => {
      console.error("WebSocket error:", error);

      // Check if this is a timeout error
      const isTimeoutError = error.message.includes("Request timed out");

      if (isTimeoutError) {
        // Handle timeout error specifically
        setError("Request timed out. Please try again.");
        // Update the store to indicate this is a timeout error
        useMedAssistStore.getState().setTimeoutError(true);
        useMedAssistStore
          .getState()
          .setError("Request timed out. Please try again.");
      } else {
        // Handle other errors
        setError(error.message);
        useMedAssistStore.getState().setError(error.message);
        useMedAssistStore.getState().setTimeoutError(false);
      }
    });

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

    wsRef.current?.on(WEBSOCKET_CUSTOM_EVENTS.RECONNECT, (data: any) => {
      console.log("RECONNECT received:", data);
      if (wsRef.current) {
        wsRef.current.reconnect("manual reconnect");
      }
    });
    // Connect to WebSocket
    service
      .connect()
      .then(() => {
        console.log("WebSocket connected successfully");
      })
      .catch((error) => {
        console.error("Failed to connect to WebSocket:", error);
        setError(error.message);
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
  }, [config?.sessionId, config?.auth.token, setConnectionEstablished]);

  // Send text message
  const sendTextMessage = (message: string) => {
    if (wsRef.current?.isConnected()) {
      try {
        wsRef.current.sendChatMessage(message);
      } catch (error) {
        console.error("Failed to send text message:", error);
        setError(
          error instanceof Error ? error.message : "Failed to send message"
        );
      }
    } else {
      console.error("WebSocket not connected");
      setError("WebSocket not connected");
    }
  };

    // Send pill message
    const sendPillMessage = (pillMessage: string, tool_use_id: string) => {
        if (wsRef.current && isConnectionEstablished) {
          wsRef.current.sendPillMessage(pillMessage, tool_use_id);
          console.log(
            "Pill message sent:",
            pillMessage,
            "tool_use_id:",
            tool_use_id
          );
        }
      };
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
          error instanceof Error ? error.message : "Failed to send audio"
        );
      }
    } else {
      console.error("WebSocket not connected");
      setError("WebSocket not connected");
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
          error instanceof Error ? error.message : "Failed to end audio stream"
        );
      }
    } else {
      console.error("WebSocket not connected");
      setError("WebSocket not connected");
    }
  };

  // Send file upload request
  const sendFileUploadRequest = () => {
    if (wsRef.current && isConnectionEstablished) {
      wsRef.current.sendFileUploadRequest();
      console.log("File upload request sent");
    }
  };

  // Send file upload completion
  const sendFileUploadComplete = (s3Url: string) => {
    if (wsRef.current && isConnectionEstablished) {
      wsRef.current.sendFileUploadComplete(s3Url);
      console.log("File upload complete sent:", s3Url);
    }
  };

    // Set files for upload when presigned URL is received
    const setFilesForUpload = (files: File[]) => {
        setPendingFiles(files);
        if (wsRef.current) {
          wsRef.current.setFilesForUpload(files);
        }
        console.log(`Set ${files.length} files for upload`);
      };
    
        // Clear pending files
  const clearPendingFiles = () => {
    setPendingFiles([]);
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
    error,
    isStreaming,
    isAudioStreaming: isAudioStreaming.current,
    isConnected: isConnected(),
    connectionState: getConnectionState(),

    // Actions
    sendTextMessage,
    sendAudioData,
    sendEndOfAudioStream,
    sendFileUploadRequest,
    sendFileUploadComplete,
    setFilesForUpload,
    clearPendingFiles,
    clearError,
    sendPillMessage,

    sendPing,
    regenerateResponse, 
    // WebSocket service reference (for advanced usage)
    webSocketService: wsRef.current,
  };
}
