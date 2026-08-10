# Zigo Scheduler API Reference

This reference documents the public surface intended for application teams.
Everything here is controlled by the host app: Zigo Scheduler renders scheduling
state and emits user intent, but it never persists appointments by itself.

## React: `<Agenda />`

Import the ready React component and its CSS:

```tsx
import { Agenda, type AgendaProps } from "@zigoschedule/scheduler-react";
import "@zigoschedule/scheduler-react/styles.css";
```

### Required Props

| Prop | Type | Purpose |
| --- | --- | --- |
| `date` | `Date` | Anchor date. In week mode, this date decides the visible week. |
| `appointments` | `Appointment[]` | Appointments to draw. The array is never mutated. |
| `professionals` | `Professional[]` | Resource columns: professionals, rooms, chairs, equipment groups or any primary resource. |

### Data And Time Props

| Prop | Type | Default | Purpose |
| --- | --- | --- | --- |
| `blocks` | `Block[]` | `[]` | Unavailable ranges such as maintenance, time off or holidays. |
| `businessHours` | `BusinessHours \| null` | `null` | Opening rules by weekday. |
| `defaultHours` | `{ opensAt: string; closesAt: string }` | `08:00-18:00` | Fallback when a weekday is not configured. |
| `lunchBreak` | `BreakWindow \| null` | `null` | Shared break window. A professional break overrides it. |
| `timeZone` | IANA string | package default | Business time zone. Use `America/New_York`, `Europe/Lisbon`, `Asia/Tokyo`, etc. |
| `locale` | string | `en-US` | Built-in UI/date/time locale. |
| `messages` | `AgendaMessagesInput` | `undefined` | Override scheduler-owned labels and aria text. |
| `blockPastSlots` | boolean | `true` | Blocks selecting or moving into past slots in the configured business time zone. |

### View And Layout Props

| Prop | Type | Default | Purpose |
| --- | --- | --- | --- |
| `view` | `"day" \| "week" \| "month"` | `"week"` | Visible scheduler view. |
| `slotMinutes` | `5 \| 10 \| 15 \| 20 \| 30` | `30` | Day-view granularity. Invalid values fall back safely. |
| `weekScaleMinutes` | `30 \| 60` | `30` | Week-view visual scale. Kept separate so fine day booking does not make week view unreadable. |
| `weekStartsOn` | `0 \| 1` | package default | `0` Sunday, `1` Monday. |
| `columnMinWidth` | number | internal default | Minimum width for each day/resource column. |
| `rowHeight` | number | `32` | Minimum slot-row height. Raise it for a taller, scrollable grid. |
| `editable` | boolean | `true` | Enables drag/drop and resize. |

### Color And Details Props

| Prop | Type | Default | Purpose |
| --- | --- | --- | --- |
| `colorMode` | `"appointment" \| "default"` | `"appointment"` | Uses appointment colors or a single default color. Legacy aliases still work. |
| `defaultColor` | hex string | package default | Fallback appointment color. |
| `detailsMode` | `"auto" \| "modal" \| "callback"` | `"auto"` | Built-in details modal behavior. |
| `detailsActions` | `AppointmentDetailsAction[]` | all default actions | Buttons shown in the built-in details modal. |

### React Callbacks

| Callback | Payload | When It Fires |
| --- | --- | --- |
| `onMove` | `{ appointmentId, startsAt, professionalId }` | After a valid drag/drop or keyboard move. `startsAt` is an ISO instant in the configured time zone. |
| `onResize` | `{ appointmentId, durationMinutes, startsAt? }` | After a valid resize. `startsAt` is present when resizing from the start edge. |
| `onSelectAppointment` | `(appointment, dayKey)` | When an appointment is opened and the host owns selection. |
| `onDetailsAction` | `{ action, appointment }` | When a built-in modal action is clicked. The host app decides what to do. |
| `onBlocked` | `message` | When a move, resize or selection is rejected by business rules. |
| `onSelectRange` | `{ dayKey, startMinute, endMinute, professionalId }` | When the user selects an empty time range. |

### Keyboard Behavior

Appointment cards are focusable buttons.

| Shortcut | Behavior |
| --- | --- |
| `Enter` / `Space` | Open the appointment. |
| `Alt+ArrowUp` / `Alt+ArrowDown` | Move the appointment by one visible slot. |
| `Alt+ArrowLeft` / `Alt+ArrowRight` | Move to the previous or next visible column. |
| `Alt+Shift+ArrowUp` / `Alt+Shift+ArrowDown` | Shorten or extend the appointment by one visible slot. |

Keyboard changes go through the same validation path as pointer drag and resize:
business hours, professional hours, breaks, blocks, conflicts, buffers, locked
statuses and past-slot guards.

## Web Component: `<zigo-scheduler>`

Import once in bundled apps:

```ts
import "@zigoschedule/scheduler-element";
```

Or use the browser bundle:

```html
<script type="module"
  src="https://cdn.jsdelivr.net/npm/@zigoschedule/scheduler-element@0.3.2/dist/zigo-scheduler.global.js"></script>
```

### Attributes

Use attributes for scalar configuration:

| Attribute | Example | Purpose |
| --- | --- | --- |
| `date` | `2026-08-12` | Anchor date. |
| `view` | `day`, `week`, `month` | Visible view. |
| `timezone` | `America/New_York` | Business IANA time zone. |
| `locale` | `en-US` | UI/date/time locale. |
| `slot-minutes` | `15` | Day-view granularity. |
| `week-scale` | `30` | Week-view scale. |
| `row-height` | `32` | Slot row height. |
| `column-min-width` | `220` | Minimum resource/day column width. |
| `week-starts-on` | `0` or `1` | Sunday or Monday week start. |
| `details` | `off` | Disables the built-in details sheet. |
| `block-past-slots` | present/absent | Enables past-slot guards. |

Use properties for arrays and objects:

```js
schedule.appointments = appointments;
schedule.professionals = professionals;
schedule.businessHours = businessHours;
schedule.blocks = blocks;
schedule.lunchBreak = { startMinute: 720, endMinute: 780 };
schedule.messages = customMessages;
schedule.colorByProfessional = { "dr-lee": "#2563eb" };
```

### Web Component Events

| Event | Cancelable | Detail |
| --- | --- | --- |
| `select-event` | no | Appointment/block selection. |
| `select-slot` | no | Single slot click. |
| `select-range` | yes | Empty range selection. Call `preventDefault()` to reject. |
| `select-day` | no | Month/day selection. |
| `move-event` | yes | `{ id, dayKey, startMinute, endMinute, startsAt, endsAt, professionalId }`. |
| `resize-event` | yes | `{ id, dayKey, startMinute, endMinute, startsAt, endsAt, durationMinutes, professionalId }`. |
| `appointment-action` | no | `{ action, id }` from the built-in details sheet. |

Cancelable move/resize/range events revert the visual state when the host calls
`event.preventDefault()`.

## Public Data Types

### `Appointment`

Core fields:

```ts
type Appointment = {
  id: string;
  startsAt?: string;
  durationMinutes?: number;
  clientName?: string;
  clientPhone?: string | null;
  professionalId?: string | null;
  status: string;
  services?: { name?: string; durationMinutes?: number | null; price?: number | null } | Array<{
    name?: string;
    durationMinutes?: number | null;
    price?: number | null;
  }> | null;
  price?: number | null;
  notes?: string | null;
  appointmentColor?: string | null;
  bufferBeforeMinutes?: number | null;
  bufferAfterMinutes?: number | null;
  recurrence?: string | null;
  recurrenceExceptions?: string[] | null;
  recurrenceOverrides?: Record<string, AppointmentOccurrenceOverride> | null;
};
```

Legacy Portuguese aliases remain supported for existing Zigo backends, but new
public integrations should prefer the English field names.

### `Professional`

```ts
type Professional = {
  id: string;
  name?: string;
  photoUrl?: string | null;
  opensAt?: string | null;
  closesAt?: string | null;
  schedule?: ProfessionalDaySchedule[];
};
```

Use professionals for any primary resource the grid columns should represent:
staff, rooms, chairs, courts, trucks or service lanes.

### `BusinessHours`

```ts
type BusinessHours = {
  monday?: { active?: boolean; opensAt?: string | null; closesAt?: string | null };
  tuesday?: { active?: boolean; opensAt?: string | null; closesAt?: string | null };
  wednesday?: { active?: boolean; opensAt?: string | null; closesAt?: string | null };
  thursday?: { active?: boolean; opensAt?: string | null; closesAt?: string | null };
  friday?: { active?: boolean; opensAt?: string | null; closesAt?: string | null };
  saturday?: { active?: boolean; opensAt?: string | null; closesAt?: string | null };
  sunday?: { active?: boolean; opensAt?: string | null; closesAt?: string | null };
};
```

Professional schedules can override global hours per weekday.

## Errors And Edge Cases

- Invalid or missing appointment timing is ignored by layout builders instead of
  crashing the grid.
- Unsupported granularities are normalized to safe values.
- Nonexistent DST wall-clock times throw a `RangeError` with the zone and local
  time in the message.
- Appointments crossing midnight are split into per-day visual segments.
- Buffer time participates in conflicts without changing the visible appointment
  label.
- Recurrence is opt-in. Without `@zigoschedule/scheduler-recurrence`, recurring
  appointments render only their original instance.
- Inline `EXDATE` in RRULE text is not the public contract; use
  `recurrenceExceptions` with `YYYY-MM-DD` keys.

## Advanced Capabilities

Included today:

- day, week and month views;
- resource/professional columns;
- drag/drop, resize and range selection;
- blocked time, business hours, breaks and visual buffers;
- overlap lanes for conflicting visual stacks;
- IANA time zones and DST-safe layout;
- locale packs and custom messages;
- React, Web Component, CDN/no-build and headless layout entries.

Roadmap, not included yet:

- horizontal resource timeline;
- one appointment occupying multiple resources at once;
- capacity/group booking;
- scheduling assistant;
- external drag from outside inventory lists;
- export/print.
