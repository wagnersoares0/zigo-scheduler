import {
  DEFAULT_APPOINTMENT_COLOR,
  normalizeAppointmentColor,
  type AppointmentColor,
} from "@zigoschedule/scheduler-core";

export const resolveLayoutColor = (
  ...values: Array<string | null | undefined>
): AppointmentColor => {
  for (const value of values) {
    const color = normalizeAppointmentColor(value);
    if (color) return color;
  }
  return DEFAULT_APPOINTMENT_COLOR;
};
