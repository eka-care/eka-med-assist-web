import type { SendMessageOptions, ToolCallResponse } from "@eka-care/medassist-core";
import type { Message } from "@/types/widget";
import useMedAssistStore from "@/stores/medAssistStore";
import { USER_FEEDBACK } from "@eka-care/medassist-core";
import ChatMessage from "./chat-message";

interface ChatMessagesProps {
  messages: Message[];
  onSendMessage: (options: SendMessageOptions) => Promise<void>;
  callTool: <R extends ToolCallResponse = ToolCallResponse>(
    toolName: string,
    toolParams?: Record<string, unknown>
  ) => Promise<R>;
  onToggleFeedback: (
    feedback: USER_FEEDBACK,
    messageId: string,
    reason?: string
  ) => Promise<void>;
  // Apollo-specific props
}

export function ChatMessages({
  messages,
  callTool,
  onToggleFeedback,
onSendMessage,
}: ChatMessagesProps) {
  const isWaitingForResponse = useMedAssistStore(
    (state) => state.isWaitingForResponse
  );
  const progressMessage = useMedAssistStore((state) => state.progressMessage);
  const isStreaming = useMedAssistStore((state) => state.isStreaming);
//   const connectionStatus = useMedAssistStore((state) => state.connectionStatus);

  return (
    <>
      {/* Message list */}
      {messages.map((message, index) => (
      <ChatMessage 
        key={message.id}
        message={message}
        callTool={callTool}
        onToggleFeedback={onToggleFeedback}
        onSendMessage={onSendMessage}
        isLastMessage={index === messages.length - 1}
        progressMessage={progressMessage}
        toolEscalationData={message.toolEscalationData}
      />
      ))}

      {/* Typing indicator when waiting for response */}
      {isWaitingForResponse && !isStreaming && <TypingIndicator />}

      {/* Progress message when not streaming */}
      {progressMessage && !isStreaming && (
        <ProgressIndicator progressMessage={progressMessage} />
      )}
    </>
  );
}

function TypingIndicator() {
  return (
    <div className="px-4 py-4">
      <div className="flex gap-2 items-start justify-center">
        <div className="flex-shrink-0 w-8 h-8 rounded-full overflow-hidden">
          <img
            src={import.meta.env.BASE_URL + "assets/indian-doctor.png"}
            alt="Apollo Icon"
            className="flex-shrink-0 w-full h-full object-cover scale-125"
          />
        </div>
        <div className="flex-1">
          <div className="inline-flex items-center text-sm leading-relaxed p-3 rounded-3xl rounded-bl-none text-[var(--color-foreground)] bg-[var(--color-background-primary-default)]">
            <div
              className="flex items-center gap-1.5"
              aria-label="Bot is typing">
              {[0, 1, 2].map((index) => (
                <span
                  key={index}
                  className="w-2 h-2 rounded-full bg-slate-400 animate-pulse"
                  style={{ animationDelay: `${index * 150}ms` }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProgressIndicator({
  progressMessage,
}: {
  progressMessage: string;
}) {
  return (
    <div className="px-2 py-4">
      <div className="flex gap-1 items-start justify-center">
        <div className="flex-shrink-0 w-6 h-6 rounded-full overflow-hidden">
          <img
            src={import.meta.env.BASE_URL + "assets/indian-doctor.png"}
            alt="Apollo Icon"
            className="flex-shrink-0 w-6 h-6"
          />
        </div>
        <div className="flex-1">
          <div className="text-sm leading-relaxed px-3 rounded-lg text-[var(--color-foreground)] bg-[var(--color-card)]">
            <div className="ml-2 bg-gradient-to-r from-[var(--color-primary)] via-[var(--color-primary-400)] to-[var(--color-primary-600)] bg-clip-text text-transparent font-medium">
              {progressMessage}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

