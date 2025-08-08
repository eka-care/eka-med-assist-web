// Socket.IO related types
export interface ChatMessage {
  id: string;
  content: string;
  sender: "user" | "bot" | "system";
  timestamp: Date;
  type?: "text" | "image" | "file" | "voice";
  metadata?: {
    fileUrl?: string;
    fileName?: string;
    fileSize?: number;
    mimeType?: string;
    duration?: number; // for voice messages
  };
  roomId?: string;
  userId?: string;
}

export interface TypingIndicator {
  userId: string;
  username: string;
  isTyping: boolean;
  roomId?: string;
}

export interface UserStatus {
  userId: string;
  username: string;
  status: "online" | "offline" | "away" | "busy";
  lastSeen?: Date;
}

export interface RoomInfo {
  id: string;
  name: string;
  participants: string[];
  lastMessage?: ChatMessage;
  unreadCount: number;
}

// Event callback types
export type MessageCallback = (message: ChatMessage) => void;
export type TypingCallback = (typing: TypingIndicator) => void;
export type UserStatusCallback = (status: UserStatus) => void;
export type ConnectionCallback = (connected: boolean) => void;
export type ErrorCallback = (error: Error) => void;
export type RoomUpdateCallback = (room: RoomInfo) => void;

// Configuration interface
export interface SocketIOConfig {
  url: string;
  options?: {
    transports?: string[];
    timeout?: number;
    forceNew?: boolean;
    reconnection?: boolean;
    reconnectionAttempts?: number;
    reconnectionDelay?: number;
    reconnectionDelayMax?: number;
    maxReconnectionAttempts?: number;
    autoConnect?: boolean;
    query?: Record<string, string>;
    auth?: {
      token?: string;
      [key: string]: any;
    };
  };
  userId?: string;
  username?: string;
  roomId?: string;
}

// Connection states
export enum ConnectionState {
  DISCONNECTED = "disconnected",
  CONNECTING = "connecting",
  CONNECTED = "connected",
  RECONNECTING = "reconnecting",
  ERROR = "error",
}
