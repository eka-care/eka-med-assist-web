import type {
  WebSocketConfig,
  ChatMessage,
  ServerMessage,
  ClientMessage,
  ChatRequest,
  AudioStreamRequest,
  AudioEndOfStreamRequest,
  StreamResponseMessage,
  EndOfStreamMessage,
  ErrorMessage,
  ConnectionEstablishedMessage,
  ChatResponseMessage,
  SyncMessage,
  PongMessage,
  ConnectionStateType,
} from "../types/socket";
import {
  ConnectionState,
  SocketEvent,
  ContentType,
  SocketCodes,
} from "../types/socket";

type TimeoutHandle = ReturnType<typeof setTimeout>;
const BASE_URL = "ws://1ac0c5115fc1.ngrok-free.app/ws/med-assist/session";
export class WebSocketService {
  private ws: WebSocket | null = null;
  private config: WebSocketConfig;
  private connectionState: ConnectionStateType = ConnectionState.DISCONNECTED;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 1000;
  private eventCallbacks: Map<string, Set<Function>> = new Map();
  private isReconnecting: boolean = false;
  private pingInterval: TimeoutHandle | null = null;
  private connectionTimeout: TimeoutHandle | null = null;
  private currentStreamMessage: ChatMessage | null = null;

  constructor(config: WebSocketConfig) {
    this.config = {
      sessionId: config.sessionId,
      auth: config.auth,
      options: {
        reconnectAttempts: 5,
        reconnectDelay: 1000,
        pingInterval: 30000, // 30 seconds
        connectionTimeout: 20000,
        ...config.options,
      },
    };

    this.maxReconnectAttempts = this.config.options?.reconnectAttempts || 5;
    this.reconnectDelay = this.config.options?.reconnectDelay || 1000;
  }

  /**
   * Connect to the WebSocket server
   */
  public async connect(): Promise<void> {
    try {
      this.updateConnectionState(ConnectionState.CONNECTING);

      // Connect to WebSocket with session ID in URL
      const wsUrl = `${BASE_URL}/${this.config.sessionId}`;
      this.ws = new WebSocket(wsUrl);

      this.setupEventListeners();
      this.setupConnectionTimeout();

      return new Promise((resolve, reject) => {
        if (!this.ws) {
          reject(new Error("WebSocket initialization failed"));
          return;
        }

        this.ws.onopen = () => {
          this.updateConnectionState(ConnectionState.CONNECTED);
          this.reconnectAttempts = 0;
          this.isReconnecting = false;
          this.startPingInterval();
          this.triggerEvent("connection", true);
          resolve();
        };

        this.ws.onerror = (error) => {
          this.updateConnectionState(ConnectionState.ERROR);
          reject(error);
        };
      });
    } catch (error) {
      this.updateConnectionState(ConnectionState.ERROR);
      throw error;
    }
  }

  /**
   * Disconnect from the WebSocket server
   */
  public disconnect(): void {
    if (this.ws) {
      this.stopPingInterval();
      this.clearConnectionTimeout();
      this.ws.close(SocketCodes.OK);
      this.ws = null;
      this.updateConnectionState(ConnectionState.DISCONNECTED);
    }
  }

  /**
   * Send a text message
   */
  public sendTextMessage(content: string): void {
    if (!this.isConnected()) {
      throw new Error("WebSocket is not connected");
    }

    const message: ChatRequest = {
      ev: SocketEvent.CHAT,
      ct: ContentType.TEXT,
      ts: Date.now(),
      data: content,
    };

    this.sendMessage(message);
  }

  /**
   * Send a file upload request
   */
  public sendFileUploadRequest(): void {
    if (!this.isConnected()) {
      throw new Error("WebSocket is not connected");
    }

    const message: ChatRequest = {
      ev: SocketEvent.CHAT,
      ct: ContentType.FILE,
      ts: Date.now(),
    };

    this.sendMessage(message);
  }

  /**
   * Send file upload completion with S3 URL
   */
  public sendFileUploadComplete(s3Url: string): void {
    if (!this.isConnected()) {
      throw new Error("WebSocket is not connected");
    }

    const message: ChatRequest = {
      ev: SocketEvent.CHAT,
      ct: ContentType.FILE,
      ts: Date.now(),
      data: s3Url,
    };

    this.sendMessage(message);
  }

  /**
   * Send audio stream chunk
   */
  public sendAudioStream(audioData: Float32Array): void {
    if (!this.isConnected()) {
      throw new Error("WebSocket is not connected");
    }

    const message: AudioStreamRequest = {
      ev: SocketEvent.STREAM,
      ct: ContentType.AUDIO,
      ts: Date.now(),
      data: audioData,
    };

    this.sendMessage(message);
  }

  /**
   * Send audio end of stream
   */
  public sendAudioEndOfStream(audioData: Float32Array): void {
    if (!this.isConnected()) {
      throw new Error("WebSocket is not connected");
    }

    const message: AudioEndOfStreamRequest = {
      ev: SocketEvent.END_OF_STREAM,
      ct: ContentType.AUDIO,
      ts: Date.now(),
      data: audioData,
    };

    this.sendMessage(message);
  }

  /**
   * Send ping message
   */
  public sendPing(): void {
    if (this.isConnected()) {
      const message = {
        ev: SocketEvent.PING,
        ts: Date.now(),
      };
      this.sendMessage(message);
    }
  }

  /**
   * Subscribe to events
   */
  public on(event: string, callback: Function): void {
    if (!this.eventCallbacks.has(event)) {
      this.eventCallbacks.set(event, new Set());
    }
    this.eventCallbacks.get(event)!.add(callback);
  }

  /**
   * Unsubscribe from events
   */
  public off(event: string, callback?: Function): void {
    if (callback) {
      this.eventCallbacks.get(event)?.delete(callback);
    } else {
      this.eventCallbacks.delete(event);
    }
  }

  /**
   * Get current connection state
   */
  public getConnectionState(): ConnectionStateType {
    return this.connectionState;
  }

  /**
   * Check if connected
   */
  public isConnected(): boolean {
    return (
      this.connectionState === ConnectionState.CONNECTED &&
      this.ws?.readyState === WebSocket.OPEN
    );
  }

  /**
   * Reconnect manually
   */
  public async reconnect(): Promise<void> {
    if (this.isReconnecting) return;

    this.isReconnecting = true;
    this.updateConnectionState(ConnectionState.RECONNECTING);

    try {
      await this.connect();
    } catch (error) {
      this.handleReconnectionError(error as Error);
    } finally {
      this.isReconnecting = false;
    }
  }

  // Private methods

  private setupEventListeners(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      this.updateConnectionState(ConnectionState.CONNECTED);
      this.reconnectAttempts = 0;
      this.isReconnecting = false;
      this.startPingInterval();
      this.triggerEvent("connection", true);
    };

    this.ws.onclose = (event) => {
      this.updateConnectionState(ConnectionState.DISCONNECTED);
      this.stopPingInterval();
      this.triggerEvent("connection", false);

      // Handle custom close codes
      if (event.code !== SocketCodes.OK) {
        this.handleDisconnectCode(event.code);
      }

      this.attemptReconnection();
    };

    this.ws.onerror = (error) => {
      this.updateConnectionState(ConnectionState.ERROR);
      this.triggerEvent("error", error);
      this.handleReconnectionError(new Error("WebSocket error"));
    };

    this.ws.onmessage = (event) => {
      try {
        const data: ServerMessage = JSON.parse(event.data);
        this.handleServerMessage(data);
      } catch (error) {
        console.error("Failed to parse server message:", error);
        this.triggerEvent("error", new Error("Invalid message format"));
      }
    };
  }

  private handleServerMessage(message: ServerMessage): void {
    switch (message.ev) {
      case SocketEvent.CONNECTION_ESTABLISHED:
        this.handleConnectionEstablished(
          message as ConnectionEstablishedMessage
        );
        break;
      case SocketEvent.CHAT:
        this.handleChatResponse(message as ChatResponseMessage);
        break;
      case SocketEvent.STREAM:
        this.handleStreamResponse(message as StreamResponseMessage);
        break;
      case SocketEvent.END_OF_STREAM:
        this.handleEndOfStream(message as EndOfStreamMessage);
        break;
      case SocketEvent.SYNC:
        this.handleSync(message as SyncMessage);
        break;
      case SocketEvent.PONG:
        this.handlePong(message as PongMessage);
        break;
      case SocketEvent.ERROR:
        this.handleError(message as ErrorMessage);
        break;
      default:
        console.warn("Unknown message type:", (message as any).ev);
    }
  }

  private handleConnectionEstablished(
    message: ConnectionEstablishedMessage
  ): void {
    this.triggerEvent("connection_established", message);
  }

  private handleChatResponse(message: ChatResponseMessage): void {
    if (message.ct === ContentType.FILE) {
      // This is an S3 URL for file upload
      this.triggerEvent("file_upload_url", message.data);
    }
  }

  private handleStreamResponse(message: StreamResponseMessage): void {
    if (message.ct === ContentType.TEXT) {
      // Create or update streaming message
      if (!this.currentStreamMessage) {
        this.currentStreamMessage = {
          id: Date.now(),
          content: "",
          timestamp: new Date(),
          type: "text",
          metadata: { isStreaming: true },
        };
      }

      this.currentStreamMessage.content += message.data;
      this.triggerEvent("stream_chunk", message.data);
      this.triggerEvent("message_update", this.currentStreamMessage);
    }
  }

  private handleEndOfStream(message: EndOfStreamMessage): void {
    if (message.ct === ContentType.TEXT && this.currentStreamMessage) {
      // Finalize the streaming message
      this.currentStreamMessage.metadata = {
        ...this.currentStreamMessage.metadata,
        isStreaming: false,
      };
      this.triggerEvent("message", this.currentStreamMessage);
      this.currentStreamMessage = null;
    }
  }

  private handleSync(message: SyncMessage): void {
    // Handle sync message (currently not needed in frontend)
    this.triggerEvent("sync", message);
  }

  private handlePong(message: PongMessage): void {
    // Trigger pong event with client timestamp and server timestamp
    this.triggerEvent("pong", {
      cts: message.cts, // client timestamp
      ts: message.ts, // server timestamp
    });
  }

  private handleError(message: ErrorMessage): void {
    const error = new Error(`${message.code}: ${message.msg}`);
    this.triggerEvent("error", error);
  }

  private handleDisconnectCode(code: number): void {
    switch (code) {
      case SocketCodes.UNAUTHORIZED:
        this.triggerEvent("error", new Error("Unauthorized access"));
        break;
      case SocketCodes.FORBIDDEN:
        this.triggerEvent("error", new Error("Access forbidden"));
        break;
      case SocketCodes.NOT_FOUND:
        this.triggerEvent("error", new Error("Session not found"));
        break;
      case SocketCodes.INTERNAL_SERVER_ERROR:
        this.triggerEvent("error", new Error("Internal server error"));
        break;
      default:
        this.triggerEvent(
          "error",
          new Error(`Connection closed with code: ${code}`)
        );
    }
  }

  private setupConnectionTimeout(): void {
    this.clearConnectionTimeout();
    this.connectionTimeout = setTimeout(() => {
      if (this.connectionState === ConnectionState.CONNECTING) {
        this.updateConnectionState(ConnectionState.ERROR);
        this.triggerEvent("error", new Error("Connection timeout"));
      }
    }, this.config.options?.connectionTimeout || 20000);
  }

  private clearConnectionTimeout(): void {
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
  }

  private startPingInterval(): void {
    this.stopPingInterval();
    const interval = this.config.options?.pingInterval || 30000;
    this.pingInterval = setInterval(() => {
      if (this.isConnected()) {
        this.sendPing();
      }
    }, interval);
  }

  private stopPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private attemptReconnection(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.updateConnectionState(ConnectionState.ERROR);
      this.triggerEvent("reconnect_failed");
      return;
    }

    setTimeout(() => {
      if (!this.isConnected() && !this.isReconnecting) {
        this.reconnect();
      }
    }, this.reconnectDelay * Math.pow(2, this.reconnectAttempts));
  }

  private handleReconnectionError(error: Error): void {
    this.reconnectAttempts++;
    this.triggerEvent("error", error);

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.updateConnectionState(ConnectionState.ERROR);
      this.triggerEvent("reconnect_failed");
    }
  }

  private sendMessage(
    message: ClientMessage | { ev: string; ts: number }
  ): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      throw new Error("WebSocket is not open");
    }
  }

  private triggerEvent(event: string, data?: any): void {
    const callbacks = this.eventCallbacks.get(event);
    if (callbacks) {
      callbacks.forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event callback for ${event}:`, error);
        }
      });
    }
  }

  private updateConnectionState(state: ConnectionStateType): void {
    this.connectionState = state;
    this.triggerEvent("connection_state_change", state);
  }

  private generateMessageId(): number {
    return Date.now();
  }
}

// Export singleton instance for global usage
let webSocketServiceInstance: WebSocketService | null = null;

export const createWebSocketService = (
  config: WebSocketConfig
): WebSocketService => {
  if (!webSocketServiceInstance) {
    webSocketServiceInstance = new WebSocketService(config);
  }
  return webSocketServiceInstance;
};

export const getWebSocketService = (): WebSocketService | null => {
  return webSocketServiceInstance;
};

export const destroyWebSocketService = (): void => {
  if (webSocketServiceInstance) {
    webSocketServiceInstance.disconnect();
    webSocketServiceInstance = null;
  }
};
