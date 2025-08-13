import { useEffect, useRef, useState } from "react";
import useMedAssistStore from "../stores/medAssistStore";
import { WEBSOCKET_SERVER_EVENTS } from "../configs/enums";
import { SocketIOService } from "../services/SocketIOService";
import type { SocketIOConfig } from "../services/SocketIOService";
import type {
  ChatResponseMessage,
  ConnectionEstablishedMessage,
  EndOfStreamMessage,
  ErrorMessage,
  StreamResponseMessage,
  SyncMessage,
  ChatRequest,
} from "@/types/socket";
import { ContentType } from "@/types/socket";

export function useSocketIO(config: SocketIOConfig | null) {
  const socketRef = useRef<SocketIOService | null>(null);
  const [error, setError] = useState<ErrorMessage["msg"] | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
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

    // Create Socket.IO service
    const service = new SocketIOService(config);
    console.log("service", service);
    socketRef.current = service;

    // Set up event listeners
    service.on(
      WEBSOCKET_SERVER_EVENTS.CONNECTION_ESTABLISHED,
      (message: ConnectionEstablishedMessage) => {
        console.log("Connection established:", message);
        setConnectionEstablished(true);
        setSocketIOConnected(true);
      }
    );

    service.on(WEBSOCKET_SERVER_EVENTS.PONG, (data: any) => {
      console.log("PONG received:", data);
      // PONG received means connection is healthy
    });

    service.on(WEBSOCKET_SERVER_EVENTS.ERROR, (error: ErrorMessage) => {
      console.error("Socket.IO error:", error);
      setError(error.msg);
      setSocketIOConnected(false);
      setConnectionEstablished(false);
    });

    service.on(WEBSOCKET_SERVER_EVENTS.CHAT, (message: ChatResponseMessage) => {
      console.log("CHAT received:", message);
      // Handle file upload response (S3 URL)
      if (message.ct === ContentType.FILE) {
        console.log("File upload URL received:", message.data);
      }
    });

    service.on(WEBSOCKET_SERVER_EVENTS.SYNC, (message: SyncMessage) => {
      console.log("SYNC received:", message);
      // For now, we don't handle sync in frontend as specified
    });

    service.on(
      WEBSOCKET_SERVER_EVENTS.STREAM,
      (message: StreamResponseMessage) => {
        console.log("STREAM received:", message);
        if (message.ct === ContentType.TEXT) {
          setIsStreaming(true);
          // Handle text stream chunk
          console.log("Text chunk received:", message.data);
        }
      }
    );

    service.on(
      WEBSOCKET_SERVER_EVENTS.END_OF_STREAM,
      (message: EndOfStreamMessage) => {
        console.log("END_OF_STREAM received:", message);
        if (message.ct === ContentType.TEXT) {
          setIsStreaming(false);
          // Handle end of text stream
          console.log("Text stream ended");
        }
      }
    );

    // Connect
    service.connect().catch((error) => {
      console.error("Failed to connect Socket.IO:", error);
      setSocketIOConnected(false);
      setConnectionEstablished(false);
    });
    console.log("serbice after conncting", service);

    // Cleanup
    return () => {
      if (service) {
        service.disconnect();
      }
      setSocketIOConnected(false);
      setConnectionEstablished(false);
    };
  }, [config?.sessionId, config?.auth.token]);

  // Send text chat message
  const sendChatMessage = (message: string) => {
    if (socketRef.current && isSocketIOConnected) {
      const chatRequest: ChatRequest = {
        ev: WEBSOCKET_SERVER_EVENTS.CHAT,
        ct: ContentType.TEXT,
        ts: Math.floor(Date.now()),
        data: message,
      };
      socketRef.current.emit(WEBSOCKET_SERVER_EVENTS.CHAT, chatRequest);
      console.log("Chat message sent:", chatRequest);
    }
  };

  // Send file upload request
  const sendFileUploadRequest = () => {
    if (socketRef.current && isSocketIOConnected) {
      const fileRequest: ChatRequest = {
        ev: WEBSOCKET_SERVER_EVENTS.CHAT,
        ct: ContentType.FILE,
        ts: Math.floor(Date.now()),
      };
      socketRef.current.emit(WEBSOCKET_SERVER_EVENTS.CHAT, fileRequest);
      console.log("File upload request sent:", fileRequest);
    }
  };

  // Send file upload completion
  const sendFileUploadComplete = (s3Url: string) => {
    if (socketRef.current && isSocketIOConnected) {
      const fileCompleteRequest: ChatRequest = {
        ev: WEBSOCKET_SERVER_EVENTS.CHAT,
        ct: ContentType.FILE,
        ts: Math.floor(Date.now()),
        data: s3Url,
      };
      socketRef.current.emit(WEBSOCKET_SERVER_EVENTS.CHAT, fileCompleteRequest);
      console.log("File upload complete sent:", fileCompleteRequest);
    }
  };

  // Send audio stream chunk
  const sendAudioStream = (audioData: Float32Array) => {
    if (socketRef.current && isSocketIOConnected) {
      const audioRequest = {
        ev: WEBSOCKET_SERVER_EVENTS.STREAM,
        ct: ContentType.AUDIO,
        ts: Math.floor(Date.now()),
        data: audioData,
      };
      socketRef.current.emit(WEBSOCKET_SERVER_EVENTS.STREAM, audioRequest);
      console.log("Audio stream chunk sent");
    }
  };

  // Send audio end of stream
  const sendAudioEndOfStream = (audioData: Float32Array) => {
    if (socketRef.current && isSocketIOConnected) {
      const audioEndRequest = {
        ev: WEBSOCKET_SERVER_EVENTS.END_OF_STREAM,
        ct: ContentType.AUDIO,
        ts: Math.floor(Date.now()),
        data: audioData,
      };
      socketRef.current.emit(
        WEBSOCKET_SERVER_EVENTS.END_OF_STREAM,
        audioEndRequest
      );
      console.log("Audio end of stream sent");
    }
  };

  // Send PING function (kept for manual ping if needed)
  const sendPing = () => {
    if (socketRef.current && isSocketIOConnected) {
      socketRef.current.emit("ping", { ts: Math.floor(Date.now()) });
      console.log("Manual PING sent");
    }
  };

  return {
    socketService: socketRef.current,
    sendPing,
    sendChatMessage,
    sendFileUploadRequest,
    sendFileUploadComplete,
    sendAudioStream,
    sendAudioEndOfStream,
    error,
    isStreaming,
    isConnected: isSocketIOConnected,
  };
}
