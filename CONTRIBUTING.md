# Contributing

Thanks for considering a contribution to Zigo Scheduler.

The project is still before its first public stable release, so APIs may change.
The quality bar is already real: a change should keep the usage contract clear,
tested and installable.

## Before Opening An Issue Or Pull Request

- Make sure the change belongs in the scheduler library, not in a product
  backend that happens to use it.
- For visual or interaction bugs, include browser, operating system, viewport,
  locale, time zone and reproduction steps.
- For time-related bugs, include `timeZone`, exact date, business hours, break
  window, professional and appointment data.
- For feature requests, describe the real product workflow and the affected
  entry point: React, Web Component, headless layout, recurrence, core or
  engine.

## Local Development

Use Node.js 22 or newer to work on this repository. The published browser
packages do not impose that Node version on consumers.

```bash
npm install
npm test
npm run typecheck
npm run lint
npm run build
npm run verify:browser
npm run verify:frameworks
npm run verify:package
npm run release:check
```

## Change Guidelines

- Keep edits small and in the right layer.
- Do not put host backend rules inside the scheduler.
- Do not make `core` depend on DOM, React or browser globals.
- Preserve SSR safety: importing a package must not fail when `window` is not
  available.
- Update public documentation when public behavior changes.
- Add focused tests when touching gestures, time zones, recurrence, layout,
  localization or package output.
- Use `npm run verify:browser` for browser-level interaction changes. It opens
  the React package and Web Component in Chromium and checks real drag, resize,
  conflict, details modal and multi-instance behavior.
- Use `npm run verify:frameworks` before publishing framework-sensitive changes.
  It installs packed packages into clean Vite/React and Next SSR projects outside
  the monorepo.

## Layers

```text
core        domain helpers, time zones, i18n, availability
engine      contracts, validation, resources, callbacks, geometry
layout      headless render model
interaction pointer gestures, mirror, auto-scroll
element     Web Component entry point
react       controlled React entry point
recurrence  optional RRULE plugin
```

Lower layers must not import higher layers.

## Pull Request Checklist

- [ ] The change has a clear scope.
- [ ] Relevant tests were added or updated.
- [ ] Public docs were updated when needed.
- [ ] `npm run release:check` passed locally, or the failure is explained.
- [ ] No generated build output, secrets, caches or local files were included.

## Publication

npm publication, CDN release, GitHub release and official website deployment are
maintainer-only actions. Pull requests should not change credentials, tokens or
release flow without prior discussion.
