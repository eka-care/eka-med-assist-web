import { Button } from "@ui/index";
import { MoreHorizontal, Maximize2, X } from "lucide-react";
import { Separator } from "@ui/index";
import { useState, useRef, useEffect, useCallback } from "react";
import { CONNECTION_STATUS } from "@/types/widget";
import SignalIcon from "@ui/eka-ui/icons/SignalIcon";
import NoSignalIcon from "@ui/eka-ui/icons/NoSignalIcon";

interface ChatHeaderProps {
  title: string;
  onExpand?: () => void;
  onClose?: () => void;
  onMenuAction?: (action: string) => void;
  onStartSession: () => void;
  onClearSession?: () => void;
  isExpanded?: boolean;
  isMobile?: boolean;
  isConnected?: boolean;
  connectionStatus: CONNECTION_STATUS;
  isOnline: boolean;
}

export function ChatHeader({
  title,
  onExpand,
  onClose,
  // onMenuAction,
  onStartSession,
  // onClearSession,
  isExpanded = false,
  isMobile = false,
  // isConnected = false,
  connectionStatus,
  isOnline,
}: ChatHeaderProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: Event) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    }

    // In Shadow DOM, we need to listen on the shadow root or document
    const shadowRoot = dropdownRef.current?.getRootNode() as ShadowRoot;
    const eventTarget =
      shadowRoot instanceof ShadowRoot ? shadowRoot : document;

    eventTarget.addEventListener("mousedown", handleClickOutside);
    return () => {
      eventTarget.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleDropdownToggle = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDropdownOpen((prev) => !prev);
    },
    [isDropdownOpen]
  );

  const handleStartSession = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDropdownOpen(false);
      // Add a small delay to ensure state update completes
      setTimeout(() => {
        onStartSession();
      }, 0);
    },
    [onStartSession]
  );

  return (
    <div
      className={`relative flex items-center justify-between px-4 py-2 bg-[var(--color-card)] ${
        isExpanded || isMobile ? "sticky top-0 z-10" : ""
      }`}>
      <div className="flex items-center gap-2">
          <img
            // src={import.meta.env.BASE_URL + "assets/apollo-icon.svg"}
            src={"https://dr.eka.care/images/docAssistAiIcon.svg"}
            alt="Apollo Icon"
            className={`flex-shrink-0 w-6 h-6`}
          />
        <h2 className="font-semibold text-[var(--color-foreground)] text-lg">
          {title}
        </h2>

        <div
          className={`flex items-center justify-center gap-2 px-2 py-1 ${
            connectionStatus === CONNECTION_STATUS.CONNECTED && isOnline
              ? "bg-green-100 text-green-800 "
              : connectionStatus === CONNECTION_STATUS.CONNECTING && isOnline
              ? "bg-yellow-100 text-yellow-800"
              : "bg-red-100 text-red-800"
          } text-xs font-medium rounded-lg`}>
          {connectionStatus === CONNECTION_STATUS.CONNECTED && isOnline ? (
            <SignalIcon className="text-green-600" />
          ) : connectionStatus === CONNECTION_STATUS.CONNECTING && isOnline ? (
            <SignalIcon className="text-yellow-600" />
          ) : (
            <NoSignalIcon className="text-red-600" />
          )}
          <span>
            {connectionStatus === CONNECTION_STATUS.CONNECTED && isOnline
              ? "Connected"
              : connectionStatus === CONNECTION_STATUS.CONNECTING && isOnline
              ? "Connecting"
              : "Not Connected"}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-1">
        {/* Custom dropdown to avoid aria-hidden conflicts */}
        <div className="relative" ref={dropdownRef}>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-[var(--color-muted)] rounded-full"
            onClick={handleDropdownToggle}>
            <MoreHorizontal className="h-4 w-4 text-[var(--color-muted-foreground)]" />
          </Button>

          {/* Dropdown content */}
          {isDropdownOpen && (
            <div
              className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-[9999]"
              onMouseDown={(e) => {
                // Prevent the outside click handler from firing
                e.stopPropagation();
              }}>
              <div className="py-1">
                <button
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                  onClick={handleStartSession}>
                  Start New Session
                </button>
                {/* <button
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                  onClick={() => {
                    console.log("Clear Session clicked");
                    setIsDropdownOpen(false);
                  }}>
                  Clear Session
                </button> */}
                {/* <button
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                  onClick={() => {
                    console.log("Export Chat clicked");
                    setIsDropdownOpen(false);
                  }}>
                  Export Chat
                </button> */}
                {/* <button
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                  onClick={() => {
                    console.log("Settings clicked");
                    setIsDropdownOpen(false);
                  }}>
                  Settings
                </button> */}
              </div>
            </div>
          )}
        </div>

        {!isMobile && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 hover:bg-[var(--color-muted)]"
            onClick={onExpand}>
            <Maximize2 className="h-4 w-4 text-[var(--color-muted-foreground)]" />
          </Button>
        )}

        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 hover:bg-[var(--color-muted)]"
          onClick={onClose}>
          <X className="h-4 w-4 text-[var(--color-muted-foreground)]" />
        </Button>
      </div>

      {/* Subtle separator line */}
      <Separator className="absolute bottom-0 left-0 right-0" />
    </div>
  );
}
