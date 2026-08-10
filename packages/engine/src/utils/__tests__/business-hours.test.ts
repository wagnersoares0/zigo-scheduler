import { describe, expect, it } from "vitest";
import type { BusinessHours, Professional } from "../../types";
import {
  getEffectiveBusinessHoursForDay,
  getGridBusinessHoursRange,
  getProfessionalPauseIntervalForDay,
  getProfessionalBusinessHoursMessage,
  getProfessionalBusinessHoursRange,
  resolveWeekdayConfigKey,
} from "../business-hours";
import { fromDayKey } from "../time";

describe("business-hours helpers", () => {
  it("resolves weekday configuration aliases and database time values", () => {
    const tenantHorariosSemana = {
      "terça-feira": {
        abertura: "09:30:00",
        fechamento: "17:45:00",
        ativo: "1",
      },
    } as unknown as BusinessHours;

    const hours = getEffectiveBusinessHoursForDay({
      dayKey: "2026-06-23",
      tenantHorariosSemana,
      tenantHorarioPadrao: { abertura: "08:00", fechamento: "18:00" },
    });

    expect(resolveWeekdayConfigKey("terça-feira")).toBe("tuesday");
    expect(hours).toMatchObject({
      abertura: "09:30",
      fechamento: "17:45",
      startMinute: 9 * 60 + 30,
      endMinute: 17 * 60 + 45,
      isClosed: false,
    });
  });

  it("accepts public English business-hours fields", () => {
    const hours = getEffectiveBusinessHoursForDay({
      dayKey: "2026-06-22",
      tenantHorariosSemana: {
        monday: { active: true, opensAt: "09:30:00", closesAt: "17:45:00" },
      },
      tenantHorarioPadrao: { opensAt: "08:00", closesAt: "18:00" },
    });
    const professional: Professional = {
      id: "dr-lee",
      name: "Dr. Maya Lee",
      opensAt: "08:00:00",
      closesAt: "20:00:00",
      schedule: [
        { dayOfWeek: 1, startTime: "10:00:00", endTime: "16:30:00", active: true },
      ],
    };

    expect(hours).toMatchObject({
      abertura: "09:30",
      fechamento: "17:45",
      isClosed: false,
    });
    expect(getProfessionalBusinessHoursRange(hours, professional, "2026-06-22")).toEqual({
      startMinute: 10 * 60,
      endMinute: 16 * 60 + 30,
    });
  });

  it("uses salon hours, not professional hours, to define the weekly visual axis", () => {
    const tenantHorariosSemana: BusinessHours = {
      segunda: { abertura: "10:30:00", fechamento: "18:00:00", ativo: true },
      sabado: { abertura: "08:00:00", fechamento: "21:00:00", ativo: true },
    };
    const professionals: Professional[] = [
      { id: "prof-a", nome: "Ana Lima", horario_abertura: "09:00:00", horario_fechamento: "19:00:00" },
      { id: "prof-b", nome: "Bruno Souza", horario_abertura: "10:00:00", horario_fechamento: "20:00:00" },
    ];
    const getBusinessHoursForDay = (dayKey: string) =>
      getEffectiveBusinessHoursForDay({
        dayKey,
        tenantHorariosSemana,
        tenantHorarioPadrao: { abertura: "08:00", fechamento: "18:00" },
      });
    const selectedDayBusinessHours = getBusinessHoursForDay("2026-06-22");

    const range = getGridBusinessHoursRange({
      days: [fromDayKey("2026-06-22"), fromDayKey("2026-06-27")],
      selectedDayBusinessHours,
      getBusinessHoursForDay,
    });

    expect(getProfessionalBusinessHoursRange(selectedDayBusinessHours, professionals[0])).toEqual({
      startMinute: 10 * 60 + 30,
      endMinute: 18 * 60,
    });
    expect(range).toEqual({
      startMinute: 8 * 60,
      endMinute: 21 * 60,
    });
  });

  it("uses day-specific professional hours inside the salon operating window", () => {
    const dayHours = getEffectiveBusinessHoursForDay({
      dayKey: "2026-06-22",
      tenantHorariosSemana: {
        segunda: { abertura: "08:00:00", fechamento: "22:00:00", ativo: true },
      },
      tenantHorarioPadrao: { abertura: "08:00", fechamento: "18:00" },
    });
    const professional: Professional = {
      id: "prof-a",
      nome: "Junin Ramela",
      horario_abertura: "08:00:00",
      horario_fechamento: "22:00:00",
      horarios_profissional: [
        { dia_semana: 1, hora_inicio: "10:00:00", hora_fim: "17:00:00", ativo: true },
      ],
    };

    expect(getProfessionalBusinessHoursRange(dayHours, professional, "2026-06-22")).toEqual({
      startMinute: 10 * 60,
      endMinute: 17 * 60,
    });
    expect(getProfessionalBusinessHoursMessage(dayHours, professional, "2026-06-22")).toContain(
      "Junin Ramela works from 10:00 to 17:00 on this day",
    );
  });

  it("treats inactive day-specific professional hours as unavailable", () => {
    const dayHours = getEffectiveBusinessHoursForDay({
      dayKey: "2026-06-22",
      tenantHorariosSemana: {
        segunda: { abertura: "08:00:00", fechamento: "22:00:00", ativo: true },
      },
      tenantHorarioPadrao: { abertura: "08:00", fechamento: "18:00" },
    });
    const professional: Professional = {
      id: "prof-a",
      nome: "Junin Ramela",
      horarios_profissional: [
        { dia_semana: 1, hora_inicio: "10:00:00", hora_fim: "17:00:00", ativo: false },
      ],
    };

    expect(getProfessionalBusinessHoursRange(dayHours, professional, "2026-06-22")).toBeNull();
    expect(getProfessionalBusinessHoursMessage(dayHours, professional, "2026-06-22")).toBe(
      "Junin Ramela does not work on this day. Update the working hours in the professional profile.",
    );
  });

  it("resolves professional lunch override for the selected weekday", () => {
    const tenantPausaIntervalo = {
      inicioMin: 12 * 60,
      fimMin: 13 * 60,
      inicioHHMM: "12:00",
      fimHHMM: "13:00",
    };
    const customLunchProfessional: Professional = {
      id: "prof-a",
      nome: "Ana",
      horarios_profissional: [
        {
          dia_semana: 1,
          hora_inicio: "10:00:00",
          hora_fim: "18:00:00",
          ativo: true,
          tem_pausa: true,
          pausa_inicio: "15:00:00",
          pausa_fim: "16:00:00",
        },
      ],
    };
    const noLunchProfessional: Professional = {
      id: "prof-b",
      nome: "Bruno",
      horarios_profissional: [
        {
          dia_semana: 1,
          hora_inicio: "10:00:00",
          hora_fim: "18:00:00",
          ativo: true,
          tem_pausa: false,
          pausa_inicio: null,
          pausa_fim: null,
        },
      ],
    };
    const inheritLunchProfessional: Professional = {
      id: "prof-c",
      nome: "Carla",
      horarios_profissional: [
        {
          dia_semana: 1,
          hora_inicio: "10:00:00",
          hora_fim: "18:00:00",
          ativo: true,
          tem_pausa: null,
          pausa_inicio: null,
          pausa_fim: null,
        },
      ],
    };

    expect(getProfessionalPauseIntervalForDay({
      tenantPausaIntervalo,
      professional: customLunchProfessional,
      dayKey: "2026-06-22",
    })).toMatchObject({
      inicioMin: 15 * 60,
      fimMin: 16 * 60,
    });
    expect(getProfessionalPauseIntervalForDay({
      tenantPausaIntervalo,
      professional: noLunchProfessional,
      dayKey: "2026-06-22",
    })).toBeNull();
    expect(getProfessionalPauseIntervalForDay({
      tenantPausaIntervalo,
      professional: inheritLunchProfessional,
      dayKey: "2026-06-22",
    })).toEqual(tenantPausaIntervalo);
  });

  it("accepts public English lunch-break fields", () => {
    const tenantPausaIntervalo = {
      inicioMin: 12 * 60,
      fimMin: 13 * 60,
      inicioHHMM: "12:00",
      fimHHMM: "13:00",
    };
    const professional: Professional = {
      id: "dr-lee",
      name: "Dr. Maya Lee",
      schedule: [
        {
          dayOfWeek: 1,
          startTime: "09:00",
          endTime: "17:00",
          active: true,
          hasBreak: true,
          breakStartsAt: "14:00",
          breakEndsAt: "14:30",
        },
      ],
    };

    expect(getProfessionalPauseIntervalForDay({
      tenantPausaIntervalo,
      professional,
      dayKey: "2026-06-22",
    })).toMatchObject({
      inicioMin: 14 * 60,
      fimMin: 14 * 60 + 30,
    });
  });

  it("treats inactive day flags as closed", () => {
    const hours = getEffectiveBusinessHoursForDay({
      dayKey: "2026-06-22",
      tenantHorariosSemana: {
        segunda: { abertura: "08:00", fechamento: "18:00", ativo: "0" },
      },
      tenantHorarioPadrao: { abertura: "08:00", fechamento: "18:00" },
    });

    expect(hours.isClosed).toBe(true);
    expect(hours.closedMessage).toBeTruthy();
  });

  it("rejects business hours that cross midnight instead of inventing a short day", () => {
    const hours = getEffectiveBusinessHoursForDay({
      dayKey: "2026-06-22",
      tenantHorariosSemana: {
        monday: { opensAt: "22:00", closesAt: "02:00", active: true },
      },
      tenantHorarioPadrao: { opensAt: "09:00", closesAt: "17:00" },
    });

    expect(hours).toMatchObject({
      startMinute: 22 * 60,
      endMinute: 22 * 60,
      isClosed: true,
    });
    expect(hours.closedMessage).toContain("cannot cross midnight");
  });
});
