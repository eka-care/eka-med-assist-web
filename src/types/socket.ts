// WebSocket event types for chatbot
export const SocketEvent = {
  // Client to Server events
  PING: "ping",
  PONG: "pong",
  CHAT: "chat",
  STREAM: "stream",
  END_OF_STREAM: "eos",
  SYNC: "sync",
  ERROR: "err",

  // Server to Client events
  CONNECTION_ESTABLISHED: "conn",
} as const;

export type SocketEventType = (typeof SocketEvent)[keyof typeof SocketEvent];

// Content types
export const ContentType = {
  TEXT: "text",
  AUDIO: "audio",
  FILE: "file",
} as const;

export type ContentTypeType = (typeof ContentType)[keyof typeof ContentType];

// Socket disconnect codes
export const SocketCodes = {
  OK: 1000,
  BAD_REQUEST: 4000,
  UNAUTHORIZED: 4001,
  FORBIDDEN: 4003,
  NOT_FOUND: 4004,
  INTERNAL_SERVER_ERROR: 4999,
} as const;

// Base message interface
export interface BaseMessage {
  ev: SocketEventType;
  ts: number; // timestamp
  cts?: number; // client timestamp
}

// Client to Server: Chat message
export interface ChatRequest extends BaseMessage {
  ev: typeof SocketEvent.CHAT;
  ct: typeof ContentType.TEXT | typeof ContentType.FILE;
  data?: string; // message content or S3 URL
}

// Client to Server: Audio stream
export interface AudioStreamRequest extends BaseMessage {
  ev: typeof SocketEvent.STREAM;
  ct: typeof ContentType.AUDIO;
  data: Float32Array; // audio data
}

// Client to Server: Audio end of stream
export interface AudioEndOfStreamRequest extends BaseMessage {
  ev: typeof SocketEvent.END_OF_STREAM;
  ct: typeof ContentType.AUDIO;
  data: Float32Array; // final audio chunk
}

// Server to Client: Connection established
export interface ConnectionEstablishedMessage extends BaseMessage {
  ev: typeof SocketEvent.CONNECTION_ESTABLISHED;
  sid: string; // session id
  msg: string; // message
}

// Server to Client: Chat response (S3 URL for file upload)
export interface ChatResponseMessage extends BaseMessage {
  ev: typeof SocketEvent.CHAT;
  ct: typeof ContentType.FILE;
  data: {url: string,exp?:number}; // S3 presigned URL
}

// Server to Client: Stream response
export interface StreamResponseMessage extends BaseMessage {
  ev: typeof SocketEvent.STREAM;
  ct: typeof ContentType.TEXT;
  data: string; // text chunk
}

// Server to Client: End of stream
export interface EndOfStreamMessage extends BaseMessage {
  ev: typeof SocketEvent.END_OF_STREAM;
  ct: typeof ContentType.TEXT;
}

// Server to Client: Sync message
export interface SyncMessage extends BaseMessage {
  ev: typeof SocketEvent.SYNC;
}

// Server to Client: Pong response
export interface PongMessage extends BaseMessage {
  ev: typeof SocketEvent.PONG;
  cts: number; // client timestamp (same as ts from ping)
}

// Server to Client: Error message
export interface ErrorMessage extends BaseMessage {
  ev: typeof SocketEvent.ERROR;
  code: string;
  msg: string;
}

// Union type for all server messages
export type ServerMessage =
  | ConnectionEstablishedMessage
  | ChatResponseMessage
  | StreamResponseMessage
  | EndOfStreamMessage
  | SyncMessage
  | PongMessage
  | ErrorMessage;

// Union type for all client messages
export type ClientMessage =
  | ChatRequest
  | AudioStreamRequest
  | AudioEndOfStreamRequest;

// Chat message for UI
export interface ChatMessage {
  id: number; // timestamp as ID
  content: string;
  timestamp: Date;
  type: "text" | "file" | "audio";
  metadata?: {
    fileUrl?: string;
    fileName?: string;
    fileSize?: number;
    mimeType?: string;
    duration?: number;
    isStreaming?: boolean;
  };
}

// Connection states
export enum ConnectionState {
  DISCONNECTED = "disconnected",
  CONNECTING = "connecting",
  CONNECTED = "connected",
  RECONNECTING = "reconnecting",
  ERROR = "error",
}

export type ConnectionStateType =
  (typeof ConnectionState)[keyof typeof ConnectionState];

// WebSocket configuration
export interface WebSocketConfig {
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

// Event callback types
export type MessageCallback = (message: ChatMessage) => void;
export type ConnectionCallback = (connected: boolean) => void;
export type ErrorCallback = (error: Error) => void;
export type StreamCallback = (chunk: string) => void;
export type FileUploadCallback = (url: string) => void;
