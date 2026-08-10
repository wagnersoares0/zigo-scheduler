import { describe, expect, it } from "vitest";

import {
  DEFAULT_APPOINTMENT_COLOR,
  normalizeAppointmentColor,
  normalizeAppointmentColorMode,
  resolveAppointmentColor,
} from "../appointment-colors";

describe("appointment colors", () => {
  it("accepts only the supported palette", () => {
    expect(normalizeAppointmentColor("#F97316")).toBe("#F97316");
    expect(normalizeAppointmentColor(" #D946EF ")).toBe("#D946EF");
    expect(normalizeAppointmentColor("#059669")).toBe("#059669");
    expect(normalizeAppointmentColor("#ffffff")).toBeNull();
  });

  it("keeps the default mode for invalid values", () => {
    expect(normalizeAppointmentColorMode("appointment")).toBe("appointment");
    expect(normalizeAppointmentColorMode("por_cliente")).toBe("appointment");
    expect(normalizeAppointmentColorMode("default")).toBe("default");
    expect(normalizeAppointmentColorMode("qualquer_coisa")).toBe("default");
  });

  it("allows a manual appointment color without changing the default modes", () => {
    expect(
      resolveAppointmentColor({
        mode: "default",
        defaultColor: "#0F766E",
        appointmentColor: "#DB2777",
        appointmentColorIsCustom: true,
      }),
    ).toBe("#DB2777");
    expect(
      resolveAppointmentColor({
        mode: "appointment",
        defaultColor: "#0F766E",
        appointmentColor: "#DB2777",
      }),
    ).toBe("#DB2777");
    expect(
      resolveAppointmentColor({
        mode: "padrao",
        defaultColor: "#0F766E",
        appointmentColor: "#DB2777",
      }),
    ).toBe("#0F766E");
    expect(
      resolveAppointmentColor({
        mode: "por_cliente",
        defaultColor: null,
        appointmentColor: null,
      }),
    ).toBe(DEFAULT_APPOINTMENT_COLOR);
  });
});
