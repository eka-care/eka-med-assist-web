import { useEffect, useState } from "react";
import { useNetworkStatus } from "./custom-hooks/useNetworkStatus";
import { ChatWidget } from "./organisms/chat-widget";
import useSessionStore from "./stores/medAssistStore";
import { config } from "./configs/constants";
import { v4 as uuidv4 } from "uuid";

interface AppProps {
  config?: {
    firstUserMessage?: string;
    theme?: string;
    onMinimize?: () => void;
    onClose?: () => void;
    mode?: "widget" | "full";
  };
}

function App({ config: appConfig }: AppProps = {}) {
  const [isWidgetOpen, setIsWidgetOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isFullMode, setIsFullMode] = useState(false);
  const { isOnline } = useNetworkStatus();

  const setAgentId = useSessionStore((state) => state.setAgentId);
  const setUserId = useSessionStore((state) => state.setUserId);

  useEffect(() => {
    const checkMobile = () => {
      const width = window?.innerWidth;
      const userAgent = navigator?.userAgent?.toLowerCase();
      const isMobileDevice =
        width < 768 ||
        /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
          userAgent
        );

      setIsMobile(appConfig?.mode === "full" || isMobileDevice);
      setIsFullMode(appConfig?.mode === "full");
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Set agentId and userId on mount
  useEffect(() => {
    // Set agent ID from config
    setAgentId(config.X_AGENT_ID);

    // Set or generate user ID
    let userId = localStorage.getItem("user_id");
    if (!userId) {
      userId = uuidv4();
      localStorage.setItem("user_id", userId);
    }
    setUserId(userId);

    // Open widget
    setIsWidgetOpen(true);
  }, []);

  const handleCloseWidget = () => {
    if (appConfig?.onClose) {
      appConfig.onClose();
    } else {
      setIsWidgetOpen(false);
      setIsExpanded(false);
    }
  };

  const handleExpandWidget = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div>
      {/* Chat Widget */}
      <>
        {/* Overlay for expanded mode */}
        {(isExpanded || isMobile) && (
          <div
            className="fixed inset-0 bg-transparent bg-opacity-50 z-40"
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
              title="Apollo Assist"
              firstUserMessage={appConfig?.firstUserMessage || ""}
              onClose={handleCloseWidget}
              onExpand={handleExpandWidget}
              isExpanded={isExpanded}
              isMobile={isMobile}
              isOnline={isOnline}
              isFullMode={isFullMode}
            />
          )}
        </div>
      </>
    </div>
  );
}

export default App;
