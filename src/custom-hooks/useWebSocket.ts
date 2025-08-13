import { useEffect, useRef, useState } from "react";
import useMedAssistStore from "../stores/medAssistStore";
import { WebSocketService } from "../services/WebSocketService";
import {
  ContentType,
  type ChatResponseMessage,
  type WebSocketConfig,
  type ConnectionEstablishedMessage,
  type EndOfStreamMessage,
  type StreamResponseMessage,
} from "../types/socket";
import { WEBSOCKET_SERVER_EVENTS } from "@/configs/enums";

export function useWebSocket(
  config: WebSocketConfig | null,
  onTextMessage?: (message: string) => void
) {
  const wsRef = useRef<WebSocketService | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const {
    setSocketIOConnected,
    setConnectionEstablished,
    isSocketIOConnected,
  } = useMedAssistStore();

  useEffect(() => {
    if (!config) {
      console.log("No config provided");
      setSocketIOConnected(false);
      setConnectionEstablished(false);
      return;
    }
    if (wsRef.current?.isConnected()) {
      console.log("WebSocket already connected, skipping connection");
      return;
    }
    // Create WebSocket service
    const service = new WebSocketService(config);
    console.log("WebSocket service created:", service);
    wsRef.current = service;

    // Set up event listeners
    wsRef.current?.on(
      WEBSOCKET_SERVER_EVENTS.CONNECTION_ESTABLISHED,
      (connected: ConnectionEstablishedMessage) => {
        console.log("WebSocket connection:", connected);

        setConnectionEstablished(true);
        setSocketIOConnected(true);
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
          pendingFiles.length > 0
        ) {
          console.log("File upload URL received:", message.data);
          service
            .uploadFilesToPresignedUrl(message.data?.url, pendingFiles)
            .then(() => {
              setPendingFiles([]);
              console.log("Files uploaded successfully");
            })
            .catch((error) => {
              console.error("Failed to upload files:", error);
            });
        }
      }
    );

    wsRef.current?.on(WEBSOCKET_SERVER_EVENTS.ERROR, (error: Error) => {
      console.error("WebSocket error:", error);
      setError(error.message);
      setSocketIOConnected(false);
      setConnectionEstablished(false);
    });

    wsRef.current?.on(
      WEBSOCKET_SERVER_EVENTS.STREAM,
      (message: StreamResponseMessage) => {
        console.log("STREAM received:", message);
        if (message.ct === ContentType.TEXT && message.data && onTextMessage) {
          console.log("Text message received:", message.data);
          // Call the callback to display the bot response
          onTextMessage(message.data);
        }
        if (!isStreaming) {
          setIsStreaming(true);
        }
      }
    );

    wsRef.current?.on(
      WEBSOCKET_SERVER_EVENTS.END_OF_STREAM,
      (message: EndOfStreamMessage) => {
        console.log("END_OF_STREAM received:", message);
        setIsStreaming(false);
      }
    );

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

    // Connect
    wsRef.current?.connect().catch((error) => {
      console.error("Failed to connect WebSocket:", error);
      setSocketIOConnected(false);
      setConnectionEstablished(false);
    });

    // Cleanup
    return () => {
      if (wsRef.current) {
        console.log("cleanup called");

        wsRef.current.disconnect();
      }
      setSocketIOConnected(false);
      setConnectionEstablished(false);
    };
  }, [config?.sessionId, config?.auth.token]);

  // Send text chat message
  const sendChatMessage = (message: string) => {
    if (wsRef.current && isSocketIOConnected) {
      // Clear streaming state when starting a new chat
      setIsStreaming(false);
      wsRef.current.sendTextMessage(message);
      console.log("Chat message sent:", message);
    }
  };

  // Send file upload request
  const sendFileUploadRequest = () => {
    if (wsRef.current && isSocketIOConnected) {
      wsRef.current.sendFileUploadRequest();
      console.log("File upload request sent");
    }
  };

  // Send file upload completion
  const sendFileUploadComplete = (s3Url: string) => {
    if (wsRef.current && isSocketIOConnected) {
      wsRef.current.sendFileUploadComplete(s3Url);
      console.log("File upload complete sent:", s3Url);
    }
  };

  // Send audio stream chunk
  const sendAudioStream = (audioData: Float32Array) => {
    if (wsRef.current && isSocketIOConnected) {
      wsRef.current.sendAudioStream(audioData);
      console.log("Audio stream chunk sent");
    }
  };

  // Send audio end of stream
  const sendAudioEndOfStream = (audioData: Float32Array) => {
    if (wsRef.current && isSocketIOConnected) {
      wsRef.current.sendAudioEndOfStream(audioData);
      console.log("Audio end of stream sent");
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
    if (wsRef.current && isSocketIOConnected) {
      wsRef.current.sendPing();
      console.log("Manual PING sent");
    }
  };

  return {
    wsService: wsRef.current,
    sendPing,
    sendChatMessage,
    sendFileUploadRequest,
    sendFileUploadComplete,
    sendAudioStream,
    sendAudioEndOfStream,
    setFilesForUpload,
    clearPendingFiles,
    error,
    isStreaming,
    isConnected: isSocketIOConnected,
  };
}
