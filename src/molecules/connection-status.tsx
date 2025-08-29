import { useNetworkStatus } from "@/custom-hooks/useNetworkStatus";
import { ErrorMessageUI } from "@/types/socket";
import { useEffect } from "react";

interface ConnectionStatusProps {
  className?: string;
  onRetry?: () => void;
  onStartNewSession: () => void;
  showRetryButton: boolean;
  clearError: () => void;
  startNewConnection?: boolean;
  error: ErrorMessageUI | null;
}

export function ConnectionStatus({
  className = "",
  onRetry,
  onStartNewSession,
  showRetryButton,
  startNewConnection,
  clearError,
  error,
}: ConnectionStatusProps) {
  const { isOnline } = useNetworkStatus();
  // const {
  //   // isConnectionEstablished,
  //   showRetryButton,
  //   startNewConnection,
  //   // error,
  //   clearError,
  // } = useMedAssistStore();

  // // Don't show anything if connection is established and online and no error
  // if (
  //   isConnectionEstablished &&
  //   isOnline &&
  //   !error &&
  //   !showRetryButton &&
  //   !startNewConnection
  // ) {
  //   return null;
  // }

  useEffect(() => {
    console.log("showRetryButton", showRetryButton,"startNewConnection",startNewConnection);
  }, [showRetryButton,startNewConnection]);
  // Show new session error message if showSetNewSession is true
  if (startNewConnection) {
    return (
      <div
        className={`mx-4 mb-3 p-2 bg-[#FFFBEB] border border-[#FEE39B] rounded-lg ${className}`}>
        <div className="flex items-center gap-3">
          {/* Warning Icon */}
          <div className="w-5 h-5 bg-[#F7B500] rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-white text-sm font-bold">!</span>
          </div>

          {/* Error Message */}
          <div className="flex-1">
            <div className="text-[#333333] font-semibold text-sm">
              Something went wrong
            </div>
            <div className="text-[#666666] text-xs mt-1">
              Start a new session
            </div>
          </div>

          {/* Start New Session Button */}
          <button
            onClick={() => {
              if (onStartNewSession) {
                onStartNewSession();
              }
            }}
            className="px-4 py-2 bg-[#3B71F7] text-white text-sm font-semibold rounded-lg hover:bg-[#2E5CD9] transition-colors flex items-center gap-2 flex-shrink-0">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Start New Session
          </button>
        </div>
      </div>
    );
  }

  // Show retry button if showRetryButton is true
  if (showRetryButton) {
    return (
      <div
        className={`mx-4 mb-3 p-2 bg-[#FFFBEB] border border-[#FEE39B] rounded-lg ${className}`}>
        <div className="flex items-center gap-3">
          {/* Warning Icon */}
          <div className="w-5 h-5 bg-[#F7B500] rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-white text-sm font-bold">!</span>
          </div>

          {/* Error Message */}
          <div className="flex-1">
            <div className="text-[#333333] font-semibold text-sm">
              Failed to connect
            </div>
            <div className="text-[#666666] text-xs mt-1">
              Please check your connection and try again
            </div>
          </div>

          {/* Retry Button */}
          <button
            onClick={() => {
              clearError();
              if (onRetry) {
                onRetry();
              }
            }}
            className="px-4 py-2 bg-[#3B71F7] text-white text-sm font-semibold rounded-lg hover:bg-[#2E5CD9] transition-colors flex items-center gap-2 flex-shrink-0">
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
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Show loader when trying to reconnect (when there's an error but no retry button, or when connection is not established)
  return (
    <div
      className={`mx-4 mb-3 p-2 bg-[#FFFBEB] border border-[#FDD835] rounded-lg ${className}`}>
      <div className="flex items-center gap-3">
        {/* Info Icon */}
        <div className="w-5 h-5 bg-[#FDD835] rounded-full flex items-center justify-center flex-shrink-0">
          <span className="text-white text-sm font-bold">!</span>
        </div>

        {/* Loading Message */}
        <div className="flex-1">
          <div className="text-[#333333] font-semibold text-sm">
            {!isOnline ? "No internet connection" : error?.title || "Something went wrong"}
            {/* {!isOnline ? "No internet connection" : "Trying to reconnect..."} */}
          </div>
          <div className="text-[#666666] text-xs mt-1">
            {!isOnline
              ? "Please check your internet connection"
              : error?.description
              ? error.description
              : "Please wait while we try to reconnect"}
          </div>
        </div>

        {/* Loading Spinner */}
        <div className="flex-shrink-0">
          <div className="w-6 h-6 border-2 border-[#FDD835] border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    </div>
  );
}
