# Changelog

All notable changes to Zigo Scheduler will be documented here.

The project follows the spirit of Keep a Changelog and will use SemVer once the
first public release is cut.

## [Unreleased]

## [0.2.9] - 2026-08-10

### Fixed

- Professional-specific inactive days now stay closed in React and headless
  layout instead of inheriting the business's default hours.
- Professional-specific break opt-outs now stay respected instead of falling
  back to the shared business break.
- React now keeps its current-day/current-time calculations fresh while the
  scheduler remains open.
- DST spring-forward wall-clock times that do not exist are now rejected instead
  of being silently shifted to another instant.

## [0.2.8] - 2026-08-10

### Changed

- Public helpers and defaults were polished for an English-first open-source
  release while keeping Portuguese legacy aliases available for compatibility.

## [0.2.7] - 2026-08-10

### Added

- Appointments now support `bufferBeforeMinutes` and `bufferAfterMinutes` for
  preparation, cleanup or travel time. Buffers reserve time visually, participate
  in conflict validation and are exposed by the headless layout model.
- Official React and HTML starter templates were added under `templates/`.

### Changed

- React and Web Component status/action badges now use a calmer palette: the
  appointment color remains the main accent, pending/destructive states keep
  their own tone, and secondary actions stay neutral.
- README and installation copy now explicitly document React, Web
  Component, headless layout, drag, resize, resources/professionals, business
  hours, IANA time zones, DST-safe rendering, locale packs, buffers, overlap
  lanes and the built-in details modal.
- README and package READMEs now include a professional scheduler
  capability matrix that separates included features, optional packages,
  partial support and roadmap items.
- npm package descriptions and keywords now make resource scheduling,
  appointment scheduling, drag/drop, resize, business hours and time-zone
  support easier to discover.
- React appointment cards now expose visible keyboard focus and
  `aria-keyshortcuts` for their click/open behavior.

## [0.2.6] - 2026-08-10

### Fixed

- React appointment details modal now sits above every scheduler layer, so the
  time axis no longer appears undimmed over the backdrop.
- React appointment details modal now uses a calmer action/status palette:
  appointment color stays on the header and primary action, secondary actions
  are neutral, and only destructive cancel remains red.

## [0.2.5] - 2026-08-10

### Added

- React package now includes an optional built-in centered appointment details
  modal with configurable actions and host-owned persistence callbacks.

## [0.2.4] - 2026-08-09

### Fixed

- React package CSS now ships the minimal border reset needed for Tailwind
  border utilities, so external apps render scheduler grid lines without thick
  unintended borders around each slot.

## [0.2.3] - 2026-08-09

### Fixed

- React package CSS now carries the minimal border style required for grid
  lines, card borders and separators to render correctly in apps that do not
  already include Tailwind's base reset.

## [0.2.2] - 2026-08-09

### Changed

- Published package builds no longer include public source maps.
- The Web Component `appointment-action` event now emits only `{ action, id }`
  instead of the full appointment object.
- `@zigoschedule/scheduler-recurrence` keeps `rrule` bundled with its license
  notice but no longer installs `rrule` as a separate runtime dependency.
- Agenda layout generation now groups placed items by column before computing
  overlaps, avoiding a repeated scan for every column.
- Unused internal React/engine files were removed from the published type tree.

### Fixed

- Documentation now pins CDN examples to the current package version.
- HTML examples now load the matching locale messages instead of only changing
  date and currency formatting.
- The React package now publishes the bundled `lucide-react` license notice.

### Security

- Layout models now discard invalid CSS colors before React, the Web Component
  or a custom renderer receives them.
- Built-in avatars now ignore unsafe image URL schemes and avoid leaking the
  page referrer to avatar hosts.

## [0.2.1] - 2026-08-09

### Fixed

- Installation examples now list `@zigoschedule/scheduler-core` whenever they
  import locale packs directly.

## [0.2.0] - 2026-08-09

### Added

- GitHub Actions CI now runs the package gate on Node 22 and Node 24 for pushes
  and pull requests.
- Bundle size baselines now fail the build when a distributed entry point grows
  without an intentional baseline update.
- Lint debt is now gated at the current warning baseline, so new complexity or
  size warnings must be paid down or intentionally reviewed.
- `@zigoschedule/scheduler-core` now publishes opt-in locale packs under
  `@zigoschedule/scheduler-core/locales/*`.

### Changed

- The core entry now ships English UI messages by default; non-English messages
  are loaded only when the host imports and passes the matching locale pack.
- `@zigoschedule/scheduler-engine` keeps legacy Portuguese model aliases and
  internal normalization helpers out of the root public API. Legacy input data
  remains supported through the runtime compatibility layer.
- `@zigoschedule/scheduler-react` no longer exports the internal `AgendaGrid`
  and `AgendaMonthView` components from the root entry. Use the supported
  `Agenda` component, or `@zigoschedule/scheduler-layout` for custom rendering.
- The private development workspace now declares Node 22+ without imposing that
  requirement on browser packages installed from npm.
- Dependency audit remains part of the manual release gate, but GitHub pull
  requests no longer fail on unrelated advisory churn; the workflow runs audit
  separately on a weekly schedule or manual dispatch.

### Fixed

- Appointment normalization now preserves an omitted `servicesCount`, allowing
  compact service labels to fall back to linked services instead of expanding
  every service name into the card.

## [0.1.2] - 2026-08-09

### Added

- Publishable TypeScript monorepo with `core`, `engine`, `layout`,
  `interaction`, `element`, `react` and `recurrence` packages.
- ESM, CommonJS, TypeScript declarations and standalone browser bundles.
- React component, Web Component, headless layout model and optional recurrence
  plugin.
- Native scheduler localization for labels, dates, times, counts, actions and
  blocking messages.
- Business time-zone support with IANA zones.
- Week start support for Sunday or Monday.
- Public English data aliases for appointments, professionals, services, blocks
  and business hours, while keeping the original Zigo field names supported.
- Package verification through `npm run verify:pacote`, which packs and installs
  the packages outside the monorepo.
- `npm run release:check` as the local publication gate.

### Changed

- The default locale is now `en-US`.
- The default week start is now Sunday.
- The default time zone fallback is neutral UTC; production apps should pass the
  business time zone explicitly.
- Standalone browser bundles keep their required runtime code bundled, while the
  normal package builds keep sibling packages as dependencies.

### Security

- Development dependencies are checked with `npm audit` as part of release
  preparation.
