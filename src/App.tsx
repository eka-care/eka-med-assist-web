import { useEffect, useState } from "react";
// import { ChatWidget } from "./molecules/chat-widget";
import startSession from "./api/post-start-session";
// import { config } from "./configs/constants";
import { ChatWidget } from "./molecules/chat-widget";
import useSessionStore from "./stores/medAssistStore";

function App() {
  const [isWidgetOpen, setIsWidgetOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const setSessionId = useSessionStore((state) => state.setSessionId);
  const setSessionToken = useSessionStore((state) => state.setSessionToken);
  const setWidgetName = useSessionStore((state) => state.setWidgetName);
  const widgetName = useSessionStore((state) => state.widgetName);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Handle messages from widget-loader
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      switch (event.data.type) {
        case "WIDGET_INITIALIZE":
          console.log("Widget initializing, starting session...");
          // Reset any previous state when reopening
          setIsWidgetOpen(false);
          setIsExpanded(false);
          setSessionId("");
          setSessionToken("");
          // Start fresh session
          // handleOpenWidget()
          console.log(
            "event?.data?.config?.widgetName",
            event?.data?.config?.widgetName
          );
          const widgetName = event?.data?.config?.widgetName ?? "Med Assist";
          setWidgetName(widgetName || "Med Assist");
          handleOpenWidget();
          break;

        case "WIDGET_CLOSING":
          console.log("Widget is closing from widget-loader");
          setIsWidgetOpen(false);
          setIsExpanded(false);
          break;

        default:
          console.log("Unknown message type:", event.data.type);
          //handleCloseWidget();
          break;
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [setSessionId, setSessionToken]);

  const handleOpenWidget = async () => {
    console.log("Starting new session...");
    setIsLoading(true);

    try {
      // We need to handle if there is an open session already
      const { session_id, session_token } = await startSession();
      if (!session_id || !session_token) {
        throw new Error("Failed to start a new session");
      }

      setSessionId(session_id);
      setSessionToken(session_token);
      setIsWidgetOpen(true); // Make sure widget is set as open
      console.log("Session started successfully, widget opened");
    } catch (error) {
      console.error("Failed to start a new session:", error);
      // TODO: Show error to the user
      // setIsWidgetOpen(false); // Keep widget closed on error
    } finally {
      setIsLoading(false);
      setIsWidgetOpen(true);
    }
  };

  // useEffect(() => {
  //   // Only auto-open in development or when not in iframe
  //   console.log("evvironment", config.ENVIRONMENT);
  //   if (config.ENVIRONMENT === "production") {
  //     console.log("Not in development, not opening widget");
  //   } else {
  //     handleOpenWidget();
  //   }
  // }, []);


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

  // Show loading state while initializing
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing Medical Assistant...</p>
        </div>
      </div>
    );
  }

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
              title={widgetName}
              onClose={handleCloseWidget}
              onExpand={handleExpandWidget}
              isExpanded={isExpanded}
              isMobile={isMobile}
              onStartSession={handleOpenWidget}
            />
          </div>
        </>
      )}
    </div>
  );
}

export default App;
