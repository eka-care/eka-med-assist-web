// export type AppointmentItem = {
//     doctor: Doctor;
//     availability: Availability[];
//   };

import { TDoctorDetails } from "@/types/widget";

//   const doctor: Doctor = {

//     name: "Dr Rashmi Patil",
//     specialty: "General Physician",
//     experienceYears: 15,
//     profileUrl: "#",
//     photoUrl:
//       "https://images.unsplash.com/photo-1550831107-1553da8c8464?q=80&w=256&auto=format&fit=crop",
//     languages: ["Kannada", "Hindi", "English", "Marathi"],
//     hospital: "Apollo Hospitals, Vijay Nagar",
//     timings: "09:00 am - 01:00 pm",
//     days: "Mon - Sat",
//   };

//   export const availability: Availability[] = [
//     {
//       date: "2025-09-15",
//       slots: [
//         "09:00 am",
//         "09:30 am",
//         "10:30 am",
//         "11:00 am",
//         "11:30 am",
//         "12:00 pm",
//       ],
//     },
//     {
//       date: "2025-09-16",
//       slots: ["09:00 am", "09:30 am", "10:30 am", "11:00 am", "11:30 am"],
//     },
//     {
//       date: "2025-09-17",
//       slots: ["09:00 am", "10:00 am", "10:30 am", "11:30 am"],
//     },
//   ];

//  export const items: AppointmentItem[] = [
//     { doctor, availability },
//     {
//       doctor: {
//         ...doctor,
//         name: "Dr Anil Kumar",
//         specialty: "Cardiologist",
//         experienceYears: 12,
//       },
//       availability: [
//         {
//           date: "2025-09-15",
//           slots: ["09:30 am", "10:00 am", "11:00 am", "12:30 pm"],
//         },
//         { date: "2025-09-16", slots: ["09:00 am", "10:30 am", "11:30 am"] },
//         {
//           date: "2025-09-17",
//           slots: ["09:00 am", "09:30 am", "10:30 am", "12:00 pm"],
//         },
//       ],
//     },
//   ];

export const items: TDoctorDetails = {
  // doctor: {
  //   name: "Dr Rashmi Patil",
  //   specialty: "General Physician",
  //   hospital: "Apollo Hospitals, Vijay Nagar",
  //   timings: {
  //     // optional
  //     day: "All days of the week",
  //     time: "11:00 AM - 01:00 PM, 06:00 PM - 08:00PM",
  //   },

  //   experience: "15 years", // optional
  //   profile_link: "", // optional
  //   profile_pic: "", //optional
  //   languages: ["Kannada", "Hindi", "English", "Marathi"], //optional
  // },
  // availability: {
  //   // optional
  //   selected_date: "2025-09-02", // optional
  //   slots_details: [
  //     {
  //       date: "2025-09-15",
  //       day: "Monday",
  //       slots: ["09:30 am", "10:00 am", "11:00 am", "12:30 pm"],
  //       selected_slot: "09:30 am", // optional
  //     },
  //     {
  //       date: "2025-09-16",
  //       day: "Tuesday",
  //       slots: ["09:00 am", "10:30 am", "11:30 am"],
  //     },
  //     {
  //       date: "2025-09-17",
  //       slots: ["09:00 am", "09:30 am", "10:30 am", "12:00 pm"],
  //     },
  //   ],
  // },
  doctor: {
    name: "Dr. Rajagopal V",
    specialty: "Urology",
    hospital: "Apollo Health City, Jubilee Hills",
  },
  availability: {
    selected_date: "2025-09-04",
    slots_details: [
      {
        date: "2025-09-04",
        day: "Thursday",
        selected_slot: "14:00",
        slots: [
          "11:15",
          "11:30",
          "11:45",
          "12:15",
          "12:45",
          "13:00",
          "13:15",
          "13:30",
          "13:45",
          "14:00",
          "14:15",
          "14:30",
        ],
      },
    ],
  },
};
