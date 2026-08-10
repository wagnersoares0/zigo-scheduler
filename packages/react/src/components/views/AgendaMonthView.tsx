"use client";

import { memo, useEffect, useMemo, useState } from "react";
import type {
  AppointmentColor,
  AppointmentColorMode,
} from "@zigoschedule/scheduler-core";
import type { Appointment, Block, Professional, WeekStart } from "@zigoschedule/scheduler-engine";
import { DEFAULT_WEEK_START, weekdayOrder } from "@zigoschedule/scheduler-engine";
import {
  createAgendaMoreLinkArg,
  formatAgendaMoreLinkText,
  resolveAgendaMoreLinkAction,
  splitAgendaDayGridItems,
  type AgendaResolvedOptions,
  type AgendaViewId,
  type AgendaMoreLinkAction,
  type AgendaMoreLinkClick,
  type AgendaMoreLinkText,
  type AgendaNativeInteractionEvent,
} from "@zigoschedule/scheduler-engine";
import {
  zoneMins,
  toMin,
  dateKey,
  monthStart,
  monthEnd,
  zoneNowParts,
  getAppointmentStartsAt,
  getBlockStartTime,
  isCanceledStatus,
} from "@zigoschedule/scheduler-engine";
import {
} from "../grid/AgendaCellRenderHooks";
import {
} from "../events/AgendaEventContent";
import {
  AgendaMorePopover,
  type AgendaMonthMoreItem,
  type AgendaMorePopoverAnchorRect,
} from "../grid/AgendaMorePopover";
import { useAgendaLocale, useAgendaMessages, useAgendaTimeZone } from "../../config/AgendaConfigContext";
import { AgendaMonthAppointmentButton } from "./month/AgendaMonthAppointmentButton";
import { AgendaMonthBlockButton } from "./month/AgendaMonthBlockButton";
import { AgendaMonthDayCell } from "./month/AgendaMonthDayCell";

export type AgendaMonthViewProps = {
  date: Date;
  agsByDay: Map<string, Appointment[]>;
  bloqsByDay: Map<string, Block[]>;
  themeProfs?: Professional[];
  appointmentColorMode: AppointmentColorMode;
  appointmentDefaultColor: AppointmentColor;
  onOpenAgendamento: (
    ag: Appointment,
    dayKey: string,
    jsEvent?: AgendaNativeInteractionEvent,
  ) => void;
  onOpenBloqueio: (
    bloq: Block,
    dayKey: string,
    s: number,
    e: number,
    jsEvent?: AgendaNativeInteractionEvent,
  ) => void;
  onOpenDay: (dayKey: string, jsEvent?: AgendaNativeInteractionEvent) => void;
  onMoreLinkNavigate?: (
    action: AgendaMoreLinkAction,
    dayKey: string,
  ) => boolean;
  dayMaxEvents?: boolean | number;
  moreLinkText?: AgendaMoreLinkText;
  moreLinkClick?: AgendaMoreLinkClick;
  calendarOptions: AgendaResolvedOptions;
  calendarView: AgendaViewId;
  onAgendaCallbackError?: (error: Error | null) => void;
  /** Week start: 0 = Sunday, 1 = Monday. */
  weekStartsOn?: WeekStart;
};

type AgendaMonthDayModel = {
  merged: AgendaMonthMoreItem[];
  visibleItems: AgendaMonthMoreItem[];
  hiddenItems: AgendaMonthMoreItem[];
  hiddenCount: number;
  totalCount: number;
  totalItems: number;
  normalAgCount: number;
  canceledAgCount: number;
  blocksCount: number;
};

export const AgendaMonthView = memo(function AgendaMonthView({
  date,
  agsByDay,
  bloqsByDay,
  themeProfs,
  appointmentColorMode,
  appointmentDefaultColor,
  onOpenAgendamento,
  onOpenBloqueio,
  onOpenDay,
  onMoreLinkNavigate,
  dayMaxEvents,
  moreLinkText,
  moreLinkClick,
  calendarOptions,
  calendarView,
  onAgendaCallbackError,
  weekStartsOn = DEFAULT_WEEK_START,
}: AgendaMonthViewProps) {
  const timeZone = useAgendaTimeZone();
  const locale = useAgendaLocale();
  const messages = useAgendaMessages();
  const [morePopover, setMorePopover] = useState<{
    dayKey: string;
    items: AgendaMonthMoreItem[];
    anchorRect: AgendaMorePopoverAnchorRect;
  } | null>(null);
  const startOfMonth = monthStart(date);
  const endOfMonth = monthEnd(date);
  const selectedKey = dateKey(date);
  const todayKey = zoneNowParts(timeZone).dayKey;
  const daysInMonth = endOfMonth.getDate();
  // Empty cells before day 1 depend on the selected week start. This view used
  // to be hardcoded to Sunday while the rest of the library used Monday, which
  // produced different calendars for the same month.
  const leadingEmpty = (startOfMonth.getDay() - weekStartsOn + 7) % 7;
  const totalCells = leadingEmpty + daysInMonth;
  const trailingEmpty = (7 - (totalCells % 7)) % 7;
  const cells = useMemo(
    () =>
      Array.from({ length: totalCells + trailingEmpty }, (_, idx) => {
        if (idx < leadingEmpty || idx >= leadingEmpty + daysInMonth)
          return null;
        const day = idx - leadingEmpty + 1;
        return new Date(date.getFullYear(), date.getMonth(), day, 12, 0, 0, 0);
      }),
    [date, daysInMonth, leadingEmpty, totalCells, trailingEmpty],
  );
  const dayModelByKey = useMemo(() => {
    const result = new Map<string, AgendaMonthDayModel>();
    cells.forEach((dayDate) => {
      if (!dayDate) return;
      const key = dateKey(dayDate);
      const dayAgs = [...(agsByDay.get(key) ?? [])].sort(
        (a, b) => zoneMins(getAppointmentStartsAt(a), timeZone) - zoneMins(getAppointmentStartsAt(b), timeZone),
      );
      const dayBloqs = [...(bloqsByDay.get(key) ?? [])].sort(
        (a, b) => toMin(getBlockStartTime(a)) - toMin(getBlockStartTime(b)),
      );
      const totalItems = dayAgs.length + dayBloqs.length;
      const normalAgCount = dayAgs.filter((ag) => !isCanceledStatus(ag.status)).length;
      const canceledAgCount = dayAgs.length - normalAgCount;
      const blocksCount = dayBloqs.length;
      const merged: AgendaMonthMoreItem[] = [
        ...dayAgs.map((ag) => ({
          kind: "ag" as const,
          ag,
          start: zoneMins(getAppointmentStartsAt(ag), timeZone),
        })),
        ...dayBloqs.map((bloq) => ({
          kind: "bloq" as const,
          bloq,
          start: toMin(getBlockStartTime(bloq)),
        })),
      ].sort((a, b) => a.start - b.start);
      const { visibleItems, hiddenItems, hiddenCount, totalCount } =
        splitAgendaDayGridItems(merged, dayMaxEvents);

      result.set(key, {
        merged,
        visibleItems,
        hiddenItems,
        hiddenCount,
        totalCount,
        totalItems,
        normalAgCount,
        canceledAgCount,
        blocksCount,
      });
    });
    return result;
  }, [agsByDay, bloqsByDay, cells, dayMaxEvents]);

  useEffect(() => {
    setMorePopover(null);
  }, [agsByDay, bloqsByDay, date, dayMaxEvents]);
  const weekdayLabels = useMemo(
    () =>
      weekdayOrder(weekStartsOn).map((index) =>
        new Intl.DateTimeFormat(locale, { weekday: "short" }).format(
          new Date(2026, 7, 2 + index, 12),
        ),
      ),
    [locale, weekStartsOn],
  );

  return (
    <section className="flex-1 min-w-0 overflow-auto bg-white">
      <div className="grid min-h-full min-w-[1120px] grid-cols-7 border-l border-t border-[#D1D5DB]">
        {weekdayLabels.map((weekday) => (
          <div
            key={weekday}
            className="sticky top-0 z-20 flex h-10 items-center justify-center border-r border-b border-[#D1D5DB] bg-[#F8FAFC] px-3 text-[12px] font-semibold text-[#374151]"
          >
            {weekday}
          </div>
        ))}

        {cells.map((dayDate, idx) => {
          if (!dayDate) {
            return (
              <div
                key={`month-empty-${idx}`}
                className="min-h-[132px] border-r border-b border-[#E5E7EB] bg-[#F9FAFB]"
              />
            );
          }

          const key = dateKey(dayDate);
          const isToday = key === todayKey;
          const isSelected = key === selectedKey;
          const weekend = dayDate.getDay() === 0 || dayDate.getDay() === 6;
          const dayModel = dayModelByKey.get(key);
          const totalItems = dayModel?.totalItems ?? 0;
          const normalAgCount = dayModel?.normalAgCount ?? 0;
          const canceledAgCount = dayModel?.canceledAgCount ?? 0;
          const blocksCount = dayModel?.blocksCount ?? 0;
          const merged = dayModel?.merged ?? [];
          const visibleItems = dayModel?.visibleItems ?? [];
          const hiddenItems = dayModel?.hiddenItems ?? [];
          const hiddenCount = dayModel?.hiddenCount ?? 0;
          const totalCount = dayModel?.totalCount ?? 0;
          const moreLinkLabel = moreLinkText
            ? formatAgendaMoreLinkText(hiddenCount, moreLinkText, totalCount)
            : messages.more(hiddenCount, totalCount);

          return (
            <AgendaMonthDayCell
              key={key}
              dayDate={dayDate}
              dayKey={key}
              todayKey={todayKey}
              isToday={isToday}
              isSelected={isSelected}
              weekend={weekend}
              totalItems={totalItems}
              normalAgCount={normalAgCount}
              canceledAgCount={canceledAgCount}
              blocksCount={blocksCount}
              calendarOptions={calendarOptions}
              calendarView={calendarView}
              onAgendaCallbackError={onAgendaCallbackError}
              onOpenDay={onOpenDay}
            >
              <div className="mt-1 flex min-h-0 flex-1 flex-col">
                <div className="space-y-0.5 overflow-hidden">
                  {visibleItems.map((item) => {
                    if (item.kind === "ag") {
                      return (
                        <AgendaMonthAppointmentButton
                          key={item.ag.id}
                          ag={item.ag}
                          dayKey={key}
                          calendarOptions={calendarOptions}
                          calendarView={calendarView}
                          appointmentColorMode={appointmentColorMode}
                          appointmentDefaultColor={appointmentDefaultColor}
                          onAgendaCallbackError={onAgendaCallbackError}
                          onOpenAgendamento={onOpenAgendamento}
                        />
                      );
                    }

                    return (
                      <AgendaMonthBlockButton
                        key={item.bloq.id}
                        bloq={item.bloq}
                        dayKey={key}
                        calendarOptions={calendarOptions}
                        calendarView={calendarView}
                        themeProfs={themeProfs}
                        onAgendaCallbackError={onAgendaCallbackError}
                        onOpenBloqueio={onOpenBloqueio}
                      />
                    );
                  })}
                </div>

                {hiddenCount > 0 && (
                  <div className="flex min-h-0 flex-1 items-start">
                    <button
                      type="button"
                      aria-label={messages.openDayWithMoreItems(key, hiddenCount)}
                      onClick={(ev) => {
                        const moreLinkArg = createAgendaMoreLinkArg({
                          date: dayDate,
                          view: "dayGridMonth",
                          allItems: merged,
                          hiddenItems,
                          hiddenCount,
                          totalCount,
                        });
                        const action = resolveAgendaMoreLinkAction(
                          moreLinkClick,
                          moreLinkArg,
                        );

                        if (action !== "popover") {
                          const handled =
                            onMoreLinkNavigate?.(action, key) ?? false;
                          if (handled) return;
                          if (action === "day" || action === "timeGridDay") {
                            onOpenDay(key, ev.nativeEvent);
                            return;
                          }
                        }

                        const rect = ev.currentTarget.getBoundingClientRect();
                        setMorePopover({
                          dayKey: key,
                          items: hiddenItems,
                          anchorRect: {
                            top: rect.top,
                            right: rect.right,
                            bottom: rect.bottom,
                            left: rect.left,
                            width: rect.width,
                            height: rect.height,
                          },
                        });
                      }}
                      className="rounded-sm px-1 text-left text-[11px] font-semibold text-[#2563EB] hover:bg-[#EFF6FF] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30"
                    >
                      {moreLinkLabel}
                    </button>
                  </div>
                )}
              </div>
            </AgendaMonthDayCell>
          );
        })}
      </div>

      {morePopover && (
        <AgendaMorePopover
          dayKey={morePopover.dayKey}
          items={morePopover.items}
          anchorRect={morePopover.anchorRect}
          themeProfs={themeProfs}
          appointmentColorMode={appointmentColorMode}
          appointmentDefaultColor={appointmentDefaultColor}
          onClose={() => setMorePopover(null)}
          onOpenAgendamento={onOpenAgendamento}
          onOpenBloqueio={onOpenBloqueio}
          calendarOptions={calendarOptions}
          calendarView={calendarView}
          onAgendaCallbackError={onAgendaCallbackError}
        />
      )}
    </section>
  );
});
