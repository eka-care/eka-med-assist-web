"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Building2,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Languages,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CustomSelect } from "@ui/eka-ui/molecules/custom-select";
import { cn } from "@/lib/utils";
import { formatDate, getInitials } from "@/utils/doctorUtils";
import type { BookInfo } from "./doctor-details-list";
import {
  SYNAPSE_TOOL_CALLBACK_NAME,
  type TAvailability,
  type TAvailabilityDatesToolResponse,
  type TAvailabilitySlotsToolResponse,
  type TDoctorAvailability,
  type TDoctorDetails,
  type ToolCallbacks,
  type ToolCallResponse,
} from "@eka-care/medassist-core";

type AppointmentCardProps = {
  doctor: TDoctorAvailability;
  doctorDetails: TDoctorDetails;
  callTool: <R extends ToolCallResponse = ToolCallResponse>(
    toolName: string,
    toolParams: Record<string, unknown>
  ) => Promise<R>;
  onBook?: (info: BookInfo) => void;
  callbacks?: ToolCallbacks;
  disabled?: boolean;
  error?: string;
};

export function AppointmentCardNew({
  doctor,
  doctorDetails,
  callTool,
  onBook,
  callbacks,
  disabled,
  error,
}: AppointmentCardProps) {
  const [open, setOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedHospital, setSelectedHospital] = useState<string>("");
  const [calendarOffset, setCalendarOffset] = useState(0);
  const [loadingAvailabilityDates, setLoadingAvailabilityDates] =
    useState(false);
  const [loadingAvailabilitySlots, setLoadingAvailabilitySlots] =
    useState(false);
  const [availability, setAvailability] = useState<
    Record<string, TAvailability[]>
  >({});

  useEffect(() => {
    if (!doctor.hospital_id && doctorDetails.hospitals.length) {
      setSelectedHospital(doctorDetails.hospitals[0].hospital_id!);
    } else if (doctor.hospital_id) {
      setSelectedHospital(doctor.hospital_id!);
    }
  }, [doctor.hospital_id, doctorDetails.hospitals]);

  // Initialize availability from doctor.availability prop if available
  useEffect(() => {
    if (doctor?.availability?.length) {
      const hospitalId = doctor.hospital_id || selectedHospital;
      if (hospitalId) {
        setAvailability((prev) => ({
          ...prev,
          [hospitalId]: doctor.availability!,
        }));
      }
    }
  }, [doctor?.availability, doctor?.hospital_id]);

  const getAvailabilityDates = useCallback(
    async (toolName: string) => {
      if (!selectedHospital || !doctor.doctor_id) return;

      try {
        setLoadingAvailabilityDates(true);
        const toolParams = {
          doctor_id: doctor.doctor_id,
          hospital_id: selectedHospital,
        };
        const response = await callTool<TAvailabilityDatesToolResponse>(
          toolName,
          toolParams
        );
        if (response.available_dates.length) {
          setAvailability((prev) => ({
            ...prev,
            [selectedHospital]: response.available_dates.map((date) => ({
              date,
              slots: [],
            })),
          }));
        }
      } catch (error) {
        console.error("Failed to get availability dates:", error);
      } finally {
        setLoadingAvailabilityDates(false);
      }
    },
    [selectedHospital, doctor.doctor_id]
  );

  useEffect(() => {
    if (
      callbacks?.[SYNAPSE_TOOL_CALLBACK_NAME.AVAILABILITY_DATES] &&
      selectedHospital &&
      !availability[selectedHospital]?.length
    ) {
      getAvailabilityDates(
        callbacks[SYNAPSE_TOOL_CALLBACK_NAME.AVAILABILITY_DATES].tool_name
      );
    }
  }, [callbacks, selectedHospital]);

  const availabilityForSelectedHospital = useMemo(() => {
    return availability[selectedHospital] || [];
  }, [availability, selectedHospital]);

  const calendarDays = useMemo(() => {
    if (!availabilityForSelectedHospital.length) return null;

    const startIndex = calendarOffset;
    const endIndex = Math.min(
      startIndex + 3,
      availabilityForSelectedHospital.length
    );

    return availabilityForSelectedHospital
      .slice(startIndex, endIndex)
      .map((day) => ({
        slots: day.slots,
        date: day.date,
        ...formatDate(day.date),
        hasSlots: day.slots.length > 0,
      }));
  }, [availabilityForSelectedHospital, calendarOffset]);

  const selectedDateData = useMemo(() => {
    if (!selectedDate) return null;
    return (
      availabilityForSelectedHospital.find(
        (item) => item.date === selectedDate
      ) || null
    );
  }, [availabilityForSelectedHospital, selectedDate]);

  const handleSlotSelect = (slot: string) => {
    setSelectedSlot(slot);
  };

  const prevCalendar = useCallback(() => {
    setCalendarOffset((offset) => Math.max(0, offset - 3));
    setSelectedSlot(null);
  }, []);

  const nextCalendar = useCallback(() => {
    const maxOffset = Math.max(
      0,
      availabilityForSelectedHospital.length - 3
    );
    setCalendarOffset((offset) => Math.min(maxOffset, offset + 3));
    setSelectedSlot(null);
  }, [availabilityForSelectedHospital.length]);

  const getAvailabilitySlots = useCallback(
    async (
      toolName: string,
      toolParams: { doctor_id: string; hospital_id: string; date: string }
    ) => {
      try {
        setLoadingAvailabilitySlots(true);
        const response = await callTool<TAvailabilitySlotsToolResponse>(
          toolName,
          toolParams
        );
        if (response.slots.length) {
          setAvailability((prev) => {
            const hospitalAvailability = prev[toolParams.hospital_id] || [];
            const existingDateIndex = hospitalAvailability.findIndex(
              (item) => item.date === toolParams.date
            );

            if (existingDateIndex >= 0) {
              const updated = [...hospitalAvailability];
              updated[existingDateIndex] = {
                date: toolParams.date,
                slots: response.slots,
              };
              return { ...prev, [toolParams.hospital_id]: updated };
            } else {
              return {
                ...prev,
                [toolParams.hospital_id]: [
                  ...hospitalAvailability,
                  { date: toolParams.date, slots: response.slots },
                ],
              };
            }
          });
        }
      } catch (error) {
        console.error("Failed to get availability slots:", error);
      } finally {
        setLoadingAvailabilitySlots(false);
      }
    },
    [callTool]
  );

  const selectDate = useCallback(
    async (date: string) => {
      if (selectedDate === date) return;

      setSelectedDate(date);

      // Check if we need to fetch slots for this date
      const dateData = availabilityForSelectedHospital.find(
        (item) => item.date === date
      );
      const needsSlots =
        !dateData?.slots.length &&
        doctor.doctor_id &&
        selectedHospital &&
        callbacks?.[SYNAPSE_TOOL_CALLBACK_NAME.AVAILABILITY_SLOTS];

      if (needsSlots && doctor.doctor_id) {
        await getAvailabilitySlots(
          callbacks![SYNAPSE_TOOL_CALLBACK_NAME.AVAILABILITY_SLOTS].tool_name,
          {
            doctor_id: doctor.doctor_id,
            hospital_id: selectedHospital,
            date: date,
          }
        );
      }

      // Set slot preference if available
      const updatedDateData = availabilityForSelectedHospital.find(
        (item) => item.date === date
      );
      if (
        doctor?.selected_date === date &&
        doctor?.slot_preference &&
        updatedDateData?.slots.includes(doctor.slot_preference)
      ) {
        setSelectedSlot(doctor.slot_preference);
      } else {
        setSelectedSlot(null);
      }
    },
    [availabilityForSelectedHospital, selectedHospital]
  );

  // Initialize selected date when availability loads
  useEffect(() => {
    if (selectedDate || !availabilityForSelectedHospital.length) return;

    const initialDate =
      doctor.selected_date || availabilityForSelectedHospital[0]?.date;
    if (initialDate) {
      selectDate(initialDate).catch(console.error);
    }
  }, [
    doctor.selected_date,
    availabilityForSelectedHospital,
    selectedDate,
    selectDate,
  ]);

  const handleBook = () => {
    if (onBook && selectedSlot && selectedDate) {
      onBook({
        date: selectedDate,
        time: selectedSlot,
        doctorData: {
          doctor: doctorDetails,
          hospital_id: selectedHospital,
        },
      });
    }
  };

  const canGoPrevious = calendarOffset > 0;
  const canGoNext =
    calendarOffset <
    Math.max(0, availabilityForSelectedHospital.length - 3);

  if (!doctorDetails) return null;

  return (
    <Card
      className="max-w-md rounded-xl border-slate-200 shadow-sm p-0 bg-white overflow-hidden"
      aria-label="Appointment card">
      <CardHeader className="flex flex-row items-center justify-between gap-3 bg-[var(--color-background-primary-subtle)] rounded-t-xl p-4 border-b border-slate-100 overflow-hidden">
        <div className="flex items-center gap-3">
          {doctorDetails.profile_pic && (
            <Avatar className="h-12 w-12 ring-2 ring-slate-200">
              <AvatarImage
                src={doctorDetails.profile_pic}
                alt={`${doctorDetails.name} profile photo`}
                crossOrigin="anonymous"
              />
              <AvatarFallback className="bg-slate-100 text-slate-700">
                {getInitials(doctorDetails.name)}
              </AvatarFallback>
            </Avatar>
          )}
          <div className="min-w-0">
            <div className="flex flex-wrap items-baseline gap-2">
              <h3 className=" text-base font-bold text-slate-900">
                {doctorDetails.name}
              </h3>
              {doctorDetails.profile_link ? (
                <a
                  href={doctorDetails.profile_link}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-semibold text-[var(--color-primary)] hover:text-[var(--color-primary)] hover:underline">
                  View profile
                </a>
              ) : null}
            </div>
            <p className="mt-0.5 text-sm text-slate-600">
              {doctorDetails.specialty}
              {doctorDetails.experience && (
                <> • {doctorDetails.experience}</>
              )}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-4 py-2">
        {/* Info rows */}
        <div className="grid gap-2 border-b border-slate-200 pb-3">
          {doctorDetails?.timings && (
            <div className="flex items-start gap-2 text-sm text-slate-900">
              <Clock
                className="h-4 w-4 text-[var(--color-primary)] mt-0.5 flex-shrink-0"
                aria-hidden
              />
              <span className="text-slate-600 text-xs">
                {doctorDetails?.timings}
              </span>
            </div>
          )}

          {doctorDetails.languages ? (
            <div className="flex items-center gap-2 text-sm text-slate-900">
              <Languages
                className="h-4 w-4 text-[var(--color-primary)]"
                aria-hidden
              />
              <span className="text-slate-600">
                {doctorDetails.languages}
              </span>
            </div>
          ) : null}

          {doctorDetails?.hospitals && doctorDetails.hospitals?.length > 1
            ? selectedHospital && (
                <div className="flex items-center gap-2 text-sm text-slate-900">
                  <Building2
                    className="h-4 w-4 text-[var(--color-primary)]"
                    aria-hidden
                  />
                  <CustomSelect
                    options={doctorDetails.hospitals.map((hospital) => ({
                      value: hospital.hospital_id,
                      label: hospital.name || "",
                    }))}
                    placeholder="Select Hospital"
                    disabled={disabled}
                    onValueChange={(value) => setSelectedHospital(value)}
                    value={selectedHospital}
                  />
                </div>
              )
            : (
                <div className="flex items-center gap-2 text-sm text-slate-900">
                  <Building2
                    className="h-4 w-4 text-[var(--color-primary)]"
                    aria-hidden
                  />
                  <span className="text-slate-600">
                    {doctorDetails.hospitals?.[0]?.name || ""}
                  </span>
                </div>
              )}
        </div>

        {/* Conditional buttons */}
        {availabilityForSelectedHospital.length > 0 ||
        loadingAvailabilityDates ? (
          <Button
            type="button"
            variant="outline"
            aria-expanded={open}
            aria-controls="ap-slots"
            onClick={() => setOpen((o) => !o)}
            disabled={loadingAvailabilityDates}
            className="mt-3 w-full border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-background-primary-subtle)] disabled:opacity-50">
            {loadingAvailabilityDates ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Loading availability...
              </>
            ) : (
              <>
                <span className="mr-1">
                  {open ? "Hide slots" : "Show available slots"}
                </span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 transition-transform",
                    open && "rotate-180"
                  )}
                  aria-hidden
                />
              </>
            )}
          </Button>
        ) : (
          <div className="mt-3 w-full flex items-center justify-center py-3 px-4 bg-gray-50 border border-gray-200 rounded-lg">
            <span className="text-sm text-gray-500 font-medium">
              No details available
            </span>
          </div>
        )}

        {/* Collapsible content */}
        {open && availabilityForSelectedHospital.length > 0 && (
          <div
            id="ap-slots"
            role="region"
            aria-label="Available slots"
            className="pt-3">
            {calendarDays ? (
              <>
                {/* Calendar */}
                <div className="flex items-center gap-2 px-0.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={prevCalendar}
                    aria-label="Previous 3 days"
                    disabled={disabled || !canGoPrevious}
                    className="h-8 w-8 flex-shrink-0 rounded-md border-slate-200 bg-transparent text-slate-900 disabled:opacity-50">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>

                  <div className="flex-1 grid grid-cols-3 gap-1 min-w-0">
                    {calendarDays.map((day, i) => {
                      const isSelected = selectedDate === day.date;
                      const isDisabled = !day.hasSlots;
                      return (
                        <Button
                          key={`${day.date}-${i}`}
                          type="button"
                          variant="outline"
                          onClick={() =>
                            !isDisabled && selectDate(day.date)
                          }
                          disabled={isDisabled || disabled}
                          aria-current={
                            isSelected ? "date" : undefined
                          }
                          className={cn(
                            "flex flex-col items-center justify-center h-12 rounded-lg border-2 p-2 gap-0.5 min-w-0 transition-all",
                            isSelected &&
                              "border-[var(--color-primary)] ring-2 ring-[var(--color-background-primary-subtle)] bg-[var(--color-background-primary-subtle)] shadow-sm",
                            isDisabled &&
                              "border-slate-200 bg-slate-50 text-slate-300 cursor-not-allowed",
                            !isSelected &&
                              !isDisabled &&
                              "border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300"
                          )}>
                          <span
                            className={cn(
                              "text-[10px] tracking-wide w-full text-center font-medium",
                              isSelected &&
                                "text-[var(--color-primary)]",
                              isDisabled && "text-slate-300",
                              !isSelected &&
                                !isDisabled &&
                                "text-slate-600"
                            )}>
                            {day.weekday}
                          </span>
                          <span
                            className={cn(
                              "text-xs font-bold w-full text-center",
                              isSelected &&
                                "text-[var(--color-primary)]",
                              isDisabled && "text-slate-300",
                              !isSelected &&
                                !isDisabled &&
                                "text-slate-900"
                            )}>
                            {day.dayNum}
                          </span>
                        </Button>
                      );
                    })}
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={nextCalendar}
                    aria-label="Next 3 days"
                    disabled={disabled || !canGoNext}
                    className="h-8 w-8 flex-shrink-0 rounded-md border-slate-200 bg-transparent text-slate-900 disabled:opacity-50">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>

                {/* Slots */}
                <div className="px-0.5 py-3">
                  {loadingAvailabilitySlots ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-4 w-4 animate-spin text-[var(--color-primary)] mr-2" />
                      <span className="text-sm text-slate-600">
                        Loading slots...
                      </span>
                    </div>
                  ) : selectedDateData?.slots?.length ? (
                    <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                      {selectedDateData.slots.map((t, index) => {
                        const selected = selectedSlot === t;
                        return (
                          <Button
                            key={t || `slot-${index}`}
                            type="button"
                            variant="outline"
                            onClick={() => handleSlotSelect(t)}
                            aria-pressed={selected}
                            disabled={disabled}
                            className={cn(
                              "inline-flex h-9 items-center justify-center gap-2 rounded-lg px-3 text-xs font-semibold transition-all",
                              selected
                                ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white shadow-sm hover:bg-[var(--color-primary)]/90"
                                : "border-slate-200 bg-white text-slate-900 hover:bg-slate-50 hover:border-slate-300"
                            )}>
                            <Calendar
                              className={cn(
                                "h-3.5 w-3.5 flex-shrink-0",
                                selected
                                  ? "text-white"
                                  : "text-[var(--color-primary)]"
                              )}
                            />
                            <span className="truncate">{t}</span>
                          </Button>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="px-1 text-sm text-slate-600">
                      No slots available for this day.
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="px-0.5 pb-1.5">
                  <Button
                    type="button"
                    onClick={handleBook}
                    disabled={!selectedSlot || disabled}
                    aria-disabled={!selectedSlot}
                    className="w-full h-10 gap-2 bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary)]/90 disabled:opacity-60 shadow-sm font-semibold">
                    Book appointment
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </>
            ) : (
              <div className="px-1 pb-2 pt-1">
                <p className="text-sm text-slate-600">
                  {error ? error : "No availability provided."}
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default AppointmentCardNew;
