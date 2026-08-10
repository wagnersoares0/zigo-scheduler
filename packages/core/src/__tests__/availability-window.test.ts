import { describe, expect, it } from "vitest";
import {
  fromMinutes,
  getDayOfWeekFromDate,
  isStartTimeWithinWindow,
  rangeOverlapsLunchBreak,
  resolveEffectiveAvailabilityWindow,
  resolveEffectiveLunchBreak,
  resolveTenantOperatingWindow,
  toMinutes,
  type TimeWindow,
} from "../availability-window";

const window = (startMin: number, endMin: number): TimeWindow => ({
  startMin,
  endMin,
  opensAt: fromMinutes(startMin),
  closesAt: fromMinutes(endMin),
  abertura: fromMinutes(startMin),
  fechamento: fromMinutes(endMin),
});

const lunchWindow = (startMin: number, endMin: number) => ({
  startMin,
  endMin,
  startsAt: fromMinutes(startMin),
  endsAt: fromMinutes(endMin),
  inicio: fromMinutes(startMin),
  fim: fromMinutes(endMin),
});

describe("toMinutes and fromMinutes", () => {
  it("converts between HH:MM and minutes since midnight", () => {
    expect(toMinutes("00:00")).toBe(0);
    expect(toMinutes("09:30")).toBe(570);
    expect(toMinutes("23:59")).toBe(1439);
    expect(fromMinutes(0)).toBe("00:00");
    expect(fromMinutes(570)).toBe("09:30");
    expect(fromMinutes(1439)).toBe("23:59");
  });

  it("accepts an optional seconds component", () => {
    expect(toMinutes("09:30:00")).toBe(570);
  });

  it("rejects out-of-range and malformed values", () => {
    for (const bad of ["25:00", "12:60", "9:30", "abc", "", "09-30"]) {
      expect(() => toMinutes(bad)).toThrow(/Invalid hour format/);
    }
  });
});

describe("resolveEffectiveLunchBreak", () => {
  const tenantBreak = { tem_pausa: true, pausa_inicio: "12:00", pausa_fim: "13:00" };

  it("uses the professional's own break when they declare one", () => {
    const result = resolveEffectiveLunchBreak({
      tenant: tenantBreak,
      profissionalHorario: {
        hora_inicio: "09:00",
        hora_fim: "18:00",
        ativo: true,
        tem_pausa: true,
        pausa_inicio: "14:00",
        pausa_fim: "15:00",
      },
    });
    expect(result).toEqual({
      ok: true,
      window: lunchWindow(840, 900),
    });
  });

  it("honours an explicit 'no break' from the professional", () => {
    // tem_pausa === false means "configured as none", which must beat the tenant.
    const result = resolveEffectiveLunchBreak({
      tenant: tenantBreak,
      profissionalHorario: {
        hora_inicio: "09:00",
        hora_fim: "18:00",
        ativo: true,
        tem_pausa: false,
      },
    });
    expect(result).toEqual({ ok: true, window: null });
  });

  it("falls back to the tenant when the professional did not configure a break", () => {
    // Absent is not the same as false: it means "inherit".
    for (const tem_pausa of [undefined, null]) {
      const result = resolveEffectiveLunchBreak({
        tenant: tenantBreak,
        profissionalHorario: {
          hora_inicio: "09:00",
          hora_fim: "18:00",
          ativo: true,
          tem_pausa,
        },
      });
      expect(result).toEqual({
        ok: true,
        window: lunchWindow(720, 780),
      });
    }
  });

  it("falls back to the tenant when there is no professional at all", () => {
    const result = resolveEffectiveLunchBreak({ tenant: tenantBreak });
    expect(result).toMatchObject({ ok: true, window: { inicio: "12:00" } });
  });

  it("returns no break when neither side declares one", () => {
    expect(resolveEffectiveLunchBreak({})).toEqual({ ok: true, window: null });
    expect(resolveEffectiveLunchBreak({ tenant: { tem_pausa: false } })).toEqual({
      ok: true,
      window: null,
    });
  });

  it("fails loudly when the professional declares a break it cannot honour", () => {
    // Declaring tem_pausa: true with unusable hours is a data bug, not a
    // "no break" — silently ignoring it would sell an occupied slot.
    for (const bad of [
      { pausa_inicio: null, pausa_fim: "13:00" },
      { pausa_inicio: "12:00", pausa_fim: null },
      { pausa_inicio: "13:00", pausa_fim: "12:00" }, // end before start
      { pausa_inicio: "12:00", pausa_fim: "12:00" }, // zero length
      { pausa_inicio: "99:00", pausa_fim: "13:00" }, // malformed
    ]) {
      const result = resolveEffectiveLunchBreak({
        profissionalHorario: { hora_inicio: "09:00", hora_fim: "18:00", ativo: true, tem_pausa: true, ...bad },
      });
      expect(result).toEqual({
        ok: false,
        code: "invalid_professional_break",
        message: "The professional break is invalid.",
      });
    }
  });

  it("ignores a malformed tenant break instead of failing", () => {
    // The tenant break is a default, not a promise: bad data degrades to "none".
    const result = resolveEffectiveLunchBreak({
      tenant: { tem_pausa: true, pausa_inicio: "13:00", pausa_fim: "12:00" },
    });
    expect(result).toEqual({ ok: true, window: null });
  });
});

describe("rangeOverlapsLunchBreak", () => {
  const lunch = lunchWindow(720, 780);

  it("treats the range as half-open, so touching is not overlapping", () => {
    // ends exactly when lunch starts
    expect(rangeOverlapsLunchBreak({ startMin: 660, endMin: 720, lunchBreak: lunch })).toBe(false);
    // starts exactly when lunch ends
    expect(rangeOverlapsLunchBreak({ startMin: 780, endMin: 840, lunchBreak: lunch })).toBe(false);
  });

  it("detects every way a service can hit the break", () => {
    // starts before, ends inside
    expect(rangeOverlapsLunchBreak({ startMin: 690, endMin: 750, lunchBreak: lunch })).toBe(true);
    // fully inside
    expect(rangeOverlapsLunchBreak({ startMin: 730, endMin: 750, lunchBreak: lunch })).toBe(true);
    // starts inside, ends after
    expect(rangeOverlapsLunchBreak({ startMin: 750, endMin: 810, lunchBreak: lunch })).toBe(true);
    // swallows the whole break
    expect(rangeOverlapsLunchBreak({ startMin: 660, endMin: 840, lunchBreak: lunch })).toBe(true);
  });

  it("never overlaps when there is no break", () => {
    expect(rangeOverlapsLunchBreak({ startMin: 0, endMin: 1440, lunchBreak: null })).toBe(false);
  });
});

describe("getDayOfWeekFromDate", () => {
  it("returns 0 for Sunday through 6 for Saturday", () => {
    expect(getDayOfWeekFromDate("2026-08-09")).toBe(0);
    expect(getDayOfWeekFromDate("2026-08-10")).toBe(1);
    expect(getDayOfWeekFromDate("2026-08-15")).toBe(6);
  });

  it("gives the same weekday regardless of the business's zone", () => {
    for (const zone of ["America/Sao_Paulo", "America/Rio_Branco", "Europe/Lisbon", "Pacific/Kiritimati"]) {
      expect(getDayOfWeekFromDate("2026-08-06", zone)).toBe(4);
    }
  });
});

describe("resolveTenantOperatingWindow", () => {
  it("falls back to 09:00–18:00 when nothing is configured", () => {
    expect(resolveTenantOperatingWindow({ dayOfWeek: 1 })).toEqual(window(540, 1080));
  });

  it("uses the legacy single opening/closing when there is no weekly config", () => {
    expect(
      resolveTenantOperatingWindow({
        dayOfWeek: 1,
        horarioAbertura: "08:00",
        horarioFechamento: "20:00",
      })
    ).toEqual(window(480, 1200));
  });

  it("accepts public English operating-window fields", () => {
    expect(
      resolveTenantOperatingWindow({
        dayOfWeek: 1,
        opensAt: "08:00",
        closesAt: "20:00",
        horariosSemana: { monday: { active: true, opensAt: "10:00", closesAt: "16:00" } },
      })
    ).toEqual(window(600, 960));
  });

  it("lets the weekly config override the legacy hours", () => {
    expect(
      resolveTenantOperatingWindow({
        dayOfWeek: 1,
        horarioAbertura: "08:00",
        horarioFechamento: "20:00",
        horariosSemana: { segunda: { ativo: true, abertura: "10:00", fechamento: "16:00" } },
      })
    ).toEqual(window(600, 960));
  });

  it("closes the day when the weekly config marks it inactive", () => {
    expect(
      resolveTenantOperatingWindow({
        dayOfWeek: 0,
        horariosSemana: { domingo: { ativo: false } },
      })
    ).toBeNull();
  });

  it("accepts the weekday key written in any common form", () => {
    // Real databases accumulate "terça", "terca", "ter" and "terça-feira".
    for (const key of ["terca", "terça", "ter", "terça-feira", "TERCA", "Terça-Feira"]) {
      expect(
        resolveTenantOperatingWindow({
          dayOfWeek: 2,
          horariosSemana: { [key]: { ativo: true, abertura: "07:00", fechamento: "11:00" } },
        })
      ).toEqual(window(420, 660));
    }
  });

  it("ignores a weekday entry that belongs to another day", () => {
    expect(
      resolveTenantOperatingWindow({
        dayOfWeek: 2,
        horariosSemana: { sexta: { ativo: false, abertura: "07:00", fechamento: "11:00" } },
      })
    ).toEqual(window(540, 1080));
  });

  it("ignores malformed hours and keeps the default", () => {
    expect(
      resolveTenantOperatingWindow({
        dayOfWeek: 1,
        horarioAbertura: "8h",
        horarioFechamento: "25:00",
      })
    ).toEqual(window(540, 1080));
  });

  it("returns null when closing is not after opening", () => {
    expect(
      resolveTenantOperatingWindow({
        dayOfWeek: 1,
        horarioAbertura: "18:00",
        horarioFechamento: "09:00",
      })
    ).toBeNull();
    expect(
      resolveTenantOperatingWindow({
        dayOfWeek: 1,
        horarioAbertura: "09:00",
        horarioFechamento: "09:00",
      })
    ).toBeNull();
  });
});

describe("resolveEffectiveAvailabilityWindow", () => {
  const tenantWindow = window(540, 1080); // 09:00–18:00

  it("returns the tenant window when nothing narrows it", () => {
    expect(resolveEffectiveAvailabilityWindow({ tenantWindow })).toEqual(tenantWindow);
  });

  it("intersects with the professional's own hours", () => {
    expect(
      resolveEffectiveAvailabilityWindow({
        tenantWindow,
        profissionalHorario: { hora_inicio: "10:00", hora_fim: "16:00", ativo: true },
      })
    ).toEqual(window(600, 960));
  });

  it("accepts public English professional and requested windows", () => {
    expect(
      resolveEffectiveAvailabilityWindow({
        tenantWindow,
        profissionalHorario: { startTime: "10:00", endTime: "16:00", active: true },
        requestedOpensAt: "11:00",
        requestedClosesAt: "15:00",
      })
    ).toEqual(window(660, 900));
  });

  it("never widens beyond the tenant window", () => {
    // A professional starting at 07:00 cannot open the salon early.
    expect(
      resolveEffectiveAvailabilityWindow({
        tenantWindow,
        profissionalHorario: { hora_inicio: "07:00", hora_fim: "22:00", ativo: true },
      })
    ).toEqual(tenantWindow);
  });

  it("returns null when the professional is inactive", () => {
    expect(
      resolveEffectiveAvailabilityWindow({
        tenantWindow,
        profissionalHorario: { hora_inicio: "10:00", hora_fim: "16:00", ativo: false },
      })
    ).toBeNull();
  });

  it("returns null when the professional's hours are unusable", () => {
    for (const bad of [
      { hora_inicio: "16:00", hora_fim: "10:00" },
      { hora_inicio: "10:00", hora_fim: "10:00" },
      { hora_inicio: "abc", hora_fim: "16:00" },
    ]) {
      expect(
        resolveEffectiveAvailabilityWindow({
          tenantWindow,
          profissionalHorario: { ...bad, ativo: true },
        })
      ).toBeNull();
    }
  });

  it("narrows further with the requested range", () => {
    expect(
      resolveEffectiveAvailabilityWindow({
        tenantWindow,
        requestedAbertura: "11:00",
        requestedFechamento: "15:00",
      })
    ).toEqual(window(660, 900));
  });

  it("intersects all three sources at once", () => {
    // tenant 09–18, professional 10–16, requested 11–20 → 11–16
    expect(
      resolveEffectiveAvailabilityWindow({
        tenantWindow,
        profissionalHorario: { hora_inicio: "10:00", hora_fim: "16:00", ativo: true },
        requestedAbertura: "11:00",
        requestedFechamento: "20:00",
      })
    ).toEqual(window(660, 960));
  });

  it("returns null when the intersection collapses", () => {
    expect(
      resolveEffectiveAvailabilityWindow({
        tenantWindow,
        profissionalHorario: { hora_inicio: "09:00", hora_fim: "11:00", ativo: true },
        requestedAbertura: "12:00",
      })
    ).toBeNull();
  });

  it("ignores a malformed requested range", () => {
    expect(
      resolveEffectiveAvailabilityWindow({
        tenantWindow,
        requestedAbertura: "não",
        requestedFechamento: "26:00",
      })
    ).toEqual(tenantWindow);
  });
});

describe("isStartTimeWithinWindow", () => {
  const w = window(540, 1080); // 09:00–18:00

  it("accepts a service that fits exactly", () => {
    expect(isStartTimeWithinWindow({ startTime: "17:00", durationMinutes: 60, window: w })).toBe(true);
    expect(isStartTimeWithinWindow({ startTime: "09:00", durationMinutes: 30, window: w })).toBe(true);
  });

  it("rejects a service that would run past closing", () => {
    // This is the check that stops a 60-minute service being booked at 17:30.
    expect(isStartTimeWithinWindow({ startTime: "17:30", durationMinutes: 60, window: w })).toBe(false);
  });

  it("rejects a start before opening", () => {
    expect(isStartTimeWithinWindow({ startTime: "08:30", durationMinutes: 30, window: w })).toBe(false);
  });

  it("rejects a malformed start time", () => {
    expect(isStartTimeWithinWindow({ startTime: "9:00", durationMinutes: 30, window: w })).toBe(false);
  });

  it("treats a negative or fractional duration as zero-length", () => {
    expect(isStartTimeWithinWindow({ startTime: "17:00", durationMinutes: -30, window: w })).toBe(true);
    expect(isStartTimeWithinWindow({ startTime: "17:00", durationMinutes: 59.9, window: w })).toBe(true);
  });
});
