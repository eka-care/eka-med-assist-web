import { config } from "@/configs/constants";
import { fetchWithTimeout } from "@/utils/timeoutUtils";
import { TDoctor } from "@/types/widget";

export interface DoctorDetailsParams {
  doctor_id: string;
}

export interface DoctorDetailsResponse extends TDoctor {}

export const getDoctorDetails = async (
  sessionId: string,
  toolParams: DoctorDetailsParams
): Promise<DoctorDetailsResponse> => {
  try {
    const response = await fetchWithTimeout(
      `${config.BASE_API_URL}/med-assist/api-call-tool?session_id=${sessionId}&tool_name=doctor_details`,
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
      30000 // 30 second timeout
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log("Doctor details API response:", data);
    return data;
  } catch (error) {
    console.error("Error getting doctor details:", error);

    // Handle timeout error specifically
    if (error instanceof Error && error.message.includes("timeout")) {
      throw new Error("Request timed out. Please try again.");
    }

    throw error;
  }
};
