import { config } from "@/configs/constants";

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

    const response = await fetch(
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
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      //based on the error code show error as bot response
      throw new Error(
        errorData.message || `Something went wrong`
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error calling mobile verification API:", error);
    return {
      error: {
        code: "api_error",
        msg:
          error instanceof Error ? error.message : "Failed to process request",
      },
    };
  }
}