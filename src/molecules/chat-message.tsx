import { useState, useEffect, useRef } from "react";
import {
  Button,
  MultiSelectGroup,
  MULTI_SELECT_ADDITIONAL_OPTION,
  PillItem,
  ThumbsUpIcon,
  ThumbsDownIcon,
} from "@ui/index";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import DoctorDetailsList from "./doctor-details-list";
import type { BookInfo } from "./doctor-details-list";
import { FilePreviewList } from "./file-preview";
import { FeedbackFollowUp } from "./feedback-followup";
import {
  DISLIKE_FEEDBACK_OPTIONS,
  type ExtendedToolEscalationData,
  type Message,
} from "@/types/widget";
import {
  type SendMessageOptions,
  type ToolCallResponse,
  SYNAPSE_COMPONENTS,
  USER_FEEDBACK,
} from "@eka-care/medassist-core";
import useMedAssistStore from "@/stores/medAssistStore";

// MarqueeText component for handling text overflow with hover-triggered marquee
interface MarqueeTextProps {
  text: string;
  maxWidth?: string;
  className?: string;
}

function MarqueeText({
  text,
  maxWidth = "200px",
  className = "",
}: MarqueeTextProps) {
  const [needsMarquee, setNeedsMarquee] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const checkOverflow = () => {
      if (containerRef.current && textRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        const textWidth = textRef.current.scrollWidth;
        setNeedsMarquee(textWidth > containerWidth);
      }
    };

    checkOverflow();
    window.addEventListener("resize", checkOverflow);
    return () => window.removeEventListener("resize", checkOverflow);
  }, [text, maxWidth]);

  return (
    <div
      ref={containerRef}
      className={`marquee-container ${className}`}
      style={{ maxWidth }}
      title={text}>
      <span
        ref={textRef}
        className={
          needsMarquee ? "marquee-text-default" : "marquee-text-normal"
        }>
        {text}
      </span>
    </div>
  );
}

interface ChatMessageProps {
  message: Message;
  progressMessage?: string | null;
  isLastMessage?: boolean;
  toolEscalationData?: ExtendedToolEscalationData;
  onSendMessage: (options: SendMessageOptions) => Promise<void>;
  callTool: <R extends ToolCallResponse = ToolCallResponse>(
    toolName: string,
    toolParams?: Record<string, unknown>
  ) => Promise<R>;
  onToggleFeedback: (feedback: USER_FEEDBACK,messageId: string, reason?: string) => Promise<void>;
}

export default function ChatMessage({
  message,
  isLastMessage,
  progressMessage,
  toolEscalationData,
  callTool,
  onSendMessage,
  onToggleFeedback,
}: ChatMessageProps) {
  const isBot = message.role !== "user";
  const [selectedValues, setSelectedValues] = useState<string[]>([]);
  const [userFeedback, setUserFeedback] = useState<USER_FEEDBACK>(
    message.feedback || USER_FEEDBACK.NONE
  );
  const [showFeedbackFollowUp, setShowFeedbackFollowUp] = useState(false);
  const { isStreaming } = useMedAssistStore();

  // Show feedback follow-up for dislike on last message
  useEffect(() => {
    if (message.feedback === USER_FEEDBACK.DISLIKE && isLastMessage) {
      setShowFeedbackFollowUp(true);
    } else {
      setShowFeedbackFollowUp(false);
    }
  }, [message.feedback, isLastMessage]);

  // Reset selected values when new toolEscalationData comes in
  useEffect(() => {
    if (toolEscalationData?.details?.component === SYNAPSE_COMPONENTS.MULTI) {
      setSelectedValues([]);
    }
  }, [toolEscalationData]);

  const handlePillClick = async (choice: string) => {
    const msgId = Date.now().toString();
    await onSendMessage({
      message: choice,
      messageId: msgId,
      toolCalled: true,
    });
  };

  const handleBook = async (info: BookInfo) => {
    await onSendMessage({
      message: `I want to book an appointment for ${
        info.doctorData?.doctor?.name || "the doctor"
      } on ${info.date} for ${info.time}`,
      toolCalled: true,
    });
  };

  const handleFeedbackToggle = (fb: USER_FEEDBACK) => {
    setUserFeedback(fb);
    onToggleFeedback(fb, message.id);
  };

  const handleCloseFeedbackPrompt = () => {
    setShowFeedbackFollowUp(false);
  };

  const handleDislikeReasonSelect = (option: PillItem) => {
    onToggleFeedback(USER_FEEDBACK.DISLIKE, option.value);
  };

  const handleMultiSelectChange = (values: string[]) => {
    setSelectedValues(values);
  };

  const getAdditionalOption = ():
    | MULTI_SELECT_ADDITIONAL_OPTION
    | undefined => {
    if (!toolEscalationData?.details?.input?.additional_option)
      return undefined;

    const option = toolEscalationData.details?.input?.additional_option as any;

    if (typeof option === "string") {
      if (
        option === MULTI_SELECT_ADDITIONAL_OPTION.NOTA ||
        option === MULTI_SELECT_ADDITIONAL_OPTION.AOTA
      ) {
        return option;
      }
    }

    if (typeof option === "object" && option !== null) {
      if (option.NOTA === MULTI_SELECT_ADDITIONAL_OPTION.NOTA) {
        return MULTI_SELECT_ADDITIONAL_OPTION.NOTA;
      }
      if (option.AOTA === MULTI_SELECT_ADDITIONAL_OPTION.AOTA) {
        return MULTI_SELECT_ADDITIONAL_OPTION.AOTA;
      }
    }

    return undefined;
  };

  const getMultiSelectOptions = () => {
    const options = toolEscalationData?.details?.input?.options;
    if (!options) return [];
    if (Array.isArray(options)) {
      return options.map((choice, index) => ({
        id: `option-${index}`,
        label: choice.label,
        value: choice.value,
      }));
    } else {
      return Object.keys(options).map((key, index) => ({
        id: `option-${index}`,
        label: key,
        value: key,
      }));
    }
  };

  const handleConfirm = async () => {
    if (selectedValues.length > 0) {
      const mergedMessage = selectedValues.join(", ");
      const msgId = Date.now().toString();
      await onSendMessage({
        message: mergedMessage,
        messageId: msgId,
        toolCalled: true,
      });
    }
  };

  const isTextEmpty = !message.content && !progressMessage && !isStreaming;
  const shouldRenderBubble = !isBot || !isTextEmpty;
  const isToolResponded = message.isResponded || toolEscalationData?.isResponded;

  return (
    <div className="px-4 py-2">
      <div
        className={`flex gap-2 ${
          isBot ? "items-start" : "items-start justify-end"
        }`}>
        <div className={`${isBot ? "flex-1 space-y-2" : "max-w-[80%]"}`}>
          {shouldRenderBubble && (
            <div
              className={`flex items-end gap-2 ${
                isBot ? "justify-start" : "justify-end"
              }`}>
              {isBot && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full overflow-hidden">
                  <img
                    src={import.meta.env.BASE_URL + "assets/indian-doctor.png"}
                    alt="Apollo Icon"
                    className="w-full h-full object-cover scale-125"
                  />
                </div>
              )}
              <div
                className={`text-sm leading-relaxed rounded-3xl ${
                  isBot
                    ? "rounded-bl-none text-[var(--color-foreground)] bg-[var(--color-background-primary-default)]"
                    : "rounded-br-none text-[var(--color-black-800)] bg-[var(--color-background-primary-subtle)]"
                }`}>
                {/* Tool call status */}
                {message.toolCallStatus && isBot && (
                  <div className="text-xs text-[var(--color-muted-foreground)] p-4 pb-2 border-b border-[var(--color-border)]">
                    {message.toolCallStatus}
                  </div>
                )}

                {/* Progress message (gradient style) */}
                {!message.toolCallStatus && progressMessage && isBot && isLastMessage && (
                  <div className="p-4 pb-0 bg-gradient-to-r from-[var(--color-primary)] via-[var(--color-primary-400)] to-[var(--color-primary-600)] bg-clip-text text-transparent font-medium">
                    <ReactMarkdown>{progressMessage}</ReactMarkdown>
                  </div>
                )}

                {/* Bot message content */}
                {message.content && isBot && (
                  <div className="markdown-content p-4">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {`${message.content}${isStreaming && isLastMessage ? " ..." : ""}`}
                    </ReactMarkdown>
                  </div>
                )}

                {/* User message content */}
                {message.content && !isBot && (
                  <div className="text-sm break-words p-4">{message.content}</div>
                )}

                {/* Streaming indicator */}
                {isBot && isStreaming && !message.content && !progressMessage && (
                  <span className="animate-pulse p-4 block">...</span>
                )}

                {/* Timestamp */}
                {message.timestamp && (
                  <p className="text-xs text-[var(--color-muted-foreground)] text-right px-4 pb-2">
                    {message.timestamp}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* File previews */}
          {message.files && message.files.length > 0 && (
            <div className="mt-2">
              <FilePreviewList files={message.files} isPreview={false} className="" />
            </div>
          )}

          {/* Tool Escalation: Pills, Multi-select, Doctor Cards */}
          {isBot && toolEscalationData && (
            <div className="flex items-end gap-2">
              <div className="flex-shrink-0 w-8 h-8 rounded-full overflow-hidden">
                {isTextEmpty && (
                  <img
                    src={import.meta.env.BASE_URL + "assets/indian-doctor.png"}
                    alt="Apollo Icon"
                    className="w-full h-full object-cover scale-125"
                  />
                )}
              </div>

              {/* Pills */}
              {toolEscalationData.details?.component ===
                SYNAPSE_COMPONENTS.PILL &&
                toolEscalationData.details?.input?.options && (
                  <div>
                    <div className="text-xs text-[var(--color-muted-foreground)] mb-2 font-medium">
                      {isToolResponded
                        ? "Option selected:"
                        : "Select an option:"}
                    </div>
                    <div className="flex flex-row gap-2 flex-wrap">
                      {toolEscalationData.details.input.options.map(
                        (choice, index) => (
                          <Button
                            key={`pill-${toolEscalationData.tool_id}-${index}`}
                            variant="outline"
                            size="sm"
                            className={`justify-start text-sm font-normal border-[var(--color-primary)] h-9 rounded-lg w-fit min-w-0 ${
                              isToolResponded
                                ? "bg-gray-100 text-gray-500 cursor-not-allowed"
                                : "hover:bg-[var(--color-accent)] text-[var(--color-primary)]"
                            }`}
                            onClick={() =>
                              !isToolResponded &&
                              handlePillClick(choice.value || "")
                            }
                            disabled={!!isToolResponded}>
                            <MarqueeText
                              text={choice.label || choice.value || ""}
                              maxWidth="250px"
                              className="text-left"
                            />
                          </Button>
                        )
                      )}
                    </div>
                  </div>
                )}

              {/* Multi-select */}
              {toolEscalationData.details?.component ===
                SYNAPSE_COMPONENTS.MULTI &&
                toolEscalationData.details?.input?.options && (
                  <div className="mt-3">
                    <div className="text-xs text-[var(--color-muted-foreground)] mb-2 font-medium">
                      {isToolResponded
                        ? "Options selected:"
                        : "Select multiple options:"}
                    </div>
                    <MultiSelectGroup
                      options={getMultiSelectOptions()}
                      selectedValues={selectedValues}
                      onSelectionChange={
                        isToolResponded ? () => {} : handleMultiSelectChange
                      }
                      additionalOption={getAdditionalOption()}
                      required={false}
                    />
                    {!isToolResponded && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2 text-sm font-normal border-[var(--color-primary)] hover:bg-[var(--color-accent)] text-[var(--color-primary)] h-8 rounded-lg"
                        onClick={handleConfirm}
                        disabled={selectedValues.length === 0}>
                        Confirm
                      </Button>
                    )}
                  </div>
                )}

              {/* Doctor Cards */}
              {toolEscalationData.details?.component ===
                SYNAPSE_COMPONENTS.DOCTOR_CARD &&
                toolEscalationData.details?.input?.doctors &&
                callTool && (
                  <DoctorDetailsList
                    doctorAvailabilities={
                      toolEscalationData.details.input.doctors
                    }
                    doctorDetails={
                      toolEscalationData.details.input.doctor_details
                    }
                    callbacks={
                      toolEscalationData.details._meta?.callbacks as any
                    }
                    callTool={callTool}
                    onBook={(info: BookInfo) => handleBook(info)}
                    disabled={!!isToolResponded}
                  />
                )}
            </div>
          )}

          {/* Feedback */}
          {isBot &&
          !isStreaming &&
          message.id !== "1" &&
          isLastMessage &&
          userFeedback === USER_FEEDBACK.NONE ? (
            <div className="flex items-center gap-1 mt-3 ml-10 pb-4">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 hover:bg-[var(--color-muted)]"
                onClick={() => handleFeedbackToggle(USER_FEEDBACK.LIKE)}>
                <ThumbsUpIcon className="h-3 w-3 text-black/50" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 hover:bg-[var(--color-muted)]"
                onClick={() => handleFeedbackToggle(USER_FEEDBACK.DISLIKE)}>
                <ThumbsDownIcon className="h-3 w-3 text-black/50" />
              </Button>
            </div>
          ) : userFeedback === USER_FEEDBACK.LIKE ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 pb-4 mt-3 ml-10 hover:bg-[var(--color-muted)]"
              disabled={true}>
              <ThumbsUpIcon className="h-3 w-3 text-primary" />
            </Button>
          ) : userFeedback === USER_FEEDBACK.DISLIKE ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 pb-4 mt-3 ml-10 hover:bg-[var(--color-muted)]"
              disabled={true}>
              <ThumbsDownIcon className="h-3 w-3 text-primary" />
            </Button>
          ) : null}

          {/* Feedback follow-up for dislike */}
          {showFeedbackFollowUp && (
            <FeedbackFollowUp
              title="Tell us what went wrong"
              options={DISLIKE_FEEDBACK_OPTIONS}
              onClose={handleCloseFeedbackPrompt}
              onOptionSelect={handleDislikeReasonSelect}
            />
          )}
        </div>
      </div>
    </div>
  );
}
