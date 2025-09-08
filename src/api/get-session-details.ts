import { config } from "@/configs/constants";

export const getSessionDetails = async (
  sessionId: string
): Promise<boolean> => {
  console.log("🔍 getSessionDetails called with sessionId:", sessionId);
  try {
    const url = `${config.BASE_API_URL}/med-assist/session/${sessionId}`;
    console.log("🌐 Making API call to:", url);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-agent-id": config.X_AGENT_ID,
      },
    });

    console.log("📡 API response status:", response.status, response.ok);

    if (!response.ok) {
      // Handle specific error codes
      const errorData = await response.json().catch(() => ({}));

      switch (response.status) {
        case 401: // Session expired
          console.log("Session expired:", errorData);
          return false;
        case 404: // Session not found
          console.log("Session not found:", errorData);
          return false;
        case 403: // Invalid agent/wid
          console.log("Invalid agent:", errorData);
          return false;
        case 500: // Internal server error
          console.log("Internal server error:", errorData);
          return false;
        default:
          console.error(`HTTP error! status: ${response.status}`, errorData);
          return false;
      }
    }

    const data = await response.json();
    if (data.status === "active" || data?.msg === "Session Active") {
      return true;
    } else {
      return false;
    }
  } catch (error) {
    console.error("Error getting session details:", error);
    // Return false for any network or parsing errors
    return false;
  }
};
