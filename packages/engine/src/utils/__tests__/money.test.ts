import { describe, expect, it } from "vitest";
import { parseMoneyInput } from "../money";

describe("parseMoneyInput", () => {
  it("accepts decimal and thousands separators used by common locales", () => {
    expect(parseMoneyInput("R$ 1.500")).toBe(1500);
    expect(parseMoneyInput("R$ 1.500,00")).toBe(1500);
    expect(parseMoneyInput("$1,500.00")).toBe(1500);
    expect(parseMoneyInput("$12.34")).toBe(12.34);
    expect(parseMoneyInput("12,34")).toBe(12.34);
  });
});
