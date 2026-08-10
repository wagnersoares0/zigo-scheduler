// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { AgendaConfigProvider, useAgendaTimeZone } from "../AgendaConfigContext";
import { DEFAULT_TIME_ZONE } from "@zigoschedule/scheduler-core";

function ShowZone() {
  return <span>{useAgendaTimeZone()}</span>;
}

const zoneSeenBy = (node: React.ReactElement): string => {
  const html = renderToStaticMarkup(node);
  return html.replace(/<\/?span>/g, "");
};

describe("AgendaConfigProvider", () => {
  it("hands the configured zone to the tree below it", () => {
    expect(
      zoneSeenBy(
        <AgendaConfigProvider timeZone="America/Manaus">
          <ShowZone />
        </AgendaConfigProvider>
      )
    ).toBe("America/Manaus");
  });

  it("falls back to the default when no zone is given", () => {
    expect(
      zoneSeenBy(
        <AgendaConfigProvider>
          <ShowZone />
        </AgendaConfigProvider>
      )
    ).toBe(DEFAULT_TIME_ZONE);
  });

  it("falls back rather than accepting an unusable zone", () => {
    // Shifting every appointment on screen is worse than ignoring bad config.
    for (const bad of ["America/Nowhere", "BRT", "-03:00"]) {
      expect(
        zoneSeenBy(
          <AgendaConfigProvider timeZone={bad}>
            <ShowZone />
          </AgendaConfigProvider>
        )
      ).toBe(DEFAULT_TIME_ZONE);
    }
  });

  it("works without a provider so components render in isolation", () => {
    expect(zoneSeenBy(<ShowZone />)).toBe(DEFAULT_TIME_ZONE);
  });

  it("keeps nested providers scoped to their own subtree", () => {
    const html = renderToStaticMarkup(
      <AgendaConfigProvider timeZone="America/Sao_Paulo">
        <ShowZone />
        <AgendaConfigProvider timeZone="Europe/Lisbon">
          <ShowZone />
        </AgendaConfigProvider>
      </AgendaConfigProvider>
    );
    expect(html).toBe("<span>America/Sao_Paulo</span><span>Europe/Lisbon</span>");
  });
});
