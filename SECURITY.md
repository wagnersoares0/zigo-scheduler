# Security Policy

## Supported Versions

Zigo Scheduler is currently in `0.x` and before its first stable public release.
Until a stable release exists, the supported version for security fixes is the
latest code on the main development line.

This policy will be updated with supported version ranges after the first stable
release.

## Reporting A Vulnerability

Please do not open a public issue for a vulnerability.

Use GitHub private security advisories when they are enabled for the repository.
If that is not available yet, email `contato@zigoapp.com.br` and share only the
context needed to start triage.

Include, when possible:

- affected package and version;
- affected entry point: React, Web Component, headless layout, recurrence, core
  or engine;
- minimal reproduction steps;
- expected impact;
- whether the issue depends on browser behavior, SSR, iframe/portal rendering,
  locale or time zone.

## Scope

This policy covers the library source code, npm packages, standalone browser
bundles and build/test scripts.

Host applications remain outside this scope: authentication, tenants,
authorization, databases, payment flows, reminders and backend persistence are
owned by the product that installs the scheduler.

## Dependency Security

Before publishing, run:

```bash
npm audit
npm run release:check
```

Third-party code included in distributed bundles must keep the required license
notice in the published package.
