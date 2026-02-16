import { USER_FEEDBACK } from "@/configs/enums";
import { AudioData } from "@/services/audioService";
import type { ToolCallData } from "@eka-care/medassist-core";
import { PillItem } from "@ui/index";

// Extended ToolEscalationData with additional required field
export type ExtendedToolEscalationData = ToolCallData & {
  isResponded: boolean;
};

export const MessageSender = {
  USER: "user",
  ASSISTANT: "assistant",
} as const;

export interface Message {
  id: string;
  content: string;
  isBot?: boolean; // kept for backward compat in UI
  role: (typeof MessageSender)[keyof typeof MessageSender];
  files?: File[];
  originalUserMessage?: string;
  isRegenerating?: boolean;
  commonContentData?: import("./socket").CommonHandlerData; // kept for mobile verification
  toolEscalationData?: ExtendedToolEscalationData; // NEW: from synapse SDK tool calls
  isResponseFromTool?: boolean;
  audioData?: AudioData;
  isResponded?: boolean;
  isStored: boolean;
  tool_use_params?: any;
  feedback?: USER_FEEDBACK;
  timestamp?: string;
  toolCallStatus?: string | null;
}

export type TDoctor = {
  name: string;
  specialty: string;
  hospitals: THospital[];
  timings?: string;
  experience?: string; // optional
  profile_link?: string; // optional
  profile_pic?: string; //optional
  languages?: string; //optional
  // Additional fields for API callbacks
  doctor_id: string;
};

export type THospital = {
  name: string;
  city: string;
  state: string;
  hospital_id: string;
  region_id: string;
};

export type TAvailability = {
  [hospital_id: string]: {
    selected_date?: string; // optional
    slots_details?: TSlotDetail[];
  };
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

export type TLabPackage = {
  package_name?: string;
  hospital_name?: string;
  city?: string;
  link?: string;
  description?: string;
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

export const DISLIKE_FEEDBACK_OPTIONS: PillItem[] = [
  {
    id: "irrelevant_response",
    label: "Irrelevant response",
    value: "Irrelevant response",
  },
  {
    id: "facing_some_errors",
    label: "Facing some errors",
    value: "Facing some errors",
  },
  {
    id: "other",
    label: "Other",
    value: "Other",
  },
];