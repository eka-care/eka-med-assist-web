import { postCallbackWrapper } from "@/api/post-callback-wrapper";
import { TOOL_NAME } from "@/configs/enums";
import { AvailabilityDatesParams } from "@/types/api";

const getAvailabiltyDates = async (doctorData: {
    doctor_id: string;
    hospital_id?: string;
    region_id?: string;
  }, sessionId: string, refreshSession: () => Promise<boolean>) => {
    if (!doctorData?.doctor_id) {
        return { success: false, data: null };
      }
      try {
        const response = await postCallbackWrapper<AvailabilityDatesParams>({
          toolParams: {
            doctor_id: doctorData.doctor_id,
            hospital_id: doctorData.hospital_id || "",
            region_id: doctorData.region_id || "",
          },
          wrapperOptions: {
            session_id: sessionId,
            tool_name: TOOL_NAME.AVAILABILITY_DATES,
            onSessionRefresh: refreshSession,
          },
        });
          
        if(!response?.ok) {
          throw new Error("Failed to load availability dates");
        }
        const data = await response.json();
  
        if (!data?.available_dates?.length) {
          console.error("Available dates are not coming in response", response);
          return { success: false, data: null };
        }
        return { success: true, data };
      } catch (error) {
        console.error("Error loading availability dates:", error);
        return { success: false, data: null };
      }
};

export default getAvailabiltyDates;