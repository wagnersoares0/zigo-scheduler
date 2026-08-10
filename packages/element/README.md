# @zigoschedule/scheduler-element

The framework-free Web Component entry point: `<zigo-scheduler>`.

Use it in server-rendered pages, PHP, Laravel, Django, Rails, Vue, Svelte,
Angular, Alpine, static HTML, or any page that can load a module script.

The component includes the scheduler UI, day/week/month views, drag and resize,
range selection and a built-in appointment details dialog. It does not require a
CSS import; styles are isolated inside the shadow root.

## Built-In Capabilities

- Drag appointments to another slot, day or professional/resource.
- Resize appointments to change duration.
- Split overlapping appointments side by side.
- Reserve preparation, cleanup or travel time with `bufferBeforeMinutes` and
  `bufferAfterMinutes`.
- Render multi-professional schedules with resource columns.
- Enforce business hours, professional hours, breaks and blocked slots.
- Render in IANA time zones and keep wall-clock appointments stable across DST.
- Use in HTML, PHP, Laravel, Django, Rails or any server-rendered page.
- Add RRULE/iCalendar recurrence only when needed with
  `@zigoschedule/scheduler-recurrence`.

## Professional Scheduler Features

| Area | Included in `<zigo-scheduler>` |
| --- | --- |
| Interaction | Drag/drop, resize, range selection, blocked move feedback and appointment events. |
| Resources | Professional/resource columns, resource-specific hours and resource-aware conflicts. |
| Time rules | Business hours, closed days, breaks, blocked slots, buffers and slot granularity. |
| International use | IANA time zones, DST-safe positioning, locale messages, AM/PM and 24h formatting. |
| Operational UI | Shadow DOM styles, appointment cards, built-in details dialog and action events. |
| Integration | Works in HTML, PHP, Laravel, Django, Rails, CMS pages and no-build prototypes. |

Roadmap, not included yet: horizontal resource timeline, multi-resource
appointments, capacity/group bookings, keyboard move/resize, external drag from
an outside list and scheduling assistant.

For every attribute, property, DOM event and edge-case rule, see the repository
[`API_REFERENCE.md`](https://github.com/wagnersoares0/zigo-scheduler/blob/main/API_REFERENCE.md).

## Install

```bash
npm install @zigoschedule/scheduler-element @zigoschedule/scheduler-core
```

With a bundler:

```ts
import "@zigoschedule/scheduler-element";
```

With a CDN:

```html
<script type="module"
  src="https://cdn.jsdelivr.net/npm/@zigoschedule/scheduler-element@0.3.2/dist/zigo-scheduler.global.js"></script>
```

## Minimal Example

```html
<style>
  .schedule-shell { height: 720px; min-height: 0; }
  zigo-scheduler { display: block; height: 100%; }
</style>

<div class="schedule-shell">
  <zigo-scheduler
    id="schedule"
    date="2026-08-12"
    view="week"
    timezone="America/New_York"
    locale="en-US"
    week-starts-on="0"
    block-past-slots
  ></zigo-scheduler>
</div>

<script type="module">
  import "@zigoschedule/scheduler-element";

  const schedule = document.getElementById("schedule");

  schedule.professionals = [
    { id: "clinic-maya", name: "Dr. Maya Lee", opensAt: "09:00", closesAt: "17:00" },
    { id: "pet-noah", name: "Noah Carter", opensAt: "08:30", closesAt: "16:30" },
  ];

  schedule.businessHours = {
    monday: { active: true, opensAt: "09:00", closesAt: "18:00" },
    tuesday: { active: true, opensAt: "09:00", closesAt: "18:00" },
    sunday: { active: false },
  };

  schedule.appointments = [
    {
      id: "clinic-001",
      startsAt: "2026-08-12T14:00:00.000Z",
      durationMinutes: 45,
      bufferAfterMinutes: 10,
      clientName: "Olivia Carter",
      professionalId: "clinic-maya",
      status: "confirmed",
      services: { name: "Physical therapy follow-up", durationMinutes: 45, price: 120 },
    },
  ];

  schedule.addEventListener("move-event", (event) => {
    const { id, startsAt, endsAt, professionalId } = event.detail;
    // Persist the ISO instants and professional in your backend.
  });
</script>
```

## Attributes

`view`, `date`, `timezone`, `locale`, `slot-minutes`, `week-scale`,
`row-height`, `column-min-width`, `scroll-to-now`, `week-starts-on`, `details`
and `block-past-slots`.

Use attributes for scalar configuration. Use properties for arrays and objects:
`appointments`, `professionals`, `businessHours`, `blocks`, `lunchBreak`,
`colorByProfessional` and `messages`.

## Events

`select-event`, `select-slot`, `select-range`, `select-day`, `move-event`,
`resize-event` and `appointment-action`.

The component never saves data on its own. It emits intent, and the host app
decides what to save.

`move-event` and `resize-event` include the minute-based fields plus
`startsAt` and `endsAt` ISO instants calculated in the configured `timezone`.

`appointment-action` emits `{ action, id }`. Keep private appointment data in
your application state or API; the DOM event only carries the intent.

## Localization

Set `locale` and `timezone` explicitly in production. The Web Component
localizes scheduler-owned text and formatting. Free text from your backend, such
as service names and notes, is rendered exactly as provided.

The root bundle ships English UI copy. In bundled apps, import only the locale
pack you need before rendering the element:

```js
import { esESMessages } from "@zigoschedule/scheduler-core/locales/es-ES";
import "@zigoschedule/scheduler-element";

document.querySelector("zigo-scheduler").messages = esESMessages;
```
