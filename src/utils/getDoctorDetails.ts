import { DoctorDetailsParams } from "@/api/post-available-doctors";
import { postCallbackWrapper } from "@/api/post-callback-wrapper";
import { TOOL_NAME } from "@/configs/enums";

const getDoctorDetails = async (
  doctorId: string,
  sessionId: string,
  onSessionRefresh: () => Promise<boolean>
) => {
  try {
    const response = await postCallbackWrapper<DoctorDetailsParams>({
      toolParams: { doctor_id: doctorId },
      wrapperOptions: {
        session_id: sessionId,
        tool_name: TOOL_NAME.DOCTOR_DETAILS,
        onSessionRefresh,
      },
    });

    if(!response?.ok) {
      throw new Error("Failed to load doctor details");
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error loading doctor details:", error);
    throw error;
  }
};

export default getDoctorDetails;