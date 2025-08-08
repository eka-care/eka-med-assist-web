import type { ThemeType } from "@ui/eka-ui/components/theme-provider";

export interface PillConfig {
  id: string;
  text: string;
  action?: string;
  icon?: string;
  variant?: "primary" | "secondary" | "outline";
}

export interface WidgetConfig {
  // Theme Configuration
  theme: ThemeType;

  // Brand Configuration
  brandName: string;
  brandLogo?: string;
  brandColors?: {
    primary?: string;
    secondary?: string;
    accent?: string;
  };

  // Chat Configuration
  welcomeMessage: string;
  assistantName: string;
  assistantAvatar?: string;

  // Initial Pills Configuration
  initialPills: PillConfig[];

  // Widget Configuration
  widgetTitle: string;
  widgetSubtitle?: string;
  showTimestamp?: boolean;
  showTypingIndicator?: boolean;

  // Styling Configuration
  borderRadius?: "sm" | "md" | "lg" | "xl";
  shadow?: "sm" | "md" | "lg" | "xl";
  maxWidth?: string;
  maxHeight?: string;

  // Function Configuration
  onSendMessage?: (message: string) => void;
  onPillClick?: (pill: PillConfig) => void;
  onWidgetClose?: () => void;
  onWidgetExpand?: () => void;
}

export interface Message {
  id: string;
  text: string;
  sender: "user" | "bot";
  timestamp: Date;
  type?: "text" | "pill" | "image" | "file";
  metadata?: any;
}
