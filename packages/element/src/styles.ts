/**
 * Styles for the shadow root.
 *
 * Shipped as a string on purpose: the element carries its own look and cannot
 * be broken by the host page's CSS, and the host does not need a build step to
 * import a stylesheet. Custom properties are the theming contract.
 */
export const STYLES = `
/*
 * The grid is positioned by coordinates and explicit widths. Without border-box,
 * padding and borders are added outside the measured width, so the last column
 * can leak out of the scheduler. Inside the shadow root this universal selector
 * does not escape to the host page.
 */
*, *::before, *::after { box-sizing: border-box; }

:host {
  --za-ink: #0f172a;
  --za-muted: #64748b;
  --za-line: #e2e8f0;
  --za-rule: #eef2f7;
  --za-surface: #ffffff;
  --za-head: #f8fafc;

  display: block;
  height: 100%;
  font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  color: var(--za-ink);
  background: var(--za-surface);
}

.za-root { position: relative; display: flex; flex-direction: column; height: 100%; min-height: 0; }

.za-header {
  display: flex;
  flex: none;
  height: 48px;
  border-bottom: 1px solid var(--za-line);
  background: var(--za-surface);
  overflow: hidden;
}
.za-corner { flex: none; border-right: 1px solid var(--za-line); background: var(--za-head); }
.za-header-track { position: relative; flex: none; }
.za-header-cell {
  position: absolute;
  top: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1px;
  border-right: 1px solid var(--za-line);
  padding: 0 8px;
  overflow: hidden;
}
.za-header-label {
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}
.za-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  object-fit: cover;
  flex: none;
}
.za-initials {
  display: grid;
  place-items: center;
  background: #e2e8f0;
  color: #475569;
  font-size: 10px;
  font-weight: 700;
}
.za-header-cell { flex-direction: row; gap: 8px; }
.za-header-stack { display: flex; flex-direction: column; min-width: 0; }

/*
 * Truncation is required, not decorative. Hosts can provide long closed-day
 * labels, and a header only has one weekday column of width. Text that does not
 * fit must ellipsize.
 */
.za-header-sub {
  font-size: 11px;
  color: var(--za-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
  min-width: 0;
}

.za-scroller { flex: 1; min-height: 0; overflow: auto; overscroll-behavior: contain; }
.za-surface { position: relative; }

.za-axis {
  position: sticky;
  left: 0;
  z-index: 2;
  float: left;
  background: var(--za-head);
  border-right: 1px solid var(--za-line);
}
.za-axis-cell {
  position: absolute;
  right: 0;
  left: 0;
  padding: 2px 6px 0 0;
  text-align: right;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  color: var(--za-muted);
  border-top: 1px solid var(--za-rule);
}
.za-axis-cell.za-major { color: var(--za-ink); border-top-color: var(--za-line); }

.za-canvas { position: absolute; top: 0; }
.za-lines { position: absolute; inset: 0; }
.za-line { position: absolute; left: 0; right: 0; border-top: 1px solid var(--za-rule); }
.za-line.za-major { border-top-color: var(--za-line); }
.za-column-divider { position: absolute; top: 0; bottom: 0; border-left: 1px solid var(--za-line); }

.za-unavailable {
  position: absolute;
  display: flex;
  align-items: flex-start;
  padding: 3px 6px;
  font-size: 10px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #94a3b8;
  background: repeating-linear-gradient(
    45deg, #f8fafc, #f8fafc 6px, #eef2f7 6px, #eef2f7 12px
  );
  pointer-events: none;
  /* Long text wraps inside the column, where there is room, and never leaks out. */
  overflow: hidden;
  overflow-wrap: anywhere;
  line-height: 1.35;
}
.za-unavailable.za-closed { background: #f1f5f9; }

.za-event {
  position: absolute;
  display: flex;
  flex-direction: column;
  border: 1px solid;
  border-radius: 6px;
  overflow: hidden;
  cursor: pointer;
  box-sizing: border-box;
}
.za-event:focus-visible { outline: 2px solid var(--za-ink); outline-offset: 1px; }
.za-event-head {
  flex: none;
  padding: 2px 6px;
  font-size: 11px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  overflow: hidden;
}
.za-event-body {
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: 3px 6px;
  min-width: 0;
}
.za-event-title { font-size: 12px; font-weight: 600; }
.za-event-sub { font-size: 11px; color: var(--za-muted); }
.za-event-title, .za-event-sub { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.za-muted { opacity: 0.8; }
.za-status-cancelado,
.za-status-canceled,
.za-status-cancelled { opacity: 0.55; }
.za-status-cancelado .za-event-title,
.za-status-canceled .za-event-title,
.za-status-cancelled .za-event-title { text-decoration: line-through; }

.za-resize {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 8px;
  cursor: ns-resize;
}
.za-resize::after {
  content: "";
  position: absolute;
  left: 50%;
  bottom: 2px;
  width: 22px;
  height: 2px;
  border-radius: 2px;
  transform: translateX(-50%);
  background: currentColor;
  opacity: 0.35;
}

.za-paid {
  position: absolute;
  top: 3px;
  right: 4px;
  width: 14px;
  height: 14px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: #16a34a;
  color: #fff;
  font-size: 9px;
  font-weight: 700;
}

.za-ghost {
  position: absolute;
  z-index: 3;
  border: 2px dashed;
  border-radius: 6px;
  pointer-events: none;
}
/*
 * A card being dragged must not change color.
 *
 * This used to be opacity 0.4, which washed the fill out. The card background is
 * already translucent; applying opacity again makes a selected color look almost
 * gray. Color is data, not decoration.
 *
 * The drag signal is now a ring in the same color plus a shadow. The fill is not
 * touched.
 */
.za-event.za-dragging {
  box-shadow:
    0 0 0 2px var(--za-event-color, var(--za-ink)),
    0 8px 18px rgba(15, 23, 42, 0.22);
  z-index: 4;
}

.za-band {
  position: absolute;
  border: 1px dashed var(--za-ink);
  border-radius: 5px;
  background: rgba(2, 132, 199, 0.12);
  pointer-events: none;
}

/* Month. */

.za-month { display: flex; flex-direction: column; height: 100%; min-height: 0; }
.za-month-head {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  flex: none;
  border-bottom: 1px solid var(--za-line);
  background: var(--za-head);
}
.za-month-weekday {
  padding: 8px 0;
  text-align: center;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--za-muted);
}
.za-month-body { position: relative; flex: 1; min-height: 0; overflow: auto; }
.za-month-cell {
  position: absolute;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 4px 5px;
  border-right: 1px solid var(--za-line);
  border-bottom: 1px solid var(--za-line);
  overflow: hidden;
  box-sizing: border-box;
  cursor: pointer;
}
.za-month-cell.za-outside { background: #fafbfc; }
.za-month-cell.za-outside .za-month-number { color: #cbd5e1; }
.za-month-cell.za-today .za-month-number {
  background: var(--za-ink);
  color: #fff;
  border-radius: 999px;
}
.za-month-number {
  align-self: flex-start;
  min-width: 20px;
  padding: 1px 5px;
  text-align: center;
  font-size: 12px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.za-month-entry {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 1px 3px;
  border-radius: 4px;
  font-size: 11px;
  overflow: hidden;
  white-space: nowrap;
}
.za-month-entry:hover { background: #f1f5f9; }
.za-month-time { flex: none; font-variant-numeric: tabular-nums; font-weight: 600; }
.za-month-title { overflow: hidden; text-overflow: ellipsis; }
.za-month-more { padding-left: 3px; font-size: 11px; font-weight: 600; color: var(--za-muted); }
.za-status-cancelado .za-month-title,
.za-status-canceled .za-month-title,
.za-status-cancelled .za-month-title { text-decoration: line-through; opacity: 0.6; }

.za-license {
  position: absolute;
  left: 1px;
  bottom: 1px;
  z-index: 99;
  padding: 2px 6px;
  border: 1px solid #ddd;
  border-width: 1px 1px 0 0;
  border-top-right-radius: 3px;
  background: #eee;
  font-size: 12px;
  color: #333;
}

/* Appointment sheet.
   Same operational sheet as the React demo, embedded in the component. It lives
   inside the shadow root so these styles stay attached. */

.za-sheet-backdrop {
  position: absolute;
  inset: 0;
  z-index: 60;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgba(15, 23, 42, 0.45);
  animation: za-fade 0.14s ease-out;
}
.za-sheet {
  display: flex;
  flex-direction: column;
  width: min(400px, 100%);
  max-height: 100%;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.28);
  animation: za-rise 0.16s ease-out;
}
@keyframes za-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes za-rise { from { opacity: 0; transform: translateY(8px) scale(0.98); } to { opacity: 1; transform: none; } }
@media (prefers-reduced-motion: reduce) {
  .za-sheet-backdrop, .za-sheet { animation: none; }
}

.za-sheet-head {
  flex: none;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 18px;
  color: #fff;
  border-radius: 16px 16px 0 0;
}
.za-sheet-headings { display: grid; gap: 1px; min-width: 0; flex: 1; }
.za-sheet-headings strong { font-size: 15px; font-weight: 650; }
.za-sheet-headings span { font-size: 12px; opacity: 0.85; font-variant-numeric: tabular-nums; }
.za-sheet-x {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  flex: none;
  padding: 0;
  border: 0;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.16);
  color: #fff;
  cursor: pointer;
}
.za-sheet-x:hover { background: rgba(255, 255, 255, 0.3); }
.za-sheet-x:focus-visible { outline: 2px solid #fff; outline-offset: 1px; }

/* Only the body scrolls. Actions stay pinned at the bottom, even in a short
   scheduler viewport. */
.za-sheet-rows { flex: 1; min-height: 0; overflow-y: auto; padding: 6px 18px 4px; }
.za-sheet-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid #f1f5f9;
}
.za-sheet-row:last-child { border-bottom: 0; }
.za-sheet-icon { flex: none; color: #94a3b8; padding-top: 1px; }
.za-sheet-main { display: grid; gap: 2px; min-width: 0; flex: 1; }
.za-sheet-main strong { font-size: 14px; font-weight: 600; color: var(--za-ink); }
.za-sheet-main span { font-size: 13px; color: var(--za-muted); overflow-wrap: anywhere; }
.za-muted-text { color: #cbd5e1 !important; font-style: italic; }
.za-sheet-value { flex: none; font-size: 13.5px; font-weight: 600; color: var(--za-ink); }
.za-sheet-value.za-big { font-size: 17px; }

.za-sheet-tags { display: flex; flex-wrap: wrap; gap: 6px; }
.za-tag {
  padding: 2px 9px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 600;
  font-style: normal;
  background: #f1f5f9;
  color: #475569;
}
.za-tag-ok   { background: #f1f5f9; color: #475569; }
.za-tag-warn { background: #fef3c7; color: #92400e; }
.za-tag-bad  { background: #fee2e2; color: #991b1b; }

.za-sheet-actions {
  flex: none;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  padding: 14px 18px;
  border-top: 1px solid #f1f5f9;
}
.za-action {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  padding: 10px 4px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #fff;
  font: inherit;
  font-size: 11.5px;
  font-weight: 600;
  color: #475569;
  cursor: pointer;
}
.za-action:hover { background: #f8fafc; }
.za-action:focus-visible { outline: 2px solid var(--za-ink); outline-offset: 1px; }
.za-action-green { color: #475569; border-color: #e2e8f0; }
.za-action-blue  { color: #475569; border-color: #e2e8f0; }
.za-action-red   { color: #b91c1c; border-color: #fecaca; }

.za-sheet-foot {
  flex: none;
  display: flex;
  gap: 10px;
  padding: 0 18px 18px;
}
.za-sheet-ghost, .za-primary {
  flex: 1;
  padding: 11px 14px;
  border-radius: 10px;
  font: inherit;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}
.za-sheet-ghost { border: 1px solid #e2e8f0; background: #fff; color: #475569; }
.za-sheet-ghost:hover { background: #f8fafc; }
.za-primary { flex: 1.4; border: 0; color: #fff; }
.za-primary:hover { filter: brightness(0.94); }
.za-sheet-ghost:focus-visible, .za-primary:focus-visible { outline: 2px solid var(--za-ink); outline-offset: 2px; }
`;
