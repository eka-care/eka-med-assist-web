import { postCallbackWrapper } from "@/api/post-callback-wrapper";
import { TOOL_NAME } from "@/configs/enums";
import { MOBILE_VERIFICATION_STAGE } from "@/organisms/chat-widget";
import { MOBILE_VERIFICATION_ERROR_MESSAGES } from "@/types/widget";
import getErrorMessageBasedOnCode from "./getErrorMessage";
import {
  IMobileVerificationResponse,
  MobileVerificationRequest,
} from "@/types/api";

const handleMobileVerification = async (
  mobileNumber: string,
  sessionId: string,
  refreshSession: () => Promise<boolean>
): Promise<{
  success: boolean;
  data: IMobileVerificationResponse;
}> => {
  try {
    const response = await postCallbackWrapper<MobileVerificationRequest>({
      toolParams: {
        mobile_number: mobileNumber.trim(),
        stage: MOBILE_VERIFICATION_STAGE.MOBILE_NUMBER,
      },
      wrapperOptions: {
        session_id: sessionId,
        tool_name: TOOL_NAME.MOBILE_VERIFICATION,
        onSessionRefresh: refreshSession,
      },
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      //based on the error code show error as bot response
      if (errorData?.error?.code) {
        return getErrorMessageBasedOnCode(errorData, false);
      }
      return {
        success: false,
        data: {
          error: {
            msg: MOBILE_VERIFICATION_ERROR_MESSAGES.INVALID_MOBILE_NUMBER.msg,
          },
        },
      };
    }
    const data = await response.json();
    if (data.error) {
      return { success: false, data: { error: data.error } };
    } else if (data.status === "success") {
      return { success: true, data };
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
