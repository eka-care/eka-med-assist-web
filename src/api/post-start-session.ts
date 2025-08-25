import { config } from "@/configs/constants";

// Default JWT payload for the session
const startSession = async () => {
    try {
        const response = await fetch(
            `${config.BASE_API_URL}/med-assist/session`,
            {
                method: "POST",
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
        console.error("Error starting session:", error);
        throw error;
    }
};

export default startSession;
