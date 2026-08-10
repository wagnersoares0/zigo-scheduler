"use client";

import { AlertTriangle, ChevronDown, Clock3 } from "lucide-react";

export type CheckoutPendingNoticeItem = {
  id: string;
  clientName: string;
  serviceName: string;
  professionalName: string;
  timeLabel: string;
  dayLabel: string;
};

type CheckoutPendingNoticeProps<TItem extends CheckoutPendingNoticeItem> = {
  count: number;
  scopeLabel: string;
  periodLabel: string;
  items: TItem[];
  open: boolean;
  onToggle: () => void;
  onOpenItem: (item: TItem) => void;
};

export function CheckoutPendingNotice<TItem extends CheckoutPendingNoticeItem>({
  count,
  scopeLabel,
  periodLabel,
  items,
  open,
  onToggle,
  onOpenItem,
}: CheckoutPendingNoticeProps<TItem>) {
  const previewItems = items.slice(0, 6);
  const hiddenCount = Math.max(0, count - previewItems.length);

  return (
    <section className="rounded-xl border border-[#FDBA74] bg-[#FFF7ED] px-4 py-3 text-sm text-[#9A3412] shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#FFEDD5] text-[#C2410C]">
            <AlertTriangle className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="font-semibold text-[#7C2D12]">
              {count} overdue {count === 1 ? "appointment" : "appointments"} {scopeLabel} without checkout
            </p>
            <p className="mt-0.5 text-xs font-medium text-[#9A3412]">
              {periodLabel}: finish checkout so finance receives the right totals.
            </p>
          </div>
        </div>
        <button
          type="button"
          className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg border border-[#0284C7] bg-white px-3 text-xs font-semibold text-[#0284C7] hover:bg-[#F0F9FF]"
          onClick={onToggle}
          aria-expanded={open}
        >
          {open ? "Hide pending" : "View pending"}
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      </div>

      {open && (
        <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {previewItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className="min-w-0 rounded-lg border border-[#FED7AA] bg-white px-3 py-2 text-left text-[#020617] hover:border-[#0284C7] hover:bg-[#F8FAFC]"
              onClick={() => onOpenItem(item)}
            >
              <span className="flex min-w-0 items-center gap-1.5 text-[11px] font-semibold text-[#C2410C]">
                <Clock3 className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{item.dayLabel} · {item.timeLabel}</span>
              </span>
              <span className="mt-1 block truncate text-sm font-semibold">{item.clientName}</span>
              <span className="mt-0.5 block truncate text-xs text-[#475569]">
                {item.serviceName} · {item.professionalName}
              </span>
              <span className="mt-2 inline-flex rounded-md bg-[#E0F2FE] px-2 py-1 text-[11px] font-semibold text-[#0369A1]">
                Open appointment
              </span>
            </button>
          ))}

          {hiddenCount > 0 && (
            <div className="rounded-lg border border-dashed border-[#FDBA74] bg-white/70 px-3 py-2 text-xs font-medium text-[#9A3412]">
              +{hiddenCount} pending {hiddenCount === 1 ? "appointment" : "appointments"}. Use the period schedule/list to review the rest.
            </div>
          )}
        </div>
      )}
    </section>
  );
}
