# Zigo Scheduler

[![npm version](https://img.shields.io/npm/v/@zigoschedule/scheduler-react.svg)](https://www.npmjs.com/package/@zigoschedule/scheduler-react)
[![CI](https://github.com/wagnersoares0/zigo-scheduler/actions/workflows/ci.yml/badge.svg)](https://github.com/wagnersoares0/zigo-scheduler/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-111827.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-ready-2563eb.svg)](https://www.typescriptlang.org/)

Open-source scheduling UI and calendar logic for appointment-based products.
React, Web Component, CDN bundle and headless layout model from the same
engine.

Zigo Scheduler is built for real booking workflows: business hours by weekday,
professional-specific hours, lunch or break windows, drag and resize, month and
week views, time zones, localization, optional recurrence, and a headless layout
model for teams that want to draw their own UI. The package is meant to be the
front-end scheduling surface for a host product, not a generic date calendar.

**Use it when you need appointments, resources and business time to behave like
a product, not just events painted on a grid.**

- React package with packaged CSS and a built-in details modal.
- Framework-free `<zigo-scheduler>` Web Component for HTML, PHP, Laravel,
  Django, Rails, Vue, Svelte, Angular and static pages.
- Resource/professional columns, drag/drop, resize, buffers, blocked time,
  business hours, IANA time zones and DST-safe positioning.
- Optional RRULE recurrence and opt-in locale packs, so apps only load the
  pieces they actually use.

Quick links: [Install](#install-the-entry-you-need) ·
[Capability Matrix](#professional-scheduler-capability-matrix) ·
[React Example](#react-complete-minimum-example) ·
[Web Component](#html-php-laravel-django-rails) ·
[Headless Layout](#headless-layout) · [License](#license)

## What It Includes

- Built-in drag-and-drop for moving appointments to another time, day or
  professional/resource.
- Built-in resize for changing appointment duration.
- Visual overlap handling: conflicting cards share the lane side by side instead
  of covering each other.
- Optional `bufferBeforeMinutes` and `bufferAfterMinutes` fields for preparation,
  cleanup or travel time. Buffers reserve time visually and participate in
  conflict validation without changing the appointment label.
- Multi-professional and resource columns, including professional-specific
  hours.
- Business hours by weekday, closed days, lunch or break windows, and blocked
  slots.
- IANA time-zone support, such as `America/New_York`, `America/Los_Angeles`,
  `America/Sao_Paulo`, `Europe/London` and `Asia/Tokyo`.
- DST-safe rendering: appointment positions are calculated in the business time
  zone instead of using fixed offsets.
- Day, week and month views with configurable slot granularity.
- Ready React package, framework-free Web Component, CDN bundle, and headless
  layout model for custom renderers.
- Built-in appointment details modal/dialog with operational actions. Your app
  can use it, replace it, or keep click handling fully controlled.
- Standard status badges, payment indicators and keyboard-focus states for the
  default UI.
- Optional iCalendar RRULE recurrence through
  `@zigoschedule/scheduler-recurrence`, without forcing recurrence weight into
  apps that do not need it.
- Locale packs for scheduler-owned labels, dates, times, counts and actions.

It is not a backend. Tenants, users, permissions, payments, storage, reminders
and API calls stay in the host application. The scheduler receives already
scoped data, validates the calendar rules it knows about, renders the schedule,
and sends changes back through callbacks or DOM events.

## Professional Scheduler Capability Matrix

Zigo Scheduler is not positioned as a simple event calendar. It is built around
appointment operations: resources, business time, interaction, localization and
host-owned persistence.

| Capability | Status | What Zigo Scheduler Provides |
| --- | --- | --- |
| Day, week and month views | Included | Ready views in React and Web Component, plus a headless layout model. |
| Resource/professional columns | Included | Professionals, rooms, chairs or other resources can be rendered as columns. |
| Business hours by resource | Included | Global hours, weekday rules, breaks and per-professional schedule overrides. |
| Drag and drop | Included | Move appointments across time, day and professional/resource columns. |
| Resize | Included | Change duration by resizing appointments, using the same validation rules. |
| Range selection | Included | Select empty time ranges to open the host app's create flow. |
| Blocked time and breaks | Included | Blocks, lunch/break windows, closed days and unavailable ranges participate in validation. |
| Buffers before/after | Included | Preparation, cleanup or travel time reserves occupancy without changing the appointment label. |
| Conflict lanes | Included | Overlapping appointments are laid out side by side instead of covering each other. |
| Built-in details modal | Included | React modal and Web Component dialog for client, phone, service, status, payment and actions. |
| Status/payment badges | Included | Default UI separates appointment color from status and payment meaning. |
| IANA time zones and DST | Included | Rendering uses the business time zone, not fixed offsets or the user's machine by accident. |
| Locale packs | Included | Scheduler-owned UI text, dates, times, duration and currency can be localized per app. |
| RRULE recurrence | Optional package | `@zigoschedule/scheduler-recurrence` expands iCalendar RRULE only when imported. |
| React entry | Included | Controlled React component with packaged CSS. |
| HTML/PHP/Laravel/Django entry | Included | Framework-free `<zigo-scheduler>` Web Component with Shadow DOM styles. |
| CDN/no-build usage | Included | Global browser bundle for prototypes, sandboxes and server-rendered pages. |
| Headless/custom UI | Included | `@zigoschedule/scheduler-layout` returns rows, columns, events, buffers and hit testing. |
| Vue/Angular/Svelte usage | Supported via Web Component | Dedicated wrappers are not required for first adoption. |
| Keyboard accessibility | Partial | Cards are focusable buttons and open by keyboard; keyboard move/resize is roadmap. |
| Horizontal resource timeline | Roadmap | Current resource view is vertical columns; horizontal timeline is a future larger feature. |
| Multi-resource appointment | Roadmap | Current appointments attach to one primary resource; doctor + room + equipment is planned. |
| Capacity/group bookings | Roadmap | Current model is appointment-based; capacity slots/classes are planned. |
| Scheduling assistant | Roadmap | Finding best available time across people/resources belongs to a future assistant layer. |
| External drag from outside list | Roadmap | Internal drag/drop is included; external inventory-to-calendar drag is planned. |
| Export/print | Roadmap | The scheduler renders the operational UI; export and print are not in the package yet. |

## Install The Entry You Need

| Use case | Package |
| --- | --- |
| React application | `@zigoschedule/scheduler-react` |
| HTML, PHP, Laravel, Django, Rails, Vue, Svelte, Angular, Alpine | `@zigoschedule/scheduler-element` |
| No npm, just a script tag | `@zigoschedule/scheduler-element` global bundle |
| Custom UI with your own renderer | `@zigoschedule/scheduler-layout` |
| Recurring appointments | `@zigoschedule/scheduler-recurrence` |

Lower-level packages are published too, but most products should start with
React, the Web Component, or the headless layout package.

For repository development, use Node.js 22 or newer. That requirement is only
for contributors building this monorepo; the published packages run in the
browser and do not force Node 22 on consumer projects.

## React, Complete Minimum Example

```bash
npm install @zigoschedule/scheduler-react @zigoschedule/scheduler-core @zigoschedule/scheduler-engine
```

```tsx
import { Agenda } from "@zigoschedule/scheduler-react";
import type { Appointment, BusinessHours, Professional } from "@zigoschedule/scheduler-engine";
import "@zigoschedule/scheduler-react/styles.css";

const professionals: Professional[] = [
  {
    id: "clinic-maya",
    name: "Dr. Maya Lee",
    photoUrl: "/team/maya.jpg",
    opensAt: "09:00",
    closesAt: "17:00",
  },
  {
    id: "pet-noah",
    name: "Noah Carter",
    photoUrl: "/team/noah.jpg",
    opensAt: "08:30",
    closesAt: "16:30",
  },
  {
    id: "studio-ava",
    name: "Ava Brooks",
    photoUrl: "/team/ava.jpg",
    opensAt: "10:00",
    closesAt: "18:00",
  },
];

const businessHours: BusinessHours = {
  sunday: { active: false },
  monday: { active: true, opensAt: "09:00", closesAt: "18:00" },
  tuesday: { active: true, opensAt: "09:00", closesAt: "18:00" },
  wednesday: { active: true, opensAt: "09:00", closesAt: "18:00" },
  thursday: { active: true, opensAt: "09:00", closesAt: "18:00" },
  friday: { active: true, opensAt: "09:00", closesAt: "17:00" },
  saturday: { active: true, opensAt: "10:00", closesAt: "14:00" },
};

const appointments: Appointment[] = [
  {
    id: "clinic-001",
    startsAt: "2026-08-12T14:00:00.000Z",
    durationMinutes: 45,
    bufferAfterMinutes: 10,
    clientName: "Olivia Carter",
    clientPhone: "+1 415 555 0184",
    professionalId: "clinic-maya",
    status: "confirmed",
    paymentStatus: "pending",
    services: { name: "Physical therapy follow-up", durationMinutes: 45, price: 120 },
  },
  {
    id: "pet-001",
    startsAt: "2026-08-12T16:00:00.000Z",
    durationMinutes: 60,
    clientName: "Milo Johnson",
    professionalId: "pet-noah",
    status: "confirmed",
    services: { name: "Dog grooming", durationMinutes: 60, price: 75 },
  },
  {
    id: "studio-001",
    startsAt: "2026-08-12T18:30:00.000Z",
    durationMinutes: 50,
    clientName: "Emma Wilson",
    professionalId: "studio-ava",
    status: "pending",
    appointmentColor: "#7c3aed",
    services: { name: "Color consultation", durationMinutes: 50, price: 95 },
  },
];

export function ScheduleScreen() {
  return (
    <div style={{ height: 720, minHeight: 0 }}>
      <Agenda
        date={new Date("2026-08-12T12:00:00.000Z")}
        view="day"
        locale="en-US"
        timeZone="America/New_York"
        weekStartsOn={0}
        appointments={appointments}
        professionals={professionals}
        businessHours={businessHours}
        lunchBreak={{ startMinute: 12 * 60, endMinute: 13 * 60, startsAt: "12:00", endsAt: "13:00" }}
        onMove={({ appointmentId, startsAt, professionalId }) => {
          // Save the new instant and professional in your backend.
        }}
        onResize={({ appointmentId, durationMinutes }) => {
          // Save the new duration in your backend.
        }}
        detailsMode="modal"
        onDetailsAction={({ action, appointment }) => {
          // Route WhatsApp, reminder, edit, cancel or charge in your app.
        }}
        onBlocked={(message) => {
          // Show why the scheduler refused a move or selection.
        }}
      />
    </div>
  );
}
```

The React component is controlled. It does not store appointments for you. It
renders the props you pass and reports user intent through callbacks.

Import `@zigoschedule/scheduler-react/styles.css` once. You do not need to make
Tailwind scan `node_modules`; the package ships the CSS it needs.

## HTML, PHP, Laravel, Django, Rails

The Web Component works anywhere a page can load JavaScript. Use attributes for
simple configuration and properties for arrays or objects.

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
  import "https://cdn.jsdelivr.net/npm/@zigoschedule/scheduler-element@0.3.0/dist/zigo-scheduler.global.js";

  const schedule = document.getElementById("schedule");

  schedule.professionals = window.professionalsFromBackend;
  schedule.appointments = window.appointmentsFromBackend;
  schedule.businessHours = window.businessHoursFromBackend;

  schedule.addEventListener("move-event", (event) => {
    const { id, startsAt, endsAt, professionalId } = event.detail;
    // POST the ISO instants and professional to your backend.
  });

  schedule.addEventListener("appointment-action", (event) => {
    const { action, id } = event.detail;
    // Open WhatsApp, charge, cancel, remind, or edit in your app.
  });
</script>
```

No CSS import is needed for the Web Component. Its styles live inside the
shadow root, so your page CSS does not break the scheduler and the scheduler CSS
does not leak into your page.

Use `block-past-slots` when the browser must reject moves, resizes and
selections before the current business-zone time. Without it, past-time policy
stays entirely in your backend or host app.

## Headless Layout

Use `@zigoschedule/scheduler-layout` when your product already has a design
system and you only want the scheduling math.

```bash
npm install @zigoschedule/scheduler-layout
```

```ts
import { buildAgendaLayout } from "@zigoschedule/scheduler-layout";

const model = buildAgendaLayout({
  date: new Date("2026-08-12T12:00:00.000Z"),
  view: "day",
  appointments,
  professionals,
  businessHours,
  timeZone: "America/New_York",
  locale: "en-US",
  width: 960,
  height: 640,
});

model.columns;      // positioned days or professionals
model.rows;         // time rows with labels and pixel coordinates
model.events;       // positioned appointment cards, overlap lanes and buffers
model.unavailable;  // closed time and break windows
model.hitTest(420, 180);
```

The model is plain data. You can render it with Vue, Svelte, Angular, Canvas,
SVG, server-generated HTML, or hand-written DOM.

## Recurring Appointments

Recurring appointments are optional so teams that do not need them do not pay
for `rrule`.

```bash
npm install @zigoschedule/scheduler-recurrence @zigoschedule/scheduler-engine
```

```ts
import "@zigoschedule/scheduler-recurrence";
import type { Appointment } from "@zigoschedule/scheduler-engine";

const appointments: Appointment[] = [
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

The recurrence engine expands wall-clock time in the business time zone. A 3 PM
appointment stays 3 PM across daylight saving changes, even when the UTC instant
changes.

Occurrence ids use one convention:

```text
series-id@YYYY-MM-DD
weekly-therapy@2026-09-03
```

Use `parseOccurrenceId` from `@zigoschedule/scheduler-core` on the backend side
of your save flow. If the id is an occurrence, update the series override or
exception. If it is not, update the appointment directly.

## Data Contract

The public examples use English field names:

```ts
type Appointment = {
  id: string;
  startsAt: string;          // ISO instant
  durationMinutes: number;
  clientName: string;
  professionalId: string | null;
  status: "pending" | "confirmed" | "completed" | "canceled";
  paymentStatus?: "pending" | "paid" | "confirmed" | string | null;
  services?: { name: string; durationMinutes?: number; price?: number };
};
```

Legacy Portuguese backend fields also remain supported:
`data_hora`, `duracao_minutos`, `cliente_nome`, `profissional_id`,
`pagamento_status`, `servicos`, `nome`, `preco`, `abertura`, `fechamento` and
the recurrence aliases with `recorrencia`.

Business hours can be written with English weekday keys:

```ts
const businessHours = {
  monday: { active: true, opensAt: "09:00", closesAt: "18:00" },
  tuesday: { active: true, opensAt: "09:00", closesAt: "18:00" },
  sunday: { active: false },
};
```

## Localization

Pass `locale` and `timeZone` explicitly in production. The root package ships
English UI copy by default; import only the locale pack your product needs.

```tsx
import { frFRMessages } from "@zigoschedule/scheduler-core/locales/fr-FR";

<Agenda locale="fr-FR" messages={frFRMessages} timeZone="Europe/Paris" />
```

```js
import { esESMessages } from "@zigoschedule/scheduler-core/locales/es-ES";

const schedule = document.querySelector("zigo-scheduler");
schedule.setAttribute("locale", "es-ES");
schedule.setAttribute("timezone", "Europe/Madrid");
schedule.messages = esESMessages;
```

Supported locale packs: `en-US`, `pt-BR`, `es-ES`, `fr-FR`, `de-DE`, `ru-RU`,
`th-TH`, `it-IT`, `nl-NL`, `pl-PL`, `tr-TR`, `id-ID`, `ja-JP`, `ko-KR`,
`zh-CN`, `ar-SA` and `hi-IN`.

The scheduler localizes the interface it owns: labels, dates, times, counts,
status text, action labels, and blocking messages. Free text from your backend,
such as client names, service names, notes and block reasons, is rendered as you
send it. If your product is multilingual, localize that data in your app or API.

## What Is Inside

| Package | Purpose |
| --- | --- |
| `@zigoschedule/scheduler-core` | time zones, i18n, availability helpers, recurrence ids |
| `@zigoschedule/scheduler-engine` | event model, validation, resources, callbacks, geometry |
| `@zigoschedule/scheduler-layout` | headless render model |
| `@zigoschedule/scheduler-interaction` | pointer drag, resize, mirror and auto-scroll |
| `@zigoschedule/scheduler-element` | framework-free `<zigo-scheduler>` |
| `@zigoschedule/scheduler-react` | ready React components |
| `@zigoschedule/scheduler-recurrence` | optional RRULE recurrence plugin |

Only the React package has a React peer dependency. The Web Component does not
need React, and the core/layout packages do not touch the DOM.

## What It Does Not Do

- It does not store appointments.
- It does not authenticate users or tenants.
- It does not send reminders.
- It does not charge payments.
- It does not translate backend data fields such as service names or notes.
- It does not decide your permission model.

Those pieces belong to the product using the scheduler.

## Local Development

```bash
npm install
npm test
npm run typecheck
npm run lint
npm run build
npm run verify:package
npm run release:check
```

`release:check` is the publication gate. It runs the fast checks, builds the
packages, packs them, installs them outside the monorepo, and verifies the
browser-facing bundles.

## License

MIT.
