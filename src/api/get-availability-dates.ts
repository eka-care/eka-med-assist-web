import { config } from "@/configs/constants";

export interface AvailabilityDatesParams {
  doctor_id: string;
  hospital_id: string;
  region_id: number;
}

export interface AvailabilityDatesResponse {
  available_dates: string[];
}

export const getAvailabilityDates = async (
  sessionId: string,
  toolParams: AvailabilityDatesParams
): Promise<AvailabilityDatesResponse> => {
  try {
    const response = await fetch(
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
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error getting availability dates:", error);
    throw error;
  }
};
