// import { MobileVerificationRequest } from "@/api/post-mobile-verification";
import { fetchWithTimeout } from "../utils/timeoutUtils";
// import { AvailabilityDatesParams } from "@/api/post-availability-dates";
// import { DoctorDetailsParams } from "@/api/post-available-doctors";
// import { AvailabilitySlotsParams } from "@/api/post-availability-slots";
import { TOOL_NAME } from "@/configs/enums";
import { config } from "@/configs/constants";

export interface ApiWrapperOptions {
  session_id: string;
  tool_name: TOOL_NAME;
  timeout?: number;
  onSessionRefresh?: () => Promise<boolean>;
}


export async function postCallbackWrapper<T>({toolParams, wrapperOptions, retryCount = 0}: {
  toolParams:T,
  wrapperOptions: ApiWrapperOptions,
  retryCount?: number,
}): Promise<Response> {
  const {
    timeout = 30000,
    onSessionRefresh,
    session_id,
    tool_name,
  } = wrapperOptions;
  try {
    const url = `${config.BASE_API_URL}/med-assist/api-call-tool?session_id=${session_id}&tool_name=${tool_name}`;
    const options = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-agent-id": config.X_AGENT_ID,
      },
      body: JSON.stringify({
        tool_params: toolParams,
      }),
    };

    const response = await fetchWithTimeout(url, options, timeout);

    // If response is ok, return it
    if (response.ok) {
      return response;
    }

    // Handle 401 Unauthorized errors
    if (response.status === 401 && retryCount < 1 && onSessionRefresh) {
      console.log(
        "401 Unauthorized error detected, attempting session refresh..."
      );

      const refreshSuccess = await onSessionRefresh();
      if (refreshSuccess) {
        console.log("Session refreshed successfully, retrying request...");

        // Retry the original request with the same options
        return await postCallbackWrapper({
          toolParams,
          wrapperOptions,
          retryCount: retryCount + 1
      });
      } else {
        console.error("Session refresh failed");
      }
    }
    
    // Return the original response for non-401 errors or if refresh failed
    return response;
  } catch (error) {
    console.error("Error in fetchWithSessionRefresh:", error);
    throw error;
  }
}
