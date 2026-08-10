import { registerRecurrenceExpander } from "@zigoschedule/scheduler-layout";
import { recurrenceExpander } from "./expander";

/**
 * Installs recurrence into the scheduler.
 *
 * Importing this package is the normal installation path: the plugin registers
 * itself. The function is exported too for hosts that control initialization.
 *
 * This is the only file in the package that imports layout. The expander itself
 * lives in `expander.ts`, without that dependency, so the standalone build can
 * bundle the function without dragging the registry along.
 */
export function installRecurrence(): void {
  registerRecurrenceExpander(recurrenceExpander);
}

installRecurrence();
