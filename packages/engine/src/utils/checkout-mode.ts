export type AppointmentCheckoutMode = "regular" | "antecipado";

const DAY_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

const isValidDayKey = (value: string): boolean => {
  if (!DAY_KEY_RE.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
};

export const getAppointmentCheckoutMode = (
  appointmentDayKey: string,
  currentDayKey: string,
): AppointmentCheckoutMode => {
  if (!isValidDayKey(appointmentDayKey) || !isValidDayKey(currentDayKey)) {
    return "regular";
  }

  return appointmentDayKey > currentDayKey ? "antecipado" : "regular";
};
