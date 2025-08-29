import { config } from "@/configs/constants";

export const getSessionDetails = async (sessionId: string) => {
  try {
    const response = await fetch(
      `${config.BASE_API_URL}/med-assist/session/${sessionId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-agent-id": config.X_AGENT_ID,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error getting session details:", error);
    throw error;
  }
};
