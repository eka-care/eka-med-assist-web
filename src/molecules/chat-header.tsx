import { Button } from "@ui/index";
import { Maximize2, X, Plus, Minimize2 } from "lucide-react";
import { Separator } from "@ui/index";
import { CONNECTION_STATUS } from "@/types/widget";
import { useCallback, useEffect, useRef, useState } from "react";

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
  isFullMode?: boolean;
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
  isFullMode = false,
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
      className={`relative flex items-center justify-between px-4 py-4 bg-[var(--color-primary-background-default)]  ${
        isExpanded || isMobile ? "sticky top-0 z-10" : "rounded-t-lg"
      }`}>
      <div className="flex items-center gap-2">
        <div className="relative w-7 h-8">
          <img
            src={import.meta.env.BASE_URL + "assets/apollo-icon.svg"}
            alt="Apollo Icon"
            className={`flex-shrink-0 w-6 h-6`}
          />
          <span
            className={`absolute bottom-0 right-0 text-xs ${
              connectionStatus === CONNECTION_STATUS.CONNECTED && isOnline
                ? "bg-green-500 ring-2 ring-[var(--color-neutral-300)]"
                : connectionStatus === CONNECTION_STATUS.CONNECTING && isOnline
                ? "bg-yellow-500 ring-2 ring-[var(--color-neutral-300)]"
                : "bg-red-500 ring-2 ring-[var(--color-neutral-300)]"
            } rounded-full p-1`}></span>
        </div>

        <div>
          <h2 className="font-semibold text-[var(--color-background)] text-lg">
            {title}
          </h2>
          <p className="text-sm text-[var(--color-background)]">
            {connectionStatus === CONNECTION_STATUS.CONNECTED && isOnline
              ? "Here for You 24/7"
              : connectionStatus === CONNECTION_STATUS.CONNECTING && isOnline
              ? "Connecting"
              : "Not Connected"}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1">
        {/* Custom dropdown to avoid aria-hidden conflicts */}

        {/* Custom dropdown to avoid aria-hidden conflicts */}
        <div className="relative" ref={dropdownRef}>
          <Button
            variant="ghost"
            size="sm"
            title="Start New Chat"
            className="h-8 w-8 p-0 hover:bg-white/10 rounded-full cursor-pointer"
            onClick={handleDropdownToggle}>
            <Plus className="h-full w-full text-white" />
          </Button>
          {/* Dropdown content */}
          {isDropdownOpen && (
            <div
              className="absolute z-50 right-0 top-full mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-[9999]"
              onMouseDown={(e) => {
                // Prevent the outside click handler from firing
                e.stopPropagation();
              }}>
              <div className="py-1">
                <button
                  className="block w-full text-center p-2 text-sm text-gray-700 hover:bg-[var(--color-card)] focus:bg-[var(--color-card)] focus:outline-none cursor-pointer"
                  onClick={handleStartSession}>
                  Start New Chat
                </button>
              </div>
            </div>
          )}
        </div>

        {!isMobile && (
          <Button
            variant="ghost"
            size="sm"
            title={isExpanded ? "Minimize Chat" : "Maximize Chat"}
            className="h-6 w-6 p-0 text-[var(--color-background)] hover:bg-[var(--color-background-primary-default)] hover:text-[var(--color-primary-foreground)] cursor-pointer"
            onClick={onExpand}>
            {isExpanded ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>
        )}

        {!isFullMode && (
          <Button
            variant="ghost"
            size="sm"
            title="Close Chat"
            className="h-6 w-6 p-0 text-[var(--color-background)] hover:bg-[var(--color-background-primary-default)] hover:text-[var(--color-primary-foreground)] cursor-pointer"
            onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Subtle separator line */}
      <Separator className="absolute bottom-0 left-0 right-0" />
    </div>
  );
}
