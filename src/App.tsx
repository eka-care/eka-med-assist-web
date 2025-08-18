import { useState, useEffect } from "react";
import { ChatWidget } from "./molecules/chat-widget";
import startSession from "./api/post-start-session";
import useSessionStore from "./stores/medAssistStore";

function App() {
  const [isWidgetOpen, setIsWidgetOpen] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const setSessionId = useSessionStore((state) => state.setSessionId);
  const setSessionToken = useSessionStore((state) => state.setSessionToken);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);
  useEffect(() => {
    if (!isWidgetOpen) {
      console.log("widget is not open");
      return;
    }
    handleOpenWidget();
  }, [isWidgetOpen]);

  console.log("isWidgetOpen", isWidgetOpen);
  const handleOpenWidget = async () => {
    console.log("hi from  open fun");

    try {
      //add loading state
      setIsWidgetOpen(true);

      const { session_id, session_token } = await startSession();
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
      //setLoading(false)
      setIsWidgetOpen(true);
    }
  };

  const handleCloseWidget = () => {
    setIsWidgetOpen(false);
    setIsExpanded(false);
  };

  const handleExpandWidget = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div>
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
