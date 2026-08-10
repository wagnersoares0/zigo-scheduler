# Architecture

Zigo Scheduler is a layered TypeScript monorepo. The core idea is simple:
scheduling rules stay separate from rendering, and every visual entry point uses
the same calculation layer.

That separation matters because the library needs to work in very different
places: React apps, plain HTML pages, PHP/Laravel/Django/Rails server-rendered
pages, no-npm sandboxes and products that want to draw their own UI.

## Layers

```text
packages/
  core          domain helpers, time zones, dates, i18n, availability
  engine        contracts, validation, resources, callbacks, geometry
  layout        headless render model
  interaction   pointer drag, resize, mirror, auto-scroll
  element       <zigo-scheduler> Web Component
  react         controlled React component
  recurrence    optional RRULE recurrence plugin
```

## Dependency Rule

Lower layers do not know about higher layers.

`core` does not touch DOM or React. `engine` does not render UI. `layout`
returns coordinates and calendar blocks as plain data. `element` and `react` are
visual entry points.

This protects the public promises:

- React users get a ready scheduler.
- HTML and server-rendered users get a tag and a script.
- Custom UI users get the same scheduling math without adopting our renderer.

## Entry Points

`@zigoschedule/scheduler-react` is the React entry point. It publishes ESM,
CommonJS, types and `styles.css`.

`@zigoschedule/scheduler-element` registers `<zigo-scheduler>`. It is the entry
point for HTML, PHP, Laravel, Django, Rails, Angular, Vue, Svelte, Alpine and
other pages that can load JavaScript.

`@zigoschedule/scheduler-layout` is for custom renderers. It receives
appointments, professionals, blocks, business hours and dimensions, then returns
columns, rows, events, unavailable ranges and hit testing.

`@zigoschedule/scheduler-recurrence` is optional. Importing it registers the
recurrence expander. Products that do not use recurrence do not carry `rrule`.

## Professional Scheduler Capabilities

The public architecture is shaped around appointment scheduling, not only event
display.

- `core` owns IANA time zones, DST-safe day ranges, locale packs, AM/PM vs 24h
  formatting, currency formatting and recurrence occurrence ids.
- `engine` owns appointments, resources, business hours, breaks, blocked time,
  buffers, conflict validation, callback contracts and option normalization.
- `layout` owns rows, columns, unavailable ranges, overlap lanes, buffer ranges,
  month overflow and hit testing.
- `interaction` owns drag, drop, resize, mirror and auto-scroll primitives.
- `react` and `element` own the ready operational UI: cards, resource columns,
  status/payment badges, details modal/dialog and host-owned action callbacks.
- `recurrence` owns optional RRULE expansion, exceptions and occurrence
  overrides.

Large planning features that are not in the package yet are intentionally not
hidden behind placeholders: horizontal resource timeline, multi-resource
appointments, capacity/group bookings, keyboard move/resize, external drag from
outside lists, scheduling assistant and export/print.

## Multi-Tenant And Multi-Professional Contract

The library does not create a backend and does not decide tenant scope. The host
application passes already scoped data: professionals, appointments, blocks,
business hours, break windows and the business time zone.

The contract is:

- tenant, permissions and persistence belong to the host product;
- the scheduler renders and validates the state it receives;
- callbacks return user intent so the host can save it in its backend.

The same engine supports multiple businesses because `timeZone`, `businessHours`,
`professionals`, `appointments` and `blocks` are configuration/data inputs.

## Localization

Scheduler-owned messages, labels, dates, times and counts pass through `core`.
The host should pass an explicit `locale` and `timeZone` in production.

The scheduler localizes the interface it owns. Free text from the backend, such
as service names, client names, notes and block reasons, is rendered as provided
by the host.

## Build And Publication

`npm run build` creates publishable artifacts in `packages/*/dist`.

Each package publishes:

- ESM in `dist/index.js`;
- CommonJS in `dist/index.cjs`;
- TypeScript declarations in `dist/index.d.ts`;
- `package.json` exports;
- `LICENSE` and `README.md`.

Standalone browser bundles are also produced:

- `packages/element/dist/zigo-scheduler.global.js`;
- `packages/recurrence/dist/zigo-scheduler-recurrence.global.js`.

Those are publication artifacts. They go to npm and can be served by a CDN, but
they do not need to be versioned as source files in the main GitHub repository.

## Quality Gate

The release gate is:

```bash
npm run release:check
```

It runs tests, typecheck, lint, build, local packing, installation outside the
monorepo and package verification. It proves the repository can publish
installable packages before npm publication happens.

Visual checks for the official website, interactive demos and sandboxes belong
to the separate website/examples repository.

## What Stays Out Of The Main GitHub Repository

The public library repository should contain source, tests, public docs, package
manifests and quality scripts.

Do not include secrets, caches, generated builds, local screenshots, private
notes, the official website, demos, example apps or strategy files that are not
public documentation for the library.
