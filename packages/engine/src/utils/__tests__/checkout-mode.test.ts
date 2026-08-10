import { describe, expect, it } from "vitest";

import { getAppointmentCheckoutMode } from "../checkout-mode";

describe("getAppointmentCheckoutMode", () => {
  it("classifies only a future date as prepaid checkout", () => {
    expect(getAppointmentCheckoutMode("2026-07-27", "2026-07-26")).toBe("antecipado");
  });

  it("keeps regular checkout on the same day and for past dates", () => {
    expect(getAppointmentCheckoutMode("2026-07-26", "2026-07-26")).toBe("regular");
    expect(getAppointmentCheckoutMode("2026-07-25", "2026-07-26")).toBe("regular");
  });

  it("does not classify invalid dates as prepaid", () => {
    expect(getAppointmentCheckoutMode("tomorrow", "2026-07-26")).toBe("regular");
    expect(getAppointmentCheckoutMode("2026-99-40", "2026-07-26")).toBe("regular");
  });
});
