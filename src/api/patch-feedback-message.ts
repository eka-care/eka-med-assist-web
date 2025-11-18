import { config } from "@/configs/constants";
import { USER_FEEDBACK } from "@/configs/enums";
import useSessionStore from "@/stores/medAssistStore";

const patchFeedbackMessage = async (
  sessionId: string,
  messageId: string,
  feedBack: USER_FEEDBACK,
  feedbackReason?: string
) => {
  try {
    // Get agentId from store
    const agentId = useSessionStore.getState().agentId;

    if (!agentId || agentId.trim() === "") {
      throw new Error("agentId is required to patch feedback");
    }

    const url = `${config.BASE_API_URL}/med-assist/session/${sessionId}/${messageId}`;
    const response = await fetch(url, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "X-agent-id": agentId,
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
