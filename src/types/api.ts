import { MOBILE_VERIFICATION_STAGE } from "@/organisms/chat-widget";

export type MobileVerificationRequest = {
  mobile_number?: string;
  otp?: string;
  stage: MOBILE_VERIFICATION_STAGE;
  selected_uhid?: string;
}

export type TUhidDetails ={
  uhid: string;
  fn?: string;
  ln?: string;
  mn?: string;
  dob?: string;
  age?: string;
  gender?: string;
  hospital?: string;
}
export interface IMobileVerificationResponse {
  status?: "success";
  message?: string;
  uhids?: TUhidDetails[];
  error?: {
    code?: string;
    msg?: string;
  };
}