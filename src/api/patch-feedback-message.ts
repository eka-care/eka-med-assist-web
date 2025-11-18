import { config } from "@/configs/constants";
import { USER_FEEDBACK } from "@/configs/enums";

const patchFeedbackMessage = async (
  sessionId: string,
  messageId: string,
  feedBack: USER_FEEDBACK,
  feedbackReason?: string
) => {
  try {
    const url = `${config.BASE_API_URL}/med-assist/session/${sessionId}/${messageId}`;
    const response = await fetch(url, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "X-agent-id": config.X_AGENT_ID,
      },
    //   credentials: "include", // crucial line
      body: JSON.stringify({
        feedback: feedBack,
        feedback_reason: feedbackReason,
      }),
    });
    if (!response.ok) {
      throw new Error("Failed to patch feedback message");
    }
    return response.json();
  } catch (error) {
    console.error("Error patching feedback message:", error);
    throw error;
  }
};

export default patchFeedbackMessage;
