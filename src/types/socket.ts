import { MULTI_SELECT_ADDITIONAL_OPTION } from "@/configs/enums";

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

export const WebSocketErrorCodes = {
  TIMEOUT: "timeout",
} as const;

export type WebSocketErrorCode =
  (typeof WebSocketErrorCodes)[keyof typeof WebSocketErrorCodes];

export type SocketEventType = (typeof SocketEvent)[keyof typeof SocketEvent];

// Content types
export const ContentType = {
  TEXT: "text",
  AUDIO: "audio",
  FILE: "file",
  PILL: "pill",
  MULTI: "multi",
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
  SERVER_RESTART: 1012,
  ABNORMAL_CLOSURE: 1006,
} as const;

// Base message interface
export interface BaseMessage {
  ev: SocketEventType;
  ts: number; // timestamp
  cts?: number; // client timestamp
}
export interface PingRequest extends BaseMessage {
  ev: typeof SocketEvent.PING;
  _id: string;
}
// Client to Server: Chat message
export interface ChatRequest extends BaseMessage {
  ev: typeof SocketEvent.CHAT;
  ct: typeof ContentType.TEXT | typeof ContentType.FILE;
  _id: string;
  data?: { url?: string; text?: string; tool_use_id?: string }; // message content or S3 URL
}

// Client to Server: Audio stream

export interface AudioStreamRequest extends BaseMessage {
  ev: typeof SocketEvent.STREAM;
  ct: typeof ContentType.AUDIO;
  _id: string;
  data: { audio: string; format: string }; // audio data as Uint8Array for real-time streaming
}
// Client to Server: Audio end of stream
export interface AudioEndOfStreamRequest extends BaseMessage {
  ev: typeof SocketEvent.END_OF_STREAM;
  ct: typeof ContentType.AUDIO;
  _id: string;
  // data: string; // final audio chunk as Uint8Array
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
  ct:
    | typeof ContentType.FILE
    | typeof ContentType.PILL
    | typeof ContentType.MULTI;
  data: {
    url?: string;
    exp?: number;
    tool_use_id?: string;
    choices?: string[];
    additional_option: MULTI_SELECT_ADDITIONAL_OPTION;
  }; // S3 presigned URL
  // ct: typeof ContentType.FILE;
  // data: { url: string; exp?: number }; // S3 presigned URL
}

// Server to Client: Pill response
export interface PillResponseMessage extends BaseMessage {
  ev: typeof SocketEvent.CHAT;
  ct: typeof ContentType.PILL;
  data: { choices: string[]; tool_use_id: string }; // pill data
}

// Server to Client: Stream response
export interface StreamResponseMessage extends BaseMessage {
  ev: typeof SocketEvent.STREAM;
  ct: typeof ContentType.TEXT;
  data: { text?: string; progress_msg?: string }; // text chunk
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
  | PillResponseMessage
  | StreamResponseMessage
  | EndOfStreamMessage
  | SyncMessage
  | PongMessage
  | ErrorMessage;

// Union type for all client messages
export type ClientMessage =
  | ChatRequest
  | AudioStreamRequest
  | AudioEndOfStreamRequest
  | AudioStreamRequest
  | PingRequest;

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

export enum SOCKET_ERROR_CODES {
  SESSION_INACTIVE = "session_not_found",
  SESSION_EXPIRED = "session_expired",
  INVALID_EVENT = "invalid_event",
  INVALID_CONTENT_TYPE = "invalid_content",
  PARSING_ERROR = "parsing", // for all LLM related error
  FILE_UPLOAD_INPROGRESS = "file_upload_inprogress",
  TIMEOUT = "timeout",
  SERVER_ERROR = "server_error",
}

// UI Error Message interface
export interface ErrorMessageUI {
  title: string;
  description?: string;
}

// Error messages for UI with title and description
export const ERROR_MESSAGES: Record<string, ErrorMessageUI> = {
  SESSION_INACTIVE: {
    title: "We couldn't find your session. Please start a new session.",
    description: "We couldn't find your session. Please start a new session.",
  },
  SESSION_EXPIRED: {
    title: "Session Expired",
    description: "Your session has expired. Please log in again.",
  },
  INVALID_EVENT: {
    title: "Invalid Request",
    description: "Something went wrong with the request. Please retry.",
  },
  INVALID_CONTENT_TYPE: {
    title: "Unsupported Format",
    description: "Unsupported file or data format.",
  },
  PARSING_ERROR: {
    title: "Processing Error",
    description: "We had trouble processing your request. Please try again.",
  },
  FILE_UPLOAD_INPROGRESS: {
    title: "Another File Upload is in progress",
    description: "A file is still uploading. Please wait.",
  },
  TIMEOUT: {
    title: "Request Timeout",
    description: "The request took too long. Please try again.",
  },
  SERVER_ERROR: {
    title: "Server Error",
    description: "Something went wrong on our side. Please try again later.",
  },
  OFFLINE: {
    title: "No Internet Connection",
    description: "You're offline. Please check your internet connection.",
  },
  CONNECTION_LOST: {
    title: "Trying to reconnect...",
    description: "Please wait while we try to reconnect",
  },
  CONNECTION_ATTEMPTS_EXCEEDED: {
    title: "Failed to connect",
    description: "Please check your connection and try again",
  },
} as const;

export type ConnectionStateType =
  (typeof ConnectionState)[keyof typeof ConnectionState];

// WebSocket configuration
export interface WebSocketConfig {
  sessionId: string;
  auth: {
    token: string;
  };
  options?: {
    connectAttempts?: number;
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
