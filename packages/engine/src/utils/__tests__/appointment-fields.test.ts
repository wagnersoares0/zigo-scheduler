import { describe, expect, it } from "vitest";
import type { Appointment } from "../../types";
import {
  getAppointmentBufferAfterMinutes,
  getAppointmentBufferBeforeMinutes,
  getAppointmentServicesCount,
  normalizeAppointment,
} from "../appointment-fields";
import { getAppointmentServiceLabel } from "../format";

describe("appointment field normalization", () => {
  it("keeps public appointment fields ahead of legacy aliases", () => {
    const normalized = normalizeAppointment({
      id: "appointment-1",
      startsAt: "2026-08-12T14:00:00.000Z",
      data_hora: "2026-08-12T15:00:00.000Z",
      durationMinutes: 45,
      duracao_minutos: 30,
      clientName: "Olivia Carter",
      cliente_nome: "Legacy Client",
      clientPhone: "+1 415 555 0184",
      cliente_telefone: "+55 11 99999-9999",
      professionalId: "professional-public",
      profissional_id: "professional-legacy",
      paymentStatus: "paid",
      pagamento_status: "pending",
      price: 120,
      preco: 90,
      notes: "Public note",
      notas: "Legacy note",
      bufferBeforeMinutes: 10,
      buffer_antes_minutos: 5,
      bufferAfterMinutes: 15,
      buffer_depois_minutos: 8,
      servicesCount: 2,
      servicos_count: 7,
      status: "confirmed",
    });

    expect(normalized).toMatchObject({
      startsAt: "2026-08-12T14:00:00.000Z",
      durationMinutes: 45,
      clientName: "Olivia Carter",
      clientPhone: "+1 415 555 0184",
      professionalId: "professional-public",
      paymentStatus: "paid",
      price: 120,
      notes: "Public note",
      bufferBeforeMinutes: 10,
      bufferAfterMinutes: 15,
      servicesCount: 2,
    });
    expect(getAppointmentBufferBeforeMinutes(normalized)).toBe(10);
    expect(getAppointmentBufferAfterMinutes(normalized)).toBe(15);
  });

  it("uses legacy aliases when public fields are absent", () => {
    const normalized = normalizeAppointment({
      id: "legacy-appointment",
      data_hora: "2026-08-12T15:00:00.000Z",
      duracao_minutos: 30,
      cliente_nome: "Legacy Client",
      cliente_telefone: "+55 11 99999-9999",
      profissional_id: "professional-legacy",
      pagamento_status: "pending",
      preco: 90,
      notas: "Legacy note",
      buffer_antes_minutos: 5,
      buffer_depois_minutos: 8,
      servicos_count: 3,
      status: "confirmado",
    });

    expect(normalized).toMatchObject({
      startsAt: "2026-08-12T15:00:00.000Z",
      durationMinutes: 30,
      clientName: "Legacy Client",
      clientPhone: "+55 11 99999-9999",
      professionalId: "professional-legacy",
      paymentStatus: "pending",
      price: 90,
      notes: "Legacy note",
      bufferBeforeMinutes: 5,
      bufferAfterMinutes: 8,
      servicesCount: 3,
    });
    expect(getAppointmentBufferBeforeMinutes(normalized)).toBe(5);
    expect(getAppointmentBufferAfterMinutes(normalized)).toBe(8);
  });

  it("does not invent servicesCount, so compact service labels can fall back to linked services", () => {
    const appointment: Appointment = {
      id: "multi-service",
      data_hora: "2026-08-12T14:00:00.000Z",
      duracao_minutos: 90,
      cliente_nome: "Olivia Carter",
      profissional_id: "professional-1",
      status: "confirmado",
      agendamento_servicos: [
        { servico_id: "consultation", ordem: 1, servicos: { nome: "Consultation" } },
        { servico_id: "lab-review", ordem: 2, servicos: { nome: "Lab review" } },
        { servico_id: "follow-up", ordem: 3, servicos: { nome: "Follow-up" } },
      ],
    };

    const normalized = normalizeAppointment(appointment);

    expect(getAppointmentServicesCount(appointment, 3)).toBe(3);
    expect(normalized.servicesCount).toBeUndefined();
    expect(getAppointmentServiceLabel(normalized, true)).toBe("Consultation +2");
  });
});
