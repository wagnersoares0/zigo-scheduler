import { describe, expect, it } from "vitest";
import { describeInEnglish, describeRecurrence } from "../describe";

/**
 * The public default is English. Portuguese remains native and explicit.
 */
const describePt = (rule: string): string => describeRecurrence(rule, "pt-BR");

describe("default locale", () => {
  it("describes rules in English by default", () => {
    expect(describeRecurrence("FREQ=WEEKLY;BYDAY=TU")).toBe("every Tuesday");
    expect(describeRecurrence("FREQ=WEEKLY;INTERVAL=2;BYDAY=TH")).toBe("every other week on Thursday");
  });
});

describe("weekly rules in Portuguese", () => {
  it("matches the article to the weekday", () => {
    expect(describePt("FREQ=WEEKLY;BYDAY=TU")).toBe("toda terça");
    expect(describePt("FREQ=WEEKLY;BYDAY=SA")).toBe("todo sábado");
    expect(describePt("FREQ=WEEKLY;BYDAY=SU")).toBe("todo domingo");
  });

  it("lists multiple days with the final Portuguese conjunction", () => {
    expect(describePt("FREQ=WEEKLY;BYDAY=MO,WE,FR")).toBe(
      "toda segunda, quarta e sexta"
    );
    expect(describePt("FREQ=WEEKLY;BYDAY=TU,TH")).toBe("toda terça e quinta");
  });

  it("uses the natural biweekly wording", () => {
    expect(describePt("FREQ=WEEKLY;INTERVAL=2;BYDAY=TH")).toBe(
      "quinzenal, na quinta"
    );
    expect(describePt("FREQ=WEEKLY;INTERVAL=2;BYDAY=SA")).toBe(
      "quinzenal, no sábado"
    );
  });

  it("counts weeks when the interval is larger", () => {
    expect(describePt("FREQ=WEEKLY;INTERVAL=3;BYDAY=MO")).toBe(
      "a cada 3 semanas, na segunda"
    );
  });

  it("works without an explicit weekday", () => {
    expect(describePt("FREQ=WEEKLY")).toBe("toda semana");
    expect(describePt("FREQ=WEEKLY;INTERVAL=2")).toBe("quinzenal");
  });
});

describe("monthly rules in Portuguese", () => {
  it("understands weekday positions in the month", () => {
    expect(describePt("FREQ=MONTHLY;BYDAY=1FR")).toBe("na primeira sexta do mês");
    expect(describePt("FREQ=MONTHLY;BYDAY=+3FR")).toBe("na terceira sexta do mês");
    expect(describePt("FREQ=MONTHLY;BYDAY=-1FR")).toBe("na última sexta do mês");
  });

  it("understands month days", () => {
    expect(describePt("FREQ=MONTHLY;BYMONTHDAY=15")).toBe("todo dia 15");
    expect(describePt("FREQ=MONTHLY;BYMONTHDAY=1,15")).toBe("todo dia 1 e 15");
  });

  it("works without extra details", () => {
    expect(describePt("FREQ=MONTHLY")).toBe("todo mês");
    expect(describePt("FREQ=MONTHLY;INTERVAL=2")).toBe("a cada 2 meses");
  });
});

describe("daily and yearly rules in Portuguese", () => {
  it("keeps obvious rules short", () => {
    expect(describePt("FREQ=DAILY")).toBe("todo dia");
    expect(describePt("FREQ=DAILY;INTERVAL=3")).toBe("a cada 3 dias");
    expect(describePt("FREQ=YEARLY")).toBe("todo ano");
  });
});

describe("series endings in Portuguese", () => {
  it("counts occurrences", () => {
    expect(describePt("FREQ=DAILY;COUNT=10")).toBe("todo dia, 10 vezes");
    expect(describePt("FREQ=DAILY;COUNT=1")).toBe("todo dia, 1 vez");
  });

  it("shows the limit date in the locale format", () => {
    expect(describePt("FREQ=WEEKLY;BYDAY=TU;UNTIL=20261231T235959Z")).toBe(
      "toda terça, até 31/12/2026"
    );
  });
});

describe("robustness", () => {
  it("accepts the RRULE prefix", () => {
    expect(describePt("RRULE:FREQ=WEEKLY;BYDAY=TU")).toBe("toda terça");
  });

  it("returns empty for invalid rules", () => {
    // The label cannot crash the scheduler or invent copy for junk input.
    expect(describeRecurrence("not a rule")).toBe("");
    expect(describeRecurrence("")).toBe("");
    expect(describeRecurrence("FREQ=SEMPRE")).toBe("");
  });

  it("falls back to English when the locale vocabulary does not cover the rule", () => {
    // Better an English sentence than no sentence. `BYHOUR` has no Portuguese
    // wording here, and the rule is valid.
    const phrase = describePt("FREQ=HOURLY;INTERVAL=6");
    expect(phrase).not.toBe("");
    expect(phrase.toLowerCase()).toContain("hour");
  });
});

describe("original rrule text", () => {
  it("stays available for callers that want English", () => {
    expect(describeInEnglish("FREQ=WEEKLY;BYDAY=TU")).toContain("Tuesday");
    expect(describeInEnglish("invalid rule")).toBe("");
  });
});
