# Official Templates

Small starter files for testing Zigo Scheduler in a new app.

- `react/` uses the React package with the packaged CSS and a controlled
  appointment state.
- `html/` uses the Web Component from the CDN with no React dependency.

These templates are intentionally small. They show the required host container
height, scheduler data shape, modal behavior, drag/resize callbacks and where a
real backend should save changes.

They are meant to prove the professional scheduler contract quickly:
multi-professional columns, business hours, time zone, locale, drag/drop,
resize, buffers, status, details actions and host-owned persistence. They do
not include a backend, login, payments, horizontal timeline or scheduling
assistant.
