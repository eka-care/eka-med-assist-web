import { config } from "@/configs/constants";

interface RefreshSessionResponse {
  session_id: string;
  session_token: string;
  status: string;
  msg?: string;
}

interface RefreshSessionError {
  error: {
    code: string;
    msg: string;
  };
}

/**
 * Refresh an existing session to keep it active
 * @param sessionId - The session ID to refresh
 * @returns Promise with session details
 */
const refreshSession = async (
  sessionId: string,
  sessionToken: string
): Promise<RefreshSessionResponse> => {
  try {
    const response = await fetch(
      `${config.BASE_API_URL}/med-assist/session/${sessionId}/refresh`,
      {
        method: "GET",
        headers: {
          // "ngrok-skip-browser-warning": "69420",
          "Content-Type": "application/json",
          "X-agent-id": config.X_AGENT_ID,
          "x-sess-token": sessionToken,
        },
        // credentials: "include" // crucial line
      }
    );

    if (!response.ok) {
      // Try to parse error response to get the actual error message
      try {
        const errorData: RefreshSessionError = await response.json();
        if (errorData.error && errorData.error.msg) {
          // Create a structured error with code and message
          const error = new Error(errorData.error.msg);
          (error as any).code = errorData.error.code;
          (error as any).status = response.status;
          throw error;
        }
      } catch (parseError) {
        // If we can't parse the error response, fall back to status-based error
        const error = new Error(
          `Failed to refresh session: ${response.status} ${response.statusText}`
        );
        (error as any).status = response.status;
        throw error;
      }
      // If we reach here without throwing, throw a generic error
      const error = new Error(
        `Failed to refresh session: ${response.status} ${response.statusText}`
      );
      (error as any).status = response.status;
      throw error;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error refreshing session:", error);
    throw error;
  }
};

export default refreshSession;
