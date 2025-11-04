import { postCallbackWrapper } from "@/api/post-callback-wrapper";
import { TOOL_NAME } from "@/configs/enums";
import { DoctorDetailsParams } from "@/types/api";

const getDoctorDetails = async (
  doctorId: string,
  sessionId: string,
  onSessionRefresh: () => Promise<boolean>
) => {
  if (!doctorId) {
    return { success: false, data: null };
  }
  try {
    const response = await postCallbackWrapper<DoctorDetailsParams>({
      toolParams: { doctor_id: doctorId },
      wrapperOptions: {
        session_id: sessionId,
        tool_name: TOOL_NAME.DOCTOR_DETAILS,
        onSessionRefresh,
      },
    });

    if (!response?.ok) {
      const responseData = await response.json();
      if (
        responseData?.error?.code === "bot_error_display" &&
        !!responseData?.error?.msg
      ) {
        return { success: false, data: null, error: responseData?.error };
      }
      throw new Error("Failed to load doctor details");
    }
    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error("Error loading doctor details:", error);
    return { success: false, data: null };
  }
};

export default getDoctorDetails;
