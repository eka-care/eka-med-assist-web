import { io, Socket } from "socket.io-client";

export interface SocketIOConfig {
  sessionId: string;
  auth: {
    token: string;
  };
  options?: {
    reconnectAttempts?: number;
    reconnectDelay?: number;
    pingInterval?: number;
    connectionTimeout?: number;
  };
}

export class SocketIOService {
  private socket: Socket | null = null;
  private config: SocketIOConfig;
  private eventCallbacks: Map<string, Set<(...args: any[]) => void>> =
    new Map();
  private pingInterval: number | null = null;

  constructor(config: SocketIOConfig) {
    this.config = {
      sessionId: config.sessionId,
      auth: config.auth,
      options: {
        reconnectAttempts: 5,
        reconnectDelay: 1000,
        pingInterval: 30000,
        connectionTimeout: 20000,
        ...config.options,
      },
    };
  }

  public connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.socket = io(
          `http://1ac0c5115fc1.ngrok-free.app?token=${encodeURIComponent(
            this.config.auth.token
          )}`,
          {
            path: `/ws/med-assist/session/${this.config.sessionId}`,
            transports: ["websocket"],
            reconnection: true,
            reconnectionAttempts: this.config.options?.reconnectAttempts || 5,
            reconnectionDelay: this.config.options?.reconnectDelay || 1000,
            timeout: this.config.options?.connectionTimeout || 20000,
          }
        );

        this.socket.on("connect", () => {
          console.log("Socket.IO connected");
          this.startPingInterval();
          resolve();
        });

        this.socket.on("connect_error", (error) => {
          console.error("Socket.IO connection error:", error);
          // Don't reject immediately - wait for conn event or timeout
          console.log(
            "Connection error occurred, but waiting for conn event..."
          );
          reject(error);
        });

        // Listen for the custom 'conn' event from your server
        this.socket.on("conn", (data) => {
          console.log("Server connection established:", data);
          console.log("Session ID:", data.sid);
          console.log("Message:", data.msg);
          this.startPingInterval();
          resolve();
        });

        this.socket.on("disconnect", (reason, code) => {
          console.log("Socket.IO disconnected:", reason, "Code:", code);
          this.stopPingInterval();
        });
      } catch (error) {
        console.log("Socket.IO connection error:", error);
        console.log("socket", this.socket);

        reject(error);
      }
    });
  }

  public disconnect(): void {
    this.stopPingInterval();
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  private startPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }

    this.pingInterval = setInterval(() => {
      if (this.socket?.connected) {
        this.emit("ping", { ts: Math.floor(Date.now()) });
      }
    }, this.config.options?.pingInterval || 30000);
  }

  private stopPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  public on(event: string, callback: (...args: any[]) => void): void {
    if (!this.eventCallbacks.has(event)) {
      this.eventCallbacks.set(event, new Set());
    }
    this.eventCallbacks.get(event)!.add(callback);

    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  public off(event: string, callback?: (...args: any[]) => void): void {
    if (callback) {
      this.eventCallbacks.get(event)?.delete(callback);
      if (this.socket) {
        this.socket.off(event, callback);
      }
    } else {
      this.eventCallbacks.delete(event);
      if (this.socket) {
        this.socket.off(event);
      }
    }
  }

  public emit(event: string, data?: any): void {
    if (this.socket) {
      // Add timestamp to all emitted events if not already present
      const messageWithTimestamp = {
        ...data,
        ts: data?.ts || Math.floor(Date.now()),
      };
      this.socket.emit(event, messageWithTimestamp);
    }
  }

  public isConnected(): boolean {
    return this.socket?.connected || false;
  }
}
