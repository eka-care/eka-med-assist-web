import { postCallbackWrapper } from "@/api/post-callback-wrapper";
import { TOOL_NAME } from "@/configs/enums";
import { MOBILE_VERIFICATION_STAGE } from "@/organisms/chat-widget";
import { MOBILE_VERIFICATION_ERROR_MESSAGES } from "@/types/widget";
import getErrorMessageBasedOnCode from "./getErrorMessage";
import { MobileVerificationRequest } from "@/types/api";

const handleOtpVerification = async (
  otp: string,
  mobile_number: string,
  sessionId: string,
  refreshSession: () => Promise<boolean>,
  reason?: string
) => {
  try {
    const response = await postCallbackWrapper<MobileVerificationRequest>({
      toolParams: {
        mobile_number: mobile_number.trim(),
        otp: otp.trim(),
        stage: MOBILE_VERIFICATION_STAGE.OTP,
        ...(reason && { lead_description: reason }),
      },
      wrapperOptions: {
        session_id: sessionId,
        tool_name: TOOL_NAME.MOBILE_VERIFICATION,
        onSessionRefresh: refreshSession,
      },
    });
    if(reason === "callback requested"){
      return {
        success: true,
        data: {
          message: "Appointment requested successfully. You will get a callback soon.",
        },
      };
    }
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      //based on the error code show error as bot response
      if (errorData?.error?.code) {
        return getErrorMessageBasedOnCode(errorData, true);
      }
      return {
        success: false,
        data: {
          error: {
            msg: MOBILE_VERIFICATION_ERROR_MESSAGES.INVALID_OTP.msg,
          },
        },
      };
    }
    const data = await response.json().catch(() => ({}));
    if (data.status === "success") {
      return { success: true, data };
    }
    return {
      success: false,
      data: {
        error: { msg: MOBILE_VERIFICATION_ERROR_MESSAGES.INVALID_OTP.msg },
      },
    };
  } catch (error) {
    console.error("OTP verification error:", error);
    return {
      success: false,
      data: {
        error: {
          msg:
            error instanceof Error
              ? error.message
              : MOBILE_VERIFICATION_ERROR_MESSAGES.INVALID_OTP.msg,
        },
      },
    };
  }
};

export default handleOtpVerification;
