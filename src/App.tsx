import { Button } from "@ui/index";
import { useState, useEffect } from "react";
import { ChatWidget } from "./molecules/chat-widget";
import { useTheme } from "@ui/index";
// import WebSocketChatExample from "./examples/WebSocketChatExample";
import startSession from "./api/post-start-session";
import useSessionStore from "./stores/medAssistStore";

function App() {
  const [isWidgetOpen, setIsWidgetOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showWebSocketExample, setShowWebSocketExample] = useState(false);
  const setSessionId = useSessionStore((state) => state.setSessionId);
  const setSessionToken = useSessionStore((state) => state.setSessionToken);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const handleOpenWidget = async () => {
    try {
      //add loading state
      const data = await startSession();
      console.log("data", data);
      const {session_id, session_token} =data

      if (!session_id || !session_token) {
        throw new Error("Failed to start a new session");
      }
      setSessionId(session_id);
      setSessionToken(session_token);

      setIsWidgetOpen(true);
    } catch (error) {
      console.log("Falied to start a new session");
      //TODO: Show error to the user
    } finally {
      setIsWidgetOpen(true);
      //setLoading(false)
    }
  };

  const handleCloseWidget = () => {
    setIsWidgetOpen(false);
    setIsExpanded(false);
  };

  const handleExpandWidget = () => {
    setIsExpanded(!isExpanded);
  };

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme as any);
  };

  const themes = [
    { name: "Patient Light", value: "patient-light" },
    { name: "Patient Dark", value: "patient-dark" },
    { name: "Doctor Light", value: "doctor-light" },
    { name: "Doctor Dark", value: "doctor-dark" },
    { name: "Client", value: "client" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Demo page content */}
      <div className="p-8">
        <h1 className="text-3xl font-bold text-center mb-8 text-foreground">
          Apollo Assist Demo
        </h1>

        {/* Theme Switcher */}
        <div className="max-w-4xl mx-auto mb-8">
          <div className="flex flex-wrap gap-2 justify-center">
            {themes.map((themeOption) => (
              <Button
                key={themeOption.value}
                onClick={() => handleThemeChange(themeOption.value)}
                variant={theme === themeOption.value ? "default" : "outline"}
                className="text-sm">
                {themeOption.name}
              </Button>
            ))}
          </div>
        </div>

        <div className="max-w-4xl mx-auto">
          <p className="text-muted-foreground mb-8 text-center">
            Click the button below to open the chat widget. On mobile devices,
            it will take full screen.
          </p>

          <div className="text-center space-x-4">
            <Button
              onClick={handleOpenWidget}
              className="px-6 py-3 rounded-full">
              Open Apollo Assist
            </Button>
            <Button
              onClick={() => setShowWebSocketExample(!showWebSocketExample)}
              variant="outline"
              className="px-6 py-3 rounded-full">
              {showWebSocketExample ? "Hide" : "Show"} WebSocket Example
            </Button>
          </div>
        </div>
      </div>

      {/* WebSocket Example */}
      {/* {showWebSocketExample && (
        <div className="max-w-4xl mx-auto mt-8">
          <WebSocketChatExample />
        </div>
      )} */}

      {/* Chat Widget */}
      {isWidgetOpen && (
        <>
          {/* Overlay for expanded mode */}
          {(isExpanded || isMobile) && (
            <div
              className="fixed inset-0 bg-black bg-opacity-50 z-40"
              onClick={handleCloseWidget}
            />
          )}

          {/* Widget positioned for web or mobile */}
          <div
            className={
              isMobile
                ? "fixed inset-0 z-50"
                : isExpanded
                ? "fixed inset-0 z-50 p-4"
                : "fixed bottom-4 right-4 z-50"
            }>
            <ChatWidget
              title="Apollo Assist"
              onClose={handleCloseWidget}
              onExpand={handleExpandWidget}
              isExpanded={isExpanded}
              isMobile={isMobile}
            />
          </div>
        </>
      )}
    </div>
  );
}

export default App;

// import { ChatWidgetSocket } from "./molecules/chat-widget-socket";
// import { createUserTypeSocketConfig } from "./config/socket";

// function App() {
//   const socketConfig = createUserTypeSocketConfig(
//     "user-123",
//     "John Doe",
//     "patient"
//   );

//   return (
//     <ChatWidgetSocket
//       socketConfig={socketConfig}
//       title="Apollo Assist"
//       showConnectionStatus={true}
//     />
//   );
// }
// export default App;
