import { postCallbackWrapper } from "@/api/post-callback-wrapper";
import { TOOL_NAME } from "@/configs/enums";
import { MOBILE_VERIFICATION_STAGE } from "@/organisms/chat-widget";
import { MOBILE_VERIFICATION_ERROR_MESSAGES } from "@/types/widget";
import getErrorMessageBasedOnCode from "./getErrorMessage";
import {
  IMobileVerificationResponse,
  MobileVerificationRequest,
} from "@/types/api";

const handleUhidVerification = async (
  uhid: string,
  sessionId: string,
  refreshSession: () => Promise<boolean>
): Promise<{
  success: boolean;
  data: null | IMobileVerificationResponse;
}> => {
  try {
    const response = await postCallbackWrapper<MobileVerificationRequest>({
      toolParams: {
        selected_uhid: uhid,
        stage: MOBILE_VERIFICATION_STAGE.UHID,
      },
      wrapperOptions: {
        session_id: sessionId,
        tool_name: TOOL_NAME.MOBILE_VERIFICATION,
        onSessionRefresh: refreshSession,
      },
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      if (errorData?.error?.code) {
        return getErrorMessageBasedOnCode(errorData, false);
      }
      return {
        success: false,
        data: {
          error: { msg: MOBILE_VERIFICATION_ERROR_MESSAGES.INVALID_UHID.msg },
        },
      };
    }
    const data = await response.json();
    if (data.status === "success") {
      return { success: true, data };
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
