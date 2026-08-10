import type { AgendaMessagesInput, TimeZone } from "@zigoschedule/scheduler-core";
import type {
  Appointment,
  Block,
  BusinessHoursDefaults,
  BusinessHours,
  BreakWindow,
  Professional,
  WeekStart,
} from "@zigoschedule/scheduler-engine";

/**
 * The render model: a calendar described as plain data.
 *
 * Everything here is numbers and strings. No React, no DOM, no framework. A
 * consumer walks `columns`, `rows` and `events` and draws rectangles. That is
 * the entire contract.
 *
 * This is what lets the library be used outside React. The hard part of a
 * calendar was never the markup: it is knowing where each box goes, which
 * minutes cannot be booked, and which appointment collides with which. All of
 * that is decided here and handed over as coordinates.
 */

export type AgendaLayoutView = "day" | "week";

export type AgendaLayoutInput = {
  /** Day being shown. In week mode it anchors the week. */
  date: Date;
  view?: AgendaLayoutView;
  appointments: Appointment[];
  blocks?: Block[];
  /** Columns in day view; in week view they scope which appointments appear. */
  professionals: Professional[];
  businessHours?: BusinessHours | null;
  defaultHours?: BusinessHoursDefaults;
  /** Shared lunch break. A professional's own schedule overrides it. */
  lunchBreak?: BreakWindow | null;
  timeZone?: TimeZone;
  /** Locale used for generated labels such as weekdays and closed/lunch text. */
  locale?: string;
  /** Optional copy overrides for generated labels. */
  messages?: AgendaMessagesInput;
  /** Day-view grid step: 5, 10, 15, 20 or 30. Anything else falls back to 30. */
  slotMinutes?: number;
  /** Week-view row spacing: 30 or 60. Anything else falls back to 30. */
  weekScaleMinutes?: number;
  /**
   * Week start: 0 = Sunday, 1 = Monday.
   *
   * This is a country convention, not a taste choice. The US commonly starts on
   * Sunday; many other regions start on Monday.
   */
  weekStartsOn?: WeekStart;
  /** Minimum height of a row, in pixels. Rows still stretch to fill. */
  rowHeight?: number;
  /** Width available for the whole grid, time axis included. */
  width: number;
  /** Height available. Rows stretch when the working day is short. */
  height: number;
  /** Width of the time axis on the left. Defaults to 54. */
  axisWidth?: number;
  /** Minimum width of a column before the grid starts scrolling sideways. */
  columnMinWidth?: number;
  /** Color used when an appointment carries none. */
  defaultColor?: string;
  /** Professional id to color. Wins over the appointment's own color. */
  colorByProfessional?: Record<string, string>;
};

export type AgendaLayoutColumn = {
  key: string;
  dayKey: string;
  professionalId: string | null;
  /** The professional in day view, the weekday in week view. */
  label: string;
  /** Secondary heading, usually the date. */
  sublabel: string;
  left: number;
  width: number;
  isClosed: boolean;
  /**
   * Short header label, such as "Closed".
   *
   * Intentionally short: the header column can be narrow, and the full sentence
   * belongs in the body block.
   */
  closedLabel: string | null;
  /** Full sentence for the body block, where there is enough room. */
  closedMessage: string | null;
  /** Working window of this column, in minutes from midnight. */
  openStartMinute: number;
  openEndMinute: number;
};

export type AgendaLayoutRow = {
  minute: number;
  /** "09:30". Every row carries one; hiding it is the consumer's choice. */
  label: string;
  top: number;
  height: number;
  /** Whole hour, usually drawn with a heavier rule. */
  isMajor: boolean;
};

export type AgendaLayoutEventKind = "appointment" | "block";

export type AgendaLayoutEvent = {
  id: string;
  kind: AgendaLayoutEventKind;
  columnKey: string;
  dayKey: string;
  professionalId: string | null;
  top: number;
  height: number;
  left: number;
  width: number;
  startMinute: number;
  endMinute: number;
  /** Reserved time before the appointment. Blocks overlap lanes but is not part of the appointment label. */
  bufferBeforeMinutes: number;
  /** Reserved time after the appointment. Blocks overlap lanes but is not part of the appointment label. */
  bufferAfterMinutes: number;
  /** Start minute including the visual buffer. */
  bufferStartMinute: number;
  /** End minute including the visual buffer. */
  bufferEndMinute: number;
  /** "09:00 - 10:00" */
  timeLabel: string;
  title: string;
  subtitle: string;
  professionalName: string;
  status: string;
  isPaid: boolean;
  color: string;
  /** Placement among colliding events in the same column, 0-based. */
  overlapIndex: number;
  overlapCount: number;
};

/** A stretch of a column that cannot be booked. */
export type AgendaLayoutUnavailable = {
  columnKey: string;
  reason: "lunch" | "closed" | "before-open" | "after-close";
  label: string;
  top: number;
  height: number;
  startMinute: number;
  endMinute: number;
};

export type AgendaLayoutHit = {
  columnKey: string;
  dayKey: string;
  professionalId: string | null;
  /** Snapped down to the grid step. */
  minute: number;
};

export type AgendaLayout = {
  columns: AgendaLayoutColumn[];
  rows: AgendaLayoutRow[];
  events: AgendaLayoutEvent[];
  unavailable: AgendaLayoutUnavailable[];
  /** Step actually used. The week overrides the day granularity. */
  stepMinutes: number;
  rowHeight: number;
  startMinute: number;
  endMinute: number;
  axisWidth: number;
  totalWidth: number;
  /** Taller than the `height` given means the grid should scroll. */
  totalHeight: number;
  /** Pixels relative to the grid's top-left corner, axis included. */
  hitTest: (x: number, y: number) => AgendaLayoutHit | null;
  /** Minute to pixels, for a "now" line or any custom overlay. */
  minuteToY: (minute: number) => number;
  /** Pixels back to a minute, snapped to the step. */
  yToMinute: (y: number) => number;
};
