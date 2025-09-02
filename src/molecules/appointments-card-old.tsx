"use client"

import { useMemo, useState } from "react"
import {
  ArrowRight,
  Building2,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Languages,
  Phone,
} from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export type Availability = {
  date: string // ISO date, e.g. "2025-09-16"
  slots: string[]
}

export type Doctor = {
  name: string
  specialty: string
  experienceYears?: number
  profileUrl?: string
  photoUrl?: string
  languages?: string[]
  hospital: string
  timings: string // "09:00 am - 01:00 pm"
  days?: string // "Mon - Sat"
}

type Props = {
  doctor: Doctor
  availability: Availability[]
  onCall?: () => void
  onBook?: (info: { date: string; time: string }) => void
}

export function AppointmentCard({ doctor, availability, onCall, onBook }: Props) {
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)

  const activeDay = availability[activeIndex]

  const dayLabels = useMemo(() => {
    return availability.map((a) => {
      const d = new Date(a.date)
      const weekday = d.toLocaleDateString(undefined, { weekday: "short" }).toUpperCase()
      const dayNum = d.toLocaleDateString(undefined, { day: "2-digit" })
      return { weekday, dayNum }
    })
  }, [availability])

  const initials =
    doctor.name
      ?.split(" ")
      .map((s) => s[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "DR"

  function prevDay() {
    setActiveIndex((i) => Math.max(0, i - 1))
    setSelectedSlot(null)
  }

  function nextDay() {
    setActiveIndex((i) => Math.min(availability.length - 1, i + 1))
    setSelectedSlot(null)
  }

  function handleBook() {
    if (onBook && activeDay && selectedSlot) {
      onBook({ date: activeDay.date, time: selectedSlot })
    }
  }

  return (
    <Card className="max-w-md rounded-xl border-slate-200 shadow-sm" aria-label="Appointment card">
      <CardHeader className="flex flex-row items-center justify-between gap-3 rounded-xl bg-blue-50 px-4 py-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12">
            <AvatarImage
              src={
                doctor.photoUrl ||
                "https://images.unsplash.com/photo-1550831107-1553da8c8464?q=80&w=256&auto=format&fit=crop" ||
                "/placeholder.svg" ||
                "/placeholder.svg"
              }
              alt={`${doctor.name} profile photo`}
              crossOrigin="anonymous"
            />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="flex flex-wrap items-baseline gap-2">
              <h3 className="truncate text-base font-bold text-slate-900">{doctor.name}</h3>
              {doctor.profileUrl ? (
                <a
                  href={doctor.profileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-semibold text-blue-600 hover:underline"
                >
                  View profile
                </a>
              ) : null}
            </div>
            <p className="mt-0.5 text-sm text-slate-500">
              {doctor.specialty}
              {doctor.experienceYears != null && <> • {doctor.experienceYears}+ years experience</>}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4">
        {/* Info rows */}
        <div className="grid gap-2 border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2 text-sm text-slate-900">
            <Clock className="h-4 w-4 text-blue-600" aria-hidden />
            <span>
              {doctor.timings}
              {doctor.days && <span className="text-slate-500"> • {doctor.days}</span>}
            </span>
          </div>

          {doctor.languages?.length ? (
            <div className="flex items-center gap-2 text-sm text-slate-900">
              <Languages className="h-4 w-4 text-blue-600" aria-hidden />
              <span className="text-slate-500">{doctor.languages.join(", ")}</span>
            </div>
          ) : null}

          <div className="flex items-center gap-2 text-sm text-slate-900">
            <Building2 className="h-4 w-4 text-blue-600" aria-hidden />
            <span className="font-semibold">{doctor.hospital}</span>
          </div>
        </div>

        {/* Toggle */}
        <Button
          type="button"
          variant="outline"
          aria-expanded={open}
          aria-controls="ap-slots"
          onClick={() => setOpen((o) => !o)}
          className="mt-3 w-full border-blue-600 text-blue-600 hover:bg-blue-50"
        >
          <span className="mr-1">{open ? "Hide slots" : "Show available slots"}</span>
          <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
        </Button>

        {/* Collapsible content */}
        {open && (
          <div id="ap-slots" role="region" aria-label="Available slots" className="pt-3">
            {availability.length > 0 ? (
              <>
                {/* Date bar */}
                <div className="grid grid-cols-[32px_1fr_32px] items-center gap-2 px-0.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={prevDay}
                    aria-label="Previous day"
                    disabled={activeIndex === 0}
                    className="h-7 w-7 text-xs rounded-md border-slate-200 bg-transparent text-slate-900 disabled:opacity-50"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>

                  <div className="grid auto-cols-max grid-flow-col gap-1 overflow-x-auto">
                    {dayLabels.map((d, i) => {
                      const active = i === activeIndex
                      return (
                        <Button
                          key={`${d.weekday}-${d.dayNum}-${i}`}
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setActiveIndex(i)
                            setSelectedSlot(null)
                          }}
                          aria-current={active ? "date" : undefined}
                          className={[
                            "grid h-12 min-w-16 place-items-center rounded-lg border p-3 gap-0.5",
                            active
                              ? "border-blue-600 ring-2 ring-blue-100"
                              : "border-slate-200 bg-white hover:bg-slate-50",
                          ].join(" ")}
                        >
                          <span className="text-[10px] tracking-wide text-slate-500">{d.weekday}</span>
                          <span className="text-xs font-bold text-slate-900">{d.dayNum}</span>
                        </Button>
                      )
                    })}
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={nextDay}
                    aria-label="Next day"
                    disabled={activeIndex === availability.length - 1}
                    className="text-xs h-7 w-7 rounded-md border-slate-200 bg-transparent text-slate-900 disabled:opacity-50"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>

                {/* Slots */}
                <div className="grid grid-cols-3 gap-2 px-0.5 py-3 max-[420px]:grid-cols-2">
                  {activeDay?.slots?.length ? (
                    activeDay.slots.map((t) => {
                      const selected = selectedSlot === t
                      return (
                        <Button
                          key={t}
                          type="button"
                          variant="outline"
                          onClick={() => setSelectedSlot(t)}
                          aria-pressed={selected}
                          className={[
                            "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-semibold",
                            selected
                              ? "border-blue-600 bg-blue-600 text-white"
                              : "border-slate-200 bg-white text-slate-900 hover:bg-slate-50",
                          ].join(" ")}
                        >
                          <Calendar className={`h-4 w-4 text-xs${selected ? "text-white" : "text-blue-600"}`} />
                          {t}
                        </Button>
                      )
                    })
                  ) : (
                    <p className="col-span-full px-1 text-sm text-slate-500">No slots for this day.</p>
                  )}
                </div>

                {/* Actions */}
                <div className="grid grid-cols-[1fr_1.2fr] gap-2 px-0.5 pb-1.5">
                  <Button type="button" variant="secondary" onClick={onCall} className="h-10 gap-2">
                    <Phone className="h-4 w-4" />
                    Call
                  </Button>
                  <Button
                    type="button"
                    onClick={handleBook}
                    disabled={!selectedSlot}
                    aria-disabled={!selectedSlot}
                    className="h-10 gap-2 bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                  >
                    Book appointment
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </>
            ) : (
              <p className="px-1 pb-2 pt-1 text-sm text-slate-500">No availability provided.</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default AppointmentCard
