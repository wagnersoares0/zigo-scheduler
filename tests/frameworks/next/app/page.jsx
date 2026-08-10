import "@zigoschedule/scheduler-element";
import { buildAgendaLayout } from "@zigoschedule/scheduler-layout";
import SchedulerClient from "./SchedulerClient";
import {
  DAY_KEY,
  TIME_ZONE,
  businessHours,
  initialAppointments,
  professionals,
} from "./data";

const layout = buildAgendaLayout({
  date: new Date(`${DAY_KEY}T12:00:00`),
  view: "day",
  timeZone: TIME_ZONE,
  appointments: initialAppointments,
  professionals,
  businessHours,
  width: 900,
  height: 600,
});

export default function Page() {
  return (
    <main className="page">
      <p data-testid="ssr-proof">
        SSR columns: {layout.columns.length}; events: {layout.events.length}
      </p>
      <SchedulerClient />
    </main>
  );
}
