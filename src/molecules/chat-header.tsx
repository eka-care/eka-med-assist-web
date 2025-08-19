import { Button } from "@ui/index";
import { MoreHorizontal, Maximize2, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Separator,
} from "@ui/index";

interface ChatHeaderProps {
  title: string;
  onExpand?: () => void;
  onClose?: () => void;
  onMenuAction?: (action: string) => void;
  onStartSession?: () => void;
  onClearSession?: () => void;
  isExpanded?: boolean;
  isMobile?: boolean;
  isConnected?: boolean;
}

export function ChatHeader({
  title,
  onExpand,
  onClose,
  onMenuAction,
  onStartSession,
  onClearSession,
  isExpanded = false,
  isMobile = false,
  isConnected = false,
}: ChatHeaderProps) {
  return (
    <div
      className={`relative flex items-center justify-between px-4 bg-[var(--color-card)] ${
        isExpanded || isMobile ? "sticky top-0 z-10" : ""
      }`}>
      <div className="flex items-center gap-3">
        <h2 className="font-semibold text-[var(--color-foreground)] text-lg">
          {title}
        </h2>
        {isConnected && (
          <div className="flex items-center gap-2 px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>Connected</span>
          </div>
        )}
      </div>
      <div className="flex items-center gap-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 hover:bg-[var(--color-muted)] rounded-full">
              <MoreHorizontal className="h-4 w-4 text-[var(--color-muted-foreground)]" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => onStartSession?.()}>
              Start New Session
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onClearSession?.()}>
              Clear Session
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onMenuAction?.("clear")}>
              Clear Chat
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onMenuAction?.("export")}>
              Export Chat
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onMenuAction?.("settings")}>
              Settings
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

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
