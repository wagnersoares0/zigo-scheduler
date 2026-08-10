import type { AgendaMessagesInput, TimeZone } from "@zigoschedule/scheduler-core";
import type { Appointment, Professional, WeekStart } from "@zigoschedule/scheduler-engine";

/** One appointment as it appears inside a day cell: a line, not a box. */
export type AgendaMonthEntry = {
  id: string;
  dayKey: string;
  startMinute: number;
  /** "09:30" */
  timeLabel: string;
  title: string;
  professionalId: string | null;
  professionalName: string;
  status: string;
  color: string;
};

export type AgendaMonthCell = {
  dayKey: string;
  dayNumber: number;
  column: number;
  row: number;
  left: number;
  top: number;
  width: number;
  height: number;
  /** False for the leading and trailing days borrowed from other months. */
  isCurrentMonth: boolean;
  isToday: boolean;
  /** Capped at `maxEntriesPerDay`. */
  entries: AgendaMonthEntry[];
  /** How many did not fit, shown as the cell's "+3 more" counter. */
  hiddenCount: number;
  totalCount: number;
};

export type AgendaMonthLayoutInput = {
  date: Date;
  appointments: Appointment[];
  professionals?: Professional[];
  timeZone?: TimeZone;
  locale?: string;
  messages?: AgendaMessagesInput;
  width: number;
  height: number;
  /** Lines per day before the rest collapse into a counter. Defaults to 3. */
  maxEntriesPerDay?: number;
  defaultColor?: string;
  colorByProfessional?: Record<string, string>;
  /** Week start: 0 = Sunday, 1 = Monday. Defaults to Sunday. */
  weekStartsOn?: WeekStart;
};

export type AgendaMonthLayout = {
  /** In the order selected by `weekStartsOn`. */
  weekdayLabels: string[];
  /** Always 42 cells: six weeks, so the grid never changes height. */
  cells: AgendaMonthCell[];
  columnWidth: number;
  rowHeight: number;
  totalWidth: number;
  totalHeight: number;
  /** Localized month label, such as "August 2026". */
  monthLabel: string;
};
