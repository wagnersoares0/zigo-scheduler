# @zigoschedule/scheduler-layout

The headless render model for Zigo Scheduler.

Use this package when you want to draw the scheduler yourself. It receives
appointments, professionals, blocks, business hours and a viewport size, then
returns rows, columns, positioned events, unavailable ranges and a hit-test
function.

It is useful for custom design systems, Vue/Svelte/Angular renderers, Canvas,
SVG, server-rendered HTML, or products that need the scheduling math without the
default UI.

## What The Model Solves

- Time and resource columns for day, week and month scheduling.
- Appointment positions, overlap lanes, visual buffer ranges and hidden month
  overflow counts.
- Business hours, professional-specific hours, breaks and blocked slots.
- IANA time-zone and DST-safe date math.
- Hit testing for custom drag, resize and range-selection implementations.
- Optional recurrence expansion when `@zigoschedule/scheduler-recurrence` is
  installed.

## Professional Scheduler Model

| Area | What the model gives a custom renderer |
| --- | --- |
| Geometry | Rows, columns, event rectangles, hidden month counts and unavailable ranges. |
| Resources | Resource/professional columns and resource-aware overlap lanes. |
| Time rules | Business hours, breaks, blocks, buffers and slot/week scale normalization. |
| Interaction support | Hit testing for drag, resize and range selection. |
| International use | Time-zone and locale-aware labels without forcing React or DOM rendering. |

The model does not include a horizontal resource timeline, multi-resource
appointment allocation, capacity booking or scheduling assistant yet. Those are
larger product features, not hidden switches in this package.

## Install

```bash
npm install @zigoschedule/scheduler-layout
```

## Example

```ts
import { buildAgendaLayout } from "@zigoschedule/scheduler-layout";

const model = buildAgendaLayout({
  date: new Date("2026-08-12T12:00:00.000Z"),
  view: "day",
  appointments: [
    {
      id: "field-001",
      startsAt: "2026-08-12T15:00:00.000Z",
      durationMinutes: 90,
      bufferAfterMinutes: 15,
      clientName: "Northside Office",
      professionalId: "tech-sam",
      status: "confirmed",
      services: { name: "HVAC maintenance", durationMinutes: 90, price: 180 },
    },
  ],
  professionals: [{ id: "tech-sam", name: "Sam Rivera", opensAt: "08:00", closesAt: "17:00" }],
  businessHours: { wednesday: { active: true, opensAt: "08:00", closesAt: "17:00" } },
  timeZone: "America/Chicago",
  locale: "en-US",
  width: 960,
  height: 640,
});

for (const event of model.events) {
  const node = document.createElement("div");
  node.style.left = `${event.left}px`;
  node.style.top = `${event.top}px`;
  node.style.width = `${event.width}px`;
  node.style.height = `${event.height}px`;
  node.textContent = `${event.timeLabel} ${event.title}`;
  grid.appendChild(node);
}
```

`slotMinutes` controls day density. `weekScaleMinutes` controls week density.
They are intentionally separate so a business can accept fine-grained bookings
without making a seven-day week view unreadable.

For month views, use `buildAgendaMonthLayout()` from the same package. It
returns month cells, visible entries and hidden-count metadata, so your renderer
can draw the month grid without rebuilding recurrence, time zone or overflow
logic.

For timed views, `event.startMinute` and `event.endMinute` remain the real
appointment. `event.bufferStartMinute` and `event.bufferEndMinute` include the
reserved preparation/cleanup window used for overlap lanes.
