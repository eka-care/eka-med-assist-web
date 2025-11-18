import { X } from "lucide-react";
import { Pills, type PillItem } from "@ui/index";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface FeedbackFollowUpProps {
  title?: string;
  subtitle?: string;
  options: PillItem[];
  onClose: () => void;
  onOptionSelect?: (option: PillItem) => void;
  className?: string;
}

export function FeedbackFollowUp({
  title = "Tell us more",
  subtitle,
  //   subtitle = "Let us know what didn’t work so we can improve.",
  options,
  onClose,
  onOptionSelect,
  className = "",
}: FeedbackFollowUpProps) {
  const [feedbackSubmitted, setFeedbackSubmitted] = useState<boolean>(false);

  const handleOptionSelect = (option: PillItem) => {
    setFeedbackSubmitted(true);
    onOptionSelect?.(option);
  };

  return (
    <div
      className={cn(
        "mx-4 my-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)]/40 px-4 py-3",
        className
      )}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-[var(--color-foreground)]">
            {feedbackSubmitted ? "Thank you for your feedback" : title}
          </p>
          {subtitle && (
            <p className="text-xs text-[var(--color-muted-foreground)]">
              {subtitle}
            </p>
          )}
        </div>
        <button
          aria-label="Close feedback prompt"
          className="text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
          onClick={onClose}>
          <X className="h-4 w-4" />
        </button>
      </div>
    {!feedbackSubmitted && <Pills
        className="mt-3"
        pillClassName="bg-white text-[var(--color-foreground)] hover:bg-white/80"
        items={options}
        onItemClick={(option) => handleOptionSelect(option)}
      />}
    </div>
  );
}
