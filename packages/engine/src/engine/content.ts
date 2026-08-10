/**
 * Content returned by the host for rendering.
 *
 * This is `unknown` on purpose. The engine carries the host value to the
 * rendering layer but never reads inside it. Typing it as `ReactNode` would bind
 * a framework-agnostic package to React and would force Vue, Svelte or plain HTML
 * users to install `@types/react` just to compile.
 *
 * Renderers narrow it back. In `@zigoschedule/scheduler-react`, this becomes
 * `ReactNode`.
 */
export type AgendaContent = unknown;
