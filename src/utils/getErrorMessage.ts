import { MOBILE_VERIFICATION_ERROR_MESSAGES } from "@/types/widget";

const getErrorMessageBasedOnCode = (
  errorData: { error: { code: string } },
  isOtpProvided: boolean
) => {
  //based on the error code show error as bot response
  switch (errorData.error.code) {
    case MOBILE_VERIFICATION_ERROR_MESSAGES.OTP_NOT_FOUND.code:
      return {
        success: false,
        data: {
          error: {
            code: MOBILE_VERIFICATION_ERROR_MESSAGES.OTP_NOT_FOUND.code,
            msg: MOBILE_VERIFICATION_ERROR_MESSAGES.OTP_NOT_FOUND.msg,
          },
        },
      };

    case MOBILE_VERIFICATION_ERROR_MESSAGES.INVALID_OTP.code:
      return {
        success: false,
        data: {
          error: {
          code: MOBILE_VERIFICATION_ERROR_MESSAGES.INVALID_OTP.code,
          msg: MOBILE_VERIFICATION_ERROR_MESSAGES.INVALID_OTP.msg,
          },
        },
      };
    case MOBILE_VERIFICATION_ERROR_MESSAGES.TOOL_ERROR.code:
      return {
        success: false,
        data: {
          error: {
          code: MOBILE_VERIFICATION_ERROR_MESSAGES.TOOL_ERROR.code,
          msg: isOtpProvided
            ? MOBILE_VERIFICATION_ERROR_MESSAGES.TOOL_ERROR.msg
            : MOBILE_VERIFICATION_ERROR_MESSAGES.INVALID_MOBILE_NUMBER
                .msg,
          },
        },
      };
    default:
      if (!isOtpProvided) {
        return {
          success: false,
         data: { error: {
            code: MOBILE_VERIFICATION_ERROR_MESSAGES.TOOL_ERROR.code,
            msg: MOBILE_VERIFICATION_ERROR_MESSAGES.INVALID_MOBILE_NUMBER
              .msg,
          },
        },
        };
      }
      return {
        success: false,
        data: {
          error: {
          code: MOBILE_VERIFICATION_ERROR_MESSAGES.TOOL_ERROR.code,
          msg: MOBILE_VERIFICATION_ERROR_MESSAGES.TOOL_ERROR.msg,
          },
        },
      };
  }
};

export default getErrorMessageBasedOnCode;
