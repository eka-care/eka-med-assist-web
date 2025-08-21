import { WEBSOCKET_SERVER_EVENTS } from "@/configs/enums";
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
  WebSocketErrorCodes,
} from "../types/socket";

type TimeoutHandle = ReturnType<typeof setTimeout>;
const BASE_URL = "ws://fea0c1ed4375.ngrok-free.app/ws/med-assist/session";
export class WebSocketService {
  private ws: WebSocket | null = null;
  public config: WebSocketConfig;
  private connectionState: ConnectionStateType = ConnectionState.DISCONNECTED;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 1000;
  private eventCallbacks: Map<string, Set<Function>> = new Map();
  private isReconnecting: boolean = false;
  private pingInterval: TimeoutHandle | null = null;
  private connectionTimeout: TimeoutHandle | null = null;
  private currentStreamMessage: ChatMessage | null = null;
  private pendingFiles: File[] = [];

  constructor(config: WebSocketConfig) {
    this.config = {
      sessionId: config.sessionId,
      auth: config.auth,
      options: {
        reconnectAttempts: 5,
        reconnectDelay: 1000,
        pingInterval: 30000, // 30 seconds
        connectionTimeout: 60000,
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
      // Prevent multiple simultaneous connection attempts
      if (
        this.isReconnecting ||
        this.connectionState === ConnectionState.CONNECTING
      ) {
        console.log("Connection already in progress, skipping");
        return;
      }

      if (this.isConnected()) {
        console.log("WebSocket is already connected");
        return;
      }

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.log("Reconnect attempts exceeded");
        this.updateConnectionState(ConnectionState.ERROR);
        this.triggerEvent(
          WEBSOCKET_SERVER_EVENTS.ERROR,
          new Error("Reconnect attempts exceeded")
        );
        return;
      }

      this.updateConnectionState(ConnectionState.CONNECTING);
      this.isReconnecting = true;
      this.reconnectAttempts++;

      // Connect to WebSocket with session ID in URL and token as query param
      const wsUrl = `${BASE_URL}/${
        this.config.sessionId
      }/?token=${encodeURIComponent(this.config.auth.token)}`;

      console.log(
        "Connecting to WebSocket:",
        wsUrl,
        "reconnectAttempts",
        this.reconnectAttempts
      );
      this.ws = new WebSocket(wsUrl);

      this.setupEventListeners();
      this.setupConnectionTimeout();

      return new Promise((resolve, reject) => {
        if (!this.ws) {
          reject(new Error("WebSocket initialization failed"));
          return;
        }

        this.ws.onopen = () => {
          console.log("WebSocket connection opened");
          this.updateConnectionState(ConnectionState.CONNECTED);
          this.reconnectAttempts = 0;
          this.isReconnecting = false;
          this.startPingInterval();
          this.triggerEvent(
            WEBSOCKET_SERVER_EVENTS.CONNECTION_ESTABLISHED,
            true
          );
          resolve();
        };

        this.ws.onerror = (error) => {
          console.log("WebSocket connection error", error);
          this.updateConnectionState(ConnectionState.ERROR);
          this.isReconnecting = false;
          reject(error);
        };
      });
    } catch (error) {
      console.log("WebSocket connection error from catch block", error);
      this.updateConnectionState(ConnectionState.ERROR);
      this.isReconnecting = false;
      throw error;
    }
  }

  /**
   * Disconnect from the WebSocket server
   */
  public disconnect(): void {
    console.log("WebSocket disconnect called");
    if (this.ws) {
      this.stopPingInterval();
      this.clearConnectionTimeout();
      this.ws.close(SocketCodes.OK);
      this.ws = null;
      this.updateConnectionState(ConnectionState.DISCONNECTED);
    }
  }

  /**
   * Regenerate response for a specific chat
   */
  public regenerateResponse(originalUserMessage: string): void {
    if (!this.isConnected()) {
      throw new Error("WebSocket is not connected");
    }

    console.log("Regenerating response for:", originalUserMessage);

    // Clear any existing streaming message when regenerating
    this.clearStreamingState();

    const message: ChatRequest = {
      ev: SocketEvent.CHAT,
      ct: ContentType.TEXT,
      ts: Date.now(),
      data: { text: originalUserMessage },
    };

    this.sendMessage(message);
  }

  /**
   * Send a text message
   */
  public sendTextMessage(content: string): void {
    if (!this.isConnected()) {
      throw new Error("WebSocket is not connected");
    }

    // Clear any existing streaming message when starting a new chat
    this.clearStreamingState();

    const message: ChatRequest = {
      ev: SocketEvent.CHAT,
      ct: ContentType.TEXT,
      ts: Date.now(),
      data: { text: content },
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
      data: { url: s3Url },
    };

    this.sendMessage(message);
  }

  /**
   * Set files for upload when presigned URL is received
   */
  public setFilesForUpload(files: File[]): void {
    this.pendingFiles = files;
    console.log(`Set ${files.length} files for upload`);
  }

  /**
   * Clear pending files
   */
  public clearPendingFiles(): void {
    this.pendingFiles = [];
    console.log("Cleared pending files");
  }

  /**
   * Clear streaming state
   */
  public clearStreamingState(): void {
    this.currentStreamMessage = null;
    console.log("Cleared streaming state");
  }

  /**
   * Upload files to presigned URL
   */
  public async uploadFilesToPresignedUrl(
    presignedUrl: string,
    files: File[]
  ): Promise<void> {
    console.log("hi from uploadFilesToPresignedUrl");

    try {
      console.log(
        `Uploading ${files.length} files to presigned URL ${presignedUrl}`
      );

      for (const file of files) {
        console.log(
          `Uploading ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`
        );

        const response = await fetch(presignedUrl, {
          method: "PUT",
          body: file,
          headers: {
            "Content-Type": file.type,
          },
        });

        if (!response.ok) {
          throw new Error(
            `Failed to upload ${file.name}: ${response.status} ${response.statusText}`
          );
        }

        console.log(`Successfully uploaded ${file.name}`);
      }

      console.log(
        "All files uploaded successfully, calling sendFileUploadComplete"
      );

      // Call sendFileUploadComplete with the presigned URL
      this.sendFileUploadComplete(presignedUrl);
    } catch (error) {
      console.error("Error uploading files to presigned URL:", error);
      throw error;
    }
  }

  /**
   * Send audio stream chunk
   */
  public sendAudioStreamStart(): void {
    if (!this.isConnected()) {
      throw new Error("WebSocket is not connected");
    }
    const message: AudioStreamRequest = {
      ev: SocketEvent.STREAM,
      ct: ContentType.AUDIO,
      ts: Date.now(),
      data: "start",
    };
    this.sendMessage(message);
  }
  public sendAudioStream(audioData: Uint8Array): void {
    if (!this.isConnected()) {
      throw new Error("WebSocket is not connected");
    }
    const base64Audio = btoa(String.fromCharCode(...audioData));

    const message: AudioStreamRequest = {
      ev: SocketEvent.STREAM,
      ct: ContentType.AUDIO,
      ts: Date.now(),
      data: base64Audio,
    };
    console.log("Sending audio stream message:", message);
    this.sendMessage(message);
  }

  public sendPillMessage(pillMessage: string, tool_use_id: string): void {
    if (!this.isConnected()) {
      throw new Error("WebSocket is not connected");
    }
    const message: ChatRequest = {
      ev: SocketEvent.CHAT,
      ct: ContentType.TEXT,
      ts: Date.now(),
      data: { text: pillMessage, tool_use_id: tool_use_id },
    };
    this.sendMessage(message);
  }
  /**
   * Send audio end of stream
   */
  public sendAudioEndOfStream(audioData: Uint8Array): void {
    if (!this.isConnected()) {
      throw new Error("WebSocket is not connected");
    }
    console.log("Sending audio end of stream", audioData);
    const message: AudioEndOfStreamRequest = {
      ev: SocketEvent.END_OF_STREAM,
      ct: ContentType.AUDIO,
      ts: Date.now(),
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
   * Unified reconnect function - handles all reconnection scenarios
   */
  public async reconnect(
    reason?: string,
    resetAttempts: boolean = false
  ): Promise<void> {
    if (this.isReconnecting) {
      console.log("Reconnection already in progress, skipping");
      return;
    }

    console.log(
      `Initiating reconnection${reason ? ` due to: ${reason}` : ""}...`
    );

    this.isReconnecting = true;
    this.updateConnectionState(ConnectionState.RECONNECTING);

    // Reset reconnection attempts if requested (e.g., for timeout errors)
    if (resetAttempts) {
      this.reconnectAttempts = 0;
    }

    try {
      // Close existing connection if any

      this.disconnect();

      // Attempt to reconnect
      await this.connect();

      console.log("Reconnection successful");

      // // Trigger reconnection success event
      // this.triggerEvent(WEBSOCKET_SERVER_EVENTS.CONNECTION_ESTABLISHED, true);
    } catch (error) {
      console.error("Reconnection failed:", error);

      // Handle reconnection error
      this.handleReconnectionError(error as Error);
    } finally {
      this.isReconnecting = false;
    }
  }

  /**
   * Manually trigger a timeout error for testing
   */
  public triggerTimeoutError(): void {
    console.log("Manually triggering timeout error for testing...");
    const timeoutMessage: ErrorMessage = {
      ev: "err",
      ts: Date.now(),
      code: WebSocketErrorCodes.TIMEOUT,
      msg: "Request timed out",
    };
    this.handleError(timeoutMessage);
  }

  /**
   * Get current session configuration
   */
  public getSessionConfig(): { sessionId: string; token: string } {
    return {
      sessionId: this.config.sessionId,
      token: this.config.auth.token,
    };
  }

  // Private methods

  private setupEventListeners(): void {
    if (!this.ws) return;

    // Remove any existing listeners to prevent duplicates
    this.ws.onopen = null;
    this.ws.onclose = null;
    this.ws.onerror = null;
    this.ws.onmessage = null;

    this.ws.onopen = () => {
      console.log("WebSocket connection opened");
      this.updateConnectionState(ConnectionState.CONNECTED);
      this.reconnectAttempts = 0;
      this.isReconnecting = false;
      this.startPingInterval();
      this.triggerEvent(WEBSOCKET_SERVER_EVENTS.CONNECTION_ESTABLISHED, true);
    };

    this.ws.onclose = (event) => {
      console.log("WebSocket connection closed:", event.code, event.reason);
      this.updateConnectionState(ConnectionState.DISCONNECTED);
      this.stopPingInterval();
      this.triggerEvent(WEBSOCKET_SERVER_EVENTS.CONNECTION_ESTABLISHED, false);

      // Handle custom close codes
      if (event.code !== SocketCodes.OK) {
        this.handleDisconnectCode(event.code);
      }

      // Only attempt reconnection if we're not manually disconnecting
      if (this.connectionState !== ConnectionState.DISCONNECTED) {
        this.attemptReconnection();
      }
    };

    this.ws.onerror = (error) => {
      console.log("WebSocket error:", error);
      this.updateConnectionState(ConnectionState.ERROR);
      this.triggerEvent(WEBSOCKET_SERVER_EVENTS.ERROR, error);
      this.handleReconnectionError(new Error("WebSocket error"));
    };

    this.ws.onmessage = (event) => {
      try {
        const data: ServerMessage = JSON.parse(event.data);
        this.handleServerMessage(data);
      } catch (error) {
        console.error("Failed to parse server message:", error, event);
        this.triggerEvent(
          WEBSOCKET_SERVER_EVENTS.ERROR,
          new Error("Invalid message format")
        );
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
    console.log("Connection established", message);
    this.triggerEvent(WEBSOCKET_SERVER_EVENTS.CONNECTION_ESTABLISHED, true);
  }

  private handleChatResponse(message: ChatResponseMessage): void {
    console.log("Chat response received", message);
    if (message.ct === ContentType.FILE && message.data) {
      // This is an S3 URL for file upload
      this.triggerEvent(WEBSOCKET_SERVER_EVENTS.CHAT, message);
      console.log("File upload URL received", message, message.data);

      // If we have pending files, upload them automatically
      if (this.pendingFiles && this.pendingFiles.length > 0) {
        console.log("File upload URL received, uploading pending files");
        this.uploadFilesToPresignedUrl(
          message.data?.url || "",
          this.pendingFiles
        )
          .then(() => {
            // Clear pending files after successful upload
            this.pendingFiles = [];
          })
          .catch((error) => {
            console.error("Failed to upload files:", error);
            // Keep files in pending state for retry if needed
          });
      }
    } else {
      this.triggerEvent(WEBSOCKET_SERVER_EVENTS.CHAT, message);
    }
  }

  private handleStreamResponse(message: StreamResponseMessage): void {
    if (message.ct === ContentType.TEXT && message.data) {
      console.log("Stream response received:", message.data);

      // Handle progress messages
      if (message.data.progress_msg) {
        console.log("Progress message received:", message.data.progress_msg);
        this.triggerEvent("progress_message", message.data.progress_msg);
        return;
      }

      // Handle text messages
      if (message.data.text) {
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

        // Add the new word/chunk to the existing content
        this.currentStreamMessage.content += message.data.text;
        // Send the PROGRESSIVE (accumulated) text, not just the new word
        this.triggerEvent("stream_chunk", this.currentStreamMessage.content);
      }
    }
  }

  private handleEndOfStream(message: EndOfStreamMessage): void {
    if (message.ct === ContentType.TEXT && this.currentStreamMessage) {
      // Finalize the streaming message
      this.currentStreamMessage.metadata = {
        ...this.currentStreamMessage.metadata,
        isStreaming: false,
      };
      this.triggerEvent(
        WEBSOCKET_SERVER_EVENTS.END_OF_STREAM,
        this.currentStreamMessage
      );
      // Clear the streaming message
      this.currentStreamMessage = null;
    }
  }

  private handleSync(message: SyncMessage): void {
    // Handle sync message (currently not needed in frontend)
    this.triggerEvent(WEBSOCKET_SERVER_EVENTS.SYNC, message);
  }

  private handlePong(message: PongMessage): void {
    // Trigger pong event with client timestamp and server timestamp
    this.triggerEvent(WEBSOCKET_SERVER_EVENTS.PONG, {
      cts: message.cts, // client timestamp
      ts: message.ts, // server timestamp
    });
  }

  private handleError(message: ErrorMessage): void {
    if (message.code === WebSocketErrorCodes.TIMEOUT) {
      console.log("Timeout error received:", message);
      console.log("Current connection state:", this.connectionState);
      console.log("WebSocket ready state:", this.ws?.readyState);
      console.log("Testing connection with ping...");

      // First, try to send a ping to test if the connection is still alive
      this.testConnectionWithPing()
        .then((isAlive) => {
          if (isAlive) {
            console.log("Connection is alive, ping successful");
            // Connection is alive, just trigger a regular error event
            const error = new Error(`Request timed out. Please try again.`);
            this.triggerEvent(WEBSOCKET_SERVER_EVENTS.ERROR, error);
          } else {
            console.log("Connection is dead, attempting to reconnect...");
            // Connection is dead, attempt to reconnect
            this.reconnect();
          }
        })
        .catch((error) => {
          console.log("Ping test failed, attempting to reconnect...", error);
          // Ping test failed, attempt to reconnect
          this.reconnect();
        });
      // if (this.isConnected()) {
      //   console.log("Connection is alive, triggering error event");
      //   const error = new Error(`Request timed out. Please try again.`);
      //   this.triggerEvent(WEBSOCKET_SERVER_EVENTS.ERROR, error);
      // } else {
      //   console.log("Connection is dead, attempting to reconnect...");
      //   // Connection is dead, attempt to reconnect with reset attempts
      //   this.reconnect("timeout error", true);
      // }
    } else {
      const error = new Error(`${message.code}: ${message.msg}`);
      this.triggerEvent(WEBSOCKET_SERVER_EVENTS.ERROR, error);
    }
  }

  private async testConnectionWithPing(): Promise<boolean> {
    return new Promise((resolve) => {
      let pongReceived = false;
      let timeoutId: NodeJS.Timeout;

      // Set up a one-time pong listener
      const pongHandler = () => {
        pongReceived = true;
        clearTimeout(timeoutId);
        this.off(WEBSOCKET_SERVER_EVENTS.PONG, pongHandler);
        resolve(pongReceived);
      };

      // Set up timeout for ping test
      timeoutId = setTimeout(() => {
        this.off(WEBSOCKET_SERVER_EVENTS.PONG, pongHandler);
        resolve(false);
      }, 5000); // 5 second timeout for ping test

      // Listen for pong response
      this.on(WEBSOCKET_SERVER_EVENTS.PONG, pongHandler);

      // Send ping
      this.sendPing();
    });
  }

  private handleDisconnectCode(code: number): void {
    console.log("Handling disconnect code:", code);

    switch (code) {
      case SocketCodes.UNAUTHORIZED:
        this.triggerEvent(
          WEBSOCKET_SERVER_EVENTS.ERROR,
          new Error("Unauthorized access")
        );
        break;
      case SocketCodes.FORBIDDEN:
        this.triggerEvent(
          WEBSOCKET_SERVER_EVENTS.ERROR,
          new Error("Access forbidden")
        );
        break;
      case SocketCodes.NOT_FOUND:
        this.triggerEvent(
          WEBSOCKET_SERVER_EVENTS.ERROR,
          new Error("Session not found")
        );
        break;
      case SocketCodes.INTERNAL_SERVER_ERROR:
        this.triggerEvent(
          WEBSOCKET_SERVER_EVENTS.ERROR,
          new Error("Internal server error")
        );
        break;
      case SocketCodes.SERVER_RESTART:
        this.triggerEvent(
          WEBSOCKET_SERVER_EVENTS.ERROR,
          new Error("Server restarted")
        );
        break;
      case SocketCodes.ABNORMAL_CLOSURE:
        this.triggerEvent(
          WEBSOCKET_SERVER_EVENTS.ERROR,
          new Error("Abnormal closure")
        );
        break;
      default:
        this.triggerEvent(
          WEBSOCKET_SERVER_EVENTS.ERROR,
          new Error(`Connection closed with code: ${code}`)
        );
    }
  }

  private setupConnectionTimeout(): void {
    this.clearConnectionTimeout();
    this.connectionTimeout = setTimeout(() => {
      if (this.connectionState === ConnectionState.CONNECTING) {
        this.updateConnectionState(ConnectionState.ERROR);
        this.triggerEvent(
          WEBSOCKET_SERVER_EVENTS.ERROR,
          new Error("Connection timeout")
        );
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
    console.log(`Starting ping interval: ${interval}ms`);

    this.pingInterval = setInterval(() => {
      if (this.isConnected()) {
        this.sendPing();
      } else {
        console.log("WebSocket not connected, stopping ping interval");
        this.stopPingInterval();
      }
    }, interval);
  }

  private stopPingInterval(): void {
    if (this.pingInterval) {
      console.log("Stopping ping interval");
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private attemptReconnection(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.updateConnectionState(ConnectionState.ERROR);
      this.triggerEvent(
        WEBSOCKET_SERVER_EVENTS.ERROR,
        new Error("Reconnect failed")
      );
      return;
    }

    // Prevent multiple simultaneous reconnection attempts
    if (this.isReconnecting) {
      console.log("Reconnection already in progress, skipping");
      return;
    }

    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
    console.log(
      `Scheduling reconnection attempt ${
        this.reconnectAttempts + 1
      } in ${delay}ms`
    );

    setTimeout(() => {
      if (!this.isConnected() && !this.isReconnecting) {
        console.log(
          `Attempting reconnection ${this.reconnectAttempts + 1}/${
            this.maxReconnectAttempts
          }`
        );
        // Use the unified reconnect function
        this.reconnect(`automatic attempt ${this.reconnectAttempts + 1}`);
      }
    }, delay);
  }

  private handleReconnectionError(error: Error): void {
    this.reconnectAttempts++;
    this.isReconnecting = false;

    console.error("Reconnection error:", error);
    this.triggerEvent(WEBSOCKET_SERVER_EVENTS.ERROR, error);

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.updateConnectionState(ConnectionState.ERROR);
      this.triggerEvent(
        WEBSOCKET_SERVER_EVENTS.ERROR,
        new Error("Maximum reconnection attempts exceeded")
      );
    } else {
      // Schedule next reconnection attempt
      this.attemptReconnection();
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
}

// Export singleton instance for global usage
let webSocketServiceInstance: WebSocketService | null = null;

export const createWebSocketService = (
  config: WebSocketConfig
): WebSocketService => {
  // If we already have an instance with the same config, return it
  if (
    webSocketServiceInstance &&
    webSocketServiceInstance.config.sessionId === config.sessionId &&
    webSocketServiceInstance.config.auth.token === config.auth.token
  ) {
    return webSocketServiceInstance;
  }

  // If we have an existing instance with different config, disconnect it first
  if (webSocketServiceInstance) {
    webSocketServiceInstance.disconnect();
  }

  // Create new instance
  webSocketServiceInstance = new WebSocketService(config);
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

// Add method to check if instance exists with current config
export const hasWebSocketServiceWithConfig = (
  config: WebSocketConfig
): boolean => {
  return (
    webSocketServiceInstance !== null &&
    webSocketServiceInstance.config.sessionId === config.sessionId &&
    webSocketServiceInstance.config.auth.token === config.auth.token
  );
};
