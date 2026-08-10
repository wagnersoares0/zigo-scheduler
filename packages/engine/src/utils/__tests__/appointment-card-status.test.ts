import { describe, expect, it } from "vitest";
import type { Appointment } from "../../types";
import { getAgendaAppointmentCardStatus } from "../appointment-card-status";

const makeAppointment = (
  status: Appointment["status"],
  pagamento_status: Appointment["pagamento_status"] = null,
): Pick<Appointment, "status" | "pagamento_status"> => ({ status, pagamento_status });
const makePublicAppointment = (
  status: Appointment["status"],
  paymentStatus: Appointment["paymentStatus"] = null,
): Pick<Appointment, "status" | "paymentStatus" | "pagamento_status"> => ({ status, paymentStatus });
const now = { dayKey: "2026-07-28", minute: 11 * 60 };

describe("appointment card status", () => {
  it("does not mark a confirmed appointment as paid before checkout", () => {
    expect(getAgendaAppointmentCardStatus({
      appointment: makeAppointment("confirmado"),
      dayKey: "2026-07-28",
      endMinute: 12 * 60,
      now,
    })).toBeNull();
  });

  it("marks checkout with a check only when payment is registered", () => {
    expect(getAgendaAppointmentCardStatus({
      appointment: makeAppointment("concluido", "pago"),
      dayKey: "2026-07-28",
      endMinute: 10 * 60 + 30,
      now,
    })).toBe("paid");
  });

  it("marks a finished appointment without checkout as overdue", () => {
    expect(getAgendaAppointmentCardStatus({
      appointment: makeAppointment("confirmado"),
      dayKey: "2026-07-28",
      endMinute: 10 * 60 + 30,
      now,
    })).toBe("overdue");
  });

  it("keeps a legacy confirmed payment as paid", () => {
    expect(getAgendaAppointmentCardStatus({
      appointment: makeAppointment("confirmado", "confirmado"),
      dayKey: "2026-07-28",
      endMinute: 10 * 60,
      now,
    })).toBe("paid");
  });

  it("does not add a status icon to canceled appointments", () => {
    expect(getAgendaAppointmentCardStatus({
      appointment: makeAppointment("cancelado"),
      dayKey: "2026-07-27",
      endMinute: 10 * 60,
      now,
    })).toBeNull();
  });

  it("accepts public English status and payment values", () => {
    expect(getAgendaAppointmentCardStatus({
      appointment: makePublicAppointment("completed", "confirmed"),
      dayKey: "2026-07-28",
      endMinute: 10 * 60,
      now,
    })).toBe("paid");
    expect(getAgendaAppointmentCardStatus({
      appointment: makePublicAppointment("canceled"),
      dayKey: "2026-07-28",
      endMinute: 10 * 60,
      now,
    })).toBeNull();
  });
});
