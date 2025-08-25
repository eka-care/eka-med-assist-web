import {
  Button,
  DocAssistIcon,
  MultiSelectGroup,
  MULTI_SELECT_ADDITIONAL_OPTION,
} from "@ui/index";
import { ThumbsUp, ThumbsDown, RotateCcw } from "lucide-react";
import { PillAction, QuickActions } from "./quick-actions";
import { useState, useEffect } from "react";

interface MessageBubbleProps {
  message: string;
  isBot?: boolean;
  showActions: boolean;
  quickActions: { id: string; label: string }[];
  isQuickActionsDisabled: boolean;
  isStreaming?: boolean;
  progressMessage?: string | null;
  onLike?: () => void;
  onDislike?: () => void;
  onRegenerate?: (messageId: string) => void;
  handleQuickAction: (action: string) => void;
  showRetry?: boolean;
  onRetry?: () => void;
  messageId: string; // Add messageId prop
  isRegenerating?: boolean; // Add isRegenerating prop
  pillAction?: PillAction; // Add pills prop
  onPillClick?: (pillText: string, tool_use_id: string) => void; // Add pill click handler
  multiData?: PillAction; // Add multi data prop
  onMultiClick?: (multiText: string, tool_use_id: string) => void; // Add multi click handler
  audioData?: any; // Add audio data support
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
  progressMessage,
  handleQuickAction,
  messageId,
  isRegenerating = false,
  pillAction,
  onPillClick,
  multiData,
  onMultiClick,
}: MessageBubbleProps) {
  const [selectedMultiValues, setSelectedMultiValues] = useState<string[]>([]);

  // Reset selected values when new multiData comes in
  useEffect(() => {
    if (multiData) {
      setSelectedMultiValues([]);
    }
  }, [multiData]);

  const handleMultiSelect = (values: string[]) => {
    setSelectedMultiValues(values);
  };

  const handleMultiSubmit = () => {
    if (onMultiClick && multiData?.tool_use_id) {
      // Handle additional options logic
      let finalValues = [...selectedMultiValues];

      if (multiData.additionalOption === MULTI_SELECT_ADDITIONAL_OPTION.NOTA) {
        // If "none of the above" is selected, only send that
        const notaValue = selectedMultiValues.find(
          (value) => value === MULTI_SELECT_ADDITIONAL_OPTION.NOTA
        );
        if (notaValue) {
          finalValues = [notaValue];
        }
      } else if (
        multiData.additionalOption === MULTI_SELECT_ADDITIONAL_OPTION.AOTA
      ) {
        // If "all of the above" is selected, send all choices
        const aotaValue = selectedMultiValues.find(
          (value) => value === MULTI_SELECT_ADDITIONAL_OPTION.AOTA
        );
        if (aotaValue) {
          finalValues = [...multiData.choices, aotaValue];
        }
      }

      // Send the selected values as comma-separated text
      onMultiClick(finalValues.join(", "), multiData.tool_use_id);
    }
  };
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
                : "text-[var(--color-black-800)] bg-blue-200"
            }`}>
            {/* Only show message content if it's not empty or if it's a bot message */}
            {(message || isBot) && message}
            {isBot && progressMessage && (
              <span className="ml-2 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent font-medium">
                {progressMessage}
              </span>
            )}
            {isBot && isStreaming && !progressMessage && (
              <span className="animate-pulse">...</span>
            )}
            {isBot && isRegenerating && (
              <span className="ml-2 text-blue-600 animate-pulse">
                🔄 Regenerating...
              </span>
            )}
          </div>

          {/* Display audio data for user messages */}
          {/* {!isBot && audioData && (
            <div className="mt-2 p-2 bg-[var(--color-accent)] rounded-md">
              <div className="text-sm text-[var(--color-primary)]">
                🎤 Voice message sent
              </div>
            </div>
          )} */}

          {/* Display pills for bot messages */}
          {isBot &&
            pillAction &&
            pillAction.tool_use_id &&
            pillAction.choices.length > 0 && (
              <div className="mt-3">
                <div className="text-xs text-[var(--color-muted-foreground)] mb-2 font-medium">
                  Select an option:
                </div>
                <div className="flex flex-col gap-2">
                  {pillAction.choices.map((choice, index) => (
                    <Button
                      key={`${pillAction.tool_use_id}-${index}`}
                      variant="outline"
                      size="sm"
                      className="justify-start text-sm font-normal border-[var(--color-primary)] hover:bg-[var(--color-accent)] text-[var(--color-primary)] h-9 rounded-lg w-full"
                      onClick={() =>
                        onPillClick?.(choice, pillAction.tool_use_id)
                      }
                      disabled={isQuickActionsDisabled}>
                      {choice}
                    </Button>
                  ))}
                </div>
              </div>
            )}

          {isBot &&
            multiData &&
            multiData.tool_use_id &&
            multiData.choices.length > 0 && (
              <div className="mt-3">
                <div className="text-xs text-[var(--color-muted-foreground)] mb-2 font-medium">
                  Select multiple options:
                </div>
                <MultiSelectGroup
                  options={multiData.choices.map((choice, index) => ({
                    id: `${multiData.tool_use_id}-${index}`,
                    label: choice,
                    value: choice,
                  }))}
                  selectedValues={selectedMultiValues}
                  onSelectionChange={handleMultiSelect}
                  additionalOption={multiData.additionalOption}
                  required={false}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 text-sm font-normal border-[var(--color-primary)] hover:bg-[var(--color-accent)] text-[var(--color-primary)] h-8 rounded-lg"
                  onClick={handleMultiSubmit}
                  disabled={
                    isQuickActionsDisabled || selectedMultiValues.length === 0
                  }>
                  Confirm
                </Button>
              </div>
            )}
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
                onClick={() => onRegenerate?.(messageId)}
                disabled={isRegenerating || isStreaming}>
                <RotateCcw
                  className={`h-3 w-3 text-[var(--color-muted-foreground)] ${
                    isRegenerating || isStreaming ? "opacity-50" : ""
                  }`}
                />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
