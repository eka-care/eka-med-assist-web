import { config } from "@/configs/constants";
import { fetchWithTimeout } from "@/utils/timeoutUtils";

export interface AvailabilitySlotsParams {
  doctor_id: string;
  appointment_date: string;
  hospital_id?: string;
  region_id?: string;
}

export interface AvailabilitySlotsResponse {
  slots: string[];
}

export const getAvailabilitySlots = async (
  sessionId: string,
  toolParams: AvailabilitySlotsParams
): Promise<AvailabilitySlotsResponse> => {
  try {
    const response = await fetchWithTimeout(
      `${config.BASE_API_URL}/med-assist/api-call-tool?session_id=${sessionId}&tool_name=availability_slots`,
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
      10000 // 10 second timeout
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error getting availability slots:", error);

    // Handle timeout error specifically
    if (error instanceof Error && error.message.includes("timeout")) {
      throw new Error("Request timed out. Please try again.");
    }

    throw error;
  }
};
