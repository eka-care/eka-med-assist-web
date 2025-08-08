import { useState } from "react";
import { ChatWidgetSocket } from "../molecules/chat-widget-socket";
import {
  createUserSocketConfig,
  createUserTypeSocketConfig,
} from "../config/socket";
import { Button, Card } from "@ui/index";

export function ChatWidgetExample() {
  const [isWidgetOpen, setIsWidgetOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [userType, setUserType] = useState<"patient" | "doctor" | "admin">(
    "patient"
  );

  // Example user data
  const userId = "user-123";
  const username = "John Doe";

  // Create Socket.IO configuration based on user type
  const socketConfig = createUserTypeSocketConfig(userId, username, userType);

  const handleOpenWidget = () => {
    setIsWidgetOpen(true);
  };

  const handleCloseWidget = () => {
    setIsWidgetOpen(false);
    setIsExpanded(false);
  };

  const handleExpandWidget = () => {
    setIsExpanded(!isExpanded);
  };

  const handleUserTypeChange = (type: "patient" | "doctor" | "admin") => {
    setUserType(type);
    // Close and reopen widget to apply new configuration
    setIsWidgetOpen(false);
    setTimeout(() => {
      setIsWidgetOpen(true);
    }, 100);
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8 text-foreground">
          Apollo Assist with Socket.IO Integration
        </h1>

        {/* User Type Selection */}
        <Card className="p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Select User Type</h2>
          <div className="flex gap-4">
            <Button
              variant={userType === "patient" ? "default" : "outline"}
              onClick={() => handleUserTypeChange("patient")}>
              Patient
            </Button>
            <Button
              variant={userType === "doctor" ? "default" : "outline"}
              onClick={() => handleUserTypeChange("doctor")}>
              Doctor
            </Button>
            <Button
              variant={userType === "admin" ? "default" : "outline"}
              onClick={() => handleUserTypeChange("admin")}>
              Admin
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Current room: {socketConfig.roomId}
          </p>
        </Card>

        {/* Connection Info */}
        <Card className="p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Connection Information</h2>
          <div className="space-y-2 text-sm">
            <p>
              <strong>Server URL:</strong> {socketConfig.url}
            </p>
            <p>
              <strong>User ID:</strong> {socketConfig.userId}
            </p>
            <p>
              <strong>Username:</strong> {socketConfig.username}
            </p>
            <p>
              <strong>Room ID:</strong> {socketConfig.roomId}
            </p>
            <p>
              <strong>User Type:</strong> {userType}
            </p>
          </div>
        </Card>

        {/* Demo Instructions */}
        <Card className="p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Features Demo</h2>
          <ul className="space-y-2 text-sm">
            <li>✅ Real-time messaging with Socket.IO</li>
            <li>✅ Typing indicators</li>
            <li>✅ Connection status monitoring</li>
            <li>✅ Automatic reconnection</li>
            <li>✅ Message queuing when offline</li>
            <li>✅ User-specific rooms</li>
            <li>✅ Error handling and recovery</li>
          </ul>
        </Card>

        {/* Open Chat Widget Button */}
        <div className="text-center">
          <Button
            onClick={handleOpenWidget}
            className="px-6 py-3 rounded-full"
            size="lg">
            Open Apollo Assist Chat
          </Button>
        </div>

        {/* Chat Widget */}
        {isWidgetOpen && (
          <ChatWidgetSocket
            title={`Apollo Assist - ${
              userType.charAt(0).toUpperCase() + userType.slice(1)
            } Support`}
            onClose={handleCloseWidget}
            onExpand={handleExpandWidget}
            isExpanded={isExpanded}
            isMobile={isMobile}
            socketConfig={socketConfig}
            welcomeMessage={`Hi! I'm Apollo Assist, your ${userType} support assistant. How can I help you today?`}
            showConnectionStatus={true}
          />
        )}
      </div>
    </div>
  );
}

// Example of using the Socket.IO service directly
export function DirectSocketIOExample() {
  const [messages, setMessages] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  const handleConnect = async () => {
    try {
      const { SocketIOService } = await import("../services/SocketIOService");

      const config = createUserSocketConfig(
        "user-456",
        "Jane Smith",
        "test-room"
      );
      const socketService = new SocketIOService(config);

      // Set up event listeners
      socketService.on("connection", (connected: boolean) => {
        setIsConnected(connected);
        setMessages((prev) => [
          ...prev,
          `Connection: ${connected ? "Connected" : "Disconnected"}`,
        ]);
      });

      socketService.on("message", (message: any) => {
        setMessages((prev) => [...prev, `Received: ${message.content}`]);
      });

      socketService.on("error", (error: Error) => {
        setMessages((prev) => [...prev, `Error: ${error.message}`]);
      });

      // Connect
      await socketService.connect();

      // Send a test message
      socketService.sendMessage({
        content: "Hello from direct Socket.IO!",
        sender: "user",
        type: "text",
      });
    } catch (error) {
      setMessages((prev) => [...prev, `Connection failed: ${error}`]);
    }
  };

  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold mb-4">
        Direct Socket.IO Service Example
      </h2>
      <div className="space-y-4">
        <Button onClick={handleConnect} disabled={isConnected}>
          {isConnected ? "Connected" : "Connect to Socket.IO"}
        </Button>

        <div className="h-40 overflow-y-auto border rounded p-2">
          {messages.map((msg, index) => (
            <div key={index} className="text-sm mb-1">
              {msg}
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
