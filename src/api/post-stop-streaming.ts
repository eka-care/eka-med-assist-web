import { config } from "@/configs/constants";

export const postStopStreaming = async (sessionId: string) => {
  const response = await fetch(`${config.BASE_API_URL}/med-assist/session/${sessionId}/stop`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-agent-id": config.X_AGENT_ID,
    },
  });
  if (!response.ok) {
    throw new Error("Failed to stop streaming");
  }
  return response.json();
};
