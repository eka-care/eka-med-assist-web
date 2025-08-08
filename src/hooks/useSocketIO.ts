import { useState, useEffect, useCallback, useRef } from "react";
import { SocketIOService } from "../services/SocketIOService";
import type {
  SocketIOConfig,
  ChatMessage,
  TypingIndicator,
  UserStatus,
  RoomInfo,
} from "../types/socket";
import { ConnectionState } from "../types/socket";

interface UseSocketIOReturn {
  // Connection state
  isConnected: boolean;
  connectionState: ConnectionState;
  isConnecting: boolean;
  isReconnecting: boolean;

  // Messages
  messages: ChatMessage[];
  sendMessage: (
    content: string,
    type?: ChatMessage["type"],
    metadata?: ChatMessage["metadata"]
  ) => void;

  // Typing indicators
  typingUsers: TypingIndicator[];
  sendTypingIndicator: (isTyping: boolean) => void;

  // User status
  userStatuses: UserStatus[];

  // Room management
  currentRoom: RoomInfo | null;
  joinRoom: (roomId: string) => void;
  leaveRoom: () => void;

  // Connection management
  connect: () => Promise<void>;
  disconnect: () => void;
  reconnect: () => Promise<void>;

  // Error handling
  error: Error | null;
  clearError: () => void;

  // Service instance
  socketService: SocketIOService | null;
}

interface UseSocketIOOptions {
  config: SocketIOConfig;
  autoConnect?: boolean;
  maxMessages?: number;
  enableTypingIndicator?: boolean;
  enableUserStatus?: boolean;
  enableRoomManagement?: boolean;
}

export function useSocketIO(options: UseSocketIOOptions): UseSocketIOReturn {
  const {
    config,
    autoConnect = true,
    maxMessages = 100,
    enableTypingIndicator = true,
    enableUserStatus = true,
    enableRoomManagement = true,
  } = options;

  // State
  const [connectionState, setConnectionState] = useState<ConnectionState>(
    ConnectionState.DISCONNECTED
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typingUsers, setTypingUsers] = useState<TypingIndicator[]>([]);
  const [userStatuses, setUserStatuses] = useState<UserStatus[]>([]);
  const [currentRoom, setCurrentRoom] = useState<RoomInfo | null>(null);
  const [error, setError] = useState<Error | null>(null);

  // Refs
  const socketServiceRef = useRef<SocketIOService | null>(null);
  const typingTimeoutRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map()
  );

  // Computed states
  const isConnected = connectionState === ConnectionState.CONNECTED;
  const isConnecting = connectionState === ConnectionState.CONNECTING;
  const isReconnecting = connectionState === ConnectionState.RECONNECTING;

  // Initialize socket service
  useEffect(() => {
    if (!socketServiceRef.current) {
      socketServiceRef.current = new SocketIOService(config);
    }

    const service = socketServiceRef.current;

    // Set up event listeners
    service.on("connection_state_change", (state: ConnectionState) => {
      setConnectionState(state);
    });

    service.on("message", (message: ChatMessage) => {
      setMessages((prev) => {
        const newMessages = [...prev, message];
        // Keep only the last maxMessages
        return newMessages.slice(-maxMessages);
      });
    });

    if (enableTypingIndicator) {
      service.on("typing", (typing: TypingIndicator) => {
        setTypingUsers((prev) => {
          const filtered = prev.filter((t) => t.userId !== typing.userId);
          if (typing.isTyping) {
            return [...filtered, typing];
          }
          return filtered;
        });

        // Clear typing indicator after 3 seconds
        if (typing.isTyping) {
          const timeout = setTimeout(() => {
            setTypingUsers((prev) =>
              prev.filter((t) => t.userId !== typing.userId)
            );
          }, 3000);

          typingTimeoutRef.current.set(typing.userId, timeout);
        } else {
          const timeout = typingTimeoutRef.current.get(typing.userId);
          if (timeout) {
            clearTimeout(timeout);
            typingTimeoutRef.current.delete(typing.userId);
          }
        }
      });
    }

    if (enableUserStatus) {
      service.on("user_status", (status: UserStatus) => {
        setUserStatuses((prev) => {
          const filtered = prev.filter((s) => s.userId !== status.userId);
          return [...filtered, status];
        });
      });
    }

    if (enableRoomManagement) {
      service.on("room_update", (room: RoomInfo) => {
        setCurrentRoom(room);
      });
    }

    service.on("error", (error: Error) => {
      setError(error);
    });

    // Auto-connect if enabled
    if (autoConnect) {
      service.connect().catch((err) => {
        setError(err);
      });
    }

    // Cleanup function
    return () => {
      // Clear typing timeouts
      typingTimeoutRef.current.forEach((timeout) => clearTimeout(timeout));
      typingTimeoutRef.current.clear();

      // Remove event listeners
      service.off("connection_state_change");
      service.off("message");
      service.off("typing");
      service.off("user_status");
      service.off("room_update");
      service.off("error");
    };
  }, [
    config,
    autoConnect,
    maxMessages,
    enableTypingIndicator,
    enableUserStatus,
    enableRoomManagement,
  ]);

  // Connection management
  const connect = useCallback(async () => {
    if (socketServiceRef.current) {
      try {
        setError(null);
        await socketServiceRef.current.connect();
      } catch (err) {
        setError(err as Error);
        throw err;
      }
    }
  }, []);

  const disconnect = useCallback(() => {
    if (socketServiceRef.current) {
      socketServiceRef.current.disconnect();
    }
  }, []);

  const reconnect = useCallback(async () => {
    if (socketServiceRef.current) {
      try {
        setError(null);
        await socketServiceRef.current.reconnect();
      } catch (err) {
        setError(err as Error);
        throw err;
      }
    }
  }, []);

  // Message management
  const sendMessage = useCallback(
    (
      content: string,
      type: ChatMessage["type"] = "text",
      metadata?: ChatMessage["metadata"]
    ) => {
      if (socketServiceRef.current && isConnected) {
        socketServiceRef.current.sendMessage({
          content,
          sender: "user",
          type,
          metadata,
          roomId: config.roomId,
          userId: config.userId,
        });
      }
    },
    [isConnected, config.roomId, config.userId]
  );

  // Typing indicator
  const sendTypingIndicator = useCallback(
    (isTyping: boolean) => {
      if (socketServiceRef.current && isConnected && enableTypingIndicator) {
        socketServiceRef.current.sendTypingIndicator(isTyping);
      }
    },
    [isConnected, enableTypingIndicator]
  );

  // Room management
  const joinRoom = useCallback(
    (roomId: string) => {
      if (socketServiceRef.current && isConnected && enableRoomManagement) {
        socketServiceRef.current.joinRoom(roomId);
      }
    },
    [isConnected, enableRoomManagement]
  );

  const leaveRoom = useCallback(() => {
    if (socketServiceRef.current && isConnected && enableRoomManagement) {
      socketServiceRef.current.leaveRoom();
    }
  }, [isConnected, enableRoomManagement]);

  // Error handling
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // Connection state
    isConnected,
    connectionState,
    isConnecting,
    isReconnecting,

    // Messages
    messages,
    sendMessage,

    // Typing indicators
    typingUsers,
    sendTypingIndicator,

    // User status
    userStatuses,

    // Room management
    currentRoom,
    joinRoom,
    leaveRoom,

    // Connection management
    connect,
    disconnect,
    reconnect,

    // Error handling
    error,
    clearError,

    // Service instance
    socketService: socketServiceRef.current,
  };
}

// Hook for typing indicator with debouncing
export function useTypingIndicator(
  sendTypingIndicator: (isTyping: boolean) => void,
  delay: number = 500
) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startTyping = useCallback(() => {
    sendTypingIndicator(true);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      sendTypingIndicator(false);
    }, delay);
  }, [sendTypingIndicator, delay]);

  const stopTyping = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    sendTypingIndicator(false);
  }, [sendTypingIndicator]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return { startTyping, stopTyping };
}
