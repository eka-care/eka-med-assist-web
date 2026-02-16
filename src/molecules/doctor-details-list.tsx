"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { AppointmentCardNew } from "./appointment-card";
import {
  SYNAPSE_TOOL_CALLBACK_NAME,
  type TDoctorAvailability,
  type TDoctorDetailsMap,
  type TDoctorToolResponse,
  type ToolCallbacks,
  type ToolCallResponse,
} from "@eka-care/medassist-core";

export type BookInfo = {
  date: string;
  time: string;
  doctorData: {
    doctor: TDoctorToolResponse;
    hospital_id?: string;
    region_id?: string;
  };
};

type Props = {
  doctorAvailabilities: TDoctorAvailability[];
  doctorDetails?: TDoctorDetailsMap;
  callbacks?: ToolCallbacks;
  onBook?: (info: BookInfo) => void;
  disabled?: boolean;
  callTool: <R extends ToolCallResponse = ToolCallResponse>(
    toolName: string,
    toolParams: Record<string, unknown>
  ) => Promise<R>;
};

export function DoctorDetailsList({
  doctorAvailabilities,
  doctorDetails,
  callbacks,
  onBook,
  disabled = false,
  callTool,
}: Props) {
  const [loadedDoctorDetails, setLoadedDoctorDetails] =
    useState<TDoctorDetailsMap>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadedCount, setLoadedCount] = useState(0);

  const totalDoctors = doctorAvailabilities.length;

  const initialLoadCount = Math.min(3, doctorAvailabilities.length);
  const remainingCount = totalDoctors - initialLoadCount;

  useEffect(() => {
    const loadInitialDoctors = async () => {
      setLoading(true);
      setError(null);
      const initialDoctors = doctorAvailabilities.slice(0, initialLoadCount);

      const doctorPromises = initialDoctors
        .filter((doctor) => doctor.doctor_id)
        .map(async (doctor) => {
          try {
            const details = await fetchDoctorDetails(doctor.doctor_id!);
            return {
              doctorId: doctor.doctor_id!,
              doctorDetails: details || null,
            };
          } catch (error) {
            return { doctorId: doctor.doctor_id!, doctorDetails: null };
          }
        });

      const results = await Promise.allSettled(doctorPromises);
      const details: TDoctorDetailsMap = {};
      results.forEach((result) => {
        if (result.status === "fulfilled") {
          const { doctorId, doctorDetails } = result.value;
          if (doctorId && doctorDetails) {
            details[doctorId] = doctorDetails;
          }
        }
      });

      setLoadedDoctorDetails(details);
      setLoadedCount(Object.keys(details).length);
      setLoading(false);
    };
    loadInitialDoctors();
  }, []);

  const fetchDoctorDetails = async (doctorId: string) => {
    if (doctorDetails) {
      return doctorDetails[doctorId];
    }
    if (callbacks && callbacks[SYNAPSE_TOOL_CALLBACK_NAME.DOCTOR_DETAILS]) {
      const result = await callTool<TDoctorToolResponse>(
        callbacks[SYNAPSE_TOOL_CALLBACK_NAME.DOCTOR_DETAILS].tool_name,
        {
          doctor_id: doctorId,
        }
      );
      return result || null;
    }
    return null;
  };

  const loadRemainingDoctors = async () => {
    if (loadedCount >= doctorAvailabilities.length) return;
    setLoading(true);
    setError(null);
    const remainingDoctors = doctorAvailabilities.slice(loadedCount);
    const doctorPromises = remainingDoctors
      .filter((doctor) => doctor.doctor_id)
      .map(async (doctor) => {
        try {
          const details = await fetchDoctorDetails(doctor.doctor_id!);
          return { doctorId: doctor.doctor_id!, detail: details };
        } catch (error) {
          return { doctorId: doctor.doctor_id!, detail: null };
        }
      });
    const results = await Promise.allSettled(doctorPromises);
    const details: TDoctorDetailsMap = {};
    results.forEach((result) => {
      if (result.status === "fulfilled") {
        const { doctorId, detail } = result.value;
        if (doctorId && detail) {
          details[doctorId] = detail;
        }
      }
    });
    setLoadedDoctorDetails((prev) => ({ ...prev, ...details }));
    setLoadedCount((c) => c + Object.keys(details).length);
    setLoading(false);
  };

  if (loading && loadedCount === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)] mx-auto mb-3"></div>
          <p className="text-sm text-gray-500">Loading doctor details...</p>
        </div>
      </div>
    );
  }

  if (loadedCount === 0) {
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
        {doctorAvailabilities.map(
          (doctor, index) =>
            doctor?.doctor_id &&
            loadedDoctorDetails[doctor.doctor_id!] && (
              <AppointmentCardNew
                key={`${index}`}
                doctor={doctor}
                doctorDetails={loadedDoctorDetails[doctor.doctor_id!]}
                callTool={callTool}
                onBook={onBook}
                callbacks={callbacks}
                disabled={disabled}
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
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[var(--color-primary)] mr-2"></div>
                Loading more doctors...
              </>
            ) : (
              `Show more (${remainingCount} more)`
            )}
          </Button>
        </div>
      )}

      {/* Error message for partial failures */}
      {error && loadedCount > 0 && (
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
