/**
 * @zigoschedule/scheduler-core - the domain rules.
 *
 * Time zones, availability windows, opening hours, lunch breaks, granularity.
 * Pure functions: no DOM, no framework, no I/O. This is the layer that knows
 * what "available" means, and the one worth porting to another language.
 */
export * from "./timezone";
export * from "./i18n";
export * from "./time-zone-options";
export * from "./occurrence-id";
export * from "./availability-window";
export * from "./agenda-granularity";
export * from "./agenda-helpers";
export * from "./appointment-colors";
export * from "./appointment-products";
export * from "./booking-professionals";
export * from "./permissions";
