import React, { ErrorInfo, useEffect, useState } from "react";

interface ErrorScreenProps {
    error?: Error;
    errorInfo?: ErrorInfo;
    onRetry?: () => void;
    title?: string;
    message?: string;
    showDetails?: boolean;
}

const ErrorScreen: React.FC<ErrorScreenProps> = ({
    error,
    errorInfo,
    onRetry,
    title = "There was a problem while loading your virtual assistant",
    message = "Please try loading the chat again to fix the issue",
    //   showDetails = false,
}) => {
    const [isMobile, setIsMobile] = useState(false);

    // Mobile detection logic (same as App.tsx)
    useEffect(() => {
        console.log("error", error);
        console.log("errorInfo", errorInfo);
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };

        checkMobile();
        window.addEventListener("resize", checkMobile);
        return () => window.removeEventListener("resize", checkMobile);
    }, []);

    const handleRetry = () => {
        if (onRetry) {
            onRetry();
        } else {
            // Fallback: reload the page
            window.location.reload();
        }
    };

    // Container styles (same as chat widget)
    const containerStyles = isMobile
        ? "fixed inset-0 z-[2147483647] bg-[var(--color-card)] border-border flex flex-col h-screen w-screen items-center justify-center"
        : "fixed bottom-4 right-4 z-[2147483647] w-full max-w-sm bg-[var(--color-card)] border-border shadow-lg rounded-lg py-2 pb-4 items-center justify-center";

    const contentHeight = isMobile ? "flex-1 min-h-0" : "h-[500px]";

    return (
        <div className={containerStyles}>
            {/* Content */}
            <div
                className={`${contentHeight} flex flex-col items-center justify-center p-6 text-center`}>
                {/* Robot Illustration */}
                <div>
                    <img
                        src={import.meta.env.BASE_URL + "assets/error.png"}
                        alt="Error Robot"
                        className={`${isMobile
                            ? "w-32 h-48" // Smaller on mobile: 128px × 192px
                            : "w-[203px] h-[304px]" // Full size on desktop
                            } flex-shrink-0 mx-auto aspect-[201/301]`}
                    />
                </div>

                {/* Error Message */}
                <h1 className="text-md font-semibold text-gray-800 mb-3">{title}</h1>

                <p className="text-xs text-gray-600 mb-6">{message}</p>

                {/* Action Buttons */}
                <div className="space-y-3 w-full max-w-xs flex justify-center items-center">
                    <button
                        onClick={handleRetry}
                        className="w-fit bg-primary hover:bg-primary/80 text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2">
                        <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                            />
                        </svg>
                        <span>Reload chat</span>
                    </button>
                </div>

                {/* Error Details (Optional) */}
                {/* {showDetails && error && (
          <details className="mt-6 text-left w-full max-w-xs">
            <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700 mb-2">
              Show Error Details
            </summary>
            <div className="bg-gray-50 p-4 rounded-lg text-xs font-mono text-gray-700 overflow-auto max-h-40">
              <div className="mb-2">
                <strong>Error:</strong> {error.message}
              </div>
              {errorInfo && (
                <div>
                  <strong>Stack:</strong>
                  <pre className="whitespace-pre-wrap mt-1">
                    {errorInfo.componentStack}
                  </pre>
                </div>
              )}
            </div>
          </details>
        )} */}
            </div>
        </div>
    );
};

export default ErrorScreen;
