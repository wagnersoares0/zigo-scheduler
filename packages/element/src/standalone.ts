/**
 * Entry point of the standalone `<script>` build.
 *
 * Everything is inlined here, so this file is also the only place a second
 * script can reach the calendar from. It publishes a small socket on the window
 * - enough for a plugin to register itself, nothing more.
 *
 * Why a global at all: each standalone build is a closed bundle. Loading
 * `zigo-scheduler-recurrence.global.js` after this one gives it *its own* copy of
 * every module it imports, including the plugin registry, so registering
 * through an import would write into a registry the calendar never reads. The
 * window is the only ground both files stand on.
 *
 * Only the registry travels this way, because only the registry holds state.
 * Pure helpers can be duplicated without consequence, and are.
 */
import {
  registerRecurrenceExpander,
  clearRecurrenceExpander,
  hasRecurrenceExpander,
  type RecurrenceExpander,
} from "@zigoschedule/scheduler-layout";
import { defineZigoScheduler, TAG_NAME } from "./define";

export * from "./index";

export type ZigoSchedulerGlobal = {
  version: string;
  TAG_NAME: string;
  define: (tag?: string) => void;
  registerRecurrenceExpander: (fn: RecurrenceExpander) => void;
  clearRecurrenceExpander: () => void;
  hasRecurrenceExpander: () => boolean;
};

declare global {
  interface Window {
    ZigoScheduler?: ZigoSchedulerGlobal;
  }
}

// Replaced at build time with the version in package.json.
declare const __ZIGO_VERSION__: string;

if (typeof window !== "undefined") {
  window.ZigoScheduler = {
    version: typeof __ZIGO_VERSION__ === "string" ? __ZIGO_VERSION__ : "0.0.0",
    TAG_NAME,
    define: defineZigoScheduler,
    registerRecurrenceExpander,
    clearRecurrenceExpander,
    hasRecurrenceExpander,
  };
}
