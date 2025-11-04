import { postCallbackWrapper } from "@/api/post-callback-wrapper";
import { TOOL_NAME } from "@/configs/enums";
import { AvailabilitySlotsParams } from "@/types/api";

const getAvailabilitySlots = async (appointmentDate: string, doctorData: {
    doctor_id: string;
    hospital_id?: string;
    region_id?: string;
  }, sessionId: string, refreshSession: () => Promise<boolean>) => {
    if (!doctorData?.doctor_id || !appointmentDate) {
        return { success: false, data: null };
      }
      try {
        const response = await postCallbackWrapper<AvailabilitySlotsParams>({
          toolParams: {
            doctor_id: doctorData.doctor_id,
            appointment_date: appointmentDate,
            hospital_id: doctorData.hospital_id || "",
            region_id: doctorData.region_id || "",
          },
          wrapperOptions: {
            session_id: sessionId,
            tool_name: TOOL_NAME.AVAILABILITY_SLOTS,
            onSessionRefresh: refreshSession,
          },
        });
        if (!response?.ok) {
          const errorData = await response.json();
           if (response.status === 412 && errorData?.error?.code === 'bot_error_display' && !!errorData?.error?.msg) {
            return { success: false, data: { error: { msg: errorData?.error?.msg } } };
           }
          throw new Error("Failed to load availability slots");
        }
        const data = await response.json();
        if (!data?.slots?.length) {
          console.error("Available slots are not coming in response", response);
          return { success: false, data: null };
        }
        return { success: true, data };
      } catch (error) {
        console.error("Error loading slots for date:", error);
        return { success: false, data: null };
      }
  }

export default getAvailabilitySlots;