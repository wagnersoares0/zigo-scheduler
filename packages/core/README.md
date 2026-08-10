# @zigoschedule/scheduler-core

Pure domain helpers for Zigo Scheduler.

Use this package when you need scheduler rules without rendering anything:
time-zone conversion, availability windows, lunch or break logic, locale
messages, currency/time formatting, and recurring occurrence id parsing.

It has no DOM dependency and no framework dependency.

This is the package behind the scheduler's international and time correctness:
IANA zones, DST-safe day ranges, locale packs, AM/PM vs 24h formatting, money
formatting and recurring occurrence ids.

## Install

```bash
npm install @zigoschedule/scheduler-core
```

## Time Zones

```ts
import { zonedDateKey, zonedTimeToUtc } from "@zigoschedule/scheduler-core";

const startsAt = zonedTimeToUtc("2026-08-12", 9 * 60, "America/New_York");

zonedDateKey(startsAt, "America/New_York"); // "2026-08-12"
```

Use IANA time zones such as `America/New_York`, `Europe/London` or
`Asia/Tokyo`. Fixed offsets are not enough for daylight saving time.

## Time Zone Picker Data

```ts
import { buildTimeZoneGroups } from "@zigoschedule/scheduler-core";

const groups = buildTimeZoneGroups();
```

The list highlights major regions and can include every IANA zone supported by
the current browser or Node runtime.

## Native Scheduler Messages

```ts
import { getAgendaMessages, normalizeAgendaLocale } from "@zigoschedule/scheduler-core";
import { frFRMessages } from "@zigoschedule/scheduler-core/locales/fr-FR";

normalizeAgendaLocale("en-GB"); // "en-US"

const messages = getAgendaMessages("fr-FR", {
  ...frFRMessages,
  details: { ...frFRMessages.details, charge: "Encaisser maintenant" },
});

messages.today; // "Aujourd'hui"
```

The root bundle ships English UI copy. Other languages are opt-in locale packs,
so a product loads only the language it imports.

Supported locale packs: `en-US`, `pt-BR`, `es-ES`, `fr-FR`, `de-DE`, `ru-RU`,
`th-TH`, `it-IT`, `nl-NL`, `pl-PL`, `tr-TR`, `id-ID`, `ja-JP`, `ko-KR`,
`zh-CN`, `ar-SA` and `hi-IN`.

## Occurrence Ids

```ts
import { parseOccurrenceId, seriesIdOf } from "@zigoschedule/scheduler-core";

parseOccurrenceId("weekly-therapy@2026-09-03");
// { seriesId: "weekly-therapy", slotDayKey: "2026-09-03" }

parseOccurrenceId("single-visit"); // null
seriesIdOf("weekly-therapy@2026-09-03"); // "weekly-therapy"
```

Use this on the backend side of drag, resize or cancel flows for recurring
appointments.
