"use client";

import { memo } from "react";
import type { ReactNode } from "react";
import { Calendar, CalendarDays, ChevronLeft, ChevronRight, List, RefreshCw } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { View } from "@zigoschedule/scheduler-engine";
import { useAgendaMessages } from "../../config/AgendaConfigContext";

type ViewButton = {
  id: View;
  messageKey: keyof ReturnType<typeof useAgendaMessages>["views"];
  Icon: LucideIcon;
};

type Props = {
  view: View;
  periodLabel: string;
  loading?: boolean;
  onViewChange: (view: View) => void;
  onToday: () => void;
  onPrev: () => void;
  onNext: () => void;
  onReload?: () => void;
  filters?: ReactNode;
};

const VIEW_BUTTONS: ViewButton[] = [
  { id: "day", messageKey: "day", Icon: CalendarDays },
  { id: "week", messageKey: "week", Icon: Calendar },
  { id: "month", messageKey: "month", Icon: Calendar },
  { id: "list", messageKey: "list", Icon: List },
];

export const AgendaToolbar = memo(function AgendaToolbar({
  view,
  periodLabel,
  loading = false,
  onViewChange,
  onToday,
  onPrev,
  onNext,
  onReload,
  filters,
}: Props) {
  const messages = useAgendaMessages();

  return (
    <section className="border-b border-[#E2E8F0] bg-white px-3 py-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-1">
          <button
            type="button"
            aria-label={messages.previousPeriod}
            onClick={onPrev}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-l-md border border-[#D1D5DB] bg-white text-[#374151] transition hover:bg-[#F3F4F6] focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]/30"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label={messages.nextPeriod}
            onClick={onNext}
            className="-ml-px inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-r-md border border-[#D1D5DB] bg-white text-[#374151] transition hover:bg-[#F3F4F6] focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]/30"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onToday}
            className="ml-2 inline-flex h-9 shrink-0 items-center gap-2 rounded-md border border-[#D1D5DB] bg-white px-3 text-sm font-bold text-[#020617] transition hover:bg-[#F3F4F6] focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]/30"
          >
            <CalendarDays className="h-4 w-4 text-[#0284C7]" />
            {messages.today}
          </button>
          <div className="ml-2 flex h-9 min-w-0 items-center px-2">
            <span className="truncate text-xl font-black leading-none text-[#020617]">
              {periodLabel}
            </span>
          </div>
        </div>

        <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
          <div
            role="tablist"
            aria-label={messages.viewsLabel}
            className="inline-flex min-w-0 overflow-x-auto rounded-md border border-[#D1D5DB] bg-white"
          >
            {VIEW_BUTTONS.map(({ id, messageKey, Icon }) => {
              const active = id === view;
              const label = messages.views[messageKey];
              return (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => onViewChange(id)}
                  className={`-ml-px inline-flex h-9 shrink-0 items-center gap-1.5 border-l border-[#D1D5DB] px-3 text-xs font-black transition first:ml-0 first:border-l-0 focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]/30 ${
                    active
                      ? "bg-[#0284C7] text-white"
                      : "bg-white text-[#374151] hover:bg-[#F3F4F6] hover:text-[#020617]"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              );
            })}
          </div>
          {filters}
          {onReload ? (
            <button
              type="button"
              onClick={onReload}
              disabled={loading}
              className="inline-flex h-9 shrink-0 items-center gap-2 rounded-md border border-[#D1D5DB] bg-white px-3 text-xs font-black text-[#020617] transition hover:border-[#0284C7] hover:text-[#0284C7] focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]/30 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              {loading ? messages.updating : messages.reload}
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
});
