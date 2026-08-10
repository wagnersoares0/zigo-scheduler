# @zigoschedule/scheduler-react

The ready-to-render React entry point for Zigo Scheduler.

Use this package when your application is already React and you want the full
calendar surface: day, week and month views, drag and resize, resource columns,
time-zone aware labels, localization, blocked slots, visual buffers and
appointment callbacks.

## Built-In Capabilities

- Drag appointments to another slot, day or professional/resource.
- Resize appointments to change duration.
- Split overlapping appointments side by side instead of stacking them on top of
  each other.
- Reserve preparation, cleanup or travel time with `bufferBeforeMinutes` and
  `bufferAfterMinutes`.
- Render multi-professional schedules with resource columns.
- Enforce business hours, professional hours, breaks and blocked slots.
- Render in IANA time zones and keep wall-clock appointments stable across DST.
- Open a built-in centered appointment details modal, or keep clicks fully
  controlled with your own modal/drawer.
- Use standard status/payment badges and visible keyboard focus in the default
  UI.
- Use packaged CSS directly; no Tailwind scan of `node_modules` is required.
- Add RRULE/iCalendar recurrence only when needed with
  `@zigoschedule/scheduler-recurrence`.

The component is controlled. You pass `appointments`, `professionals`,
`businessHours` and `blocks`; the component reports user actions through
callbacks. Your app still owns persistence.

## Professional Scheduler Features

| Area | Included in this React entry |
| --- | --- |
| Interaction | Drag/drop, resize, range selection, blocked move feedback and appointment click. |
| Resources | Professional/resource columns, resource-specific hours and resource-aware conflicts. |
| Time rules | Business hours, closed days, breaks, blocked slots, buffers and slot granularity. |
| International use | IANA time zones, DST-safe positioning, locale packs, AM/PM and 24h formatting. |
| Operational UI | Appointment cards, status/payment badges, built-in details modal and host-owned actions. |
| Extensibility | Controlled props, callbacks, custom messages, optional recurrence and headless escape hatch. |

Roadmap, not promised in this package yet: horizontal resource timeline,
multi-resource appointments, capacity/group bookings, keyboard move/resize,
external drag from an outside list and scheduling assistant.

## Install

```bash
npm install @zigoschedule/scheduler-react @zigoschedule/scheduler-core @zigoschedule/scheduler-engine
```

React 18 or newer is a peer dependency.

Import the packaged CSS once in your app entry:

```tsx
import "@zigoschedule/scheduler-react/styles.css";
```

No Tailwind setup is required for the scheduler CSS.

## Minimal Example

```tsx
import { Agenda } from "@zigoschedule/scheduler-react";
import type { Appointment, BusinessHours, Professional } from "@zigoschedule/scheduler-engine";
import "@zigoschedule/scheduler-react/styles.css";

const professionals: Professional[] = [
  { id: "clinic-maya", name: "Dr. Maya Lee", opensAt: "09:00", closesAt: "17:00" },
  { id: "pet-noah", name: "Noah Carter", opensAt: "08:30", closesAt: "16:30" },
];

const businessHours: BusinessHours = {
  monday: { active: true, opensAt: "09:00", closesAt: "18:00" },
  tuesday: { active: true, opensAt: "09:00", closesAt: "18:00" },
  wednesday: { active: true, opensAt: "09:00", closesAt: "18:00" },
  thursday: { active: true, opensAt: "09:00", closesAt: "18:00" },
  friday: { active: true, opensAt: "09:00", closesAt: "17:00" },
  saturday: { active: false },
  sunday: { active: false },
};

const appointments: Appointment[] = [
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

export function Schedule() {
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
        onMove={({ appointmentId, startsAt, professionalId }) => {
          // Save in your backend.
        }}
        onResize={({ appointmentId, durationMinutes }) => {
          // Save in your backend.
        }}
        onDetailsAction={({ action, appointment }) => {
          // Route modal actions to your backend, CRM, WhatsApp or checkout flow.
        }}
      />
    </div>
  );
}
```

## Layout Contract

Give the parent element a real height: `720px`, `100vh`, or a flex/grid area
that stretches. The scheduler fills `width: 100%` and `height: 100%`. Without a
height, the vertical scroll area has no reliable frame.

Use `slotMinutes` for day view density: `5`, `10`, `15`, `20` or `30`.
Use `weekScaleMinutes` for week view density: `30` or `60`.

## Appointment Details

By default, the React package opens a centered details modal when no
`onSelectAppointment` callback is supplied. The modal reads the same
appointment data as the grid: client, phone, service, professional, status,
notes, price and localized time labels.

```tsx
<Agenda
  detailsMode="modal"
  detailsActions={["whatsapp", "reminder", "edit", "cancel", "charge"]}
  onDetailsAction={({ action, appointment }) => {
    // Persist or route the command in your own backend.
  }}
/>
```

Use `detailsMode="callback"` when your product already has its own modal,
drawer or route. The scheduler still emits `onSelectAppointment`; it does not
save hidden state or call your backend by itself.

## Buffers And Conflicts

Use `bufferBeforeMinutes` and `bufferAfterMinutes` on an appointment when a
service needs preparation, cleanup or travel time around the real booking.

```ts
const appointment = {
  id: "clinic-001",
  startsAt: "2026-08-12T14:00:00.000Z",
  durationMinutes: 45,
  bufferBeforeMinutes: 10,
  bufferAfterMinutes: 15,
  professionalId: "clinic-maya",
  status: "confirmed",
};
```

The card still says `10:00 - 10:45`. The buffer is shown as reserved time and is
used for conflict validation, so another appointment cannot be dropped into the
cleanup window by accident.

## Localization

```tsx
import { deDEMessages } from "@zigoschedule/scheduler-core/locales/de-DE";

<Agenda locale="de-DE" messages={deDEMessages} timeZone="Europe/Berlin" />
```

The root bundle ships English UI copy. Other languages are locale packs, so a
German app imports German instead of loading every translation.

The package localizes scheduler-owned text, dates, times, counts and action
labels. Client names, service names, notes and block reasons are host data; pass
them already localized if your product is multilingual.

Supported locale packs: `en-US`, `pt-BR`, `es-ES`, `fr-FR`, `de-DE`, `ru-RU`,
`th-TH`, `it-IT`, `nl-NL`, `pl-PL`, `tr-TR`, `id-ID`, `ja-JP`, `ko-KR`,
`zh-CN`, `ar-SA` and `hi-IN`.

Override only the terms you need:

```tsx
<Agenda
  locale="en-US"
  messages={{ details: { charge: "Collect payment" } }}
/>
```

## When Not To Use This Package

Use `@zigoschedule/scheduler-element` for non-React pages. Use
`@zigoschedule/scheduler-layout` when you want to draw every pixel yourself.
