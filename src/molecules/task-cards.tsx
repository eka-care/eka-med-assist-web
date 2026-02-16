"use client";

import { Button } from "@ui/index";
import type { TSuggestion } from "@/types/widget";

interface TaskCardsProps {
  onTaskClick: (task: string) => void;
  disabled?: boolean;
  tasks?: TSuggestion[];
}

export default function TaskCards({
  onTaskClick,
  disabled,
  tasks,
}: TaskCardsProps) {
  if (!tasks?.length) {
    return null;
  }
  return (
    <div className="flex flex-col items-end gap-2 px-4">
      {tasks.map((task) => (
        <Button
          key={task.value}
          variant="outline"
          size="sm"
          className="justify-start text-sm font-normal border-[var(--color-primary)] hover:bg-[var(--color-accent)] text-[var(--color-primary)] h-8 rounded-lg w-fit"
          onClick={() => onTaskClick(task.value || "")}
          disabled={disabled}>
          {task.label || ""}
        </Button>
      ))}
    </div>
  );
}

