/**
 * @zigoschedule/scheduler-element - the calendar as an HTML tag.
 *
 *   import "@zigoschedule/scheduler-element";
 *
 *   <zigo-scheduler view="day" timezone="America/New_York"></zigo-scheduler>
 *
 * Works in a server-rendered page, in Laravel, Rails, Django, Vue or Angular.
 * No framework is bundled: the element draws from the layout model with plain
 * DOM.
 */
export { ZigoSchedulerElement } from "./element";
export { renderAgenda } from "./render";
export { renderAgendaMonth, type MonthCallbacks } from "./render-month";
export { attachRangeSelection, type RangeSelection } from "./selection";
export type { AgendaCallbacks } from "./interactions";
export type { GestureCallbacks } from "./gestures";
export { STYLES } from "./styles";
export { defineZigoScheduler, TAG_NAME } from "./define";
