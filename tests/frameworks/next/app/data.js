import { zonedTimeToUtc } from "@zigoschedule/scheduler-core";

export const DAY_KEY = "2030-08-12";
export const TIME_ZONE = "America/New_York";

const instant = (hour, minute = 0) =>
  zonedTimeToUtc(DAY_KEY, hour * 60 + minute, TIME_ZONE).toISOString();

export const professionals = [
  { id: "maya", name: "Dr. Maya Lee" },
  { id: "noah", name: "Noah Carter" },
];

export const businessHours = {
  monday: { active: true, opensAt: "09:00", closesAt: "17:00" },
  tuesday: { active: true, opensAt: "09:00", closesAt: "17:00" },
  wednesday: { active: true, opensAt: "09:00", closesAt: "17:00" },
  thursday: { active: true, opensAt: "09:00", closesAt: "17:00" },
  friday: { active: true, opensAt: "09:00", closesAt: "17:00" },
};

export const initialAppointments = [
  {
    id: "appt_1",
    startsAt: instant(9),
    durationMinutes: 60,
    clientName: "Olivia Carter",
    professionalId: "maya",
    status: "confirmed",
    price: 120,
    services: [{ name: "Physical therapy follow-up", durationMinutes: 60, price: 120 }],
    appointmentColor: "#2563eb",
    appointmentColorIsCustom: true,
  },
  {
    id: "appt_2",
    startsAt: instant(11),
    durationMinutes: 45,
    clientName: "Lucas Bennett",
    professionalId: "noah",
    status: "pending",
    services: [{ name: "Dental screening", durationMinutes: 45, price: 90 }],
    appointmentColor: "#0f766e",
    appointmentColorIsCustom: true,
  },
];
