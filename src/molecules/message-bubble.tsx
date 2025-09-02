import {
  Button,
  DocAssistIcon,
  MultiSelectGroup,
  MULTI_SELECT_ADDITIONAL_OPTION,
  // ScrollArea,
} from "@ui/index";
// import { ThumbsUp, ThumbsDown, RotateCcw } from "lucide-react";
import { QuickActions } from "./quick-actions";
import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import AppointmentCard from "./appointment-card";
import { ContentType, type CommonHandlerData } from "@/types/socket";
// import { items } from "@/configs/appointments-demo.config";

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
  commonContentData?: CommonHandlerData; // Add common content data prop
  onContentClick?: (text: string, tool_use_id: string) => void; // Add common content click handler
  audioData?: any; // Add audio data support
  isResponded?: boolean; // Track if this bot message has been responded to
  files?: File[]; // Add files prop for file previews
}

export function MessageBubble({
  message,
  isBot = false,
  // onLike,
  // onDislike,
  // onRegenerate,
  quickActions,
  showActions,
  isQuickActionsDisabled,
  isStreaming = false,
  progressMessage,
  handleQuickAction,
  // messageId,
  isRegenerating = false,
  commonContentData,
  onContentClick,
  isResponded = false,
  files,
}: MessageBubbleProps) {
  const [selectedMultiValues, setSelectedMultiValues] = useState<string[]>([]);

  // Reset selected values when new commonContentData comes in
  useEffect(() => {
    if (commonContentData && commonContentData.type === ContentType.MULTI) {
      setSelectedMultiValues([]);
    }
  }, [commonContentData]);

  const handleMultiSelect = (values: string[]) => {
    setSelectedMultiValues(values);
  };

  const handleMultiSubmit = () => {
    if (
      onContentClick &&
      commonContentData?.tool_use_id &&
      commonContentData.type === ContentType.MULTI
    ) {
      // Handle additional options logic
      let finalValues = [...selectedMultiValues];

      if (
        commonContentData.data.additional_option ===
        MULTI_SELECT_ADDITIONAL_OPTION.NOTA
      ) {
        // If "none of the above" is selected, only send that
        const notaValue = selectedMultiValues.find(
          (value) => value === MULTI_SELECT_ADDITIONAL_OPTION.NOTA
        );
        if (notaValue) {
          finalValues = [notaValue];
        }
      } else if (
        commonContentData.data.additional_option ===
        MULTI_SELECT_ADDITIONAL_OPTION.AOTA
      ) {
        // If "all of the above" is selected, send all choices
        const aotaValue = selectedMultiValues.find(
          (value) => value === MULTI_SELECT_ADDITIONAL_OPTION.AOTA
        );
        if (aotaValue && commonContentData.data.choices) {
          finalValues = [...commonContentData.data.choices, aotaValue];
        }
      }

      // Send the selected values as comma-separated text
      onContentClick(finalValues.join(", "), commonContentData.tool_use_id);
    }
  };
  return (
    <div className="px-4 py-2">
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
            className={`text-sm leading-relaxed px-3 rounded-lg ${
              isBot
                ? "text-[var(--color-foreground)] bg-[var(--color-card)]"
                : "text-[var(--color-black-800)] bg-blue-200"
            }`}>
            {/* Only show message content if it's not empty or if it's a bot message */}
            {message && isBot && (
              <div className="markdown-content">
                <ReactMarkdown>{message}</ReactMarkdown>
              </div>
            )}
            {message && !isBot && <div className="text-sm p-4">{message}</div>}
            {isBot && progressMessage && (
              <div className="ml-2 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent font-medium">
                <ReactMarkdown>{progressMessage}</ReactMarkdown>
              </div>
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
          {files && files.length > 0 && (
            <div className="mt-2 p-2 bg-[var(--color-accent)] rounded-md">
              <div className="text-sm text-[var(--color-primary)]">
                📎 {files.length} files uploaded
              </div>
            </div>
          )}
          {/* Display common content for bot messages */}
          {isBot && commonContentData && (
            <>
              {commonContentData.type === ContentType.PILL &&
                commonContentData.data.choices &&
                commonContentData.data.choices.length > 0 && (
                  <div>
                    <div className="text-xs text-[var(--color-muted-foreground)] mb-2 font-medium">
                      {isResponded ? "Option selected:" : "Select an option:"}
                    </div>
                    <div className="flex flex-row gap-2 flex-wrap">
                      {commonContentData.data.choices.map((choice, index) => (
                        <Button
                          key={`${commonContentData.tool_use_id}-${index}`}
                          variant="outline"
                          size="sm"
                          className={`justify-start text-sm font-normal border-[var(--color-primary)] h-9 rounded-lg w-fit ${
                            isResponded
                              ? "bg-gray-100 text-gray-500 cursor-not-allowed"
                              : "hover:bg-[var(--color-accent)] text-[var(--color-primary)]"
                          }`}
                          onClick={() =>
                            !isResponded &&
                            onContentClick?.(
                              choice,
                              commonContentData.tool_use_id
                            )
                          }
                          disabled={isQuickActionsDisabled || isResponded}>
                          {choice}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

              {commonContentData.type === ContentType.MULTI &&
                commonContentData.data.choices &&
                commonContentData.data.choices.length > 0 && (
                  <div className="mt-3">
                    <div className="text-xs text-[var(--color-muted-foreground)] mb-2 font-medium">
                      {isResponded
                        ? "Options selected:"
                        : "Select multiple options:"}
                    </div>
                    <MultiSelectGroup
                      options={commonContentData.data.choices.map(
                        (choice, index) => ({
                          id: `${commonContentData.tool_use_id}-${index}`,
                          label: choice,
                          value: choice,
                        })
                      )}
                      selectedValues={selectedMultiValues}
                      onSelectionChange={
                        isResponded
                          ? () => {
                              console.log("already responded");
                            }
                          : handleMultiSelect
                      }
                      additionalOption={
                        commonContentData.data.additional_option
                      }
                      required={false}
                    />
                    {!isResponded && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2 text-sm font-normal border-[var(--color-primary)] hover:bg-[var(--color-accent)] text-[var(--color-primary)] h-8 rounded-lg"
                        onClick={handleMultiSubmit}
                        disabled={
                          isQuickActionsDisabled ||
                          selectedMultiValues.length === 0
                        }>
                        Confirm
                      </Button>
                    )}
                  </div>
                )}

              {commonContentData.type === ContentType.DOCTOR_CARD &&
                commonContentData.data.doctor_details?.doctor && (
                  <AppointmentCard
                    doctor={commonContentData.data.doctor_details.doctor}
                    availability={
                      commonContentData.data.doctor_details?.availability
                    }
                    onSelect={() => {
                      onContentClick?.(
                        `Can you give me availability dates and slots of Dr.${
                          commonContentData?.data?.doctor_details?.doctor
                            .name || "the doctor"
                        }`,
                        commonContentData.tool_use_id
                      );
                    }}
                    onBook={(info: { date: string; time: string }) => {
                      onContentClick?.(
                        `I want to book an appointment for Dr.${
                          commonContentData?.data?.doctor_details?.doctor
                            .name || "the doctor"
                        } on ${info.date} for ${info.time}`,
                        commonContentData.tool_use_id
                      );
                    }}
                    disabled={isResponded}
                  />
                )}
            </>
          )}

          {showActions && (
            <QuickActions
              actions={quickActions}
              onActionClick={handleQuickAction}
              disabled={isQuickActionsDisabled}
            />
          )}

          {/* {isBot && (
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
          )} */}
        </div>
      </div>
    </div>
  );
}
