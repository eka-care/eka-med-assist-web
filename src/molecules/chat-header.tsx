import { Button } from "@ui/index";
import { MoreHorizontal, Maximize2, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@ui/index";

interface ChatHeaderProps {
  title: string;
  onExpand?: () => void;
  onClose?: () => void;
  onMenuAction?: (action: string) => void;
  isExpanded?: boolean;
  isMobile?: boolean;
}

export function ChatHeader({
  title,
  onExpand,
  onClose,
  onMenuAction,
  isExpanded = false,
  isMobile = false,
}: ChatHeaderProps) {
  return (
    <div
      className={`flex items-center justify-between px-4 py-3 bg-[var(--color-card)] border-b border-[var(--color-border)] ${
        isExpanded || isMobile ? "sticky top-0 z-10" : ""
      }`}>
      <h2 className="font-medium text-[var(--color-foreground)] text-base">
        {title}
      </h2>
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-[var(--color-muted)]">
              <MoreHorizontal className="h-4 w-4 text-[var(--color-muted-foreground)]" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
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
    </div>
  );
}
