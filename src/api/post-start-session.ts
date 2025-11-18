import { config } from "@/configs/constants";
import useSessionStore from "@/stores/medAssistStore";

// Default JWT payload for the session
const startSession = async (user_id: string) => {
  try {
    // Get agentId from store
    const agentId = useSessionStore.getState().agentId;

    if (!agentId || agentId.trim() === "") {
      throw new Error("agentId is required to start a session");
    }

    const response = await fetch(`${config.BASE_API_URL}/med-assist/session`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-agent-id": agentId,
      },
      //   credentials: "include",
      body: JSON.stringify({ user_id }),
    });

    if (!response.ok) {
      // Try to parse error response to get the actual error message
      try {
        const errorData = await response.json();
        if (errorData.error && errorData.error.msg) {
          throw new Error(errorData.error.msg);
        } else if (errorData.error && errorData.error.code) {
          throw new Error(`Something went wrong`);
        }
      } catch (parseError) {
        // If we can't parse the error response, fall back to status-based error
        throw new Error(`Something went wrong`);
      }
      // If we reach here without throwing, throw a generic error
      throw new Error(`Something went wrong`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error starting session:", error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Something went wrong");
  }
};

export default startSession;
