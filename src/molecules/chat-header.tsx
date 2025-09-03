import { Button } from "@ui/index";
import { MoreHorizontal, Maximize2, X } from "lucide-react";
import { Separator } from "@ui/index";
import { useState, useRef, useEffect } from "react";

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
  isConnected = false,
}: ChatHeaderProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div
      className={`relative flex items-center justify-between px-4 py-2 bg-[var(--color-card)] ${
        isExpanded || isMobile ? "sticky top-0 z-10" : ""
      }`}>
      <div className="flex items-center gap-3">
        <h2 className="font-semibold text-[var(--color-foreground)] text-lg">
          {title}
        </h2>

        <div className={`flex items-center justify-center gap-2 px-2 py-1 ${isConnected? "bg-green-100 text-green-800 ": "bg-red-100 text-red-800"} text-xs font-medium rounded-full`}>
          <div
            className={`w-2 h-2 ${
              isConnected ? "bg-green-500 " : "bg-red-500"
            } rounded-full`}></div>
          <span>{isConnected ? "Connected" : "Disconnected"}</span>
        </div>
      </div>
      <div className="flex items-center gap-1">
        {/* Custom dropdown to avoid aria-hidden conflicts */}
        <div className="relative" ref={dropdownRef}>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-[var(--color-muted)] rounded-full"
            onClick={() => {
              console.log(
                "Dropdown button clicked, current state:",
                isDropdownOpen
              );
              setIsDropdownOpen(!isDropdownOpen);
            }}>
            <MoreHorizontal className="h-4 w-4 text-[var(--color-muted-foreground)]" />
          </Button>

          {/* Dropdown content */}
          {isDropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-[9999]">
              <div className="py-1">
                <button
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                  onClick={() => {
                    console.log("Start New Session clicked");
                    onStartSession();
                    setIsDropdownOpen(false);
                  }}>
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
