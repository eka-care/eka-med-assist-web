import { useEffect, useState } from "react";
import startSession from "./api/post-start-session";
import { ChatWidget } from "./molecules/chat-widget";
import useSessionStore from "./stores/medAssistStore";

interface AppProps {
    config?: {
        theme?: string;
        onMinimize?: () => void;
        onClose?: () => void;
        isProduction?: boolean;
    };
}

function App({ config }: AppProps = {}) {
    const [isWidgetOpen, setIsWidgetOpen] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
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
        setIsWidgetOpen(true);
    }, []);

    const handleOpenWidget = async () => {
        console.log("handleOpenWidget called");

        // Check if session already exists
        const currentSessionId = useSessionStore.getState().sessionId;
        const currentSessionToken = useSessionStore.getState().sessionToken;

        console.log("Current session state:", {
            sessionId: currentSessionId,
            sessionToken: currentSessionToken
        });

        if (currentSessionId && currentSessionToken) {
            setIsWidgetOpen(true);
            return;
        }

        setIsLoading(true);

        try {
            console.log("Calling startSession API...");
            const { session_id, session_token } = await startSession();
            console.log("Session API response:", { session_id, session_token });

            if (!session_id || !session_token) {
                throw new Error("Failed to start a new session - missing session_id or session_token");
            }

            console.log("Setting session in store...");
            setSessionId(session_id);
            setSessionToken(session_token);
            setIsWidgetOpen(true);
            console.log("Session started successfully, widget opened with session:", session_id);
        } catch (error) {
            console.error("Failed to start a new session:", error);
            // TODO: Show error to the user
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
        // If minimizing, call the onMinimize callback
        if (!newExpandedState && config?.onMinimize) {
            config.onMinimize();
        }
    };

    // Show loading state while initializing, false by default
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
                            title="Apollo Assist"
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
