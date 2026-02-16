import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { TSuggestion } from "@/types/widget";
import TaskCards from "./task-cards";

interface EmptyChatStateProps {
  tasks?: TSuggestion[];
  initialPrompt?: string;
  onTaskClick: (task: string) => void;
  disabled?: boolean;
}

export default function EmptyChatState({
  initialPrompt,
  tasks,
  onTaskClick,
  disabled,
}: EmptyChatStateProps) {
  const welcomeMessage = initialPrompt || "How can I assist you today?";

  return (
    <>
      {/* Bot message bubble with avatar */}
      <div className="px-4 py-2">
        <div className="flex gap-2 items-start">
          <div className="flex-1 space-y-2">
            <div className="flex items-end gap-2 justify-start">
              {/* Bot avatar */}
              <div className="flex-shrink-0 w-8 h-8 rounded-full overflow-hidden">
                <img
                  src={import.meta.env.BASE_URL + "assets/indian-doctor.png"}
                  alt="Apollo Icon"
                  className="w-full h-full object-cover scale-125"
                />
              </div>
              {/* Bot message bubble */}
              <div className="text-sm leading-relaxed rounded-3xl rounded-bl-none text-[var(--color-foreground)] bg-[var(--color-background-primary-default)]">
                <div className="markdown-content p-4">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {welcomeMessage}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Task cards below the message */}
      <TaskCards
        onTaskClick={onTaskClick}
        disabled={disabled}
        tasks={tasks}
      />
    </>
  );
}

