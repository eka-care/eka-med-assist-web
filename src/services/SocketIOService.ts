import { io, Socket } from "socket.io-client";
import type {
  ChatMessage,
  TypingIndicator,
  UserStatus,
  RoomInfo,
  SocketIOConfig,
} from "../types/socket";
import { ConnectionState } from "../types/socket";

// Node.js types for timeouts
type TimeoutHandle = ReturnType<typeof setTimeout>;

// Re-export types for backward compatibility
export type {
  ChatMessage,
  TypingIndicator,
  UserStatus,
  RoomInfo,
  SocketIOConfig,
};
export { ConnectionState };

export class SocketIOService {
  private socket: Socket | null = null;
  private config: SocketIOConfig;
  private connectionState: ConnectionState = ConnectionState.DISCONNECTED;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 1000;
  private messageQueue: ChatMessage[] = [];
  private eventCallbacks: Map<string, Set<Function>> = new Map();
  private isReconnecting: boolean = false;
  private heartbeatInterval: TimeoutHandle | null = null;
  private connectionTimeout: TimeoutHandle | null = null;

  constructor(config: SocketIOConfig) {
    this.config = {
      url: config.url,
      options: {
        transports: ["websocket", "polling"],
        timeout: 20000,
        forceNew: true,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        maxReconnectionAttempts: 5,
        autoConnect: false,
        ...config.options,
      },
      userId: config.userId,
      username: config.username,
      roomId: config.roomId,
    };

    this.maxReconnectAttempts =
      this.config.options?.maxReconnectionAttempts || 5;
    this.reconnectDelay = this.config.options?.reconnectionDelay || 1000;
  }

  /**
   * Initialize and connect to the Socket.IO server
   */
  public async connect(): Promise<void> {
    try {
      this.updateConnectionState(ConnectionState.CONNECTING);

      // Create socket instance
      this.socket = io(this.config.url, {
        ...this.config.options,
        auth: {
          userId: this.config.userId,
          username: this.config.username,
          ...this.config.options?.auth,
        },
      });

      this.setupEventListeners();
      this.setupConnectionTimeout();

      return new Promise((resolve, reject) => {
        if (!this.socket) {
          reject(new Error("Socket initialization failed"));
          return;
        }

        this.socket.once("connect", () => {
          this.updateConnectionState(ConnectionState.CONNECTED);
          this.reconnectAttempts = 0;
          this.isReconnecting = false;
          this.startHeartbeat();
          this.flushMessageQueue();
          this.emit("join_room", { roomId: this.config.roomId });
          resolve();
        });

        this.socket.once("connect_error", (error) => {
          this.updateConnectionState(ConnectionState.ERROR);
          reject(error);
        });
      });
    } catch (error) {
      this.updateConnectionState(ConnectionState.ERROR);
      throw error;
    }
  }

  /**
   * Disconnect from the Socket.IO server
   */
  public disconnect(): void {
    if (this.socket) {
      this.stopHeartbeat();
      this.clearConnectionTimeout();
      this.socket.disconnect();
      this.socket = null;
      this.updateConnectionState(ConnectionState.DISCONNECTED);
    }
  }

  /**
   * Send a message to the chat
   */
  public sendMessage(message: Omit<ChatMessage, "id" | "timestamp">): void {
    const fullMessage: ChatMessage = {
      ...message,
      id: this.generateMessageId(),
      timestamp: new Date(),
    };

    if (this.isConnected()) {
      this.emit("send_message", fullMessage);
    } else {
      // Queue message for later sending
      this.messageQueue.push(fullMessage);
      this.attemptReconnection();
    }
  }

  /**
   * Send typing indicator
   */
  public sendTypingIndicator(isTyping: boolean): void {
    if (this.isConnected()) {
      this.emit("typing", {
        userId: this.config.userId,
        username: this.config.username,
        isTyping,
        roomId: this.config.roomId,
      });
    }
  }

  /**
   * Join a specific room
   */
  public joinRoom(roomId: string): void {
    if (this.isConnected()) {
      this.emit("join_room", { roomId });
      this.config.roomId = roomId;
    }
  }

  /**
   * Leave current room
   */
  public leaveRoom(): void {
    if (this.isConnected() && this.config.roomId) {
      this.emit("leave_room", { roomId: this.config.roomId });
    }
  }

  /**
   * Update user status
   */
  public updateStatus(status: UserStatus["status"]): void {
    if (this.isConnected()) {
      this.emit("update_status", {
        userId: this.config.userId,
        status,
        timestamp: new Date(),
      });
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
  public getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  /**
   * Check if connected
   */
  public isConnected(): boolean {
    return (
      this.connectionState === ConnectionState.CONNECTED &&
      this.socket?.connected === true
    );
  }

  /**
   * Get socket instance (for advanced usage)
   */
  public getSocket(): Socket | null {
    return this.socket;
  }

  /**
   * Update authentication token
   */
  public updateAuth(token: string): void {
    if (this.socket) {
      this.socket.auth = { ...this.socket.auth, token };
    }
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
    if (!this.socket) return;

    // Connection events
    this.socket.on("connect", () => {
      this.updateConnectionState(ConnectionState.CONNECTED);
      this.reconnectAttempts = 0;
      this.isReconnecting = false;
      this.startHeartbeat();
      this.flushMessageQueue();
      this.triggerEvent("connection", true);
    });

    this.socket.on("disconnect", (reason) => {
      this.updateConnectionState(ConnectionState.DISCONNECTED);
      this.stopHeartbeat();
      this.triggerEvent("connection", false);

      if (reason === "io server disconnect") {
        // Server disconnected us, don't try to reconnect
        return;
      }

      this.attemptReconnection();
    });

    this.socket.on("connect_error", (error) => {
      this.updateConnectionState(ConnectionState.ERROR);
      this.triggerEvent("error", error);
      this.handleReconnectionError(error);
    });

    this.socket.on("reconnect", (attemptNumber) => {
      this.updateConnectionState(ConnectionState.CONNECTED);
      this.reconnectAttempts = 0;
      this.isReconnecting = false;
      this.startHeartbeat();
      this.flushMessageQueue();
      this.triggerEvent("reconnect", attemptNumber);
    });

    this.socket.on("reconnect_attempt", (attemptNumber) => {
      this.reconnectAttempts = attemptNumber;
      this.triggerEvent("reconnect_attempt", attemptNumber);
    });

    this.socket.on("reconnect_error", (error) => {
      this.triggerEvent("reconnect_error", error);
    });

    this.socket.on("reconnect_failed", () => {
      this.updateConnectionState(ConnectionState.ERROR);
      this.triggerEvent("reconnect_failed");
    });

    // Chat events
    this.socket.on("message", (message: ChatMessage) => {
      this.triggerEvent("message", message);
    });

    this.socket.on("typing", (typing: TypingIndicator) => {
      this.triggerEvent("typing", typing);
    });

    this.socket.on("user_status", (status: UserStatus) => {
      this.triggerEvent("user_status", status);
    });

    this.socket.on("room_update", (room: RoomInfo) => {
      this.triggerEvent("room_update", room);
    });

    this.socket.on("error", (error: any) => {
      this.triggerEvent("error", error);
    });

    // Heartbeat
    this.socket.on("pong", () => {
      // Server responded to ping
    });
  }

  private setupConnectionTimeout(): void {
    this.clearConnectionTimeout();
    this.connectionTimeout = setTimeout(() => {
      if (this.connectionState === ConnectionState.CONNECTING) {
        this.updateConnectionState(ConnectionState.ERROR);
        this.triggerEvent("error", new Error("Connection timeout"));
      }
    }, this.config.options?.timeout || 20000);
  }

  private clearConnectionTimeout(): void {
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit("ping");
      }
    }, 30000); // Send ping every 30 seconds
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
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

  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (message) {
        this.emit("send_message", message);
      }
    }
  }

  private emit(event: string, data: any): void {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
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

  private updateConnectionState(state: ConnectionState): void {
    this.connectionState = state;
    this.triggerEvent("connection_state_change", state);
  }

  private generateMessageId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance for global usage
let socketServiceInstance: SocketIOService | null = null;

export const createSocketIOService = (
  config: SocketIOConfig
): SocketIOService => {
  if (!socketServiceInstance) {
    socketServiceInstance = new SocketIOService(config);
  }
  return socketServiceInstance;
};

export const getSocketIOService = (): SocketIOService | null => {
  return socketServiceInstance;
};

export const destroySocketIOService = (): void => {
  if (socketServiceInstance) {
    socketServiceInstance.disconnect();
    socketServiceInstance = null;
  }
};
