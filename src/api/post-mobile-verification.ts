import { config } from "@/configs/constants";
import { MOBILE_VERIFICATION_ERROR_MESSAGES } from "@/types/widget";
import { fetchWithTimeout } from "@/utils/timeoutUtils";

export interface MobileVerificationRequest {
  mobile_number: string;
  otp?: string;
  session_id?: string;
}

export interface IMobileVerificationResponse {
  status?: "success";
  message?: string;
  error?: {
    code?: string;
    msg?: string;
  };
}

export async function callMobileVerificationAPI(
  request: MobileVerificationRequest
): Promise<IMobileVerificationResponse> {
  try {
    const toolParams: { mobile_number?: string; otp?: string } = {};

    if (request.mobile_number) {
      toolParams.mobile_number = request.mobile_number;
    }

    if (request.otp) {
      toolParams.otp = request.otp;
    }

    const response = await fetchWithTimeout(
      `${config.BASE_API_URL}/med-assist/api-call-tool?session_id=${request.session_id}&tool_name=mobile_verification`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-agent-id": config.X_AGENT_ID,
        },
        body: JSON.stringify({
          tool_params: toolParams,
        }),
      },
      30000 // 10 second timeout
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      //based on the error code show error as bot response
      if (errorData?.error?.code) {
        switch (errorData.error.code) {
          case MOBILE_VERIFICATION_ERROR_MESSAGES.OTP_NOT_FOUND.code:
            return {
              error: {
                code: MOBILE_VERIFICATION_ERROR_MESSAGES.OTP_NOT_FOUND.code,
                msg: MOBILE_VERIFICATION_ERROR_MESSAGES.OTP_NOT_FOUND.msg,
              },
            };
          case MOBILE_VERIFICATION_ERROR_MESSAGES.INVALID_OTP.code:
            return {
              error: {
                code: MOBILE_VERIFICATION_ERROR_MESSAGES.INVALID_OTP.code,
                msg: MOBILE_VERIFICATION_ERROR_MESSAGES.INVALID_OTP.msg,
              },
            };
          case MOBILE_VERIFICATION_ERROR_MESSAGES.TOOL_ERROR.code:
            return {
              error: {
                code: MOBILE_VERIFICATION_ERROR_MESSAGES.TOOL_ERROR.code,
                msg: request?.otp
                  ? MOBILE_VERIFICATION_ERROR_MESSAGES.TOOL_ERROR.msg
                  : MOBILE_VERIFICATION_ERROR_MESSAGES.INVALID_MOBILE_NUMBER
                      .msg,
              },
            };
          default:
            if (!request?.otp) {
              return {
                error: {
                  code: MOBILE_VERIFICATION_ERROR_MESSAGES.TOOL_ERROR.code,
                  msg: MOBILE_VERIFICATION_ERROR_MESSAGES.INVALID_MOBILE_NUMBER
                    .msg,
                },
              };
            }
            return {
              error: {
                code: MOBILE_VERIFICATION_ERROR_MESSAGES.TOOL_ERROR.code,
                msg: MOBILE_VERIFICATION_ERROR_MESSAGES.TOOL_ERROR.msg,
              },
            };
        }
      }
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error calling mobile verification API:", error);

    // Handle timeout error specifically
    if (error instanceof Error && error.message.includes("timeout")) {
      return {
        error: {
          code: "timeout_error",
          msg: "Request timed out. Please try again.",
        },
      };
    }

    return {
      error: {
        code: "api_error",
        msg: request?.otp
          ? MOBILE_VERIFICATION_ERROR_MESSAGES.TOOL_ERROR.msg
          : MOBILE_VERIFICATION_ERROR_MESSAGES.INVALID_MOBILE_NUMBER.msg,
      },
    };
  }
}
