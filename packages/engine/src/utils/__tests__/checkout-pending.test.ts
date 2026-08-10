import { describe, expect, it } from "vitest";
import type { Appointment, Professional } from "../../types";
import {
  buildCheckoutPendingAppointments,
  getCheckoutPendingScopeLabel,
} from "../checkout-pending";

const professionals: Professional[] = [
  { id: "prof-a", nome: "Ana" },
  { id: "prof-b", nome: "Noah" },
];

const TIME_ZONE = "America/Sao_Paulo";

const makeAppointment = (overrides: Partial<Appointment>): Appointment => ({
  id: "ag-base",
  data_hora: "2026-06-28T10:00:00-03:00",
  duracao_minutos: 60,
  cliente_nome: "Client",
  status: "confirmado",
  preco: 50,
  profissional_id: "prof-a",
  servicos: { nome: "Consultation" },
  ...overrides,
});

describe("checkout pending helpers", () => {
  it("builds only overdue visible appointments in the requested range", () => {
    const items = buildCheckoutPendingAppointments({
      appointments: [
        makeAppointment({ id: "ag-pending" }),
        makeAppointment({ id: "ag-concluded", status: "concluido" }),
        makeAppointment({ id: "ag-canceled", status: "cancelado" }),
        makeAppointment({ id: "ag-other-prof", profissional_id: "prof-b" }),
        makeAppointment({ id: "ag-future", data_hora: "2026-06-30T10:00:00-03:00" }),
      ],
      agendaProfessionals: professionals,
      professionals,
      visibleProfIds: ["prof-a"],
      rangeStart: "2026-06-28",
      rangeEnd: "2026-06-30",
      nowDayKey: "2026-06-29",
      nowMinute: 12 * 60,
      timeZone: TIME_ZONE,
    });

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      id: "ag-pending",
      dayKey: "2026-06-28",
      start: 10 * 60,
      end: 11 * 60,
      clientName: "Client",
      serviceName: "Consultation",
      professionalName: "Ana",
      timeLabel: "10:00 - 11:00",
    });
  });

  it("keeps the same scope labels used by the checkout notice", () => {
    expect(getCheckoutPendingScopeLabel("day")).toBe("today");
    expect(getCheckoutPendingScopeLabel("week")).toBe("this week");
    expect(getCheckoutPendingScopeLabel("unknown")).toBe("this period");
  });
});
