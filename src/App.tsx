import { useState, useEffect } from "react";
import { ChatWidget } from "./molecules/chat-widget";
// import startSession from "./api/post-start-session";
import useSessionStore from "./stores/medAssistStore";
import startSession from "./api/post-start-session";

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

  //PROD=================================================================================
  // useEffect(() => {
  //   const handleMessage = (event: MessageEvent) => {
  //     // Validate message origin for security
  //     // if (event.origin !== window.location.origin) {
  //     //   console.log("Invalid origin:", event.origin);
  //     //   return;
  //     // }
  //     console.log("Received message:", event.data);

  //     switch (event.data.type) {
  //       case "SESSION_STARTED":
  //         console.log("Session started by widget-loader:", event.data.session);
  //         // Set session data from widget-loader
  //         setSessionId(event.data.session.session_id);
  //         setSessionToken(event.data.session.session_token);
  //         // Show the widget
  //         setIsWidgetOpen(true);
  //         break;

  //       case "WIDGET_CLOSING":
  //         console.log("Widget is closing from widget-loader");
  //         // Widget-loader is closing the iframe, so hide our React widget
  //         setIsWidgetOpen(false);
  //         setIsExpanded(false);
  //         break;

  //       default:
  //         console.log("Unknown message type:", event.data.type);
  //         // handleOpenWidget();
  //         break;
  //     }
  //   };

  //   window.addEventListener("message", handleMessage);
  //   return () => window.removeEventListener("message", handleMessage);
  // }, []);

  // useEffect(() => {
  //   if (!isWidgetOpen) {
  //     console.log("widget is not open");
  //     return;
  //   }
  //   handleOpenWidget();
  // }, [isWidgetOpen]);

  //DEV=================================================================================
  useEffect(() => {
    handleOpenWidget();
  }, []);

  console.log("isWidgetOpen", isWidgetOpen);
  const handleOpenWidget = async () => {
    console.log("hi from  open fun");

    try {
      //add loading state
      const { session_id, session_token } = await startSession();
      if (!session_id || !session_token) {
        throw new Error("Failed to start a new session");
      }
      setSessionId(session_id);
      setSessionToken(session_token);

      setIsWidgetOpen(true);
    } catch (error) {
      console.log("Falied to start a new session",error);
      //TODO: Show error to the user
    } finally {
      //setLoading(false)
      //setIsWidgetOpen(true);
    }
  };

  const handleCloseWidget = () => {
    // Send message to widget-loader to close the iframe
    if (window.parent !== window) {
      window.parent.postMessage(
        {
          type: "WIDGET_CLOSE_REQUESTED",
        },
        "*"
      );
    }
    setIsWidgetOpen(false);
    setIsExpanded(false);
  };

  const handleExpandWidget = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div>
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
