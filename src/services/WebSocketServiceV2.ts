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
  AudioStreamRequestV2,
} from "../types/socket";
import {
  ConnectionState,
  SocketEvent,
  ContentType,
  SocketCodes,
  WebSocketErrorCodes,
} from "../types/socket";
import type { AudioData } from "./audioServiceV2";

type TimeoutHandle = ReturnType<typeof setTimeout>;
const BASE_URL = "ws://fea0c1ed4375.ngrok-free.app/ws/med-assist/session";

export class WebSocketServiceV2 {
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
        "with session ID:",
        this.config.sessionId
      );

      this.ws = new WebSocket(wsUrl);

      // Set up WebSocket event handlers
      this.setupWebSocketHandlers();

      // Set connection timeout
      this.connectionTimeout = setTimeout(() => {
        if (this.connectionState === ConnectionState.CONNECTING) {
          console.log("Connection timeout");
          this.cleanup();
          this.updateConnectionState(ConnectionState.ERROR);
          this.triggerEvent(
            WEBSOCKET_SERVER_EVENTS.ERROR,
            new Error("Connection timeout")
          );
        }
      }, this.config.options?.connectionTimeout || 60000);

      // Wait for connection to be established
      await new Promise<void>((resolve, reject) => {
        if (!this.ws) {
          reject(new Error("WebSocket not initialized"));
          return;
        }

        const onOpen = () => {
          console.log("WebSocket connected successfully");
          this.isReconnecting = false;
          this.reconnectAttempts = 0;
          this.updateConnectionState(ConnectionState.CONNECTED);
          this.startPingInterval();
          this.triggerEvent("connection_state_change", true);
          resolve();
        };

        const onError = (error: Event) => {
          console.error("WebSocket connection error:", error);
          this.isReconnecting = false;
          this.updateConnectionState(ConnectionState.ERROR);
          reject(new Error("WebSocket connection failed"));
        };

        this.ws.onopen = onOpen;
        this.ws.onerror = onError;
      });
    } catch (error) {
      console.error("Failed to connect:", error);
      this.isReconnecting = false;
      this.updateConnectionState(ConnectionState.ERROR);
      this.triggerEvent(
        WEBSOCKET_SERVER_EVENTS.ERROR,
        error instanceof Error ? error : new Error("Connection failed")
      );
      throw error;
    }
  }

  /**
   * Set up WebSocket event handlers
   */
  private setupWebSocketHandlers(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      console.log("WebSocket opened");
    };

    this.ws.onmessage = (event) => {
      try {
        const data: ServerMessage = JSON.parse(event.data);
        this.handleServerMessage(data);
      } catch (error) {
        console.error("Failed to parse WebSocket message:", error);
      }
    };

    this.ws.onclose = (event) => {
      console.log("WebSocket closed:", event.code, event.reason);
      this.handleConnectionClose(event);
    };

    this.ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      this.triggerEvent(
        WEBSOCKET_SERVER_EVENTS.ERROR,
        new Error("WebSocket error occurred")
      );
    };
  }

  /**
   * Handle server messages
   */
  private handleServerMessage(message: ServerMessage): void {
    console.log("Received server message:", message);

    switch (message.ev) {
      case WEBSOCKET_SERVER_EVENTS.CONNECTION_ESTABLISHED:
        this.handleConnectionEstablished(message as ConnectionEstablishedMessage);
        break;

      case WEBSOCKET_SERVER_EVENTS.CHAT:
        this.handleChatMessage(message as ChatResponseMessage);
        break;

      case WEBSOCKET_SERVER_EVENTS.STREAM:
        this.handleStreamMessage(message as StreamResponseMessage);
        break;

      case WEBSOCKET_SERVER_EVENTS.END_OF_STREAM:
        this.handleEndOfStreamMessage(message as EndOfStreamMessage);
        break;

      case WEBSOCKET_SERVER_EVENTS.PONG:
        this.handlePongMessage(message as PongMessage);
        break;

      case WEBSOCKET_SERVER_EVENTS.SYNC:
        this.handleSyncMessage(message as SyncMessage);
        break;

      case WEBSOCKET_SERVER_EVENTS.ERROR:
        this.handleErrorMessage(message as ErrorMessage);
        break;

      default:
        console.warn("Unknown event type:", message.ev);
    }
  }

  /**
   * Handle connection established message
   */
  private handleConnectionEstablished(message: ConnectionEstablishedMessage): void {
    console.log("Connection established:", message);
    this.triggerEvent(WEBSOCKET_SERVER_EVENTS.CONNECTION_ESTABLISHED, true);
  }

  /**
   * Handle chat message
   */
  private handleChatMessage(message: ChatResponseMessage): void {
    console.log("Chat message received:", message);
    this.triggerEvent(WEBSOCKET_SERVER_EVENTS.CHAT, message);
  }

  /**
   * Handle stream message
   */
  private handleStreamMessage(message: StreamResponseMessage): void {
    console.log("Stream message received:", message);
    this.triggerEvent(WEBSOCKET_SERVER_EVENTS.STREAM, message);
  }

  /**
   * Handle end of stream message
   */
  private handleEndOfStreamMessage(message: EndOfStreamMessage): void {
    console.log("End of stream message received:", message);
    this.triggerEvent(WEBSOCKET_SERVER_EVENTS.END_OF_STREAM, message);
  }

  /**
   * Handle pong message
   */
  private handlePongMessage(message: PongMessage): void {
    console.log("Pong message received:", message);
    this.triggerEvent(WEBSOCKET_SERVER_EVENTS.PONG, message);
  }

  /**
   * Handle sync message
   */
  private handleSyncMessage(message: SyncMessage): void {
    console.log("Sync message received:", message);
    this.triggerEvent(WEBSOCKET_SERVER_EVENTS.SYNC, message);
  }

  /**
   * Handle error message
   */
  private handleErrorMessage(message: ErrorMessage): void {
    console.error("Error message received:", message);
    this.triggerEvent(WEBSOCKET_SERVER_EVENTS.ERROR, new Error(message.msg));
  }

  /**
   * Handle connection close
   */
  private handleConnectionClose(event: CloseEvent): void {
    this.cleanup();
    this.updateConnectionState(ConnectionState.DISCONNECTED);
    this.triggerEvent(WEBSOCKET_SERVER_EVENTS.CONNECTION_ESTABLISHED, false);

    // Attempt to reconnect if not manually closed
    if (event.code !== 1000 && !this.isReconnecting) {
      this.attemptReconnect();
    }
  }

  /**
   * Attempt to reconnect
   */
  private attemptReconnect(): void {
    if (this.isReconnecting || this.reconnectAttempts >= this.maxReconnectAttempts) {
      return;
    }

    console.log(`Attempting to reconnect (${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      this.connect().catch((error) => {
        console.error("Reconnection failed:", error);
      });
    }, this.reconnectDelay);
  }

  /**
   * Send chat message
   */
  public sendChatMessage(message: string): void {
    if (!this.isConnected()) {
      throw new Error("WebSocket not connected");
    }

    const chatMessage: ChatRequest = {
      ev: SocketEvent.CHAT,
      ct: ContentType.TEXT,
      ts: Date.now(),
      data: { text: message },
    };

    this.sendMessage(chatMessage);
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
   * Send audio stream start
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

  /**
   * Send full audio data (AudioServiceV2 format) - CHANGED FROM ORIGINAL
   */
  public sendAudioStream(audioData: AudioData): void {
    if (!this.isConnected()) {
      throw new Error("WebSocket is not connected");
    }

    const message: AudioStreamRequestV2 = {
      ev: SocketEvent.STREAM,
      ct: ContentType.AUDIO,
      ts: Date.now(),
      data: {
        audio: audioData.audio, // Base64 encoded audio
        format: audioData.format, // MIME type
      },
    };

    console.log("Sending full audio data:", message);
    this.sendMessage(message);
  }

  /**
   * Send full audio data to backend (AudioServiceV2 format) - NEW METHOD
   */
  public sendAudioData(audioData: AudioData): void {
    if (!this.isConnected()) {
      throw new Error("WebSocket not connected");
    }

    const message: AudioStreamRequestV2 = {
      ev: SocketEvent.STREAM,
      ct: ContentType.AUDIO,
      ts: Date.now(),
      data: {
        audio: audioData.audio, // Base64 encoded audio
        format: audioData.format, // MIME type
      },
    };

    console.log("Sending full audio data to backend:", message);
    this.sendMessage(message);
  }

    /**
   * Send audio end of stream - CHANGED FROM ORIGINAL
   */
    public sendAudioEndOfStream(): void {
        if (!this.isConnected()) {
          throw new Error("WebSocket is not connected");
        }
        console.log("Sending audio end of stream");
        const message: AudioEndOfStreamRequest = {
          ev: SocketEvent.END_OF_STREAM,
          ct: ContentType.AUDIO,
          ts: Date.now(),
        };
    
        this.sendMessage(message);
      }
    
  /**
   * Send pill message
   */
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
   * Trigger event
   */
  private triggerEvent(event: string, data: any): void {
    const callbacks = this.eventCallbacks.get(event);
    if (callbacks) {
      callbacks.forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error("Error in event callback:", error);
        }
      });
    }
  }

  /**
   * Start ping interval
   */
  private startPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }

    this.pingInterval = setInterval(() => {
      this.sendPing();
    }, this.config.options?.pingInterval || 30000);
  }

  /**
   * Check if WebSocket is connected
   */
  public isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Get connection state
   */
  public getConnectionState(): ConnectionStateType {
    return this.connectionState;
  }

  /**
   * Update connection state
   */
  private updateConnectionState(state: ConnectionStateType): void {
    this.connectionState = state;
    console.log("Connection state updated:", state);
  }

  /**
   * Disconnect WebSocket
   */
  public disconnect(): void {
    if (this.ws) {
      this.ws.close(1000, "Manual disconnect");
    }
  }

  /**
   * Send message to WebSocket
   */
  private sendMessage(
    message: ClientMessage | { ev: string; ts: number }
  ): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      throw new Error("WebSocket is not open");
    }
  }

  /**
   * Cleanup resources
   */
  private cleanup(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }

    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }

    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onclose = null;
      this.ws.onerror = null;
      this.ws = null;
    }
  }
} 