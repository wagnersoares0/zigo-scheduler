# @zigoschedule/scheduler-recurrence

Optional recurring appointments for Zigo Scheduler.

Use this package when the business has standing appointments: every Thursday,
every other week, the first Friday of the month, or a short daily series.

The package uses the iCalendar RRULE standard and expands occurrences in the
business time zone, so wall-clock time stays stable across daylight saving time.

Recurrence is intentionally outside the base React/Web Component bundles. Apps
with weekly clients, therapy plans, classes or maintenance routes can opt in;
simple appointment products do not carry RRULE weight.

## Install

```bash
npm install @zigoschedule/scheduler-recurrence @zigoschedule/scheduler-engine
```

Importing the package registers the recurrence expander used by the layout,
React package and Web Component.

```ts
import "@zigoschedule/scheduler-recurrence";
```

Without this package, an appointment with `recurrence` still appears once on its
own start date. It degrades, it does not break.

## Example

```ts
const appointments = [
  {
    id: "weekly-therapy",
    startsAt: "2026-08-13T19:00:00.000Z",
    durationMinutes: 60,
    clientName: "Ethan Miller",
    professionalId: "clinic-maya",
    status: "confirmed",
    services: { name: "Weekly therapy session", durationMinutes: 60, price: 150 },
    recurrence: "FREQ=WEEKLY;BYDAY=TH",
    recurrenceExceptions: ["2026-08-27"],
    recurrenceOverrides: {
      "2026-09-03": { startsAt: "2026-09-04T20:00:00.000Z", durationMinutes: 90 },
    },
  },
];
```

## Utilities

```ts
import {
  describeRecurrence,
  describeInPortuguese,
  expandRecurrence,
} from "@zigoschedule/scheduler-recurrence";

expandRecurrence({ rule, startsAt, durationMinutes, timeZone, range });

describeRecurrence("FREQ=WEEKLY;BYDAY=TH");          // "every Thursday"
describeInPortuguese("FREQ=WEEKLY;BYDAY=TH");        // "toda quinta"
```

Occurrence ids use `series-id@YYYY-MM-DD`. Parse them with
`parseOccurrenceId` from `@zigoschedule/scheduler-core` before saving a moved,
resized or canceled occurrence.
