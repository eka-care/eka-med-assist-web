import { Button, DocAssistIcon } from "@ui/index";
import { ThumbsUp, ThumbsDown, RotateCcw } from "lucide-react";
import { QuickActions } from "./quick-actions";

interface MessageBubbleProps {
  message: string;
  isBot?: boolean;
  showActions: boolean;
  quickActions: { id: string; label: string }[];
  isQuickActionsDisabled: boolean;
  isStreaming?: boolean;
  onLike?: () => void;
  onDislike?: () => void;
  onRegenerate?: () => void;
  handleQuickAction: (action: string) => void;
}

export function MessageBubble({
  message,
  isBot = false,
  onLike,
  onDislike,
  onRegenerate,
  quickActions,
  showActions,
  isQuickActionsDisabled,
  isStreaming = false,
  handleQuickAction,
}: MessageBubbleProps) {
  return (
    <div className="px-4 py-3">
      <div
        className={`flex gap-2 items-start justify-center ${
          !isBot ? "justify-end" : ""
        }`}>
        {isBot && (
          <div className="flex-shrink-0 mt-1">
            <DocAssistIcon size={24} />
          </div>
        )}

        <div className={`${isBot ? "flex-1" : "max-w-[80%]"}`}>
          <div
            className={`text-sm leading-relaxed px-3 py-2 rounded-lg ${
              isBot
                ? "text-[var(--color-foreground)] bg-[var(--color-card)]"
                : "text-[var(--color-primary-foreground)] bg-[var(--color-primary)]"
            }`}>
            {message}
            {isBot && isStreaming && <span className="animate-pulse">...</span>}
          </div>

          {showActions && (
            <QuickActions
              actions={quickActions}
              onActionClick={handleQuickAction}
              disabled={isQuickActionsDisabled}
            />
          )}

          {isBot && (
            <div className="flex items-center gap-1 mt-3">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 hover:bg-[var(--color-muted)]"
                onClick={onLike}>
                <ThumbsUp className="h-3 w-3 text-[var(--color-muted-foreground)]" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 hover:bg-[var(--color-muted)]"
                onClick={onDislike}>
                <ThumbsDown className="h-3 w-3 text-[var(--color-muted-foreground)]" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 hover:bg-[var(--color-muted)]"
                onClick={onRegenerate}>
                <RotateCcw className="h-3 w-3 text-[var(--color-muted-foreground)]" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
