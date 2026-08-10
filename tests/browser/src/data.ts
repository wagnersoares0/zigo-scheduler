import { zonedTimeToUtc } from "@zigoschedule/scheduler-core";
import type {
  Appointment,
  Block,
  BreakWindow,
  BusinessHours,
  Professional,
} from "@zigoschedule/scheduler-engine";

export const DAY_KEY = "2030-08-12";
export const TIME_ZONE = "America/New_York";

export const professionals: Professional[] = [
  { id: "maya", name: "Dr. Maya Lee" },
  { id: "noah", name: "Noah Carter" },
];

export const businessHours: BusinessHours = {
  sunday: { active: false },
  monday: { active: true, opensAt: "09:00", closesAt: "17:00" },
  tuesday: { active: true, opensAt: "09:00", closesAt: "17:00" },
  wednesday: { active: true, opensAt: "09:00", closesAt: "17:00" },
  thursday: { active: true, opensAt: "09:00", closesAt: "17:00" },
  friday: { active: true, opensAt: "09:00", closesAt: "17:00" },
  saturday: { active: false },
};

export const lunchBreak: BreakWindow = {
  startsAt: "12:00",
  endsAt: "12:30",
};

export const blocks: Block[] = [
  {
    id: "staff-meeting",
    date: DAY_KEY,
    startTime: "15:00",
    endTime: "15:30",
    professionalId: "noah",
    reason: "Staff meeting",
  },
];

export const colors = {
  blue: "#2563eb",
  rose: "#db2777",
  green: "#059669",
  amber: "#d97706",
};

export function instant(hour: number, minute = 0): string {
  return zonedTimeToUtc(DAY_KEY, hour * 60 + minute, TIME_ZONE).toISOString();
}

export function appointment(
  id: string,
  hour: number,
  minute: number,
  professionalId: string,
  clientName: string,
  serviceName: string,
  color: string,
  durationMinutes = 60,
): Appointment {
  return {
    id,
    startsAt: instant(hour, minute),
    durationMinutes,
    clientName,
    clientPhone: "+1 (646) 555-0187",
    professionalId,
    status: "confirmed",
    paymentStatus: "pending",
    price: 240,
    notes: "Browser integration fixture",
    serviceId: `${id}-service`,
    services: { name: serviceName, durationMinutes, price: 240 },
    appointmentColor: color,
    appointmentColorIsCustom: true,
  };
}

export function reactAppointments(): Appointment[] {
  return [
    appointment("react-move", 9, 0, "maya", "Olivia Carter", "Physical therapy follow-up", colors.blue),
    appointment("react-conflict", 11, 0, "maya", "Ava Thompson", "Business consulting", colors.rose),
    appointment("react-resize", 13, 0, "noah", "Lucas Bennett", "Dental screening", colors.green, 45),
  ];
}

export function elementAppointments(prefix = "element"): Appointment[] {
  return [
    appointment(`${prefix}-move`, 9, 0, "maya", "Mia Johnson", "Strategy session", colors.blue),
    appointment(`${prefix}-conflict`, 11, 0, "maya", "Ethan Brown", "Follow-up visit", colors.rose),
    appointment(`${prefix}-resize`, 13, 0, "noah", "Grace Wilson", "Planning block", colors.amber, 45),
  ];
}
