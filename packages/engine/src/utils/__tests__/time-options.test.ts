import { describe, expect, it } from "vitest";
import type { BreakWindow } from "../../types";
import type { EffectiveBusinessHours } from "../business-hours";
import { buildFimHorarioOptions, buildInicioHorarioOptions } from "../time-options";

const businessHours: EffectiveBusinessHours = {
  startMinute: 10 * 60,
  endMinute: 19 * 60,
  abertura: "10:00",
  fechamento: "19:00",
  isClosed: false,
};

const pausaIntervalo: BreakWindow = {
  inicioMin: 13 * 60,
  fimMin: 14 * 60,
  inicioHHMM: "13:00",
  fimHHMM: "14:00",
};

describe("time option helpers", () => {
  it("builds start options using business hours and marks lunch starts as disabled", () => {
    const options = buildInicioHorarioOptions({
      businessHours,
      granularidade: 30,
      pausaIntervalo,
      durationMinutes: 60,
      validateDuration: true,
    });

    expect(options[0]).toMatchObject({ value: "10:00", disabled: false });
    expect(options.find((option) => option.value === "13:00")).toMatchObject({ disabled: true });
    expect(options.find((option) => option.value === "13:30")).toMatchObject({ disabled: true });
    expect(options.find((option) => option.value === "18:30")).toMatchObject({ disabled: true });
    expect(options.some((option) => option.value === "19:00")).toBe(false);
  });

  it("keeps a current start value that is outside the regular generated list", () => {
    const options = buildInicioHorarioOptions({
      businessHours,
      granularidade: 30,
      pausaIntervalo,
      currentValue: "09:50",
      durationMinutes: 30,
      validateDuration: true,
    });

    expect(options[0]).toMatchObject({ value: "09:50", disabled: true });
    expect(options[0]?.label).toContain("outside business hours");
  });

  it("builds end options up to business closing and marks lunch overlap as disabled", () => {
    const options = buildFimHorarioOptions({
      businessHours,
      granularidade: 30,
      pausaIntervalo,
      startValue: "12:30",
      currentValue: "13:30",
    });

    expect(options.find((option) => option.value === "12:30")).toMatchObject({ disabled: true });
    expect(options.find((option) => option.value === "13:00")).toMatchObject({ disabled: false });
    expect(options.find((option) => option.value === "13:30")).toMatchObject({ disabled: true });

    const lateOptions = buildFimHorarioOptions({
      businessHours,
      granularidade: 30,
      pausaIntervalo,
      startValue: "18:00",
      currentValue: "19:00",
    });
    expect(lateOptions.find((option) => option.value === "19:00")).toMatchObject({ disabled: false });
  });

  it("keeps a current end value outside business hours when editing legacy data", () => {
    const options = buildFimHorarioOptions({
      businessHours,
      granularidade: 30,
      pausaIntervalo: null,
      startValue: "18:00",
      currentValue: "19:30",
    });

    expect(options[0]).toMatchObject({ value: "19:30", disabled: true });
    expect(options[0]?.label).toContain("outside business hours");
  });
});
