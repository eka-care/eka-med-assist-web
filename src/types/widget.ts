import { AudioData } from "@/services/audioService";
import type { ThemeType } from "@ui/eka-ui/organisms/theme-provider";

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

// export interface Message {
//   id: string;
//   text: string;
//   sender: "user" | "bot";
//   timestamp: Date;
//   type?: "text" | "pill" | "image" | "file";
//   metadata?: any;
// }

export interface Message {
  id: string;
  content: string;
  isBot: boolean;
  files?: File[];
  originalUserMessage?: string; // Store the original user message for regeneration
  isRegenerating?: boolean; // Track if this message is being regenerated
  commonContentData?: import("./socket").CommonHandlerData; // Add common content data support
  audioData?: AudioData; // Add audio data support
  isResponded?: boolean; // Track if this bot message has been responded to
  isStored: boolean;
}

export type TDoctor = {
  name: string;
  specialty: string;
  hospital: string;
  timings?: string;
  experience?: string; // optional
  profile_link?: string; // optional
  profile_pic?: string; //optional
  languages?: string; //optional
  // Additional fields for API callbacks
  doctor_id: string;
  hospital_id?: string; // optional - for availability API calls
  region_id?: string; // optional - for availability API calls
};

export type TAvailability = {
  selected_date?: string; // optional
  slots_details?: TSlotDetail[];
};

export type TSlotDetail = {
  date: string;
  day?: string;
  slots: string[];
  selected_slot?: string; // optional
};

export type TDoctorDetails = {
  doctor_ids?: string[];
  availability?: TAvailability;
};

export type TCallbacks = {
  tool_callback_availability_dates?: boolean;
  tool_callback_availability_slots?: boolean;
  tool_callback_mobile_verification?: boolean;
};

export enum CONNECTION_STATUS {
  CONNECTING = "connecting",
  DISCONNECTED = "disconnected",
  CONNECTED = "connected",
}

export const RESPONSE_TIMEOUT = 30000;
export const STREAMING_TIMEOUT = 30000;

export const MOBILE_VERIFICATION_ERROR_MESSAGES = {
  TOOL_ERROR: {
    code: "tool_error",
    msg: "You phone number is unverified, do you have any other queries?",
  },
  INVALID_OTP: {
    code: "invalid_otp",
    msg: "OTP is invalid, please try again",
  },
  OTP_NOT_FOUND: {
    code: "otp_not_found",
    msg: "The OTP you entered is incorrect or has expired. Please check the 6-digit code sent to your mobile number and try again, or request a new OTP.",
  },
  INVALID_MOBILE_NUMBER: {
    code: "invalid_mobile_number",
    msg: "Something went wrong, I was unable to verify your mobile number, do you want to share another number or retry?",
  },
  USER_NOT_AUTHENTICATED: {
    code: "user_not_authenticated",
    msg: "You are not authenticated, please login again",
  },
  INVALID_UHID: {
    code: "invalid_uhid",
    msg: "Uhid is invalid, please try again",
  },
};
