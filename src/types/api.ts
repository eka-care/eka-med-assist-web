import { MOBILE_VERIFICATION_STAGE } from "@/organisms/chat-widget";
import { TDoctor } from "./widget";

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

export interface AvailabilitySlotsParams {
  doctor_id: string;
  appointment_date: string;
  hospital_id?: string;
  region_id?: string;
}

export interface AvailabilitySlotsResponse {
  slots: string[];
}

export interface DoctorDetailsParams {
  doctor_id: string;
}

export interface DoctorDetailsResponse extends TDoctor {}

export interface AvailabilityDatesParams {
  doctor_id: string;
  hospital_id?: string;
  region_id?: string;
}

export interface AvailabilityDatesResponse {
  available_dates: string[];
}
