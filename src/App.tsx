import { useEffect, useState } from "react";
import startSession from "./api/post-start-session";
import { useNetworkStatus } from "./custom-hooks/useNetworkStatus";
import { ChatWidget } from "./organisms/chat-widget";
import useSessionStore from "./stores/medAssistStore";
import { v4 as uuidv4 } from "uuid";
interface AppProps {
  config?: {
    agentId: string;
    widgetTitle?: string;
    firstBotMessage?: string;
    firstUserMessage?: string;
    theme?: string;
    onClose?: () => void;
  };
}

function App({ config }: AppProps = {}) {
  const [isWidgetOpen, setIsWidgetOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { isOnline } = useNetworkStatus();
  const setSessionId = useSessionStore((state) => state.setSessionId);
  const setSessionToken = useSessionStore((state) => state.setSessionToken);
  const setError = useSessionStore((state) => state.setError);
  const setAgentId = useSessionStore((state) => state.setAgentId);
  const setStartNewConnection = useSessionStore(
    (state) => state.setStartNewConnection
  );

  useEffect(() => {
    const checkMobile = () => {
      const width = window?.innerWidth;
      const userAgent = navigator?.userAgent?.toLowerCase();
      // More comprehensive mobile detection
      const isMobileDevice =
        width < 768 ||
        /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
          userAgent
        );

      setIsMobile(isMobileDevice);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    // Validate and store the agentId in medAssist store
    if (
      !config?.agentId ||
      typeof config.agentId !== "string" ||
      config.agentId.trim() === ""
    ) {
      console.error(
        "Cannot start session: agentId is required and must be a non-empty string"
      );
      setError({
        title: "Configuration Error",
        description:
          "agentId is required to initialize the widget. Please provide a valid agentId.",
      });
      return;
    }

    setAgentId(config.agentId);
    setIsWidgetOpen(true);
  }, [config?.agentId]);

  const handleOpenWidget = async (newSession: boolean = false) => {
    // Get agentId from store (should be set during initialization)
    const agentId = useSessionStore.getState().agentId;

    if (!agentId || agentId.trim() === "") {
      console.error("Cannot start session: agentId is not available");
      setError({
        title: "Configuration Error",
        description:
          "agentId is required to start a session. Please reinitialize the widget with a valid agentId.",
      });
      setStartNewConnection(true);
      return;
    }

    // Check if user is online before proceeding
    if (!isOnline) {
      console.warn("Cannot start session: user is offline");
      return;
    }

    // Check if session already exists
    const currentSessionId = useSessionStore.getState().sessionId;
    const currentSessionToken = useSessionStore.getState().sessionToken;

    if (currentSessionId && currentSessionToken && !newSession) {
      setIsWidgetOpen(true);
      return;
    }

    setIsLoading(true);

    try {
      console.log("Calling startSession API...");
      let user_id = localStorage.getItem("user_id");
      if (!user_id) {
        user_id = uuidv4();
        localStorage.setItem("user_id", user_id);
      }
      const { session_id, session_token } = await startSession(user_id);

      if (!session_id || !session_token) {
        throw new Error(
          "Failed to start a new session - missing session_id or session_token"
        );
      }

      setSessionId(session_id);
      setSessionToken(session_token);
      console.log("Session started successfully, widget opened with session:");
    } catch (error) {
      console.error("Failed to start a new session:", error);
      setError({
        title: error instanceof Error ? error.message : "Something went wrong",
        description: "Please start a new session.",
      });
      setStartNewConnection(true);
    } finally {
      setIsLoading(false);
      setIsWidgetOpen(true);
    }
  };

  // console.log("isWidgetOpen", isWidgetOpen);

  const handleCloseWidget = () => {
    // If we have an onClose callback from the widget loader, call it
    // The loader will handle hiding the widget and showing the button

    if (config?.onClose) {
      config.onClose();
    } else {
      // Fallback for standalone mode
      setIsWidgetOpen(false);
      setIsExpanded(false);
    }
  };

  const handleExpandWidget = () => {
    const newExpandedState = !isExpanded;
    setIsExpanded(newExpandedState);
  };

  return (
    <div>
      {/* Chat Widget */}
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
          style={{ zIndex: 99999 }}
          className={
            isMobile
              ? "fixed inset-0"
              : isExpanded
              ? "fixed inset-0 p-4"
              : "fixed bottom-4 right-4"
          }>
          {isWidgetOpen && (
            <ChatWidget
              title={config?.widgetTitle || "Eka Med Assist"}
              firstUserMessage={config?.firstUserMessage || ""}
              firstBotMessage={config?.firstBotMessage || ""}
              onClose={handleCloseWidget}
              onExpand={handleExpandWidget}
              isExpanded={isExpanded}
              isMobile={isMobile}
              onStartSession={handleOpenWidget}
              isLoading={isLoading}
              isOnline={isOnline}
            />
          )}
        </div>
      </>
    </div>
  );
}

export default App;
