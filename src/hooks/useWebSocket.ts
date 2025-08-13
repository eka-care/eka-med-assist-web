import { useEffect, useRef } from "react";
import useMedAssistStore from "../stores/medAssistStore";
import { WEBSOCKET_SERVER_EVENTS } from "../configs/enums";
import type { WebSocketConfig } from "../types/socket";
import { SocketIOService } from "@/services/SocketIOService";

export function useWebSocket(config: WebSocketConfig | null) {
  const webSocketRef = useRef<SocketIOService | null>(null);
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

    // Create WebSocket service
    const service = new SocketIOService(config);
    webSocketRef.current = service;

    // Set up event listeners
    service.on(
      WEBSOCKET_SERVER_EVENTS.CONNECTION_ESTABLISHED,
      (message: any) => {
        console.log("Connection established:", message);
        setConnectionEstablished(true);
        setSocketIOConnected(true);
      }
    );

    service.on(WEBSOCKET_SERVER_EVENTS.PONG, (data: any) => {
      console.log("PONG received:", data);
      // PONG received means connection is healthy
    });

    service.on(WEBSOCKET_SERVER_EVENTS.ERROR, (error: any) => {
      console.error("WebSocket error:", error);
      setSocketIOConnected(false);
      setConnectionEstablished(false);
    });

    // Connect
    service.connect().catch((error) => {
      console.error("Failed to connect WebSocket:", error);
      setSocketIOConnected(false);
      setConnectionEstablished(false);
    });

    // Cleanup
    return () => {
      if (service) {
        service.disconnect();
      }
      setSocketIOConnected(false);
      setConnectionEstablished(false);
    };
  }, [config, setSocketIOConnected, setConnectionEstablished]);

  // Send PING function
  // const sendPing = () => {
  //   if (webSocketRef.current && isWebSocketConnected) {
  //     webSocketRef.current.sendPing();
  //     console.log("PING sent");
  //   }
  // };

  return {
    webSocketService: webSocketRef.current,
    //sendPing,
  };
}
