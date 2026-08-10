import { describe, expect, it } from "vitest";
import type { Appointment, Block } from "../../types";
import { dateKey } from "../../utils/time";
import {
  adaptAgendaEvents,
  buildAgendaEventSourcesSnapshot,
  buildAgendaResourceInputs,
  createAgendaDateClickArg,
  createAgendaCalendarApi,
  createAgendaDayCellRenderArg,
  createAgendaEventRenderArg,
  createAgendaEventSourceLifecycle,
  createAgendaEventClickArg,
  createAgendaMoreLinkArg,
  createAgendaOptions,
  createAgendaSelectArg,
  createAgendaSlotRenderArg,
  dispatchAgendaDateClick,
  dispatchAgendaDayCellDidMount,
  dispatchAgendaDayCellWillUnmount,
  dispatchAgendaEventDidMount,
  dispatchAgendaEventClick,
  dispatchAgendaEventMouseEnter,
  dispatchAgendaEventMouseLeave,
  dispatchAgendaEventSourceFailure,
  dispatchAgendaEventSourceSuccess,
  dispatchAgendaEventWillUnmount,
  dispatchAgendaLoading,
  dispatchAgendaSelect,
  dispatchAgendaSlotLabelDidMount,
  dispatchAgendaSlotLabelWillUnmount,
  dispatchAgendaSlotLaneDidMount,
  dispatchAgendaSlotLaneWillUnmount,
  formatAgendaMoreLinkText,
  getAgendaEventDefaultBadges,
  getAgendaDayMaxEvents,
  getAgendaMoreLinkClick,
  getAgendaMoreLinkText,
  getAgendaViewDateRange,
  resolveAgendaDayCellClassNames,
  resolveAgendaDayCellContent,
  resolveAgendaEventClassNames,
  resolveAgendaEventContent,
  resolveAgendaMoreLinkAction,
  resolveAgendaSlotLabelClassNames,
  resolveAgendaSlotLabelContent,
  resolveAgendaSlotLaneClassNames,
  resolveAgendaSlotLaneContent,
  splitAgendaDayGridItems,
  toAgendaCanonicalViewId,
} from "../index";

const SAO_PAULO = "America/Sao_Paulo";

const makeAg = (status = "confirmado"): Appointment => ({
  id: `ag-${status}`,
  data_hora: "2026-06-22T10:00:00-03:00",
  duracao_minutos: 45,
  cliente_nome: "Test Client",
  status,
  profissional_id: "prof-a",
});

const makeBloq = (): Block => ({
  id: "bloq-1",
  data: "2026-06-22",
  hora_inicio: "12:00",
  hora_fim: "13:00",
  motivo: "Lunch",
  profissional_id: null,
});

describe("Zigo Scheduler agenda foundation", () => {
  it("maps current Agenda V3 views to canonical agenda view ids", () => {
    expect(toAgendaCanonicalViewId("day")).toBe("timeGridDay");
    expect(toAgendaCanonicalViewId("week")).toBe("timeGridWeek");
    expect(toAgendaCanonicalViewId("month")).toBe("dayGridMonth");
    expect(toAgendaCanonicalViewId("list")).toBe("listWeek");
    expect(toAgendaCanonicalViewId("lista")).toBe("listWeek");
  });

  it("splits dayGrid items for more popovers", () => {
    const result = splitAgendaDayGridItems(["a", "b", "c", "d"], 2);

    expect(result).toEqual({
      visibleItems: ["a", "b"],
      hiddenItems: ["c", "d"],
      hiddenCount: 2,
      totalCount: 4,
    });
    expect(splitAgendaDayGridItems(["a", "b"], false)).toMatchObject({
      visibleItems: ["a", "b"],
      hiddenItems: [],
      hiddenCount: 0,
    });
  });

  it("computes query ranges by view", () => {
    const date = new Date("2026-06-24T12:00:00-03:00");

    expect(getAgendaViewDateRange("timeGridDay", date)).toEqual({
      start: "2026-06-24",
      end: "2026-06-24",
    });
    expect(getAgendaViewDateRange("timeGridWeek", date)).toEqual({
      start: "2026-06-21",
      end: "2026-06-27",
    });
    expect(getAgendaViewDateRange("dayGridMonth", date)).toEqual({
      start: "2026-06-01",
      end: "2026-06-30",
    });
  });

  it("normalizes unsafe or invalid options to safe defaults", () => {
    const options = createAgendaOptions({
      initialView: "list",
      firstDay: 9,
      slotMinTime: "20:00",
      slotMaxTime: "07:00",
      snapDurationMinutes: 7,
      maxAppointmentDurationMinutes: 9999,
    });

    expect(options.initialView).toBe("listWeek");
    expect(options.firstDay).toBe(0);
    expect(options.slotMinTime).toBe("08:00");
    expect(options.slotMaxTime).toBe("18:00");
    expect(options.snapDurationMinutes).toBe(5);
    expect(options.maxAppointmentDurationMinutes).toBe(720);
  });

  it("keeps the month grid compact by default", () => {
    const options = createAgendaOptions();

    expect(getAgendaDayMaxEvents(options, "dayGridMonth")).toBe(2);
    expect(getAgendaDayMaxEvents(options, "timeGridWeek")).toBe(3);
  });

  it("resolves Zigo Scheduler more link options by view", () => {
    const options = createAgendaOptions({
      dayMaxEvents: 4,
      moreLinkText: "extras",
      moreLinkClick: "day",
      views: {
        dayGridMonth: {
          dayMaxEvents: 2,
          moreLinkText: (hiddenCount) => `abrir ${hiddenCount}`,
          moreLinkClick: "popover",
        },
      },
    });

    expect(getAgendaDayMaxEvents(options, "dayGridMonth")).toBe(2);
    expect(getAgendaDayMaxEvents(options, "timeGridWeek")).toBe(4);
    expect(formatAgendaMoreLinkText(5, getAgendaMoreLinkText(options, "dayGridMonth"), 9)).toBe("abrir 5");
    expect(formatAgendaMoreLinkText(3, getAgendaMoreLinkText(options, "timeGridWeek"), 7)).toBe("+3 extras");
    expect(getAgendaMoreLinkClick(options, "dayGridMonth")).toBe("popover");
    expect(getAgendaMoreLinkClick(options, "timeGridWeek")).toBe("day");
  });

  it("creates callback args compatible with agenda interaction hooks", () => {
    const [event] = adaptAgendaEvents({ appointments: [makeAg()], blocks: [] });
    const eventClickArg = createAgendaEventClickArg(event, "month");
    const dateClickArg = createAgendaDateClickArg({
      date: new Date("2026-06-22T12:00:00-03:00"),
      view: "day",
      allDay: true,
      resourceId: "prof-a",
    });
    const selectArg = createAgendaSelectArg({
      start: new Date("2026-06-22T10:00:00-03:00"),
      end: new Date("2026-06-22T10:30:00-03:00"),
      view: "week",
      resourceId: "prof-a",
    });
    const moreLinkArg = createAgendaMoreLinkArg({
      date: new Date("2026-06-22T12:00:00-03:00"),
      view: "dayGridMonth",
      allItems: ["a", "b", "c"],
      hiddenItems: ["b", "c"],
    });

    expect(eventClickArg).toMatchObject({
      eventId: "ag-confirmado",
      kind: "appointment",
      dateStr: "2026-06-22",
      resourceId: "prof-a",
      view: "dayGridMonth",
    });
    expect(dateClickArg).toMatchObject({
      dateStr: "2026-06-22",
      allDay: true,
      resourceId: "prof-a",
      view: "timeGridDay",
    });
    expect(selectArg).toMatchObject({
      allDay: false,
      resourceId: "prof-a",
      view: "timeGridWeek",
    });
    expect(moreLinkArg).toMatchObject({
      dateStr: "2026-06-22",
      hiddenCount: 2,
      totalCount: 3,
      view: "dayGridMonth",
    });
    expect(resolveAgendaMoreLinkAction("listWeek", moreLinkArg)).toBe("listWeek");
    expect(resolveAgendaMoreLinkAction(() => "day", moreLinkArg)).toBe("day");
    expect(formatAgendaMoreLinkText(2, "mais")).toBe("+2 mais");
    expect(formatAgendaMoreLinkText(2, "{count} ocultos")).toBe("2 ocultos");
  });

  it("marks an early manual checkout without changing the appointment status badge", () => {
    const [{ extendedProps, ...event }] = adaptAgendaEvents({
      appointments: [{ ...makeAg("concluido"), cobranca_antecipada: true }],
      blocks: [],
    });

    expect(getAgendaEventDefaultBadges({
      ...event,
      extendedProps,
    }).map((badge) => badge.label)).toEqual([
      "Appointment",
      "Completed",
      "Antecipado",
    ]);
  });

  it("dispatches optional callbacks without breaking the calendar flow", () => {
    const [event] = adaptAgendaEvents({ appointments: [makeAg()], blocks: [] });
    const calls: string[] = [];
    const options = createAgendaOptions({
      eventClick: (arg) => calls.push(`event:${arg.eventId}:${arg.view}`),
      dateClick: (arg) => calls.push(`date:${arg.dateStr}:${arg.view}`),
      select: (arg) => calls.push(`select:${arg.startStr}:${arg.endStr}:${arg.view}`),
    });

    const eventResult = dispatchAgendaEventClick({
      options,
      event,
      view: "month",
    });
    const dateResult = dispatchAgendaDateClick({
      options,
      date: new Date("2026-06-22T12:00:00-03:00"),
      view: "day",
      allDay: true,
    });
    const selectResult = dispatchAgendaSelect({
      options,
      start: new Date("2026-06-22T10:00:00-03:00"),
      end: new Date("2026-06-22T10:30:00-03:00"),
      view: "week",
      resourceId: "prof-a",
    });
    const failingResult = dispatchAgendaEventClick({
      options: createAgendaOptions({
        eventClick: () => {
          throw new Error("boom");
        },
      }),
      event,
      view: "week",
    });

    expect(eventResult).toMatchObject({ callbackName: "eventClick", dispatched: true, error: null });
    expect(dateResult).toMatchObject({ callbackName: "dateClick", dispatched: true, error: null });
    expect(selectResult).toMatchObject({ callbackName: "select", dispatched: true, error: null });
    expect(failingResult.dispatched).toBe(true);
    expect(failingResult.error?.message).toBe("boom");
    expect(calls).toEqual([
      "event:ag-confirmado:dayGridMonth",
      "date:2026-06-22:timeGridDay",
      "select:2026-06-22T13:00:00.000Z:2026-06-22T13:30:00.000Z:timeGridWeek",
    ]);
  });

  it("dispatches Zigo Scheduler loading and event source lifecycle callbacks", () => {
    const lifecycleCalls: string[] = [];
    const options = createAgendaOptions({
      loading: (isLoading) => lifecycleCalls.push(`loading:${isLoading ? "1" : "0"}`),
      eventSourceSuccess: (arg) => lifecycleCalls.push(`success:${arg.sourceId}:${arg.eventCount}`),
      eventSourceFailure: (arg) => lifecycleCalls.push(`failure:${arg.sourceId}:${arg.message}`),
    });
    const snapshot = buildAgendaEventSourcesSnapshot({
      appointments: [makeAg()],
      blocks: [],
      range: { start: "2026-06-22", end: "2026-06-28" },
      sourceStates: {
        appointments: createAgendaEventSourceLifecycle("appointments", {
          status: "success",
          lastSuccessAt: 1000,
          lastUpdatedAt: 1000,
        }),
        blocks: createAgendaEventSourceLifecycle("blocks", {
          status: "failure",
          error: "Failed to load blocks.",
          lastFailureAt: 2000,
          lastUpdatedAt: 2000,
        }),
      },
    });

    const loadingResult = dispatchAgendaLoading({
      options,
      isLoading: true,
    });
    const successResult = dispatchAgendaEventSourceSuccess({
      options,
      source: snapshot.sources[0],
    });
    const failureResult = dispatchAgendaEventSourceFailure({
      options,
      source: snapshot.sources[1],
    });

    expect(loadingResult).toMatchObject({ callbackName: "loading", dispatched: true, error: null });
    expect(successResult).toMatchObject({ callbackName: "eventSourceSuccess", dispatched: true, error: null });
    expect(failureResult).toMatchObject({ callbackName: "eventSourceFailure", dispatched: true, error: null });
    expect(lifecycleCalls).toEqual([
      "loading:1",
      "success:appointments:1",
      "failure:blocks:Failed to load blocks.",
    ]);
  });

  it("resolves Zigo Scheduler event rendering hooks safely", () => {
    const [event] = adaptAgendaEvents({ appointments: [makeAg("confirmado")], blocks: [] });
    const renderLifecycleCalls: string[] = [];
    const options = createAgendaOptions({
      eventClassNames: (arg) => [
        `agenda-${arg.kind}`,
        "rounded-md",
        "<script>",
        "text-[#0369A1]",
      ],
      eventContent: (arg) => `custom:${arg.timeText}:${arg.title}`,
      eventDidMount: (arg) => {
        renderLifecycleCalls.push(`mount:${arg.eventId}:${arg.display}`);
      },
      eventWillUnmount: (arg) => {
        renderLifecycleCalls.push(`unmount:${arg.eventId}:${arg.display}`);
      },
      eventMouseEnter: (arg) => {
        renderLifecycleCalls.push(`enter:${arg.eventId}:${arg.jsEvent.type}`);
      },
      eventMouseLeave: (arg) => {
        renderLifecycleCalls.push(`leave:${arg.eventId}:${arg.jsEvent.type}`);
      },
    });
    const renderArg = createAgendaEventRenderArg({
      event,
      view: "week",
      display: "timeGrid",
      density: "regular",
      timeText: "10:00 - 10:45",
      title: "Test Client",
      subtitle: "Servico",
    });

    expect(resolveAgendaEventClassNames(options.eventClassNames, renderArg)).toEqual([
      "agenda-appointment",
      "rounded-md",
      "text-[#0369A1]",
    ]);
    expect(resolveAgendaEventContent(options.eventContent, renderArg)).toBe("custom:10:00 - 10:45:Test Client");
    expect(resolveAgendaEventContent(() => true, renderArg)).toBeNull();
    expect(getAgendaEventDefaultBadges(event).map((badge) => badge.label)).toEqual([
      "Appointment",
      "Confirmed",
    ]);

    const didMountResult = dispatchAgendaEventDidMount({
      options,
      arg: renderArg,
      el: {} as HTMLElement,
    });
    const willUnmountResult = dispatchAgendaEventWillUnmount({
      options,
      arg: renderArg,
      el: {} as HTMLElement,
    });
    const mouseEnterResult = dispatchAgendaEventMouseEnter({
      options,
      arg: renderArg,
      el: {} as HTMLElement,
      jsEvent: { type: "mouseenter" } as MouseEvent,
    });
    const mouseLeaveResult = dispatchAgendaEventMouseLeave({
      options,
      arg: renderArg,
      el: {} as HTMLElement,
      jsEvent: { type: "mouseleave" } as MouseEvent,
    });

    expect(didMountResult).toMatchObject({ callbackName: "eventDidMount", dispatched: true, error: null });
    expect(willUnmountResult).toMatchObject({ callbackName: "eventWillUnmount", dispatched: true, error: null });
    expect(mouseEnterResult).toMatchObject({ callbackName: "eventMouseEnter", dispatched: true, error: null });
    expect(mouseLeaveResult).toMatchObject({ callbackName: "eventMouseLeave", dispatched: true, error: null });
    expect(renderLifecycleCalls).toEqual([
      "mount:ag-confirmado:timeGrid",
      "unmount:ag-confirmado:timeGrid",
      "enter:ag-confirmado:mouseenter",
      "leave:ag-confirmado:mouseleave",
    ]);
  });

  it("resolves Zigo Scheduler day cell and slot rendering hooks safely", () => {
    const lifecycleCalls: string[] = [];
    const options = createAgendaOptions({
      dayCellClassNames: (arg) => [
        `agenda-day-${arg.dateStr}`,
        arg.isToday ? "is-today" : "",
        "<script>",
      ],
      dayCellContent: (arg) => `day:${arg.dayNumberText}:${arg.eventCount}`,
      dayCellDidMount: (arg) => lifecycleCalls.push(`day-mount:${arg.dateStr}`),
      dayCellWillUnmount: (arg) => lifecycleCalls.push(`day-unmount:${arg.dateStr}`),
      slotLaneClassNames: (arg) => [
        arg.isBusinessHour ? "business-hour" : "closed-hour",
        arg.isPausa ? "pause-hour" : "",
        "bad<script>",
      ],
      slotLaneContent: (arg) => (arg.isPausa ? `break:${arg.timeText}` : true),
      slotLaneDidMount: (arg) => lifecycleCalls.push(`lane-mount:${arg.dateStr}:${arg.timeText}`),
      slotLaneWillUnmount: (arg) => lifecycleCalls.push(`lane-unmount:${arg.dateStr}:${arg.timeText}`),
      slotLabelClassNames: "slot-label <bad>",
      slotLabelContent: (arg) => `label:${arg.timeText}`,
      slotLabelDidMount: (arg) => lifecycleCalls.push(`label-mount:${arg.timeText}`),
      slotLabelWillUnmount: (arg) => lifecycleCalls.push(`label-unmount:${arg.timeText}`),
    });
    const dayArg = createAgendaDayCellRenderArg({
      date: new Date("2026-06-22T12:00:00-03:00"),
      dateStr: "2026-06-22",
      dayNumberText: "22",
      view: "month",
      isToday: true,
      eventCount: 3,
      appointmentCount: 2,
      blockCount: 1,
    });
    const slotArg = createAgendaSlotRenderArg({
      date: new Date("2026-06-22T15:00:00-03:00"),
      dateStr: "2026-06-22",
      timeText: "15:00",
      minute: 15 * 60,
      view: "week",
      resourceId: "prof-a",
      isMajor: true,
      isBusinessHour: true,
      isPausa: true,
    });

    expect(resolveAgendaDayCellClassNames(options.dayCellClassNames, dayArg)).toEqual([
      "agenda-day-2026-06-22",
      "is-today",
    ]);
    expect(resolveAgendaDayCellContent(options.dayCellContent, dayArg)).toBe("day:22:3");
    expect(resolveAgendaDayCellContent(() => true, dayArg)).toBeNull();
    expect(resolveAgendaSlotLaneClassNames(options.slotLaneClassNames, slotArg)).toEqual([
      "business-hour",
      "pause-hour",
    ]);
    expect(resolveAgendaSlotLaneContent(options.slotLaneContent, slotArg)).toBe("break:15:00");
    expect(resolveAgendaSlotLaneContent(() => true, slotArg)).toBeNull();
    expect(resolveAgendaSlotLabelClassNames(options.slotLabelClassNames, slotArg)).toEqual(["slot-label"]);
    expect(resolveAgendaSlotLabelContent(options.slotLabelContent, slotArg)).toBe("label:15:00");

    const dayMountResult = dispatchAgendaDayCellDidMount({
      options,
      arg: dayArg,
      el: {} as HTMLElement,
    });
    const dayUnmountResult = dispatchAgendaDayCellWillUnmount({
      options,
      arg: dayArg,
      el: {} as HTMLElement,
    });
    const laneMountResult = dispatchAgendaSlotLaneDidMount({
      options,
      arg: slotArg,
      el: {} as HTMLElement,
    });
    const laneUnmountResult = dispatchAgendaSlotLaneWillUnmount({
      options,
      arg: slotArg,
      el: {} as HTMLElement,
    });
    const labelMountResult = dispatchAgendaSlotLabelDidMount({
      options,
      arg: slotArg,
      el: {} as HTMLElement,
    });
    const labelUnmountResult = dispatchAgendaSlotLabelWillUnmount({
      options,
      arg: slotArg,
      el: {} as HTMLElement,
    });

    expect(dayMountResult).toMatchObject({ callbackName: "dayCellDidMount", dispatched: true, error: null });
    expect(dayUnmountResult).toMatchObject({ callbackName: "dayCellWillUnmount", dispatched: true, error: null });
    expect(laneMountResult).toMatchObject({ callbackName: "slotLaneDidMount", dispatched: true, error: null });
    expect(laneUnmountResult).toMatchObject({ callbackName: "slotLaneWillUnmount", dispatched: true, error: null });
    expect(labelMountResult).toMatchObject({ callbackName: "slotLabelDidMount", dispatched: true, error: null });
    expect(labelUnmountResult).toMatchObject({ callbackName: "slotLabelWillUnmount", dispatched: true, error: null });
    expect(lifecycleCalls).toEqual([
      "day-mount:2026-06-22",
      "day-unmount:2026-06-22",
      "lane-mount:2026-06-22:15:00",
      "lane-unmount:2026-06-22:15:00",
      "label-mount:15:00",
      "label-unmount:15:00",
    ]);
  });

  it("builds Zigo Scheduler resources with visibility and business hours", () => {
    const resources = buildAgendaResourceInputs({
      profissionais: [
        {
          id: "prof-a",
          nome: "Professional A",
          foto_url: "https://example.test/a.png",
          horario_abertura: "08:00",
          horario_fechamento: "16:00",
        },
        {
          id: "prof-b",
          nome: "Professional B",
          horario_abertura: "18:00",
          horario_fechamento: "09:00",
        },
      ],
      visibleResourceIds: ["prof-a"],
    });

    expect(resources).toHaveLength(2);
    expect(resources[0]).toMatchObject({
      id: "prof-a",
      title: "Professional A",
      businessHours: { startTime: "08:00", endTime: "16:00", startMinute: 480, endMinute: 960 },
      extendedProps: {
        tenantScoped: true,
        resourceId: "prof-a",
        visible: true,
      },
    });
    expect(resources[1]).toMatchObject({
      id: "prof-b",
      businessHours: undefined,
      extendedProps: {
        resourceId: "prof-b",
        visible: false,
      },
    });
  });

  it("accepts public English resource field names", () => {
    const [resource] = buildAgendaResourceInputs({
      profissionais: [
        {
          id: "dr-lee",
          name: "Dr. Maya Lee",
          photoUrl: "https://example.test/dr-lee.png",
          opensAt: "09:30",
          closesAt: "17:30",
        },
      ],
    });

    expect(resource).toMatchObject({
      id: "dr-lee",
      title: "Dr. Maya Lee",
      businessHours: { startTime: "09:30", endTime: "17:30" },
      extendedProps: {
        nome: "Dr. Maya Lee",
        fotoUrl: "https://example.test/dr-lee.png",
      },
    });
  });

  it("builds event sources with resource isolation and loading state", () => {
    const profAAppointment = makeAg();
    const profBAppointment: Appointment = {
      ...makeAg("confirmado"),
      id: "ag-prof-b",
      profissional_id: "prof-b",
    };
    const globalBlock = makeBloq();
    const profBBlock: Block = {
      ...makeBloq(),
      id: "bloq-prof-b",
      profissional_id: "prof-b",
    };

    const snapshot = buildAgendaEventSourcesSnapshot({
      appointments: [profAAppointment, profBAppointment, makeAg("canceled")],
      blocks: [globalBlock, profBBlock],
      range: { start: "2026-06-22", end: "2026-06-28" },
      loading: true,
      allowedResourceIds: ["prof-a"],
      visibleResourceIds: ["prof-a"],
      includeCanceled: false,
      timeZone: SAO_PAULO,
    });

    expect(snapshot.loading).toBe(true);
    expect(snapshot.eventCount).toBe(2);
    expect(snapshot.events.map((event) => event.id)).toEqual(["ag-confirmado", "bloq-1"]);
    expect(snapshot.sources).toHaveLength(2);
    expect(snapshot.sources[0]).toMatchObject({
      id: "appointments",
      eventCount: 1,
      loading: true,
      extendedProps: {
        tenantScoped: true,
        allowedResourceIds: ["prof-a"],
        visibleResourceIds: ["prof-a"],
      },
    });
    expect(snapshot.sources[1]).toMatchObject({
      id: "blocks",
      eventCount: 1,
      loading: true,
    });
  });

  it("keeps event source lifecycle errors isolated by source", () => {
    const snapshot = buildAgendaEventSourcesSnapshot({
      appointments: [makeAg()],
      blocks: [makeBloq()],
      range: { start: "2026-06-22", end: "2026-06-28" },
      sourceStates: {
        appointments: createAgendaEventSourceLifecycle("appointments", {
          status: "success",
          lastSuccessAt: 1000,
          lastUpdatedAt: 1000,
        }),
        blocks: createAgendaEventSourceLifecycle("blocks", {
          status: "failure",
          error: "Failed to load blocks.",
          lastFailureAt: 2000,
          lastUpdatedAt: 2000,
        }),
      },
    });

    expect(snapshot.loading).toBe(false);
    expect(snapshot.errorCount).toBe(1);
    expect(snapshot.errors).toEqual([
      {
        sourceId: "blocks",
        title: "Blocks",
        message: "Failed to load blocks.",
      },
    ]);
    expect(snapshot.sourceStates.appointments).toMatchObject({
      status: "success",
      loading: false,
      error: null,
    });
    expect(snapshot.sourceStates.blocks).toMatchObject({
      status: "failure",
      loading: false,
      error: "Failed to load blocks.",
    });
  });

  it("adapts appointments and blocks to Zigo Scheduler event inputs", () => {
    const [appointment, canceled, block] = adaptAgendaEvents({
      appointments: [makeAg(), makeAg("cancelado")],
      blocks: [makeBloq()],
    }, SAO_PAULO);

    expect(appointment).toMatchObject({
      id: "ag-confirmado",
      sourceId: "appointments",
      kind: "appointment",
      resourceId: "prof-a",
      editable: true,
      startEditable: true,
      durationEditable: true,
      overlap: false,
      extendedProps: {
        dayKey: "2026-06-22",
        startMinute: 10 * 60,
        endMinute: 10 * 60 + 45,
        tenantScoped: true,
      },
    });
    expect(canceled).toMatchObject({
      id: "ag-cancelado",
      editable: false,
      startEditable: false,
      durationEditable: false,
    });
    expect(block).toMatchObject({
      id: "bloq-1",
      sourceId: "blocks",
      kind: "block",
      title: "Lunch",
      resourceId: null,
      editable: false,
    });
  });

  it("accepts public English appointment status values", () => {
    const [completed, canceled] = adaptAgendaEvents({
      appointments: [makeAg("completed"), makeAg("canceled")],
      blocks: [],
    }, SAO_PAULO);

    expect(completed).toMatchObject({
      editable: false,
      startEditable: false,
      durationEditable: false,
    });
    expect(getAgendaEventDefaultBadges(completed).map((badge) => badge.label)).toEqual([
      "Appointment",
      "Completed",
    ]);
    expect(canceled).toMatchObject({
      editable: false,
      startEditable: false,
      durationEditable: false,
    });
    expect(getAgendaEventDefaultBadges(canceled).map((badge) => badge.label)).toEqual([
      "Appointment",
      "Canceled",
    ]);
  });

  it("exposes a small CalendarApi facade for navigation and event reads", () => {
    let nextDate: Date | null = null;
    let nextView: string | null = null;
    const events = adaptAgendaEvents({ appointments: [makeAg()], blocks: [] });
    const sourcesSnapshot = buildAgendaEventSourcesSnapshot({
      appointments: [makeAg()],
      blocks: [],
      range: { start: "2026-06-22", end: "2026-06-28" },
      loading: true,
      allowedResourceIds: ["prof-a"],
      visibleResourceIds: ["prof-a"],
      timeZone: SAO_PAULO,
    });
    const resources = buildAgendaResourceInputs({
      profissionais: [{ id: "prof-a", nome: "Professional A" }],
      visibleResourceIds: ["prof-a"],
    });
    const api = createAgendaCalendarApi(
      {
        date: new Date("2026-06-22T12:00:00-03:00"),
        view: "week",
        events,
        eventSources: sourcesSnapshot.sources,
        resources,
        loading: sourcesSnapshot.loading,
      },
      {
        setDate: (date) => {
          nextDate = date;
        },
        setView: (view) => {
          nextView = view;
        },
      },
    );

    expect(api.getView()).toBe("timeGridWeek");
    expect(api.getCurrentRange()).toEqual({ start: "2026-06-21", end: "2026-06-27" });
    expect(api.getEventById("ag-confirmado")?.title).toContain("Test Client");
    expect(api.getEventSources()[0]).toMatchObject({ id: "appointments", loading: true });
    expect(api.getResources()[0]).toMatchObject({ id: "prof-a", title: "Professional A" });
    expect(api.isLoading()).toBe(true);
    expect(dateKey(api.next())).toBe("2026-06-29");
    expect(nextDate ? dateKey(nextDate) : null).toBe("2026-06-29");
    expect(api.changeView("month")).toBe("dayGridMonth");
    expect(nextView).toBe("dayGridMonth");
  });
});
