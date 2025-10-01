"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { TDoctor, TDoctorDetails, TCallbacks } from "@/types/widget";
import { getDoctorDetails } from "@/api/post-available-doctors";
import AppointmentCard from "./appointment-card";
import useMedAssistStore from "@/stores/medAssistStore";

type Props = {
  doctorDetails: TDoctorDetails;
  callbacks?: TCallbacks;
  onBook?: (info: { date: string; time: string; doctor: TDoctor }) => void;
  disabled?: boolean;
  getAvailabilityDatesForAppointment: (doctorData: {
    doctor_id: string;
    hospital_id?: string;
    region_id?: string;
  }) => Promise<{ success: boolean; data: any }>;
  getAvailableSlotsForAppointment: (
    appointment_date: string,
    doctorData: {
      doctor_id: string;
      hospital_id?: string;
      region_id?: string;
    }
  ) => Promise<{ success: boolean; data: any }>;
};

export function DoctorDetailsList({
  doctorDetails,
  callbacks,
  onBook,
  disabled = false,
  getAvailabilityDatesForAppointment,
  getAvailableSlotsForAppointment,
}: Props) {
  const [doctors, setDoctors] = useState<TDoctor[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadedCount, setLoadedCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const sessionId = useMedAssistStore((state) => state.sessionId);

  const doctorIds = doctorDetails.doctor_ids || [];
  const totalDoctors = doctorIds.length;
  const initialLoadCount = Math.min(3, totalDoctors);
  const remainingCount = totalDoctors - initialLoadCount;

  // Load initial doctors (max 3)
  useEffect(() => {
    if (doctorIds.length === 0 || !sessionId ) return;

    const loadInitialDoctors = async () => {
      setLoading(true);
      setError(null);

      try {
        // Load first 3 doctors in parallel
        const initialIds = doctorIds.slice(0, initialLoadCount);
        const doctorPromises = initialIds.map((doctorId) =>
          getDoctorDetails(sessionId, { doctor_id: doctorId })
        );

        const results = await Promise.allSettled(doctorPromises);
        const successfulDoctors: TDoctor[] = [];

        results.forEach((result, index) => {
          if (result.status === "fulfilled") {
            successfulDoctors.push(result.value);
          } else {
            console.error(
              `Failed to load doctor ${initialIds[index]}:`,
              result.reason
            );
          }
        });

        setDoctors(successfulDoctors);
        setLoadedCount(successfulDoctors.length);
      } catch (error) {
        console.error("Error loading initial doctors:", error);
        setError("Failed to load doctor details. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    loadInitialDoctors();
  }, [doctorIds, sessionId, initialLoadCount]);

  // Load remaining doctors when "Show more" is clicked
  const loadRemainingDoctors = async () => {
    if (loadedCount >= totalDoctors || !sessionId) return;

    setLoading(true);
    setError(null);

    try {
      const remainingIds = doctorIds.slice(loadedCount);
      const doctorPromises = remainingIds.map((doctorId) =>
        getDoctorDetails(sessionId, { doctor_id: doctorId })
      );

      const results = await Promise.allSettled(doctorPromises);
      const newDoctors: TDoctor[] = [];

      results.forEach((result, index) => {
        if (result.status === "fulfilled") {
          newDoctors.push(result.value);
        } else {
          console.error(
            `Failed to load doctor ${remainingIds[index]}:`,
            result.reason
          );
        }
      });

      setDoctors((prev) => [...prev, ...newDoctors]);
      setLoadedCount((prev) => prev + newDoctors.length);
    } catch (error) {
      console.error("Error loading remaining doctors:", error);
      setError("Failed to load more doctor details. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleBook = (
    info: { date: string; time: string },
    doctor: TDoctor
  ) => {
    if (onBook) {
      onBook({ ...info, doctor });
    }
  };

//   if (disabled) {
//     return (
//       <div className="flex items-center justify-center py-2">
//         <p className="text-sm text-gray-500">Doctor Selected</p>
//       </div>
//     );
//   }

  if (loading && doctors.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
          <p className="text-sm text-gray-500">Loading doctor details...</p>
        </div>
      </div>
    );
  }

  if (error && doctors.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <p className="text-sm text-red-500 mb-2">{error}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setError(null);
              // Retry loading
              if (doctorIds.length > 0 && sessionId) {
                const loadInitialDoctors = async () => {
                  setLoading(true);
                  try {
                    const initialIds = doctorIds.slice(0, initialLoadCount);
                    const doctorPromises = initialIds.map((doctorId) =>
                      getDoctorDetails(sessionId, { doctor_id: doctorId })
                    );
                    const results = await Promise.allSettled(doctorPromises);
                    const successfulDoctors: TDoctor[] = [];
                    results.forEach((result, _) => {
                      if (result.status === "fulfilled") {
                        successfulDoctors.push(result.value);
                      }
                    });
                    setDoctors(successfulDoctors);
                    setLoadedCount(successfulDoctors.length);
                  } catch (error) {
                    setError(
                      "Failed to load doctor details. Please try again."
                    );
                  } finally {
                    setLoading(false);
                  }
                };
                loadInitialDoctors();
              }
            }}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (doctors.length === 0) {
    return (
      <div className="flex items-center justify-center py-2">
        <p className="text-sm text-gray-500">No doctor details available.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Doctor Cards */}
      <div className="space-y-4">
        {doctors.map(
          (doctor, index) =>
            doctor?.doctor_id && (
              <AppointmentCard
                key={`${index}`}
                doctor={doctor}
                availability={doctorDetails.availability}
                callbacks={callbacks}
                onBook={(info) => handleBook(info, doctor)}
                disabled={disabled}
                getAvailabilityDatesForAppointment={
                  getAvailabilityDatesForAppointment
                }
                getAvailableSlotsForAppointment={
                  getAvailableSlotsForAppointment
                }
              />
            )
        )}
      </div>

      {/* Show More Button */}
      {loadedCount < totalDoctors && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={loadRemainingDoctors}
            disabled={loading}
            className="px-6 py-2">
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                Loading more doctors...
              </>
            ) : (
              `Show more (${remainingCount} more)`
            )}
          </Button>
        </div>
      )}

      {/* Error message for partial failures */}
      {error && doctors.length > 0 && (
        <div className="text-center">
          <p className="text-sm text-red-500 mb-2">{error}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={loadRemainingDoctors}
            disabled={loading}>
            Retry loading more
          </Button>
        </div>
      )}
    </div>
  );
}

export default DoctorDetailsList;
