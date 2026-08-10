import { describe, expect, it } from "vitest";
import type { Appointment, Block, Professional } from "../../types";
import {
  buildAgendaListRows,
  filterVisibleAppointments,
  filterVisibleBlocks,
  groupAgendaRowsByDay,
  groupAppointmentsByDay,
  groupBlocksByDay,
} from "../agenda-derived-data";

const professionals: Professional[] = [
  { id: "prof-a", nome: "Ana" },
  { id: "prof-b", nome: "Noah" },
];

const makeAppointment = (overrides: Partial<Appointment>): Appointment => ({
  id: "ag-base",
  data_hora: "2026-06-29T10:00:00-03:00",
  duracao_minutos: 30,
  cliente_nome: "Client",
  status: "confirmado",
  preco: 50,
  profissional_id: "prof-a",
  servicos: { nome: "Consultation" },
  profissionais: { nome: "Ana" },
  ...overrides,
});

const makeBlock = (overrides: Partial<Block>): Block => ({
  id: "bloq-base",
  data: "2026-06-29",
  hora_inicio: "11:00",
  hora_fim: "11:30",
  motivo: "Team meeting",
  profissional_id: "prof-a",
  ...overrides,
});

describe("agenda derived data helpers", () => {
  it("filters visible appointments and blocks by status and professional", () => {
    const appointments = [
      makeAppointment({ id: "ag-visible" }),
      makeAppointment({ id: "ag-hidden-status", status: "cancelado" }),
      makeAppointment({ id: "ag-hidden-prof", profissional_id: "prof-b" }),
    ];
    const blocks = [
      makeBlock({ id: "bloq-visible" }),
      makeBlock({ id: "bloq-hidden-prof", profissional_id: "prof-b" }),
      makeBlock({ id: "bloq-global", profissional_id: null }),
    ];

    expect(filterVisibleAppointments({
      appointments,
      activeStatuses: ["confirmado"],
      visibleProfIds: ["prof-a"],
    }).map((ag) => ag.id)).toEqual(["ag-visible"]);

    expect(filterVisibleBlocks({
      blocks,
      visibleProfIds: ["prof-a"],
    }).map((bloq) => bloq.id)).toEqual(["bloq-visible", "bloq-global"]);
  });

  it("groups appointments, blocks and agenda rows using the same keys as the grid", () => {
    const appointments = [
      makeAppointment({ id: "ag-2", data_hora: "2026-06-30T09:00:00-03:00" }),
      makeAppointment({ id: "ag-1", data_hora: "2026-06-29T10:00:00-03:00" }),
    ];
    const blocks = [makeBlock({ id: "bloq-1" })];

    expect(Array.from(groupAppointmentsByDay(appointments).keys())).toEqual([
      "2026-06-30",
      "2026-06-29",
    ]);
    expect(Array.from(groupBlocksByDay(blocks).keys())).toEqual(["2026-06-29"]);

    const rows = buildAgendaListRows({
      appointments,
      blocks,
      professionals,
      tenantGranularidade: 30,
      timeZone: "America/Sao_Paulo",
    });

    expect(rows.map((row) => row.id)).toEqual(["ag-1", "bloq-1", "ag-2"]);
    expect(groupAgendaRowsByDay(rows).map(([dayKey]) => dayKey)).toEqual([
      "2026-06-29",
      "2026-06-30",
    ]);
  });
});
