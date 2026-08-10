export const plural = (count: number, one: string, many: string): string =>
  count === 1 ? one : many;

export const buildOpenAppointmentDetails = (
  words: {
    openAppointment: string;
    from: string;
    to: string;
    professional: string;
    canceled: string;
  },
  input: {
    clientName: string;
    start: string;
    end: string;
    service: string;
    professionalName?: string;
    canceled?: boolean;
  },
) =>
  [
    `${words.openAppointment} ${input.clientName}`,
    `${words.from} ${input.start} ${words.to} ${input.end}`,
    input.service,
    input.professionalName ? `${words.professional} ${input.professionalName}` : "",
    input.canceled ? words.canceled : "",
  ]
    .filter(Boolean)
    .join(", ");
