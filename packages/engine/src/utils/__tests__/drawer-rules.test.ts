import { describe, expect, it } from "vitest";

import type { AppointmentEditForm, Service } from "../../types";
import type { EffectiveBusinessHours } from "../business-hours";
import { getAddServicoMensagemErro, getAgEditConflictMessage } from "../drawer-rules";

const businessHours: EffectiveBusinessHours = {
  startMinute: 10 * 60,
  endMinute: 19 * 60,
  abertura: "10:00",
  fechamento: "19:00",
  isClosed: false,
};

const services: Service[] = [
  { id: "beard", nome: "Beard trim", duracao_minutos: 30, preco: 20 },
  { id: "long", nome: "Long service", duracao_minutos: 90, preco: 90 },
];

const agEditForm: AppointmentEditForm = {
  agendamentoId: "ag-1",
  data: "2026-07-03",
  horario: "14:00",
  fimHorario: "15:00",
  duracaoMinutos: 60,
  preco: "90",
  status: "confirmado",
  notas: "",
  clienteNome: "Client",
  clienteTelefone: "",
  profissionalId: "prof-1",
  servicosSelecionados: [],
  produtosSelecionados: [],
};

describe("drawer-rules", () => {
  it("blocks an added service that ends after business hours", () => {
    const message = getAddServicoMensagemErro({
      addServicoForm: {
        servicoId: "long",
        inicio: "18:00",
        fim: "19:00",
        profissionalId: "prof-1",
      },
      servicosCatalogo: services,
      businessHours,
      granularidade: 30,
    });

    expect(message).toBe("This service ends after business hours (19:00).");
  });

  it("blocks an edit that ends after business hours", () => {
    const message = getAgEditConflictMessage({
      form: { ...agEditForm, horario: "18:00", duracaoMinutos: 90 },
      snapshotStatus: "confirmado",
      fimHorarioManual: false,
      duracaoEfetiva: 90,
      granularidade: 30,
      businessHours,
      validateRange: () => ({ ok: true }),
    });

    expect(message).toContain("business hours end at 19:00");
    expect(message).toContain("latest possible start is 17:30");
  });

  it("translates a scheduler conflict into a drawer message", () => {
    const message = getAgEditConflictMessage({
      form: agEditForm,
      snapshotStatus: "confirmado",
      fimHorarioManual: false,
      duracaoEfetiva: 60,
      granularidade: 30,
      businessHours,
      validateRange: () => ({
        ok: false,
        code: "APPOINTMENT_CONFLICT",
        message: "Generic conflict",
      }),
    });

    expect(message).toBe("This professional already has an appointment at that time.");
  });
});
