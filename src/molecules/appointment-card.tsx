"use client";

import { useMemo, useState, useEffect } from "react";
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
import { TAvailability, TCallbacks, TDoctor } from "@/types/widget";
import useSessionStore from "@/stores/medAssistStore";

type Props = {
  doctor: TDoctor;
  availability?: TAvailability;
  callbacks: TCallbacks | undefined;
  onBook?: (info: { date: string; time: string }) => void;
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

export function AppointmentCard({
  doctor,
  availability,
  callbacks,
  onBook,
  disabled = false,
  getAvailabilityDatesForAppointment,
  getAvailableSlotsForAppointment,
}: Props) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [calendarOffset, setCalendarOffset] = useState(0);

  // New state for callback-based availability
  const [loadingDates, setLoadingDates] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [callbackAvailability, setCallbackAvailability] =
    useState<TAvailability | null>(null);
  const [userHasSelectedDate, setUserHasSelectedDate] = useState(false);

  // Get session data from store
  const sessionId = useSessionStore((state) => state.sessionId);

  // Load additional availability dates when component mounts if callbacks are enabled
  // This will extend the existing availability data with more future dates
  useEffect(() => {
    if (
      callbacks?.tool_callback_availability_dates &&
      doctor.doctor_id &&
      sessionId &&
      !callbackAvailability
    ) {
      loadAvailabilityDates();
    }
  }, [callbacks?.tool_callback_availability_dates, callbackAvailability]);

  // Use callback availability if it has more data, otherwise use provided availability
  const currentAvailability = callbackAvailability || availability;
  console.log("curent availability", currentAvailability);

  // Get the first date from availability to start the calendar
  const firstDate = useMemo(() => {
    console.log("current availabilty", currentAvailability);

    if (!currentAvailability?.slots_details?.length) return new Date();
    const firstSlot = currentAvailability.slots_details[0];
    return new Date(firstSlot.date);
  }, [currentAvailability]);

  // Auto-select date based on selected_date or first available date (only on initial load)
  useEffect(() => {
    console.log("current availabilty in useeffect", currentAvailability);

    if (currentAvailability?.slots_details?.length && !userHasSelectedDate) {
      let targetDateIndex = 0;

      // Check if there's a selected_date in the response
      if (availability?.selected_date) {
        const selectedIndex = currentAvailability.slots_details.findIndex(
          (slot) => slot.date === availability.selected_date
        );
        if (selectedIndex >= 0) {
          targetDateIndex = selectedIndex;
        }
      } else {
        // If no selected_date, prioritize the first date that already has slots
        // from the original availability data (before merging)
        const existingSlots = availability?.slots_details || [];
        const firstDateWithSlots = currentAvailability.slots_details.findIndex(
          (slot) => {
            // Check if this date exists in original data and has slots
            const originalSlot = existingSlots.find(
              (orig) => orig.date === slot.date
            );
            return (
              originalSlot &&
              originalSlot.slots &&
              originalSlot.slots.length > 0
            );
          }
        );

        if (firstDateWithSlots >= 0) {
          targetDateIndex = firstDateWithSlots;
        }
        // If no date with existing slots found, targetDateIndex remains 0 (first date)
      }

      // Set the active index to the target date
      setActiveIndex(targetDateIndex);

      // Adjust calendar offset to show the selected date in the current view
      const targetOffset = Math.floor(targetDateIndex / 3) * 3;
      setCalendarOffset(targetOffset);

      // Only load slots for empty dates after setting loadingDates to false
      // and only if the selected date doesn't have slots
      const selectedSlot = currentAvailability.slots_details[targetDateIndex];
      if (
        (!selectedSlot?.slots || selectedSlot.slots.length === 0) &&
        callbacks?.tool_callback_availability_slots &&
        doctor.doctor_id &&
        doctor.hospital_id &&
        doctor.region_id &&
        sessionId &&
        !loadingDates // Only load if we're not currently loading dates
      ) {
        // Use setTimeout to ensure this runs after loadingDates is set to false
        setTimeout(() => {
          loadSlotsForDate(selectedSlot.date);
        }, 0);
      }
    }
  }, [
    currentAvailability,
    availability?.selected_date,
    userHasSelectedDate,
    loadingDates,
  ]);

  // Generate calendar days from merged availability data
  const calendarDays = useMemo(() => {
    const days = [];

    // If we have availability data, show those dates
    if (currentAvailability?.slots_details?.length) {
      const startIndex = Math.max(0, Math.floor(calendarOffset / 3) * 3);
      const endIndex = Math.min(
        currentAvailability.slots_details.length,
        startIndex + 3
      );

      for (let i = startIndex; i < endIndex; i++) {
        const slot = currentAvailability.slots_details[i];
        const currentDate = new Date(slot.date);

        const weekday = currentDate
          .toLocaleDateString(undefined, { weekday: "short" })
          .toUpperCase();
        const dayNum = currentDate.toLocaleDateString(undefined, {
          day: "2-digit",
        });

        days.push({
          weekday,
          dayNum,
          date: slot.date,
          hasAvailability: true,
          fullDate: currentDate,
          hasSlots: slot.slots && slot.slots.length > 0,
        });
      }
    } else {
      // Fallback: generate 3 consecutive days starting from first date + offset
      const startDate = new Date(firstDate);
      startDate.setDate(startDate.getDate() + calendarOffset);

      for (let i = 0; i < 3; i++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + i);

        const weekday = currentDate
          .toLocaleDateString(undefined, { weekday: "short" })
          .toUpperCase();
        const dayNum = currentDate.toLocaleDateString(undefined, {
          day: "2-digit",
        });
        const dateString = currentDate.toISOString().split("T")[0];

        days.push({
          weekday,
          dayNum,
          date: dateString,
          hasAvailability: false,
          fullDate: currentDate,
          hasSlots: false,
        });
      }
    }

    return days;
  }, [firstDate, calendarOffset, currentAvailability]);

  const activeDay = currentAvailability?.slots_details?.[activeIndex];

  const initials =
    doctor.name
      ?.split(" ")
      .map((s) => s[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "DR";

  function prevCalendar() {
    setUserHasSelectedDate(true);
    setCalendarOffset((offset) => Math.max(0, offset - 3));
    setSelectedSlot(null);
  }

  function nextCalendar() {
    setUserHasSelectedDate(true);
    const maxOffset = currentAvailability?.slots_details?.length
      ? Math.max(0, currentAvailability.slots_details.length - 3)
      : 0;
    setCalendarOffset((offset) => Math.min(maxOffset, offset + 3));
    setSelectedSlot(null);
  }

  function selectDate(dateString: string) {
    // Mark that user has manually selected a date
    setUserHasSelectedDate(true);

    // Find the index of the selected date in availability
    const dateIndex =
      currentAvailability?.slots_details?.findIndex(
        (slot) => slot.date === dateString
      ) ?? -1;

    if (dateIndex >= 0) {
      setActiveIndex(dateIndex);
    }
    setSelectedSlot(null);

    // Check if this date already has slots loaded
    const selectedDateData = currentAvailability?.slots_details?.find(
      (slot) => slot.date === dateString
    );

    // Only load slots via callback if:
    // 1. Callbacks are enabled
    // 2. This date doesn't have slots already loaded
    // 3. We have all required parameters
    if (
      callbacks?.tool_callback_availability_slots &&
      (!selectedDateData?.slots || selectedDateData.slots.length === 0) &&
      doctor.doctor_id &&
      doctor.hospital_id &&
      doctor.region_id &&
      sessionId
    ) {
      loadSlotsForDate(dateString);
    }
  }

  // Check if we can go to previous dates
  const canGoPrevious = useMemo(() => {
    return calendarOffset > 0;
  }, [calendarOffset]);

  // Check if we can go to next dates
  const canGoNext = useMemo(() => {
    if (!currentAvailability?.slots_details?.length) return false;
    const maxOffset = Math.max(0, currentAvailability.slots_details.length - 3);
    return calendarOffset < maxOffset;
  }, [calendarOffset, currentAvailability]);

  function handleBook() {
    if (onBook && activeDay && selectedSlot) {
      onBook({ date: activeDay.date, time: selectedSlot });
    }
  }

  // Function to load availability dates
  const loadAvailabilityDates = async () => {
    if (!doctor.doctor_id || !sessionId) {
      console.warn(
        "Missing required parameters for loading availability dates"
      );
      return;
    }

    setLoadingDates(true);

    try {
      // Use the handler from chat-widget if available, otherwise fall back to direct API call
      let response;

      const result = await getAvailabilityDatesForAppointment({
        doctor_id: doctor.doctor_id,
        hospital_id: doctor?.hospital_id || "",
        region_id: doctor?.region_id || "",
      });

      if (!result.success) {
        console.error("Failed to load availability dates via handler");
        return;
      }
      response = result.data;

      // Convert available dates to slots_details format
      const callbackSlotsDetails = response.available_dates.map(
        (date: string) => ({
          date,
          slots: [], // Will be loaded when date is selected
        })
      );

      // Merge existing availability data with callback data
      const existingSlots = availability?.slots_details || [];
      const mergedSlotsDetails = [...existingSlots];

      // Add callback dates that don't already exist
      callbackSlotsDetails.forEach(
        (callbackSlot: { date: string; slots: string[] }) => {
          const exists = existingSlots.some(
            (existingSlot) => existingSlot.date === callbackSlot.date
          );
          if (!exists) {
            mergedSlotsDetails.push(callbackSlot);
          }
        }
      );

      // Sort by date to maintain chronological order
      mergedSlotsDetails.sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      console.log("merged slots", mergedSlotsDetails);

      setCallbackAvailability({
        slots_details: mergedSlotsDetails,
      });
    } catch (err) {
      console.error("Error loading availability dates:", err);
    } finally {
      setLoadingDates(false);
    }
  };

  // Function to load slots for a specific date
  const loadSlotsForDate = async (date: string) => {
    if (
      !doctor.doctor_id ||
      !doctor.hospital_id ||
      !doctor.region_id ||
      !sessionId
    ) {
      console.warn("Missing required parameters for loading slots");
      return;
    }

    setLoadingSlots(true);

    try {
      // Use the handler from chat-widget if available, otherwise fall back to direct API call
      let response;

      const result = await getAvailableSlotsForAppointment(date, {
        doctor_id: doctor.doctor_id,
        hospital_id: doctor?.hospital_id || "",
        region_id: doctor?.region_id || "",
      });

      if (!result.success) {
        console.error("Failed to load slots via handler");
        return;
      }
      response = result.data;

      // Update the slots for the specific date
      setCallbackAvailability((prev) => {
        //if no previous availability ,initialize with fetched date
        if (!prev || !prev.slots_details?.length)
          return {
            slots_details: [{ date, slots: response.slots }],
          };

        const updatedSlotsDetails = prev.slots_details.map((slot) =>
          slot.date === date ? { ...slot, slots: response.slots } : slot
        );
        //if date not present in list, append it
        const exists = prev.slots_details.some((s) => s.date === date);
        const finalSlotDetails = exists
          ? updatedSlotsDetails
          : [...updatedSlotsDetails, { date, slots: response.slots }];
        finalSlotDetails.sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );

        return {
          ...prev,
          slots_details: finalSlotDetails,
        };
      });
    } catch (err) {
      console.error("Error loading slots for date:", err);
    } finally {
      setLoadingSlots(false);
    }
  };

  return (
    <Card
      className="max-w-md rounded-xl border-slate-200 shadow-sm p-0"
      aria-label="Appointment card">
      <CardHeader className="flex flex-row items-center justify-between gap-3 bg-blue-50 p-4">
        <div className="flex items-center gap-3">
          {doctor.profile_pic && (
            <Avatar className="h-12 w-12">
              <AvatarImage
                src={doctor.profile_pic}
                alt={`${doctor.name} profile photo`}
                crossOrigin="anonymous"
              />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
          )}
          <div className="min-w-0">
            <div className="flex flex-wrap items-baseline gap-2">
              <h3 className="truncate text-base font-bold text-slate-900">
                {doctor.name}
              </h3>
              {doctor.profile_link ? (
                <a
                  href={doctor.profile_link}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-semibold text-blue-600 hover:underline">
                  View profile
                </a>
              ) : null}
            </div>
            <p className="mt-0.5 text-sm text-slate-500">
              {doctor.specialty}
              {doctor.experience && <> • {doctor.experience}</>}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-4 pb-2">
        {/* Info rows */}
        <div className="grid gap-2 border-b border-slate-200 pb-3">
          {doctor?.timings && (
            <div className="flex items-start gap-2 text-sm text-slate-900">
              <Clock
                className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0"
                aria-hidden
              />

              <span className="text-slate-500 text-xs">{doctor?.timings}</span>

              {/* {doctor?.timings?.time && (
                  <div className="flex flex-wrap gap-1">
                    {doctor?.timings?.time.split(",").map((timeSlot, index) => (
                      <span
                        key={index}
                        className="inline-block bg-blue-50 text-blue-700 px-2 py-1 rounded-md text-xs font-medium">
                        {timeSlot.trim()}
                      </span>
                    ))}
                  </div>
                )} */}
            </div>
          )}

          {doctor.languages ? (
            <div className="flex items-center gap-2 text-sm text-slate-900">
              <Languages className="h-4 w-4 text-blue-600" aria-hidden />
              <span className="text-slate-500">{doctor.languages}</span>
            </div>
          ) : null}

          <div className="flex items-center gap-2 text-sm text-slate-900">
            <Building2 className="h-4 w-4 text-blue-600" aria-hidden />
            <span className="font-semibold">{doctor.hospital}</span>
          </div>
        </div>

        {/* Conditional buttons */}
        {currentAvailability?.slots_details?.length ||
        callbacks?.tool_callback_availability_dates ||
        loadingDates ? (
          <Button
            type="button"
            variant="outline"
            aria-expanded={open}
            aria-controls="ap-slots"
            onClick={() => setOpen((o) => !o)}
            disabled={loadingDates}
            className="mt-3 w-full border-blue-600 text-blue-600 hover:bg-blue-50 disabled:opacity-50">
            {loadingDates ? (
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
                  className={`h-4 w-4 transition-transform ${
                    open ? "rotate-180" : ""
                  }`}
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
        {open && currentAvailability?.slots_details?.length && (
          <div
            id="ap-slots"
            role="region"
            aria-label="Available slots"
            className="pt-3">
            {currentAvailability.slots_details.length > 0 ? (
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
                      const isSelected = activeDay?.date === day.date;
                      const isDisabled = !day.hasAvailability;
                      return (
                        <Button
                          key={`${day.date}-${i}`}
                          type="button"
                          variant="outline"
                          onClick={() => !isDisabled && selectDate(day.date)}
                          disabled={isDisabled}
                          aria-current={isSelected ? "date" : undefined}
                          className={[
                            "flex flex-col items-center justify-center h-12 rounded-lg border p-2 gap-0.5 min-w-0",
                            isSelected
                              ? "border-blue-600 ring-2 ring-blue-100 bg-blue-50"
                              : isDisabled
                              ? "border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed"
                              : "border-slate-200 bg-white hover:bg-slate-50",
                          ].join(" ")}>
                          <span
                            className={[
                              "text-[10px] tracking-wide truncate w-full text-center",
                              isSelected
                                ? "text-blue-600"
                                : isDisabled
                                ? "text-slate-300"
                                : "text-slate-500",
                            ].join(" ")}>
                            {day.weekday}
                          </span>
                          <span
                            className={[
                              "text-xs font-bold truncate w-full text-center",
                              isSelected
                                ? "text-blue-600"
                                : isDisabled
                                ? "text-slate-300"
                                : "text-slate-900",
                            ].join(" ")}>
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
                  {loadingSlots ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-4 w-4 animate-spin text-blue-600 mr-2" />
                      <span className="text-sm text-slate-500">
                        Loading slots...
                      </span>
                    </div>
                  ) : activeDay?.slots?.length ? (
                    <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                      {activeDay.slots.map((t, index) => {
                        const selected = selectedSlot === t;
                        return (
                          <Button
                            key={t || `slot-${index}`}
                            type="button"
                            variant="outline"
                            onClick={() => setSelectedSlot(t)}
                            aria-pressed={selected}
                            className={[
                              "inline-flex h-9 items-center justify-center gap-2 rounded-lg px-3 text-xs font-semibold",
                              selected
                                ? "border-blue-600 bg-blue-600 text-white"
                                : "border-slate-200 bg-white text-slate-900 hover:bg-slate-50",
                            ].join(" ")}>
                             <Calendar
                              className={`h-3.5 w-3.5 flex-shrink-0${
                                selected ? "text-white" : "text-blue-600"
                              }`}
                            /> 
                            <span className="truncate">{t}</span>
                          </Button>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="px-1 text-sm text-slate-500">
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
                    className="w-full h-10 gap-2 bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60">
                    Book appointment
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </>
            ) : (
              <div className="px-1 pb-2 pt-1">
                <p className="text-sm text-slate-500">
                  No availability provided.
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default AppointmentCard;
