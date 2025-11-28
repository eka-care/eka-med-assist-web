import { Button } from "@ui/index";
import { Maximize2, X, Plus, Minimize2 } from "lucide-react";
import { Separator } from "@ui/index";
import { CONNECTION_STATUS } from "@/types/widget";

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
  return (
    <div
      className={`relative flex items-center justify-between px-4 py-4 bg-[var(--color-primary-background-default)] rounded-t-lg ${
        isExpanded || isMobile ? "sticky top-0 z-10" : ""
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
                ? "bg-green-500"
                : connectionStatus === CONNECTION_STATUS.CONNECTING && isOnline
                ? "bg-yellow-500"
                : "bg-red-500"
            } rounded-full p-1.5`}></span>
        </div>

        <div>
          <h2 className="font-semibold text-[var(--color-background)] text-lg">
            {title}
          </h2>
          <p className="text-sm text-[var(--color-background)]">
            {connectionStatus === CONNECTION_STATUS.CONNECTED && isOnline
              ? "Connected"
              : connectionStatus === CONNECTION_STATUS.CONNECTING && isOnline
              ? "Connecting"
              : "Not Connected"}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1">
        {/* Custom dropdown to avoid aria-hidden conflicts */}
        <div className="relative">
          <Button
            variant="ghost"
            size="sm"
            aria-label="Start New Chat"
            title="Start New Chat"
            className="h-8 w-8 p-0 text-[var(--color-background)] hover:bg-[var(--color-background-primary-default)] hover:text-[var(--color-primary-foreground)] cursor-pointer"
            onClick={onStartSession}>
            <Plus className="h-4 w-4" />
          </Button>

        </div>

        {!isMobile && (
          <Button
            variant="ghost"
            size="sm"
            title={isExpanded ? "Minimize Chat" : "Maximize Chat"}
            className="h-6 w-6 p-0 text-[var(--color-background)] hover:bg-[var(--color-background-primary-default)] hover:text-[var(--color-primary-foreground)] cursor-pointer"
            onClick={onExpand}>
            {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        )}

        <Button
          variant="ghost"
          size="sm"
          title="Close Chat"
          className="h-6 w-6 p-0 text-[var(--color-background)] hover:bg-[var(--color-background-primary-default)] hover:text-[var(--color-primary-foreground)] cursor-pointer"
          onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Subtle separator line */}
      <Separator className="absolute bottom-0 left-0 right-0" />
    </div>
  );
}
