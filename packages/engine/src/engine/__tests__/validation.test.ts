import { describe, expect, it } from "vitest";
import { zonedTimeToUtc } from "@zigoschedule/scheduler-core";
import type { Appointment, Block, Professional } from "../../types";
import { buildAgendaEngineContext, validateAgendaRange } from "../index";

const profs: Professional[] = [
  { id: "prof-a", nome: "Professional A" },
  { id: "prof-b", nome: "Professional B" },
];

const makeAg = (id: string, time: string, professionalId: string, durationMinutes = 30): Appointment => ({
  id,
  data_hora: `2026-06-22T${time}:00Z`,
  duracao_minutos: durationMinutes,
  cliente_nome: `Client ${id}`,
  status: "confirmado",
  profissional_id: professionalId,
});

const makeBloq = (
  id: string,
  startTime: string,
  endTime: string,
  professionalId: string | null = null,
): Block => ({
  id,
  data: "2026-06-22",
  hora_inicio: startTime,
  hora_fim: endTime,
  motivo: null,
  profissional_id: professionalId,
});

const makeContext = (appointments: Appointment[] = [], blocks: Block[] = []) =>
  buildAgendaEngineContext({
    resources: profs,
    date: new Date("2026-06-22T12:00:00-03:00"),
    appointmentsByDay: new Map([["2026-06-22", appointments]]),
    blocksByDay: new Map([["2026-06-22", blocks]]),
    businessHours: { startMinute: 8 * 60, endMinute: 18 * 60 },
    pausaIntervalo: null,
    snapMinutes: 5,
    temporalGuards: {
      isDayBeforeToday: () => false,
      isDayClosedForToday: () => false,
      isSlotInPast: () => false,
    },
  });

const makeOpenContext = (dayKey: string, appointments: Appointment[], timeZone = "America/New_York") =>
  buildAgendaEngineContext({
    resources: [{ id: "prof-a", name: "Professional A" }],
    date: new Date(`${dayKey}T12:00:00Z`),
    timeZone,
    appointmentsByDay: new Map([[dayKey, appointments]]),
    blocksByDay: new Map([[dayKey, []]]),
    businessHours: { startMinute: 0, endMinute: 24 * 60 },
    pausaIntervalo: null,
    snapMinutes: 5,
    temporalGuards: {
      isDayBeforeToday: () => false,
      isDayClosedForToday: () => false,
      isSlotInPast: () => false,
    },
  });

describe("validateAgendaRange", () => {
  it("ignores malformed appointments before validation math", () => {
    const context = makeContext([
      { id: "missing-start", status: "confirmed", professionalId: "prof-a" } as Appointment,
      { ...makeAg("bad-date", "10:00", "prof-a"), data_hora: "not-a-date" },
      makeAg("zero-duration", "10:30", "prof-a", 0),
      makeAg("valid", "11:00", "prof-a"),
    ]);

    expect(context.appointmentsByDay.get("2026-06-22")?.map((item) => item.id)).toEqual([
      "valid",
    ]);
  });

  it("allows exact adjacency at the appointment end", () => {
    const context = makeContext([makeAg("ag-1", "10:00", "prof-a", 30)]);

    const result = validateAgendaRange(context, {
      dayKey: "2026-06-22",
      resourceId: "prof-a",
      startMinute: 10 * 60 + 30,
      endMinute: 11 * 60,
    });

    expect(result).toEqual({ ok: true });
  });

  it("blocks overlap only on the target professional", () => {
    const context = makeContext([makeAg("ag-1", "10:00", "prof-a", 30)]);

    const sameProf = validateAgendaRange(context, {
      dayKey: "2026-06-22",
      resourceId: "prof-a",
      startMinute: 10 * 60 + 15,
      endMinute: 10 * 60 + 45,
    });
    const otherProf = validateAgendaRange(context, {
      dayKey: "2026-06-22",
      resourceId: "prof-b",
      startMinute: 10 * 60 + 15,
      endMinute: 10 * 60 + 45,
    });

    expect(sameProf).toMatchObject({ ok: false, code: "APPOINTMENT_CONFLICT" });
    expect(otherProf).toEqual({ ok: true });
  });

  it("blocks overlap from an appointment that crosses local midnight", () => {
    const context = makeOpenContext("2030-08-12", [{
      id: "night",
      startsAt: zonedTimeToUtc("2030-08-12", 23 * 60 + 30, "America/New_York").toISOString(),
      durationMinutes: 90,
      clientName: "Night client",
      status: "confirmed",
      professionalId: "prof-a",
    }]);

    const result = validateAgendaRange(context, {
      dayKey: "2030-08-13",
      resourceId: "prof-a",
      startMinute: 15,
      endMinute: 45,
    });

    expect(result).toMatchObject({ ok: false, code: "APPOINTMENT_CONFLICT" });
  });

  it("blocks overlap by the real wall-clock end on a spring-forward day", () => {
    const context = makeOpenContext("2026-03-08", [{
      id: "dst",
      startsAt: zonedTimeToUtc("2026-03-08", 90, "America/New_York").toISOString(),
      durationMinutes: 60,
      clientName: "DST client",
      status: "confirmed",
      professionalId: "prof-a",
    }]);

    const result = validateAgendaRange(context, {
      dayKey: "2026-03-08",
      resourceId: "prof-a",
      startMinute: 3 * 60,
      endMinute: 3 * 60 + 15,
    });

    expect(result).toMatchObject({ ok: false, code: "APPOINTMENT_CONFLICT" });
  });

  it("treats appointment buffers as occupied time", () => {
    const appointment = {
      ...makeAg("ag-1", "10:00", "prof-a", 30),
      bufferAfterMinutes: 15,
    };
    const context = makeContext([appointment]);

    const insideBuffer = validateAgendaRange(context, {
      dayKey: "2026-06-22",
      resourceId: "prof-a",
      startMinute: 10 * 60 + 30,
      endMinute: 10 * 60 + 45,
    });
    const afterBuffer = validateAgendaRange(context, {
      dayKey: "2026-06-22",
      resourceId: "prof-a",
      startMinute: 10 * 60 + 45,
      endMinute: 11 * 60,
    });

    expect(insideBuffer).toMatchObject({ ok: false, code: "APPOINTMENT_CONFLICT" });
    expect(afterBuffer).toEqual({ ok: true });
  });

  it("validates appointments in the configured business time zone", () => {
    const context = buildAgendaEngineContext({
      resources: profs,
      date: new Date("2026-06-22T12:00:00-03:00"),
      timeZone: "America/Sao_Paulo",
      appointmentsByDay: new Map([[
        "2026-06-22",
        [{
          id: "ag-sao-paulo",
          data_hora: "2026-06-22T13:00:00.000Z",
          duracao_minutos: 45,
          cliente_nome: "Sao Paulo client",
          status: "confirmado",
          profissional_id: "prof-a",
        }],
      ]]),
      blocksByDay: new Map([["2026-06-22", []]]),
      businessHours: { startMinute: 8 * 60, endMinute: 18 * 60 },
      pausaIntervalo: null,
      snapMinutes: 5,
      temporalGuards: {
        isDayBeforeToday: () => false,
        isDayClosedForToday: () => false,
        isSlotInPast: () => false,
      },
    });

    const conflict = validateAgendaRange(context, {
      dayKey: "2026-06-22",
      resourceId: "prof-a",
      startMinute: 10 * 60 + 15,
      endMinute: 10 * 60 + 45,
    });

    expect(conflict).toMatchObject({ ok: false, code: "APPOINTMENT_CONFLICT" });
  });

  it("blocks global blocks for every professional", () => {
    const context = makeContext([], [makeBloq("bloq-1", "14:00", "15:00")]);

    const result = validateAgendaRange(context, {
      dayKey: "2026-06-22",
      resourceId: "prof-b",
      startMinute: 14 * 60 + 30,
      endMinute: 15 * 60,
    });

    expect(result).toMatchObject({ ok: false, code: "BLOCK_CONFLICT" });
  });

  it("blocks professional-specific blocks only for that professional", () => {
    const context = makeContext([], [makeBloq("bloq-prof-a", "14:00", "15:00", "prof-a")]);

    const sameProf = validateAgendaRange(context, {
      dayKey: "2026-06-22",
      resourceId: "prof-a",
      startMinute: 14 * 60 + 30,
      endMinute: 15 * 60,
    });
    const otherProf = validateAgendaRange(context, {
      dayKey: "2026-06-22",
      resourceId: "prof-b",
      startMinute: 14 * 60 + 30,
      endMinute: 15 * 60,
    });

    expect(sameProf).toMatchObject({ ok: false, code: "BLOCK_CONFLICT" });
    expect(otherProf).toEqual({ ok: true });
  });

  it("rejects resources outside the allowed agenda resources", () => {
    const context = makeContext();

    const result = validateAgendaRange(context, {
      dayKey: "2026-06-22",
      resourceId: "prof-outside-tenant",
      startMinute: 12 * 60,
      endMinute: 12 * 60 + 30,
    });

    expect(result).toMatchObject({ ok: false, code: "RESOURCE_NOT_ALLOWED" });
  });

  it("uses professional business hours when available", () => {
    const context = buildAgendaEngineContext({
      resources: [
        { id: "prof-a", nome: "Professional A", horario_abertura: "08:00", horario_fechamento: "16:00" },
        { id: "prof-b", nome: "Professional B" },
      ],
      date: new Date("2026-06-22T12:00:00-03:00"),
      appointmentsByDay: new Map([["2026-06-22", []]]),
      blocksByDay: new Map([["2026-06-22", []]]),
      businessHours: { startMinute: 8 * 60, endMinute: 20 * 60 },
      pausaIntervalo: null,
      snapMinutes: 5,
      temporalGuards: {
        isDayBeforeToday: () => false,
        isDayClosedForToday: () => false,
        isSlotInPast: () => false,
      },
    });

    const profAOutside = validateAgendaRange(context, {
      dayKey: "2026-06-22",
      resourceId: "prof-a",
      startMinute: 16 * 60,
      endMinute: 16 * 60 + 30,
    });
    const profBGlobalFallback = validateAgendaRange(context, {
      dayKey: "2026-06-22",
      resourceId: "prof-b",
      startMinute: 16 * 60,
      endMinute: 16 * 60 + 30,
    });

    expect(profAOutside).toMatchObject({ ok: false, code: "OUTSIDE_BUSINESS_HOURS" });
    expect(profBGlobalFallback).toEqual({ ok: true });
  });

  it("uses professional business hours returned as HH:mm:ss", () => {
    const context = buildAgendaEngineContext({
      resources: [
        { id: "prof-a", nome: "Professional A", horario_abertura: "09:00:00", horario_fechamento: "17:00:00" },
      ],
      date: new Date("2026-06-22T12:00:00-03:00"),
      appointmentsByDay: new Map([["2026-06-22", []]]),
      blocksByDay: new Map([["2026-06-22", []]]),
      businessHours: { startMinute: 8 * 60, endMinute: 20 * 60 },
      pausaIntervalo: null,
      snapMinutes: 5,
      temporalGuards: {
        isDayBeforeToday: () => false,
        isDayClosedForToday: () => false,
        isSlotInPast: () => false,
      },
    });

    const outside = validateAgendaRange(context, {
      dayKey: "2026-06-22",
      resourceId: "prof-a",
      startMinute: 8 * 60 + 30,
      endMinute: 9 * 60,
    });
    const inside = validateAgendaRange(context, {
      dayKey: "2026-06-22",
      resourceId: "prof-a",
      startMinute: 9 * 60,
      endMinute: 9 * 60 + 30,
    });

    expect(outside).toMatchObject({ ok: false, code: "OUTSIDE_BUSINESS_HOURS" });
    expect(inside).toEqual({ ok: true });
  });

  it("blocks all ranges when the business day is closed", () => {
    const context = makeContext();
    context.businessHours = {
      startMinute: 8 * 60,
      endMinute: 18 * 60,
      isClosed: true,
      closedMessage: "This day is closed in the scheduler.",
    };

    const result = validateAgendaRange(context, {
      dayKey: "2026-06-22",
      resourceId: "prof-a",
      startMinute: 10 * 60,
      endMinute: 10 * 60 + 30,
    });

    expect(result).toMatchObject({
      ok: false,
      code: "OUTSIDE_BUSINESS_HOURS",
      message: "This day is closed in the scheduler.",
    });
  });

  it("uses day-specific business hours when provided", () => {
    const context = makeContext();
    context.getBusinessHoursForDay = (dayKey) => (
      dayKey === "2026-06-23"
        ? { startMinute: 9 * 60, endMinute: 17 * 60, isClosed: true, closedMessage: "Closed day." }
        : { startMinute: 8 * 60, endMinute: 18 * 60 }
    );

    const openDay = validateAgendaRange(context, {
      dayKey: "2026-06-22",
      resourceId: "prof-a",
      startMinute: 8 * 60,
      endMinute: 8 * 60 + 30,
    });
    const closedDay = validateAgendaRange(context, {
      dayKey: "2026-06-23",
      resourceId: "prof-a",
      startMinute: 10 * 60,
      endMinute: 10 * 60 + 30,
    });

    expect(openDay).toEqual({ ok: true });
    expect(closedDay).toMatchObject({
      ok: false,
      code: "OUTSIDE_BUSINESS_HOURS",
      message: "Closed day.",
    });
  });

  it("uses day-specific professional business hours before generic salon limits", () => {
    const context = makeContext();
    context.getResourceBusinessHoursForDay = (resourceId) => (
      resourceId === "prof-a"
        ? {
            startMinute: 10 * 60,
            endMinute: 17 * 60,
            closedMessage: "Professional A works this day from 10:00 to 17:00.",
          }
        : undefined
    );

    const outsideProfessionalWindow = validateAgendaRange(context, {
      dayKey: "2026-06-22",
      resourceId: "prof-a",
      startMinute: 17 * 60,
      endMinute: 17 * 60 + 30,
    });
    const otherProfessionalFallback = validateAgendaRange(context, {
      dayKey: "2026-06-22",
      resourceId: "prof-b",
      startMinute: 17 * 60,
      endMinute: 17 * 60 + 30,
    });

    expect(outsideProfessionalWindow).toMatchObject({
      ok: false,
      code: "OUTSIDE_BUSINESS_HOURS",
      message: "Professional A works this day from 10:00 to 17:00.",
    });
    expect(otherProfessionalFallback).toEqual({ ok: true });
  });

  it("uses resource-specific lunch break before the global lunch break", () => {
    const context = makeContext();
    context.pausaIntervalo = {
      inicioMin: 12 * 60,
      fimMin: 13 * 60,
      inicioHHMM: "12:00",
      fimHHMM: "13:00",
    };
    context.getResourcePausaIntervaloForDay = (resourceId) => {
      if (resourceId === "prof-a") return null;
      if (resourceId === "prof-b") {
        return {
          inicioMin: 15 * 60,
          fimMin: 16 * 60,
          inicioHHMM: "15:00",
          fimHHMM: "16:00",
        };
      }
      return undefined;
    };

    const profAInTenantLunch = validateAgendaRange(context, {
      dayKey: "2026-06-22",
      resourceId: "prof-a",
      startMinute: 12 * 60,
      endMinute: 12 * 60 + 30,
    });
    const profBInTenantLunch = validateAgendaRange(context, {
      dayKey: "2026-06-22",
      resourceId: "prof-b",
      startMinute: 12 * 60,
      endMinute: 12 * 60 + 30,
    });
    const profBInOwnLunch = validateAgendaRange(context, {
      dayKey: "2026-06-22",
      resourceId: "prof-b",
      startMinute: 15 * 60,
      endMinute: 15 * 60 + 30,
    });

    expect(profAInTenantLunch).toEqual({ ok: true });
    expect(profBInTenantLunch).toEqual({ ok: true });
    expect(profBInOwnLunch).toMatchObject({ ok: false, code: "PAUSE_CONFLICT" });
  });

  it("blocks a closed professional day with its own message", () => {
    const context = makeContext();
    context.getResourceBusinessHoursForDay = (resourceId) => (
      resourceId === "prof-a"
        ? {
            startMinute: 8 * 60,
            endMinute: 8 * 60,
            isClosed: true,
            closedMessage: "Professional A does not work this day.",
          }
        : undefined
    );

    const result = validateAgendaRange(context, {
      dayKey: "2026-06-22",
      resourceId: "prof-a",
      startMinute: 10 * 60,
      endMinute: 10 * 60 + 30,
    });

    expect(result).toMatchObject({
      ok: false,
      code: "OUTSIDE_BUSINESS_HOURS",
      message: "Professional A does not work this day.",
    });
  });

  it("can ignore a source block during Google conversion", () => {
    const context = makeContext([], [makeBloq("google-bloq", "09:00", "10:00", "prof-a")]);

    const result = validateAgendaRange(
      context,
      {
        dayKey: "2026-06-22",
        resourceId: "prof-a",
        startMinute: 9 * 60,
        endMinute: 10 * 60,
      },
      { ignoreBlockId: "google-bloq" },
    );

    expect(result).toEqual({ ok: true });
  });
});
