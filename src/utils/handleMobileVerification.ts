import { callMobileVerificationAPI, IMobileVerificationResponse } from "@/api/post-mobile-verification";
import { MOBILE_VERIFICATION_STAGE } from "@/organisms/chat-widget";
import { MOBILE_VERIFICATION_ERROR_MESSAGES } from "@/types/widget";

const handleMobileVerification = async (
    mobileNumber: string,
    sessionId: string
  ): Promise<{
    success: boolean;
    data: null | IMobileVerificationResponse;
  }> => {
    try {
      const response = await callMobileVerificationAPI({
        mobile_number: mobileNumber.trim(),
        session_id: sessionId,
        stage: MOBILE_VERIFICATION_STAGE.MOBILE_NUMBER,
      });
      if (response.error) {
        return { success: false, data: { error: response.error } };
      } else if (response.status === "success") {
        return { success: true, data: response };
      }
      return {
        success: false,
        data: {
          error: {
            msg: MOBILE_VERIFICATION_ERROR_MESSAGES.INVALID_MOBILE_NUMBER.msg,
          },
        },
      };
    } catch (error) {
      console.error("Mobile verification error:", error);
      return {
        success: false,
        data: {
          error: {
            msg:
              error instanceof Error
                ? error.message
                : MOBILE_VERIFICATION_ERROR_MESSAGES.INVALID_MOBILE_NUMBER.msg,
          },
        },
      };
    }
  };

export default handleMobileVerification;