"use client";

import { useMemo, useState } from "react";
import {
  ArrowRight,
  Building2,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Languages,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TAvailability, TDoctor } from "@/types/widget";

type Props = {
  doctor: TDoctor;
  availability?: TAvailability;
  onSelect?: () => void;
  onBook?: (info: { date: string; time: string }) => void;
  disabled?: boolean;
};

export function AppointmentCard({
  doctor,
  availability,
  onSelect,
  onBook,
  disabled =false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  const activeDay = availability?.slots_details[activeIndex];
  const dayLabels = useMemo(() => {
    return availability?.slots_details.map((a) => {
      const d = a?.day || new Date(a.date);
      const weekday = (
        d instanceof Date
          ? d.toLocaleDateString(undefined, { weekday: "short" })
          : d.substring(0, 3)
      ).toUpperCase();
      const dayNum =
        d instanceof Date
          ? d.toLocaleDateString(undefined, { day: "2-digit" })
          : a.date.substring(8, 10);
      return { weekday, dayNum };
    });
  }, [availability]);

  const initials =
    doctor.name
      ?.split(" ")
      .map((s) => s[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "DR";

  function prevDay() {
    setActiveIndex((i) => Math.max(0, i - 1));
    setSelectedSlot(null);
  }

  function nextDay() {
    setActiveIndex((i) =>
      Math.min((availability?.slots_details.length || 1) - 1, i + 1)
    );
    setSelectedSlot(null);
  }

  function handleBook() {
    if (onBook && activeDay && selectedSlot) {
      onBook({ date: activeDay.date, time: selectedSlot });
    }
  }

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
          {doctor.timings && (
            <div className="flex items-start gap-2 text-sm text-slate-900">
              <Clock
                className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0"
                aria-hidden
              />
              <div className="flex flex-col gap-1">
                {doctor.timings.day && (
                  <span className="text-slate-500 text-xs">
                    {doctor.timings.day}
                  </span>
                )}
                {doctor.timings.time && (
                  <div className="flex flex-wrap gap-1">
                    {doctor.timings.time.split(",").map((timeSlot, index) => (
                      <span
                        key={index}
                        className="inline-block bg-blue-50 text-blue-700 px-2 py-1 rounded-md text-xs font-medium">
                        {timeSlot.trim()}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {doctor.languages?.length ? (
            <div className="flex items-center gap-2 text-sm text-slate-900">
              <Languages className="h-4 w-4 text-blue-600" aria-hidden />
              <span className="text-slate-500">
                {doctor.languages.join(", ")}
              </span>
            </div>
          ) : null}

          <div className="flex items-center gap-2 text-sm text-slate-900">
            <Building2 className="h-4 w-4 text-blue-600" aria-hidden />
            <span className="font-semibold">{doctor.hospital}</span>
          </div>
        </div>

        {/* Conditional buttons */}
        {availability ? (
          <Button
            type="button"
            variant="outline"
            aria-expanded={open}
            aria-controls="ap-slots"
            onClick={() => setOpen((o) => !o)}
            className="mt-3 w-full border-blue-600 text-blue-600 hover:bg-blue-50">
            <span className="mr-1">
              {open ? "Hide slots" : "Show available slots"}
            </span>
            <ChevronDown
              className={`h-4 w-4 transition-transform ${
                open ? "rotate-180" : ""
              }`}
              aria-hidden
            />
          </Button>
        ) : (
          <Button
            type="button"
            onClick={onSelect}
            className="mt-3 w-full bg-blue-600 text-white hover:bg-blue-700">
            Select this doctor
          </Button>
        )}

        {/* Collapsible content */}
        {open && availability && (
          <div
            id="ap-slots"
            role="region"
            aria-label="Available slots"
            className="pt-3">
            {availability.slots_details.length > 0 ? (
              <>
                {/* Date bar */}
                <div className="grid grid-cols-[32px_1fr_32px] items-center gap-2 px-0.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={prevDay}
                    aria-label="Previous day"
                    disabled={activeIndex === 0 || disabled}
                    className="h-7 w-7 text-xs rounded-md border-slate-200 bg-transparent text-slate-900 disabled:opacity-50">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>

                  <div className="grid auto-cols-max grid-flow-col gap-1 overflow-x-auto">
                    {dayLabels?.map((d, i) => {
                      const active = i === activeIndex;
                      return (
                        <Button
                          key={`${d.weekday}-${d.dayNum}-${i}`}
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setActiveIndex(i);
                            setSelectedSlot(null);
                          }}
                          aria-current={active ? "date" : undefined}
                          className={[
                            "grid h-12 min-w-16 place-items-center rounded-lg border p-3 gap-0.5",
                            active
                              ? "border-blue-600 ring-2 ring-blue-100"
                              : "border-slate-200 bg-white hover:bg-slate-50",
                          ].join(" ")}>
                          <span className="text-[10px] tracking-wide text-slate-500">
                            {d.weekday}
                          </span>
                          <span className="text-xs font-bold text-slate-900">
                            {d.dayNum}
                          </span>
                        </Button>
                      );
                    })}
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={nextDay}
                    aria-label="Next day"
                    disabled={
                      activeIndex === availability.slots_details.length - 1
                    }
                    className="text-xs h-7 w-7 rounded-md border-slate-200 bg-transparent text-slate-900 disabled:opacity-50">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>

                {/* Slots */}
                <div className="grid grid-cols-3 gap-2 px-0.5 py-3 max-[420px]:grid-cols-2">
                  {activeDay?.slots?.length ? (
                    (() => {
                      const slots = activeDay.slots;
                      const minSlots = 3;
                      const displaySlots =
                        slots.length >= minSlots
                          ? slots
                          : [
                              ...slots,
                              ...Array(minSlots - slots.length).fill(null),
                            ];

                      return displaySlots.map((t, index) => {
                        const isDisabled = t === null;
                        const selected = selectedSlot === t;
                        return (
                          <Button
                            key={t || `disabled-${index}`}
                            type="button"
                            variant="outline"
                            onClick={() => !isDisabled && setSelectedSlot(t)}
                            disabled={isDisabled }
                            aria-pressed={selected}
                            className={[
                              "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-semibold",
                              isDisabled
                                ? "border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed"
                                : selected
                                ? "border-blue-600 bg-blue-600 text-white"
                                : "border-slate-200 bg-white text-slate-900 hover:bg-slate-50",
                            ].join(" ")}>
                            <Calendar
                              className={`h-4 w-4 text-xs${
                                isDisabled
                                  ? "text-slate-300"
                                  : selected
                                  ? "text-white"
                                  : "text-blue-600"
                              }`}
                            />
                            {t || "—"}
                          </Button>
                        );
                      });
                    })()
                  ) : (
                    <p className="col-span-full px-1 text-sm text-slate-500">
                      No slots for this day.
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
              <p className="px-1 pb-2 pt-1 text-sm text-slate-500">
                No availability provided.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default AppointmentCard;
