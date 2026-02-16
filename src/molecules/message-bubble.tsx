import {
  Button,
  MultiSelectGroup,
  MULTI_SELECT_ADDITIONAL_OPTION,
  PillItem,
  ThumbsUpIcon,
  ThumbsDownIcon,
} from "@ui/index";
import { QuickActions } from "./quick-actions";
import { useState, useEffect, useRef, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import DoctorDetailsList from "./doctor-details-list";
import LabPackageList from "./lab-package-list";
import { ContentType, type CommonHandlerData } from "@/types/socket";
import { TipsDisplay } from "./tips-display";
import {
  DISLIKE_FEEDBACK_OPTIONS,
  TLabPackage,
  type ExtendedToolEscalationData,
} from "@/types/widget";
import { FilePreviewList } from "./file-preview";
import { USER_FEEDBACK } from "@/configs/enums";
import { FeedbackFollowUp } from "./feedback-followup";
import remarkGfm from "remark-gfm";
import {
  SYNAPSE_COMPONENTS,
  type SendMessageOptions,
  type ToolCallResponse,
} from "@eka-care/medassist-core";
import type { BookInfo } from "./doctor-details-list";

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

    // Check on window resize
    window.addEventListener("resize", checkOverflow);
    return () => window.removeEventListener("resize", checkOverflow);
  }, [text, maxWidth]);

  return (
    <div
      ref={containerRef}
      className={`marquee-container ${className}`}
      style={{
        maxWidth,
      }}
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

interface MessageBubbleProps {
  message: string;
  messageId: string;
  isBot?: boolean;
  showActions: boolean;
  quickActions: { id: string; label: string }[];
  isQuickActionsDisabled: boolean;
  isStreaming?: boolean;
  progressMessage?: string | null;
  feedback?: USER_FEEDBACK;
  verificationStatus: boolean;
  isLastMessage: boolean;
  clearMobileVerification: () => void;
  onRegenerate?: (messageId: string) => void;
  handleQuickAction: (action: string) => void;
  showRetry?: boolean;
  onRetry?: () => void;
  isRegenerating?: boolean;
  commonContentData?: CommonHandlerData;
  onContentClick?: ({
    content,
    tool_use_id,
    tool_use_params,
  }: {
    content: string;
    tool_use_id?: string;
    tool_use_params?: any;
  }) => void;
  audioData?: any;
  isResponded?: boolean;
  files?: File[];
  tips?: string[] | null;
  onTipsExpire?: () => void;
  onLabPackageBook?: (pkg: TLabPackage) => void;
  // Synapse SDK props (matches ChatMessage pattern)
  toolEscalationData?: ExtendedToolEscalationData;
  toolCallStatus?: string | null;
  onSendMessage: (options: SendMessageOptions) => Promise<void>;
  onToggleFeedback: (feedback: USER_FEEDBACK, reason?: string) => void;
  callTool?: <R extends ToolCallResponse = ToolCallResponse>(
    toolName: string,
    toolParams?: Record<string, unknown>
  ) => Promise<R>;
}

export function MessageBubble({
  messageId,
  message,
  isBot = false,
  isLastMessage,
  quickActions,
  showActions,
  isQuickActionsDisabled,
  isStreaming = false,
  progressMessage,
  handleQuickAction,
  verificationStatus,
  clearMobileVerification,
  isRegenerating = false,
  commonContentData,
  onContentClick,
  tips,
  onTipsExpire,
  isResponded = false,
  files,
  feedback,
  onLabPackageBook,
  // Synapse SDK props
  toolEscalationData,
  toolCallStatus,
  onSendMessage,
  onToggleFeedback,
  callTool,
}: MessageBubbleProps) {
  const [selectedMultiValues, setSelectedMultiValues] = useState<string[]>([]);
  const [userFeedback, setUserFeedback] = useState<USER_FEEDBACK>(
    feedback || USER_FEEDBACK.NONE
  );
  const [showFeedbackFollowUp, setShowFeedbackFollowUp] =
    useState<boolean>(false);

  // Reset selected values when new commonContentData or toolEscalationData comes in
  useEffect(() => {
    if (
      (commonContentData && commonContentData.type === ContentType.MULTI) ||
      toolEscalationData?.details?.component === SYNAPSE_COMPONENTS.MULTI
    ) {
      setSelectedMultiValues([]);
    }
  }, [commonContentData, toolEscalationData]);

  useEffect(() => {
    if (feedback === USER_FEEDBACK.DISLIKE && isLastMessage) {
      setShowFeedbackFollowUp(true);
    } else {
      setShowFeedbackFollowUp(false);
    }
  }, [feedback, isLastMessage]);

  // --- Internal handlers for SDK tool interactions (like synapse ChatMessage) ---

  const handlePillClick = async (choice: string) => {
    await onSendMessage({
      message: choice,
      messageId: Date.now().toString(),
      toolCalled: true,
    });
  };

  const handleMultiConfirm = async () => {
    if (selectedMultiValues.length > 0) {
      const mergedMessage = selectedMultiValues.join(", ");
      await onSendMessage({
        message: mergedMessage,
        messageId: Date.now().toString(),
        toolCalled: true,
      });
    }
  };

  const handleDoctorBook = async (info: BookInfo) => {
    await onSendMessage({
      message: `I want to book an appointment for ${
        info.doctorData?.doctor?.name || "the doctor"
      } on ${info.date} for ${info.time}`,
      toolCalled: true,
    });
  };

  // --- Old commonContentData handlers (mobile verification flow) ---

  const handleMultiSelect = (values: string[]) => {
    setSelectedMultiValues(values);
  };

  const handleMultiSubmit = () => {
    if (
      onContentClick &&
      commonContentData?.tool_use_id &&
      commonContentData.type === ContentType.MULTI
    ) {
      let finalValues = [...selectedMultiValues];

      if (
        commonContentData.data.additional_option ===
        MULTI_SELECT_ADDITIONAL_OPTION.NOTA
      ) {
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
        const aotaValue = selectedMultiValues.find(
          (value) => value === MULTI_SELECT_ADDITIONAL_OPTION.AOTA
        );
        if (aotaValue && commonContentData.data.choices) {
          finalValues = [...commonContentData.data.choices, aotaValue];
        }
      }

      onContentClick({
        content: finalValues.join(", "),
        tool_use_id: commonContentData.tool_use_id,
      });
    }
  };

  // --- Feedback handlers ---

  const handleToggleFeedback = (fb: USER_FEEDBACK) => {
    setUserFeedback(fb);
    onToggleFeedback(fb);
  };

  const handleCloseFeedbackPrompt = () => {
    setShowFeedbackFollowUp(false);
  };

  const handleDislikeReasonSelect = (option: PillItem) => {
    onToggleFeedback(USER_FEEDBACK.DISLIKE, option.value);
  };

  // --- Helper for SDK multi-select options ---

  const getMultiSelectOptions = () => {
    const options = toolEscalationData?.details?.input?.options;
    if (!options) return [];
    if (Array.isArray(options)) {
      return options.map((choice, index) => ({
        id: `option-${index}`,
        label: choice.label,
        value: choice.value,
      }));
    }
    return Object.keys(options).map((key, index) => ({
      id: `option-${index}`,
      label: key,
      value: key,
    }));
  };

  const getAdditionalOption = ():
    | MULTI_SELECT_ADDITIONAL_OPTION
    | undefined => {
    if (!toolEscalationData?.details?.input?.additional_option) return undefined;

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

  // --- Render logic ---

  const isTextEmpty = useMemo(() => {
    return (
      !message &&
      !progressMessage &&
      !isStreaming &&
      !tips?.length &&
      !isRegenerating &&
      !verificationStatus
    );
  }, [
    message,
    progressMessage,
    isStreaming,
    tips,
    isRegenerating,
    verificationStatus,
  ]);

  // Don't render empty message bubble for bot messages
  const shouldRenderBubble = !isBot || !isTextEmpty;

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
                className={`text-sm leading-relaxed rounded-3xl
                 ${
                   isBot
                     ? `rounded-bl-none text-[var(--color-foreground)] bg-[var(--color-background-primary-default)]`
                     : "rounded-br-none text-[var(--color-black-800)] bg-[var(--color-background-primary-subtle)]"
                 }`}>
                {/* Display tool call status at the top, like ChatGPT */}
                {isBot && toolCallStatus && (
                  <div className="text-xs text-slate-500 px-4 pt-3 pb-1 border-b border-slate-200/50">
                    {toolCallStatus}
                  </div>
                )}

                {/* Fallback to progressMessage if toolCallStatus is not available */}
                {isBot && !toolCallStatus && progressMessage && isLastMessage && (
                  <div className="p-4 bg-gradient-to-r from-[var(--color-primary)] via-[var(--color-primary-400)] to-[var(--color-primary-600)] bg-clip-text text-transparent font-medium">
                    <ReactMarkdown>{progressMessage}</ReactMarkdown>
                  </div>
                )}

                {/* Only show message content if it's not empty */}
                {message && isBot && (
                  <div className="markdown-content p-4">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {`${message}${isStreaming && isLastMessage ? " ..." : ""}`}
                    </ReactMarkdown>
                  </div>
                )}
                {message && !isBot && (
                  <div className="text-sm break-word p-4">{message}</div>
                )}
                {isBot && isStreaming && !message && !progressMessage && (
                  <span className="animate-pulse p-4 block">...</span>
                )}
                {/* Show tips when available */}
                {isBot && tips?.length && tips.length > 0 && (
                  <div className="px-4 pb-4">
                    <TipsDisplay tips={tips} onTipsExpire={onTipsExpire} />
                  </div>
                )}
                {isBot && isRegenerating && (
                  <span className="p-4 text-[var(--color-primary)] animate-pulse block">
                    🔄 Regenerating...
                  </span>
                )}
                {isBot && verificationStatus && (
                  <div
                    className="flex items-center gap-1 p-4 text-red-500 text-sm cursor-pointer hover:underline"
                    onClick={clearMobileVerification}>
                    Exit verification
                  </div>
                )}
              </div>
            </div>
          )}

          {/* File previews */}
          {files && files.length > 0 && (
            <div className="mt-2">
              <FilePreviewList files={files} isPreview={false} className="" />
            </div>
          )}

          {/* Display old commonContentData for bot messages (mobile verification, old pills/multi, lab packages) */}
          {isBot && commonContentData && (
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
                          className={`justify-start text-sm font-normal border-[var(--color-primary)] h-9 rounded-lg w-fit min-w-0 ${
                            isResponded
                              ? "bg-gray-100 text-gray-500 cursor-not-allowed"
                              : "hover:bg-[var(--color-accent)] text-[var(--color-primary)]"
                          }`}
                          onClick={() =>
                            !isResponded &&
                            onContentClick?.({
                              content: choice,
                              tool_use_id: commonContentData.tool_use_id,
                            })
                          }
                          disabled={isQuickActionsDisabled || isResponded}>
                          <MarqueeText
                            text={choice}
                            maxWidth="250px"
                            className="text-left"
                          />
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

              {commonContentData.type === ContentType.LAB_PACKAGE_CARD &&
                commonContentData.data.lab_packages &&
                commonContentData.data.lab_packages.length > 0 && (
                  <LabPackageList
                    packages={commonContentData.data.lab_packages}
                    disabled={isResponded}
                    onBook={(pkg) => onLabPackageBook?.(pkg)}
                  />
                )}
              {commonContentData.type === ContentType.MOBILE_VERIFICATION &&
                commonContentData.data.uhids &&
                commonContentData.data.uhids?.length && (
                  <div>
                    <div className="text-xs text-[var(--color-muted-foreground)] mb-2 font-medium">
                      {isResponded ? "UHID selected:" : "Select a UHID:"}
                    </div>
                    <div className="flex flex-row gap-2 flex-wrap">
                      {commonContentData.data.uhids.map((uhid, index) => (
                        <Button
                          key={`${commonContentData.tool_use_id}-${index}`}
                          variant="outline"
                          size="sm"
                          className={`justify-start text-sm font-normal border-[var(--color-primary)] h-9 rounded-lg w-fit min-w-0 ${
                            isResponded
                              ? "bg-gray-100 text-gray-500 cursor-not-allowed"
                              : "hover:bg-[var(--color-accent)] text-[var(--color-primary)]"
                          }`}
                          onClick={() =>
                            !isResponded &&
                            onContentClick?.({
                              content: uhid.uhid,
                              tool_use_id: commonContentData.tool_use_id,
                            })
                          }
                          disabled={isQuickActionsDisabled || isResponded}>
                          <MarqueeText
                            text={`${uhid.fn || ""} ${uhid.ln || ""} ${
                              uhid.age || ""
                            } (${uhid.uhid})`}
                            maxWidth="300px"
                            className="text-left"
                          />
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          )}

          {/* SDK Tool Escalation Data (Pills, Multi, Doctor Cards) - handled internally like synapse ChatMessage */}
          {isBot && toolEscalationData && !commonContentData && (
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

              {/* Pills from SDK */}
              {toolEscalationData.details?.component ===
                SYNAPSE_COMPONENTS.PILL &&
                toolEscalationData.details?.input?.options && (
                  <div>
                    <div className="text-xs text-[var(--color-muted-foreground)] mb-2 font-medium">
                      {toolEscalationData.isResponded
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
                              toolEscalationData.isResponded
                                ? "bg-gray-100 text-gray-500 cursor-not-allowed"
                                : "hover:bg-[var(--color-accent)] text-[var(--color-primary)]"
                            }`}
                            onClick={() =>
                              !toolEscalationData.isResponded &&
                              handlePillClick(choice.value || "")
                            }
                            disabled={
                              isQuickActionsDisabled ||
                              toolEscalationData.isResponded
                            }>
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

              {/* Multi-select from SDK */}
              {toolEscalationData.details?.component ===
                SYNAPSE_COMPONENTS.MULTI &&
                toolEscalationData.details?.input?.options && (
                  <div className="mt-3">
                    <div className="text-xs text-[var(--color-muted-foreground)] mb-2 font-medium">
                      {toolEscalationData.isResponded
                        ? "Options selected:"
                        : "Select multiple options:"}
                    </div>
                    <MultiSelectGroup
                      options={getMultiSelectOptions()}
                      selectedValues={selectedMultiValues}
                      onSelectionChange={
                        toolEscalationData.isResponded
                          ? () => {}
                          : handleMultiSelect
                      }
                      additionalOption={getAdditionalOption()}
                    />
                    {!toolEscalationData.isResponded && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2 text-sm font-normal border-[var(--color-primary)] hover:bg-[var(--color-accent)] text-[var(--color-primary)] h-8 rounded-lg"
                        onClick={handleMultiConfirm}
                        disabled={
                          isQuickActionsDisabled ||
                          selectedMultiValues.length === 0
                        }>
                        Confirm
                      </Button>
                    )}
                  </div>
                )}

              {/* Doctor Cards from SDK */}
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
                    onBook={handleDoctorBook}
                    disabled={toolEscalationData.isResponded}
                  />
                )}
            </div>
          )}

          {showActions && (
            <div className="flex justify-end">
              <QuickActions
                actions={quickActions}
                onActionClick={handleQuickAction}
                disabled={isQuickActionsDisabled}
              />
            </div>
          )}

          {/* Feedback buttons (like synapse ChatMessage) */}
          {isBot &&
          !isStreaming &&
          messageId !== "1" &&
          !verificationStatus &&
          isLastMessage &&
          userFeedback === USER_FEEDBACK.NONE ? (
            <div className="flex items-center gap-1 mt-3 ml-10 pb-4">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 hover:bg-[var(--color-muted)]"
                onClick={() => handleToggleFeedback(USER_FEEDBACK.LIKE)}>
                <ThumbsUpIcon className="h-3 w-3 text-black/50" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 hover:bg-[var(--color-muted)]"
                onClick={() => handleToggleFeedback(USER_FEEDBACK.DISLIKE)}>
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

          {/* Feedback follow-up */}
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
