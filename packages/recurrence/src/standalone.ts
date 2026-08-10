/**
 * Entry point of the standalone recurrence `<script>` build.
 *
 * Loaded after `zigo-scheduler.global.js`, it plugs itself into the socket that
 * file published on the window:
 *
 *   <script type="module" src="zigo-scheduler.global.js"></script>
 *   <script type="module" src="zigo-scheduler-recurrence.global.js"></script>
 *
 * Order matters, and it is the only rule. Loaded first, or alone, it warns and
 * stops: the calendar keeps working, repeating appointments just show once, on
 * their own date.
 *
 * `@zigoschedule/scheduler-layout` is deliberately *not* imported here. Importing it
 * would inline a second registry into this bundle and register into that one,
 * which the calendar never reads: everything would look wired and nothing would
 * repeat.
 */
import { recurrenceExpander } from "./expander";

export { expandRecurrence } from "./expand";
export { describeRecurrence, describeInEnglish, describeInPortuguese } from "./describe";
export type { RecurrenceInput, Occurrence, OccurrenceOverride } from "./expand";
export { recurrenceExpander };

/**
 * The socket, described structurally rather than imported: this package must not
 * depend on `@zigoschedule/scheduler-element`, and the shape is the whole contract.
 */
type Socket = { registerRecurrenceExpander?: (fn: typeof recurrenceExpander) => void };

const socket =
  typeof window === "undefined"
    ? undefined
    : (window as unknown as { ZigoScheduler?: Socket }).ZigoScheduler;

if (socket?.registerRecurrenceExpander) {
  socket.registerRecurrenceExpander(recurrenceExpander);
} else if (typeof console !== "undefined") {
  console.warn(
    "[zigo-scheduler] recurrence was not installed: load zigo-scheduler.global.js before this file."
  );
}
