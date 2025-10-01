import { callMobileVerificationAPI, IMobileVerificationResponse } from "@/api/post-mobile-verification";
import { MOBILE_VERIFICATION_STAGE } from "@/organisms/chat-widget";
import { MOBILE_VERIFICATION_ERROR_MESSAGES } from "@/types/widget";

const handleUhidVerification = async (
    uhid: string,
    sessionId: string
  ): Promise<{
    success: boolean;
    data: null | IMobileVerificationResponse;
  }> => {
    try {
      const response = await callMobileVerificationAPI({
        selected_uhid: uhid,
        stage: MOBILE_VERIFICATION_STAGE.UHID,
        session_id: sessionId,
      });
      if (response.error) {
        return { success: false, data: { error: response.error } };
      } else if (response.status === "success") {
        return { success: true, data: response };
      }
      return {
        success: false,
        data: {
          error: { msg: MOBILE_VERIFICATION_ERROR_MESSAGES.INVALID_UHID.msg },
        },
      };
    } catch (error) {
      console.error("Uhid verification error:", error);
      return {
        success: false,
        data: {
          error: { msg: MOBILE_VERIFICATION_ERROR_MESSAGES.INVALID_UHID.msg },
        },
      };
    }
  };    

export default handleUhidVerification;