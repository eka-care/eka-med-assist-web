import { config } from "@/configs/constants";

export interface AvailabilitySlotsParams {
  doctor_id: string;
  hospital_id: string;
  region_id: number;
  appointment_date: string;
}

export interface AvailabilitySlotsResponse {
  slots: string[];
}

export const getAvailabilitySlots = async (
  sessionId: string,
  toolParams: AvailabilitySlotsParams
): Promise<AvailabilitySlotsResponse> => {
  try {
    const response = await fetch(
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
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error getting availability slots:", error);
    throw error;
  }
};
