import { Availability, Doctor } from "@/molecules/appointments-card";

export type AppointmentItem = {
    doctor: Doctor;
    availability: Availability[];
  };
  
  const doctor: Doctor = {
    name: "Dr Rashmi Patil",
    specialty: "General Physician",
    experienceYears: 15,
    profileUrl: "#",
    photoUrl:
      "https://images.unsplash.com/photo-1550831107-1553da8c8464?q=80&w=256&auto=format&fit=crop",
    languages: ["Kannada", "Hindi", "English", "Marathi"],
    hospital: "Apollo Hospitals, Vijay Nagar",
    timings: "09:00 am - 01:00 pm",
    days: "Mon - Sat",
  };
  
  export const availability: Availability[] = [
    {
      date: "2025-09-15",
      slots: [
        "09:00 am",
        "09:30 am",
        "10:30 am",
        "11:00 am",
        "11:30 am",
        "12:00 pm",
      ],
    },
    {
      date: "2025-09-16",
      slots: ["09:00 am", "09:30 am", "10:30 am", "11:00 am", "11:30 am"],
    },
    {
      date: "2025-09-17",
      slots: ["09:00 am", "10:00 am", "10:30 am", "11:30 am"],
    },
  ];
  
 export const items: AppointmentItem[] = [
    { doctor, availability },
    {
      doctor: {
        ...doctor,
        name: "Dr Anil Kumar",
        specialty: "Cardiologist",
        experienceYears: 12,
      },
      availability: [
        {
          date: "2025-09-15",
          slots: ["09:30 am", "10:00 am", "11:00 am", "12:30 pm"],
        },
        { date: "2025-09-16", slots: ["09:00 am", "10:30 am", "11:30 am"] },
        {
          date: "2025-09-17",
          slots: ["09:00 am", "09:30 am", "10:30 am", "12:00 pm"],
        },
      ],
    },
  ];