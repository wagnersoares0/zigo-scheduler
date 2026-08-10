# @zigoschedule/scheduler-engine

The pure TypeScript engine behind Zigo Scheduler.

Most applications should not install this package directly. It is already used
by the React package, the Web Component and the headless layout package.

Install it directly when you need the lower-level pieces: event adaptation,
resource inputs, validation, hit-test contracts, overlap layout, status helpers,
time utilities, appointment buffer helpers or public TypeScript types.

The engine is where professional scheduler rules are normalized before a UI
draws them: appointment duration, buffers, resource ids, blocked time, business
hours, status, callbacks and FullCalendar-like option names. It does not render
React, Web Components or DOM.

## Install

```bash
npm install @zigoschedule/scheduler-engine
```

## Example

```ts
import {
  adaptAgendaEvents,
  buildAgendaResourceInputs,
  normalizeAppointmentStatus,
} from "@zigoschedule/scheduler-engine";

const events = adaptAgendaEvents({
  appointments: [
    {
      id: "clinic-001",
      startsAt: "2026-08-12T14:00:00.000Z",
      durationMinutes: 45,
      bufferAfterMinutes: 10,
      clientName: "Olivia Carter",
      professionalId: "clinic-maya",
      status: "confirmed",
    },
  ],
  blocks: [],
}, "America/New_York");

const resources = buildAgendaResourceInputs({
  professionals: [
    { id: "clinic-maya", name: "Dr. Maya Lee", opensAt: "09:00", closesAt: "17:00" },
  ],
});

normalizeAppointmentStatus("cancelled"); // "canceled"
```

The engine does not touch the DOM and does not depend on React.
