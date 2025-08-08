# Socket.IO Integration for Apollo Assist Chat

This document provides comprehensive guidance on integrating Socket.IO with your Apollo Assist chat application using the provided service classes and React hooks.

## Table of Contents

1. [Overview](#overview)
2. [Installation](#installation)
3. [Quick Start](#quick-start)
4. [Architecture](#architecture)
5. [Configuration](#configuration)
6. [Usage Examples](#usage-examples)
7. [Best Practices](#best-practices)
8. [Troubleshooting](#troubleshooting)
9. [API Reference](#api-reference)

## Overview

The Socket.IO integration provides:

- **Real-time messaging** with automatic reconnection
- **Typing indicators** with debouncing
- **Connection status monitoring** with visual feedback
- **Message queuing** when offline
- **Room-based chat** for different user types
- **Error handling** and recovery mechanisms
- **TypeScript support** with full type safety

## Installation

### 1. Install Socket.IO Client

```bash
npm install socket.io-client
npm install --save-dev @types/socket.io-client
```

### 2. Add to package.json

```json
{
  "dependencies": {
    "socket.io-client": "^4.7.0"
  },
  "devDependencies": {
    "@types/socket.io-client": "^3.0.0"
  }
}
```

## Quick Start

### Basic Integration

```tsx
import { ChatWidgetSocket } from "./molecules/chat-widget-socket";
import { createUserSocketConfig } from "./config/socket";

function App() {
  const socketConfig = createUserSocketConfig(
    "user-123",
    "John Doe",
    "support-room"
  );

  return (
    <ChatWidgetSocket
      socketConfig={socketConfig}
      title="Apollo Assist"
      showConnectionStatus={true}
    />
  );
}
```

### Using the Hook Directly

```tsx
import { useSocketIO } from "./hooks/useSocketIO";
import { createUserSocketConfig } from "./config/socket";

function ChatComponent() {
  const socketConfig = createUserSocketConfig("user-123", "John Doe");

  const { isConnected, messages, sendMessage, typingUsers, error } =
    useSocketIO({
      config: socketConfig,
      autoConnect: true,
    });

  return (
    <div>
      <div>Status: {isConnected ? "Connected" : "Disconnected"}</div>
      {messages.map((msg) => (
        <div key={msg.id}>{msg.content}</div>
      ))}
      <button onClick={() => sendMessage("Hello!")}>Send Message</button>
    </div>
  );
}
```

## Architecture

### Core Components

1. **SocketIOService** (`src/services/SocketIOService.ts`)

   - Main service class handling Socket.IO connections
   - Manages reconnection, message queuing, and event handling
   - Provides singleton pattern for global usage

2. **useSocketIO Hook** (`src/hooks/useSocketIO.ts`)

   - React hook for easy integration
   - Manages state and provides connection management
   - Includes typing indicator functionality

3. **ChatWidgetSocket** (`src/molecules/chat-widget-socket.tsx`)

   - Enhanced chat widget with Socket.IO integration
   - Shows connection status and typing indicators
   - Handles offline/online states gracefully

4. **Configuration** (`src/config/socket.ts`)
   - Environment-based configuration
   - User type-specific settings
   - Easy customization for different deployments

### Data Flow

```
User Input → MessageInput → useSocketIO → SocketIOService → Socket.IO Server
                ↓
            Local State → ChatWidgetSocket → UI Updates
```

## Configuration

### Environment Configuration

```tsx
// src/config/socket.ts
export const socketConfigs = {
  development: {
    url: "http://localhost:3001",
    options: {
      timeout: 10000,
      reconnectionAttempts: 3,
    },
  },
  production: {
    url: "https://apollo-api.yourdomain.com",
    options: {
      timeout: 30000,
      reconnectionAttempts: 10,
    },
  },
};
```

### User Type Configuration

```tsx
// Different rooms for different user types
export const userTypeConfigs = {
  patient: {
    roomId: "patient-support",
    options: { query: { userType: "patient" } },
  },
  doctor: {
    roomId: "doctor-support",
    options: { query: { userType: "doctor" } },
  },
  admin: {
    roomId: "admin-support",
    options: { query: { userType: "admin" } },
  },
};
```

### Custom Configuration

```tsx
import { SocketIOConfig } from "./services/SocketIOService";

const customConfig: SocketIOConfig = {
  url: "https://your-socket-server.com",
  options: {
    transports: ["websocket"],
    timeout: 15000,
    reconnection: true,
    reconnectionAttempts: 5,
    auth: {
      token: "your-auth-token",
      userId: "user-123",
    },
  },
  userId: "user-123",
  username: "John Doe",
  roomId: "custom-room",
};
```

## Usage Examples

### 1. Basic Chat Widget

```tsx
import { ChatWidgetSocket } from "./molecules/chat-widget-socket";
import { createUserTypeSocketConfig } from "./config/socket";

function BasicChat() {
  const socketConfig = createUserTypeSocketConfig(
    "user-123",
    "John Doe",
    "patient"
  );

  return (
    <ChatWidgetSocket
      socketConfig={socketConfig}
      title="Patient Support"
      welcomeMessage="Hi! How can I help you today?"
      showConnectionStatus={true}
    />
  );
}
```

### 2. Advanced Hook Usage

```tsx
import { useSocketIO, useTypingIndicator } from "./hooks/useSocketIO";
import { createUserSocketConfig } from "./config/socket";

function AdvancedChat() {
  const socketConfig = createUserSocketConfig("user-123", "John Doe");

  const {
    isConnected,
    connectionState,
    messages,
    sendMessage,
    typingUsers,
    sendTypingIndicator,
    error,
    reconnect,
  } = useSocketIO({
    config: socketConfig,
    autoConnect: true,
    maxMessages: 200,
    enableTypingIndicator: true,
    enableUserStatus: true,
    enableRoomManagement: true,
  });

  const { startTyping, stopTyping } = useTypingIndicator(sendTypingIndicator);

  const handleSendMessage = (content: string) => {
    sendMessage(content, "text");
  };

  const handleInputChange = (value: string) => {
    if (value.length > 0) {
      startTyping();
    } else {
      stopTyping();
    }
  };

  return (
    <div>
      {/* Connection Status */}
      <div className={`status ${isConnected ? "connected" : "disconnected"}`}>
        {connectionState}
      </div>

      {/* Error Display */}
      {error && (
        <div className="error">
          {error.message}
          <button onClick={reconnect}>Retry</button>
        </div>
      )}

      {/* Messages */}
      <div className="messages">
        {messages.map((msg) => (
          <div key={msg.id} className={`message ${msg.sender}`}>
            {msg.content}
          </div>
        ))}
      </div>

      {/* Typing Indicators */}
      {typingUsers.length > 0 && (
        <div className="typing">
          {typingUsers.map((user) => (
            <span key={user.userId}>{user.username} is typing...</span>
          ))}
        </div>
      )}

      {/* Input */}
      <input
        onChange={(e) => handleInputChange(e.target.value)}
        onKeyPress={(e) => {
          if (e.key === "Enter") {
            handleSendMessage(e.currentTarget.value);
            e.currentTarget.value = "";
          }
        }}
        disabled={!isConnected}
      />
    </div>
  );
}
```

### 3. Direct Service Usage

```tsx
import { SocketIOService } from "./services/SocketIOService";
import { createUserSocketConfig } from "./config/socket";

class ChatManager {
  private socketService: SocketIOService;

  constructor() {
    const config = createUserSocketConfig("user-123", "John Doe");
    this.socketService = new SocketIOService(config);
    this.setupEventListeners();
  }

  private setupEventListeners() {
    this.socketService.on("message", (message) => {
      console.log("New message:", message);
    });

    this.socketService.on("connection", (connected) => {
      console.log("Connection status:", connected);
    });

    this.socketService.on("error", (error) => {
      console.error("Socket error:", error);
    });
  }

  async connect() {
    try {
      await this.socketService.connect();
      console.log("Connected to Socket.IO server");
    } catch (error) {
      console.error("Connection failed:", error);
    }
  }

  sendMessage(content: string) {
    this.socketService.sendMessage({
      content,
      sender: "user",
      type: "text",
    });
  }

  disconnect() {
    this.socketService.disconnect();
  }
}
```

## Best Practices

### 1. Connection Management

```tsx
// Always handle connection states
const { isConnected, connectionState, reconnect } = useSocketIO({ config });

useEffect(() => {
  if (connectionState === "error") {
    // Show retry button or auto-retry
    setTimeout(reconnect, 5000);
  }
}, [connectionState]);
```

### 2. Error Handling

```tsx
// Provide user-friendly error messages
const { error, clearError } = useSocketIO({ config });

if (error) {
  return (
    <div className="error-banner">
      <span>Connection error: {error.message}</span>
      <button onClick={clearError}>Dismiss</button>
      <button onClick={reconnect}>Retry</button>
    </div>
  );
}
```

### 3. Message Queuing

```tsx
// The service automatically queues messages when offline
// Messages are sent when connection is restored
const { sendMessage, isConnected } = useSocketIO({ config });

const handleSend = (content: string) => {
  sendMessage(content);
  // Message will be queued if offline and sent when connected
};
```

### 4. Typing Indicators

```tsx
// Use debounced typing indicators
const { sendTypingIndicator } = useSocketIO({ config });
const { startTyping, stopTyping } = useTypingIndicator(sendTypingIndicator);

const handleInputChange = (value: string) => {
  if (value.length > 0) {
    startTyping(); // Debounced
  } else {
    stopTyping();
  }
};
```

### 5. Performance Optimization

```tsx
// Limit message history to prevent memory issues
const { messages } = useSocketIO({
  config,
  maxMessages: 100, // Keep only last 100 messages
});

// Use React.memo for message components
const MessageComponent = React.memo(({ message }) => (
  <div>{message.content}</div>
));
```

## Troubleshooting

### Common Issues

1. **Connection Timeout**

   ```tsx
   // Increase timeout for slow connections
   const config = {
     ...baseConfig,
     options: {
       timeout: 30000, // 30 seconds
       reconnectionAttempts: 10,
     },
   };
   ```

2. **CORS Issues**

   ```tsx
   // Ensure server allows your domain
   const config = {
     url: "https://your-server.com",
     options: {
       withCredentials: true,
       transports: ["websocket", "polling"],
     },
   };
   ```

3. **Authentication Errors**

   ```tsx
   // Include proper auth tokens
   const config = {
     options: {
       auth: {
         token: "your-jwt-token",
         userId: "user-123",
       },
     },
   };
   ```

4. **Memory Leaks**
   ```tsx
   // Always cleanup event listeners
   useEffect(() => {
     const service = new SocketIOService(config);

     return () => {
       service.disconnect();
     };
   }, []);
   ```

### Debug Mode

```tsx
// Enable debug logging
const config = {
  options: {
    debug: true, // Enable Socket.IO debug logs
    logger: {
      debug: console.log,
      info: console.info,
      warn: console.warn,
      error: console.error,
    },
  },
};
```

## API Reference

### SocketIOService

#### Methods

- `connect(): Promise<void>` - Connect to Socket.IO server
- `disconnect(): void` - Disconnect from server
- `sendMessage(message): void` - Send a message
- `sendTypingIndicator(isTyping): void` - Send typing indicator
- `joinRoom(roomId): void` - Join a specific room
- `leaveRoom(): void` - Leave current room
- `updateStatus(status): void` - Update user status
- `reconnect(): Promise<void>` - Manually reconnect
- `on(event, callback): void` - Subscribe to events
- `off(event, callback?): void` - Unsubscribe from events

#### Events

- `connection` - Connection state changed
- `message` - New message received
- `typing` - Typing indicator received
- `user_status` - User status update
- `room_update` - Room information update
- `error` - Error occurred
- `connection_state_change` - Connection state changed

### useSocketIO Hook

#### Return Values

- `isConnected: boolean` - Connection status
- `connectionState: ConnectionState` - Current connection state
- `messages: ChatMessage[]` - Message history
- `sendMessage(content, type?, metadata?)` - Send message function
- `typingUsers: TypingIndicator[]` - Currently typing users
- `sendTypingIndicator(isTyping)` - Send typing indicator
- `error: Error | null` - Current error
- `reconnect()` - Reconnect function

#### Options

- `config: SocketIOConfig` - Socket.IO configuration
- `autoConnect?: boolean` - Auto-connect on mount
- `maxMessages?: number` - Maximum messages to keep
- `enableTypingIndicator?: boolean` - Enable typing indicators
- `enableUserStatus?: boolean` - Enable user status updates
- `enableRoomManagement?: boolean` - Enable room management

### Types

```tsx
interface ChatMessage {
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
    duration?: number;
  };
}

interface TypingIndicator {
  userId: string;
  username: string;
  isTyping: boolean;
  roomId?: string;
}

enum ConnectionState {
  DISCONNECTED = "disconnected",
  CONNECTING = "connecting",
  CONNECTED = "connected",
  RECONNECTING = "reconnecting",
  ERROR = "error",
}
```

## Server-Side Implementation

For the server-side Socket.IO implementation, you'll need to handle these events:

```javascript
// Server-side example (Node.js)
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // Handle authentication
  const { userId, username } = socket.auth;

  // Join room
  socket.on("join_room", ({ roomId }) => {
    socket.join(roomId);
  });

  // Handle messages
  socket.on("send_message", (message) => {
    // Broadcast to room
    socket.to(message.roomId).emit("message", message);
  });

  // Handle typing indicators
  socket.on("typing", (typing) => {
    socket.to(typing.roomId).emit("typing", typing);
  });

  // Handle user status
  socket.on("update_status", (status) => {
    socket.broadcast.emit("user_status", status);
  });

  // Handle ping/pong
  socket.on("ping", () => {
    socket.emit("pong");
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});
```

This comprehensive Socket.IO integration provides a robust, scalable solution for real-time chat functionality in your Apollo Assist application.
