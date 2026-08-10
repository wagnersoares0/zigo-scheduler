"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight } from "lucide-react";
import type {
  AppointmentColor,
  AppointmentColorMode,
} from "@zigoschedule/scheduler-core";
import {
  formatAgendaCurrency,
  formatAgendaDuration,
  formatAgendaTime,
  getAgendaStatusLabel,
} from "@zigoschedule/scheduler-core";
import type { AgendaListRow, Professional } from "@zigoschedule/scheduler-engine";
import {
  GRID_MIN,
  DAY_CANCELED_CARD_THEME,
  getAppointmentCardTheme,
  getProfessionalCardThemeForVisibleList,
  isCanceledStatus,
} from "@zigoschedule/scheduler-engine";
import {
  appointmentToAgendaEventInput,
  blockToAgendaEventInput,
  type AgendaNativeInteractionEvent,
  type AgendaResolvedOptions,
  type AgendaViewId,
} from "@zigoschedule/scheduler-engine";
import { fromDayKey } from "@zigoschedule/scheduler-engine";
import { truncateProfessionalName } from "@zigoschedule/scheduler-engine";
import {
  AgendaEventContent,
  AgendaEventTooltip,
  useAgendaEventRender,
  useAgendaEventTooltip,
} from "../events/AgendaEventContent";
import { useAgendaLocale, useAgendaMessages } from "../../config/AgendaConfigContext";

export type AgendaListViewProps = {
  agendaRowsByDay: [string, AgendaListRow[]][];
  periodLabel: string;
  themeProfs?: Professional[];
  appointmentColorMode: AppointmentColorMode;
  appointmentDefaultColor: AppointmentColor;
  onOpenRow: (
    row: AgendaListRow,
    jsEvent?: AgendaNativeInteractionEvent,
  ) => void;
  calendarOptions: AgendaResolvedOptions;
  calendarView: AgendaViewId;
  onAgendaCallbackError?: (error: Error | null) => void;
};

const LARGE_LIST_INITIAL_LIMIT = 200;
const LARGE_LIST_LOAD_STEP = 200;
type AgendaCardTheme = ReturnType<typeof getProfessionalCardThemeForVisibleList>;

type AgendaListEventRowProps = {
  row: AgendaListRow;
  themeByProfId?: ReadonlyMap<string, AgendaCardTheme>;
  appointmentColorMode: AppointmentColorMode;
  appointmentDefaultColor: AppointmentColor;
  calendarOptions: AgendaResolvedOptions;
  calendarView: AgendaViewId;
  onAgendaCallbackError?: (error: Error | null) => void;
  onOpenRow: (
    row: AgendaListRow,
    jsEvent?: AgendaNativeInteractionEvent,
  ) => void;
};

const AgendaListEventRow = memo(function AgendaListEventRow({
  row,
  themeByProfId,
  appointmentColorMode,
  appointmentDefaultColor,
  calendarOptions,
  calendarView,
  onAgendaCallbackError,
  onOpenRow,
}: AgendaListEventRowProps) {
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const locale = useAgendaLocale();
  const messages = useAgendaMessages();
  const isCanceled = isCanceledStatus(row.status);
  const profId =
    row.kind === "appointment" ? row.ag?.profissional_id : row.bloq?.profissional_id;
  const theme =
    row.kind === "appointment"
      ? isCanceled
        ? DAY_CANCELED_CARD_THEME
        : row.ag
          ? getAppointmentCardTheme({
              appointmentColor: row.ag.cor_agendamento,
              appointmentColorIsCustom: row.ag.cor_agendamento_personalizada,
              mode: appointmentColorMode,
              defaultColor: appointmentDefaultColor,
            })
          : null
      : profId
        ? (themeByProfId?.get(profId) ?? null)
        : null;
  const timeLabel = formatAgendaTime(row.start, locale);
  const endTimeLabel = formatAgendaTime(row.end, locale);
  const durationLabel = formatAgendaDuration(
    Math.max(GRID_MIN, row.end - row.start),
    locale,
  );
  const event =
    row.kind === "appointment" && row.ag
      ? appointmentToAgendaEventInput(row.ag)
      : row.kind === "block" && row.bloq
        ? blockToAgendaEventInput(row.bloq)
        : null;
  const fallbackEvent = event;
  const { dispatchMouseEnter, dispatchMouseLeave, optionClassName, renderArg } =
    useAgendaEventRender({
      options: calendarOptions,
      event: fallbackEvent ?? {
        id: row.id,
        sourceId: row.kind === "appointment" ? "appointments" : "blocks",
        kind: row.kind === "appointment" ? "appointment" : "block",
        title: row.clientName,
        start: row.dayKey,
        end: row.dayKey,
        allDay: false,
        resourceId: null,
        display: "auto",
        editable: false,
        startEditable: false,
        durationEditable: false,
        overlap: false,
        extendedProps: {
          dayKey: row.dayKey,
          startMinute: row.start,
          endMinute: row.end,
          status: row.status,
          schedulerScoped: true,
          tenantScoped: true,
          raw: row.appointment ?? row.ag ?? row.block ?? row.bloq ?? ({} as never),
        },
      },
      view: calendarView,
      display: "list",
      density: "comfortable",
      timeText: timeLabel,
      title: row.clientName,
      subtitle: `${row.serviceName} - ${truncateProfessionalName(row.professionalName, 14)}`,
      elementRef: btnRef,
      onCallbackError: onAgendaCallbackError,
    });
  const {
    hideTooltip,
    showTooltipFromElement,
    showTooltipFromMouseEvent,
    tooltip,
  } = useAgendaEventTooltip({
    renderArg,
    elementRef: btnRef,
  });

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        aria-label={
          row.kind === "appointment"
            ? messages.openAppointment(row.clientName)
            : messages.openBlock(timeLabel, endTimeLabel)
        }
        title={`${row.serviceName} - ${row.professionalName}`}
        onClick={(ev) => onOpenRow(row, ev.nativeEvent)}
        onMouseEnter={(ev) => {
          dispatchMouseEnter(ev.nativeEvent);
          showTooltipFromMouseEvent(ev.nativeEvent);
        }}
        onMouseMove={(ev) => showTooltipFromMouseEvent(ev.nativeEvent)}
        onMouseLeave={(ev) => {
          dispatchMouseLeave(ev.nativeEvent);
          hideTooltip();
        }}
        onFocus={showTooltipFromElement}
        onBlur={hideTooltip}
        className={`grid w-full grid-cols-[88px_16px_minmax(0,1fr)_40px] items-center gap-2 border-b border-[#E5E7EB] px-3 py-2.5 text-left transition-colors last:border-b-0 hover:bg-[#F9FAFB] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#2563EB]/30 ${optionClassName}`}
      >
        <div className="min-w-0">
          <p
            className={`text-[13px] font-semibold tabular-nums leading-none ${theme ? theme.timeClass : "text-[#111827]"}`}
          >
            {renderArg.timeText}
          </p>
          <p className="mt-1 text-[11px] text-[#64748B]">{durationLabel}</p>
        </div>
        <div
          className={`h-2.5 w-2.5 shrink-0 rounded-full bg-current ${theme ? theme.timeClass : "text-[#94A3B8]"}`}
        />
        <div className="min-w-0 flex-1">
          <AgendaEventContent
            options={calendarOptions}
            renderArg={renderArg}
            timeClassName="hidden"
            titleClassName={`text-[15px] font-semibold ${theme ? theme.clientClass : "text-[#0F172A]"}`}
            subtitleClassName={`text-sm ${theme ? theme.serviceClass : "text-[#64748B]"}`}
            badgeClassName="mt-1"
            showTime={false}
            showStatusBadge={row.kind === "appointment"}
            showSourceBadge={row.kind === "block"}
          />
        </div>
        <div className="flex items-center justify-end">
          <ChevronRight className="h-4 w-4 text-[#64748B]" />
        </div>
      </button>
      <AgendaEventTooltip tooltip={tooltip} />
    </>
  );
});

type AgendaListCompactEventRowProps = {
  row: AgendaListRow;
  themeByProfId?: ReadonlyMap<string, AgendaCardTheme>;
  appointmentColorMode: AppointmentColorMode;
  appointmentDefaultColor: AppointmentColor;
  onOpenRow: (
    row: AgendaListRow,
    jsEvent?: AgendaNativeInteractionEvent,
  ) => void;
};

const AgendaListCompactEventRow = memo(function AgendaListCompactEventRow({
  row,
  themeByProfId,
  appointmentColorMode,
  appointmentDefaultColor,
  onOpenRow,
}: AgendaListCompactEventRowProps) {
  const messages = useAgendaMessages();
  const locale = useAgendaLocale();
  const isCanceled = isCanceledStatus(row.status);
  const profId =
    row.kind === "appointment" ? row.ag?.profissional_id : row.bloq?.profissional_id;
  const theme =
    row.kind === "appointment"
      ? isCanceled
        ? DAY_CANCELED_CARD_THEME
        : row.ag
          ? getAppointmentCardTheme({
              appointmentColor: row.ag.cor_agendamento,
              appointmentColorIsCustom: row.ag.cor_agendamento_personalizada,
              mode: appointmentColorMode,
              defaultColor: appointmentDefaultColor,
            })
          : null
      : profId
        ? (themeByProfId?.get(profId) ?? null)
        : null;
  const timeLabel = formatAgendaTime(row.start, locale);
  const endTimeLabel = formatAgendaTime(row.end, locale);
  const durationLabel = formatAgendaDuration(
    Math.max(GRID_MIN, row.end - row.start),
    locale,
  );
  const statusLabel = row.kind === "appointment"
    ? getAgendaStatusLabel(row.status, messages)
    : messages.block;

  return (
    <button
      type="button"
      aria-label={
        row.kind === "appointment"
          ? messages.openAppointment(row.clientName)
          : messages.openBlock(timeLabel, endTimeLabel)
      }
      title={`${row.serviceName} - ${row.professionalName}`}
      onClick={(ev) => onOpenRow(row, ev.nativeEvent)}
      className="grid w-full grid-cols-[82px_minmax(0,1fr)_88px_28px] items-center gap-2 border-b border-[#E5E7EB] px-3 py-2 text-left transition-colors last:border-b-0 hover:bg-[#F9FAFB] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#0284C7]/30"
    >
      <div className="min-w-0">
        <p
          className={`text-[12px] font-semibold tabular-nums leading-none ${theme ? theme.timeClass : "text-[#111827]"}`}
        >
          {timeLabel}
        </p>
        <p className="mt-1 text-[10px] text-[#64748B]">{durationLabel}</p>
      </div>
      <div className="min-w-0">
        <p
          className={`truncate text-[13px] font-semibold leading-tight ${theme ? theme.clientClass : "text-[#0F172A]"}`}
        >
          {row.clientName}
        </p>
        <p
          className={`mt-0.5 truncate text-[11px] leading-tight ${theme ? theme.serviceClass : "text-[#64748B]"}`}
        >
          {row.serviceName} -{" "}
          {truncateProfessionalName(row.professionalName, 18)}
        </p>
      </div>
      <span className="truncate rounded-[4px] border border-[#E2E8F0] bg-[#F8FAFC] px-1.5 py-1 text-center text-[10px] font-semibold uppercase text-[#475569]">
        {statusLabel}
      </span>
      <ChevronRight className="h-4 w-4 justify-self-end text-[#64748B]" />
    </button>
  );
});

export const AgendaListView = memo(function AgendaListView({
  agendaRowsByDay,
  periodLabel,
  themeProfs,
  appointmentColorMode,
  appointmentDefaultColor,
  onOpenRow,
  calendarOptions,
  calendarView,
  onAgendaCallbackError,
}: AgendaListViewProps) {
  const locale = useAgendaLocale();
  const messages = useAgendaMessages();
  const allRows = useMemo(
    () => agendaRowsByDay.flatMap(([, rows]) => rows),
    [agendaRowsByDay],
  );
  const listStats = useMemo(() => {
    let agCount = 0;
    let blockCount = 0;
    let valorTotal = 0;
    for (const row of allRows) {
      if (row.kind === "appointment") {
        agCount += 1;
        valorTotal += row.preco ?? 0;
      } else {
        blockCount += 1;
      }
    }
    return { agCount, blockCount, valorTotal };
  }, [allRows]);
  const totalRows = allRows.length;
  const isLargeList = totalRows > LARGE_LIST_INITIAL_LIMIT;
  const [visibleLimit, setVisibleLimit] = useState(LARGE_LIST_INITIAL_LIMIT);
  const listSignature = useMemo(
    () =>
      `${periodLabel}:${totalRows}:${agendaRowsByDay[0]?.[0] ?? ""}:${agendaRowsByDay[agendaRowsByDay.length - 1]?.[0] ?? ""}`,
    [agendaRowsByDay, periodLabel, totalRows],
  );
  const themeByProfId = useMemo(() => {
    if (!themeProfs?.length) return undefined;
    return new Map(
      themeProfs.map((prof) => [
        prof.id,
        getProfessionalCardThemeForVisibleList(prof.id, themeProfs),
      ]),
    );
  }, [themeProfs]);

  useEffect(() => {
    setVisibleLimit(LARGE_LIST_INITIAL_LIMIT);
  }, [listSignature]);

  const visibleRowsByDay = useMemo(() => {
    if (!isLargeList) return agendaRowsByDay;

    let remaining = visibleLimit;
    const nextRowsByDay: [string, AgendaListRow[]][] = [];
    for (const [dayKey, rows] of agendaRowsByDay) {
      if (remaining <= 0) break;
      const dayRows = rows.slice(0, remaining);
      if (dayRows.length > 0) {
        nextRowsByDay.push([dayKey, dayRows]);
        remaining -= dayRows.length;
      }
    }
    return nextRowsByDay;
  }, [agendaRowsByDay, isLargeList, visibleLimit]);
  const visibleRowsCount = useMemo(
    () =>
      isLargeList
        ? visibleRowsByDay.reduce((acc, [, rows]) => acc + rows.length, 0)
        : totalRows,
    [isLargeList, totalRows, visibleRowsByDay],
  );
  const canLoadMore = isLargeList && visibleRowsCount < totalRows;

  return (
    <section className="flex-1 min-w-0 overflow-auto bg-white">
      <div className="flex min-w-[860px] flex-col">
        <div className="flex flex-col gap-3 border-b border-[#D1D5DB] bg-white px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">
              {messages.agenda}
            </p>
            <h2 className="truncate text-lg font-semibold capitalize text-[#020617]">
              {messages.weekPrefix}: {periodLabel}
            </h2>
          </div>
        </div>

        <div className="border-b border-[#E5E7EB] bg-[#F8FAFC] px-4 py-2 text-[11px] font-medium text-[#64748B]">
          {messages.listStats(
            listStats.agCount,
            listStats.blockCount,
            formatAgendaCurrency(listStats.valorTotal, locale),
          )}
        </div>

        <div className="bg-white">
          {isLargeList && (
            <div className="flex flex-col gap-2 border-b border-[#E5E7EB] bg-[#F8FAFC] px-4 py-3 text-sm text-[#475569] sm:flex-row sm:items-center sm:justify-between">
              <span>
                {messages.visibleItems(totalRows, visibleRowsCount)}
              </span>
              {canLoadMore && (
                <button
                  type="button"
                  onClick={() =>
                    setVisibleLimit((prev) =>
                      Math.min(prev + LARGE_LIST_LOAD_STEP, totalRows),
                    )
                  }
                  className="inline-flex h-8 items-center justify-center rounded-md border border-[#0284C7] bg-white px-3 text-xs font-semibold text-[#0284C7] transition-colors hover:bg-[#F0F9FF] focus:outline-none focus:ring-2 focus:ring-[#0284C7]/30"
                >
                  {messages.loadMore}
                </button>
              )}
            </div>
          )}

          {agendaRowsByDay.length === 0 ? (
            <div className="px-4 py-6 text-sm text-[#64748B]">
              {messages.noItems}
            </div>
          ) : (
            visibleRowsByDay.map(([dayKey, rows]) => (
              <div
                key={`agenda-list-dia-${dayKey}`}
                className="border-b border-[#D1D5DB] last:border-b-0"
              >
                <div className="sticky top-0 z-10 border-b border-[#E5E7EB] bg-[#F3F4F6] px-4 py-2 text-xs font-semibold uppercase text-[#374151]">
                  {fromDayKey(dayKey).toLocaleDateString(locale, {
                    weekday: "short",
                    day: "2-digit",
                    month: "short",
                  })}
                </div>
                <div>
                  {rows.map((row) =>
                    isLargeList ? (
                      <AgendaListCompactEventRow
                        key={`${row.dayKey}-${row.kind}-${row.id}`}
                        row={row}
                        themeByProfId={themeByProfId}
                        appointmentColorMode={appointmentColorMode}
                        appointmentDefaultColor={appointmentDefaultColor}
                        onOpenRow={onOpenRow}
                      />
                    ) : (
                      <AgendaListEventRow
                        key={`${row.dayKey}-${row.kind}-${row.id}`}
                        row={row}
                        themeByProfId={themeByProfId}
                        appointmentColorMode={appointmentColorMode}
                        appointmentDefaultColor={appointmentDefaultColor}
                        calendarOptions={calendarOptions}
                        calendarView={calendarView}
                        onAgendaCallbackError={onAgendaCallbackError}
                        onOpenRow={onOpenRow}
                      />
                    ),
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
});
