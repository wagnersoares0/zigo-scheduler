"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RefObject } from "react";
import type {
  AgendaEventInput,
  AgendaEventRenderArg,
  AgendaEventRenderDensity,
  AgendaEventRenderDisplay,
  AgendaResolvedOptions,
  AgendaViewId,
} from "@zigoschedule/scheduler-engine";
import {
  createAgendaEventRenderArg,
  dispatchAgendaEventDidMount,
  dispatchAgendaEventMouseEnter,
  dispatchAgendaEventMouseLeave,
  dispatchAgendaEventWillUnmount,
  getAgendaEventDefaultBadges,
  resolveAgendaEventClassNames,
  resolveAgendaEventContent,
} from "@zigoschedule/scheduler-engine";
import { formatAgendaCurrency } from "@zigoschedule/scheduler-core";
import { useAgendaLocale, useAgendaMessages } from "../../config/AgendaConfigContext";

type UseAgendaEventRenderInput<ElementType extends HTMLElement> = {
  options: AgendaResolvedOptions;
  event: AgendaEventInput;
  view: AgendaViewId;
  display: AgendaEventRenderDisplay;
  density: AgendaEventRenderDensity;
  timeText: string;
  title?: string;
  subtitle?: string;
  isPending?: boolean;
  elementRef?: RefObject<ElementType | null>;
  onCallbackError?: (error: Error | null) => void;
};

export const useAgendaEventRender = <ElementType extends HTMLElement>({
  options,
  event,
  view,
  display,
  density,
  timeText,
  title,
  subtitle,
  isPending = false,
  elementRef,
  onCallbackError,
}: UseAgendaEventRenderInput<ElementType>) => {
  const renderArg = useMemo(
    () =>
      createAgendaEventRenderArg({
        event,
        view,
        display,
        density,
        timeText,
        title,
        subtitle,
        isPending,
      }),
    [density, display, event, isPending, subtitle, timeText, title, view],
  );

  const optionClassName = useMemo(
    () => resolveAgendaEventClassNames(options.eventClassNames, renderArg).join(" "),
    [options.eventClassNames, renderArg],
  );

  useEffect(() => {
    const el = elementRef?.current ?? null;
    if (!el) return;

    if (options.eventDidMount) {
      const result = dispatchAgendaEventDidMount({
        options,
        arg: renderArg,
        el,
      });
      onCallbackError?.(result.error);
    }

    return () => {
      if (!options.eventWillUnmount) return;
      const result = dispatchAgendaEventWillUnmount({
        options,
        arg: renderArg,
        el,
      });
      onCallbackError?.(result.error);
    };
  }, [elementRef, onCallbackError, options, renderArg]);

  const dispatchMouseEnter = useCallback((jsEvent: MouseEvent) => {
    const el = elementRef?.current ?? null;
    if (!el || !options.eventMouseEnter) return;
    const result = dispatchAgendaEventMouseEnter({
      options,
      arg: renderArg,
      el,
      jsEvent,
    });
    onCallbackError?.(result.error);
  }, [elementRef, onCallbackError, options, renderArg]);

  const dispatchMouseLeave = useCallback((jsEvent: MouseEvent) => {
    const el = elementRef?.current ?? null;
    if (!el || !options.eventMouseLeave) return;
    const result = dispatchAgendaEventMouseLeave({
      options,
      arg: renderArg,
      el,
      jsEvent,
    });
    onCallbackError?.(result.error);
  }, [elementRef, onCallbackError, options, renderArg]);

  return {
    dispatchMouseEnter,
    dispatchMouseLeave,
    optionClassName,
    renderArg,
  };
};

type AgendaEventTooltipState = {
  renderArg: AgendaEventRenderArg;
  x: number;
  y: number;
};

const TOOLTIP_WIDTH_PX = 304;
const TOOLTIP_HEIGHT_ESTIMATE_PX = 188;
const TOOLTIP_MARGIN_PX = 12;

const clampTooltipPoint = (x: number, y: number): { x: number; y: number } => {
  if (typeof window === "undefined") return { x, y };
  const maxX = Math.max(TOOLTIP_MARGIN_PX, window.innerWidth - TOOLTIP_WIDTH_PX - TOOLTIP_MARGIN_PX);
  const maxY = Math.max(TOOLTIP_MARGIN_PX, window.innerHeight - TOOLTIP_HEIGHT_ESTIMATE_PX - TOOLTIP_MARGIN_PX);

  return {
    x: Math.max(TOOLTIP_MARGIN_PX, Math.min(x, maxX)),
    y: Math.max(TOOLTIP_MARGIN_PX, Math.min(y, maxY)),
  };
};

export const useAgendaEventTooltip = <ElementType extends HTMLElement>({
  renderArg,
  elementRef,
}: {
  renderArg: AgendaEventRenderArg;
  elementRef: RefObject<ElementType | null>;
}) => {
  const [tooltip, setTooltip] = useState<AgendaEventTooltipState | null>(null);
  const tooltipFrameRef = useRef<number | null>(null);
  const pendingTooltipPointRef = useRef<{ x: number; y: number } | null>(null);

  const cancelPendingTooltipFrame = useCallback(() => {
    if (tooltipFrameRef.current !== null && typeof window !== "undefined") {
      window.cancelAnimationFrame(tooltipFrameRef.current);
    }
    tooltipFrameRef.current = null;
    pendingTooltipPointRef.current = null;
  }, []);

  const flushMouseTooltip = useCallback(() => {
    tooltipFrameRef.current = null;
    const point = pendingTooltipPointRef.current;
    if (!point) return;
    pendingTooltipPointRef.current = null;
    setTooltip({
      renderArg,
      ...point,
    });
  }, [renderArg]);

  const showTooltipFromMouseEvent = useCallback((event: MouseEvent) => {
    const point = clampTooltipPoint(event.clientX + 14, event.clientY + 14);
    if (typeof window === "undefined" || typeof window.requestAnimationFrame !== "function") {
      setTooltip({
        renderArg,
        ...point,
      });
      return;
    }

    pendingTooltipPointRef.current = point;
    if (tooltipFrameRef.current !== null) return;
    tooltipFrameRef.current = window.requestAnimationFrame(flushMouseTooltip);
  }, [flushMouseTooltip, renderArg]);

  const showTooltipFromElement = useCallback(() => {
    const el = elementRef.current;
    if (!el) return;
    cancelPendingTooltipFrame();
    const rect = el.getBoundingClientRect();
    const point = clampTooltipPoint(rect.left + 12, rect.bottom + 10);
    setTooltip({
      renderArg,
      ...point,
    });
  }, [cancelPendingTooltipFrame, elementRef, renderArg]);

  const hideTooltip = useCallback(() => {
    cancelPendingTooltipFrame();
    setTooltip(null);
  }, [cancelPendingTooltipFrame]);

  useEffect(() => hideTooltip, [hideTooltip, renderArg.eventId]);

  useEffect(() => {
    if (!tooltip) return;

    document.addEventListener("pointerdown", hideTooltip, true);
    document.addEventListener("scroll", hideTooltip, true);
    document.addEventListener("keydown", hideTooltip);

    return () => {
      document.removeEventListener("pointerdown", hideTooltip, true);
      document.removeEventListener("scroll", hideTooltip, true);
      document.removeEventListener("keydown", hideTooltip);
    };
  }, [hideTooltip, tooltip]);

  return {
    hideTooltip,
    showTooltipFromElement,
    showTooltipFromMouseEvent,
    tooltip,
  };
};

const getRawText = (raw: unknown, key: string): string | null => {
  if (!raw || typeof raw !== "object") return null;
  const value = (raw as Record<string, unknown>)[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
};

const getRawNumber = (raw: unknown, key: string): number | null => {
  if (!raw || typeof raw !== "object") return null;
  const value = (raw as Record<string, unknown>)[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
};

const getProfessionalName = (raw: unknown): string | null => {
  if (!raw || typeof raw !== "object") return null;
  const value = (raw as Record<string, unknown>).profissionais;
  const item = Array.isArray(value) ? value[0] : value;
  if (!item || typeof item !== "object") return null;
  const name = (item as Record<string, unknown>).nome;
  return typeof name === "string" && name.trim() ? name.trim() : null;
};

export const AgendaEventTooltip = memo(function AgendaEventTooltip({
  tooltip,
}: {
  tooltip: AgendaEventTooltipState | null;
}) {
  const locale = useAgendaLocale();
  const messages = useAgendaMessages();
  if (!tooltip) return null;

  const { renderArg } = tooltip;
  const event = renderArg.event;
  const raw = event.extendedProps.raw;
  const badges = getAgendaEventDefaultBadges(event);
  const professionalName = getProfessionalName(raw);
  const phone = getRawText(raw, "cliente_telefone");
  const price = getRawNumber(raw, "preco");
  const cancelReason = getRawText(raw, "motivo_cancelamento");

  return (
    <div
      role="tooltip"
      className="pointer-events-none fixed z-[120] w-[304px] rounded-lg border border-[#CBD5E1] bg-white px-3 py-3 text-left shadow-xl"
      style={{ left: tooltip.x, top: tooltip.y }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold text-[#020617]">{renderArg.title}</p>
          {renderArg.subtitle && (
            <p className="mt-0.5 truncate text-[12px] font-medium text-[#475569]">{renderArg.subtitle}</p>
          )}
        </div>
        <span className="shrink-0 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] px-2 py-1 text-[11px] font-semibold text-[#334155]">
          {renderArg.timeText}
        </span>
      </div>

      <div className="mt-2 flex flex-wrap gap-1">
        {badges.map((badge) => (
          <span
            key={badge.key}
            className={`inline-flex rounded-sm border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${badge.className}`}
          >
            {badge.label}
          </span>
        ))}
      </div>

      <div className="mt-3 grid gap-1.5 text-[11px] text-[#475569]">
        {professionalName && (
          <div className="flex justify-between gap-3">
            <span className="font-medium text-[#64748B]">{messages.details.professional}</span>
            <span className="min-w-0 truncate font-semibold text-[#0F172A]">{professionalName}</span>
          </div>
        )}
        {phone && (
          <div className="flex justify-between gap-3">
            <span className="font-medium text-[#64748B]">{messages.details.phone}</span>
            <span className="min-w-0 truncate font-semibold text-[#0F172A]">{phone}</span>
          </div>
        )}
        {price !== null && (
          <div className="flex justify-between gap-3">
            <span className="font-medium text-[#64748B]">{messages.details.price}</span>
            <span className="font-semibold text-[#0F172A]">{formatAgendaCurrency(price, locale)}</span>
          </div>
        )}
        {cancelReason && (
          <div className="rounded-md border border-[#FECACA] bg-[#FEF2F2] px-2 py-1.5 font-medium text-[#B91C1C]">
            {cancelReason}
          </div>
        )}
      </div>
    </div>
  );
});

type AgendaEventContentProps = {
  options: AgendaResolvedOptions;
  renderArg: AgendaEventRenderArg;
  timeClassName: string;
  titleClassName: string;
  subtitleClassName: string;
  /** Third line: who is attending. Rendered only when `showMeta` is on. */
  meta?: string;
  metaClassName?: string;
  showMeta?: boolean;
  topRowClassName?: string;
  pinTopRow?: boolean;
  showTime?: boolean;
  showTitle?: boolean;
  showSubtitle?: boolean;
  showSourceBadge?: boolean;
  showStatusBadge?: boolean;
  badgeClassName?: string;
};

/**
 * Inline SVG instead of an icon package: these two glyphs ship on every card in
 * the grid, and a card is the thing that has to stay cheap to render.
 */
function UserGlyph() {
  return (
    <svg viewBox="0 0 16 16" className="h-3 w-3 shrink-0 opacity-70" aria-hidden="true" fill="currentColor">
      <circle cx="8" cy="5" r="3" />
      <path d="M2.5 14c0-3 2.5-4.5 5.5-4.5S13.5 11 13.5 14z" />
    </svg>
  );
}

function ScissorsGlyph() {
  return (
    <svg viewBox="0 0 16 16" className="h-3 w-3 shrink-0 opacity-70" aria-hidden="true" fill="currentColor">
      <path d="M4 1.5 9.4 9l-1.2 1.7L2.8 3.2zM3.5 10a2.2 2.2 0 1 0 0 4.4 2.2 2.2 0 0 0 0-4.4zm0 1.3a.9.9 0 1 1 0 1.8.9.9 0 0 1 0-1.8zM12.5 10a2.2 2.2 0 1 0 0 4.4 2.2 2.2 0 0 0 0-4.4zm0 1.3a.9.9 0 1 1 0 1.8.9.9 0 0 1 0-1.8zM12 1.5l-2.6 3.6 1.2 1.7L13.2 3.2z" />
    </svg>
  );
}

function TagGlyph() {
  return (
    <svg viewBox="0 0 16 16" className="h-3 w-3 shrink-0 opacity-70" aria-hidden="true" fill="currentColor">
      <path d="M7.3 1.5H2.6c-.6 0-1.1.5-1.1 1.1v4.7c0 .3.1.6.3.8l6 6c.4.4 1.1.4 1.6 0l4.7-4.7c.4-.4.4-1.1 0-1.6l-6-6a1.1 1.1 0 0 0-.8-.3zM4.6 5.6a1 1 0 1 1 0-2 1 1 0 0 1 0 2z" />
    </svg>
  );
}

export const AgendaEventContent = memo(function AgendaEventContent({
  options,
  renderArg,
  timeClassName,
  titleClassName,
  subtitleClassName,
  meta,
  metaClassName = "",
  showMeta = false,
  topRowClassName = "",
  pinTopRow = false,
  showTime = true,
  showTitle = true,
  showSubtitle = true,
  showSourceBadge = false,
  showStatusBadge = false,
  badgeClassName = "",
}: AgendaEventContentProps) {
  const customContent = resolveAgendaEventContent(options.eventContent, renderArg);

  if (customContent !== null) {
    return <>{customContent}</>;
  }

  const visibleBadges = getAgendaEventDefaultBadges(renderArg.event).filter((badge) => {
    if (badge.key.startsWith("source-")) return showSourceBadge;
    if (badge.key.startsWith("status-")) return showStatusBadge;
    return true;
  });
  const statusBadge = visibleBadges.find((badge) => badge.key.startsWith("status-")) ?? null;
  const secondaryBadges = visibleBadges.filter((badge) => !badge.key.startsWith("status-"));
  const hasTopRow = showTime || statusBadge;
  const contentPositionClass = pinTopRow
    ? "pointer-events-none absolute left-0 right-0 top-0 z-[2]"
    : "";

  return (
    <div className={contentPositionClass}>
      {hasTopRow && (
        <div className={`flex min-w-0 items-start justify-between gap-1 ${topRowClassName}`}>
          {showTime ? (
            <div className={`min-w-0 flex-1 truncate ${timeClassName}`}>
              {renderArg.timeText}
            </div>
          ) : (
            <span />
          )}
          {statusBadge ? (
            <span
              className={`mr-1.5 mt-1 inline-flex max-w-[46%] shrink-0 truncate rounded-sm border px-1 py-[1px] text-[8px] font-semibold uppercase leading-none ${statusBadge.className}`}
            >
              {statusBadge.label}
            </span>
          ) : null}
        </div>
      )}
      {showTitle && (
        <div className={`flex min-w-0 items-center gap-1 ${titleClassName}`}>
          <UserGlyph />
          <span className="min-w-0 truncate">{renderArg.title}</span>
        </div>
      )}
      {showSubtitle && renderArg.subtitle && (
        <div className={`flex min-w-0 items-center gap-1 ${subtitleClassName}`}>
          <TagGlyph />
          <span className="min-w-0 truncate">{renderArg.subtitle}</span>
        </div>
      )}
      {showMeta && meta && (
        <div className={`flex min-w-0 items-center gap-1 ${metaClassName}`}>
          <ScissorsGlyph />
          <span className="min-w-0 truncate">{meta}</span>
        </div>
      )}
      {secondaryBadges.length > 0 && (
        <div className={`flex flex-wrap items-center gap-1 ${badgeClassName}`}>
          {secondaryBadges.map((badge) => (
            <span
              key={badge.key}
              className={`inline-flex rounded-sm border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${badge.className}`}
            >
              {badge.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
});
