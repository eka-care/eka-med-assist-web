import { Button } from "@ui/index";
import { MULTI_SELECT_ADDITIONAL_OPTION } from "@ui/index";

interface QuickAction {
  id: string;
  label: string;
  variant?: "default" | "outline" | "secondary" | "destructive";
}

export interface PillAction {
  choices: string[];
  tool_use_id: string;
  additionalOption?: MULTI_SELECT_ADDITIONAL_OPTION;
}

interface QuickActionsProps {
  actions: QuickAction[];
  onActionClick: (actionId: string) => void;
  disabled?: boolean;
}

export function QuickActions({
  actions,
  onActionClick,
  disabled = false,
}: QuickActionsProps) {
  return (
    <div className="flex flex-col items-end gap-2 px-4">
      {actions.map((action) => (
        <Button
          key={action.id}
          variant="outline"
          size="sm"
          className="justify-start text-sm font-normal border-[var(--color-primary)] hover:bg-[var(--color-accent)] text-[var(--color-primary)] h-8 rounded-lg w-fit"
          onClick={() => onActionClick(action.id)}
          disabled={disabled}>
          {action.label}
        </Button>
      ))}
    </div>
  );
}
