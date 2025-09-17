import { config } from "@/configs/constants";
import { fetchWithTimeout } from "@/utils/timeoutUtils";

export interface AvailabilityDatesParams {
  doctor_id: string;
  hospital_id?: string;
  region_id?: string;
}

export interface AvailabilityDatesResponse {
  available_dates: string[];
}

export const getAvailabilityDates = async (
  sessionId: string,
  toolParams: AvailabilityDatesParams
): Promise<AvailabilityDatesResponse> => {
  try {
    const response = await fetchWithTimeout(
      `${config.BASE_API_URL}/med-assist/api-call-tool?session_id=${sessionId}&tool_name=availability_dates`,
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
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error getting availability dates:", error);

    // Handle timeout error specifically
    if (error instanceof Error && error.message.includes("timeout")) {
      throw new Error("Request timed out. Please try again.");
    }

    throw error;
  }
};
