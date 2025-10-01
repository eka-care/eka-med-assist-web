import { callMobileVerificationAPI } from "@/api/post-mobile-verification";
import { MOBILE_VERIFICATION_STAGE } from "@/organisms/chat-widget";
import { MOBILE_VERIFICATION_ERROR_MESSAGES } from "@/types/widget";

const handleOtpVerification = async (otp: string, mobile_number: string, sessionId: string) => {
    try {
      const response = await callMobileVerificationAPI({
        mobile_number: mobile_number.trim(),
        otp: otp.trim(),
        session_id: sessionId,
        stage: MOBILE_VERIFICATION_STAGE.OTP,
      });
      if (response.error) {
        return { success: false, data: { error: response.error } };
      } else if (response.status === "success") {
        return { success: true, data: response };
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