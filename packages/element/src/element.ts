import {
  buildAgendaLayout,
  buildAgendaMonthLayout,
  type AgendaLayoutEvent,
  type AgendaLayoutInput,
  type AgendaMonthEntry,
} from "@zigoschedule/scheduler-layout";
import {
  getAgendaMessages,
  formatAgendaTime,
  formatAgendaTimeRange,
  normalizeAgendaLocale,
  seriesIdOf,
  zonedNow,
  DEFAULT_TIME_ZONE,
  type AgendaMessagesInput,
} from "@zigoschedule/scheduler-core";
import {
  getAppointmentClientPhone,
  getAppointmentDurationMinutes,
  getAppointmentNotes,
  getAppointmentPaymentStatus,
  getAppointmentPrice,
  getAppointmentServiceLabel,
  normalizeWeekStart,
} from "@zigoschedule/scheduler-engine";
import type { Appointment, Block, BusinessHours, BreakWindow, Professional } from "@zigoschedule/scheduler-engine";
import { closeDetails, openDetails, type DetailsData } from "./parts/details";
import { releaseRenderCleanup } from "./render-cleanup";
import { renderAgenda } from "./render";
import { renderAgendaMonth } from "./render-month";
import { STYLES } from "./styles";
import { createValidatedInteractions } from "./validated-interactions";

type Data = {
  appointments: Appointment[];
  blocks: Block[];
  professionals: Professional[];
  businessHours: BusinessHours | null;
  lunchBreak: BreakWindow | null;
  colorByProfessional: Record<string, string>;
};

const EMPTY: Data = {
  appointments: [],
  blocks: [],
  professionals: [],
  businessHours: null,
  lunchBreak: null,
  colorByProfessional: {},
};

const number = (value: string | null): number | undefined => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
};

/** Empty base keeps importing the package safe without a browser DOM. */
const ElementBase = (
  typeof HTMLElement === "undefined" ? class {} : HTMLElement
) as typeof HTMLElement;

/** `<zigo-scheduler>`: React-free calendar as an HTML tag. */
export class ZigoSchedulerElement extends ElementBase {
  static observedAttributes = ["view", "date", "timezone", "slot-minutes", "week-scale", "row-height", "column-min-width", "scroll-to-now", "week-starts-on", "locale", "details", "block-past-slots"];

  #root: ShadowRoot;
  #surface: HTMLElement;
  #data: Data = { ...EMPTY };
  #messages?: AgendaMessagesInput;
  #observer?: ResizeObserver;

  constructor() {
    super();
    this.#root = this.attachShadow({ mode: "open" });

    const style = document.createElement("style");
    style.textContent = STYLES;

    this.#surface = document.createElement("div");
    this.#surface.style.height = "100%";

    this.#root.append(style, this.#surface);
  }

  /** Routes properties assigned before customElements.define back through setters. */
  #upgradeProperty(name: keyof Data): void {
    if (!Object.prototype.hasOwnProperty.call(this, name)) return;
    const value = (this as unknown as Record<string, unknown>)[name];
    delete (this as unknown as Record<string, unknown>)[name];
    (this as unknown as Record<string, unknown>)[name] = value;
  }

  connectedCallback(): void {
    for (const name of Object.keys(EMPTY) as Array<keyof Data>) {
      this.#upgradeProperty(name);
    }

    // The layout needs real pixels, so it can only be built once the element is
    // in the document and has been measured.
    this.#observer = new ResizeObserver(() => this.render());
    this.#observer.observe(this);
    this.render();
  }

  disconnectedCallback(): void {
    this.#observer?.disconnect();
    releaseRenderCleanup(this.#surface);
    closeDetails(this.#surface);
  }

  attributeChangedCallback(): void {
    this.render();
  }

  /** Appointments to draw. Setting this re-renders. */
  set appointments(value: Appointment[]) {
    this.#data.appointments = value ?? [];
    this.render();
  }
  get appointments(): Appointment[] {
    return this.#data.appointments;
  }

  set blocks(value: Block[]) {
    this.#data.blocks = value ?? [];
    this.render();
  }
  get blocks(): Block[] {
    return this.#data.blocks;
  }

  set professionals(value: Professional[]) {
    this.#data.professionals = value ?? [];
    this.render();
  }
  get professionals(): Professional[] {
    return this.#data.professionals;
  }

  set businessHours(value: BusinessHours | null) {
    this.#data.businessHours = value ?? null;
    this.render();
  }
  get businessHours(): BusinessHours | null {
    return this.#data.businessHours;
  }

  set lunchBreak(value: BreakWindow | null) {
    this.#data.lunchBreak = value ?? null;
    this.render();
  }
  get lunchBreak(): BreakWindow | null {
    return this.#data.lunchBreak;
  }

  set colorByProfessional(value: Record<string, string>) {
    this.#data.colorByProfessional = value ?? {};
    this.render();
  }
  get colorByProfessional(): Record<string, string> {
    return this.#data.colorByProfessional;
  }

  set messages(value: AgendaMessagesInput | null | undefined) {
    this.#messages = value ?? undefined;
    this.render();
  }
  get messages(): AgendaMessagesInput | undefined {
    return this.#messages;
  }

  /** The model currently on screen. Useful for tests and for custom overlays. */
  get layout() {
    return this.#buildInput() ? buildAgendaLayout(this.#buildInput()!) : null;
  }

  #buildInput(): AgendaLayoutInput | null {
    const width = this.clientWidth;
    const height = this.clientHeight;
    if (width <= 0 || height <= 0) return null;

    const raw = this.getAttribute("date");
    const date = raw ? new Date(`${raw}T12:00:00`) : new Date();

    return {
      date: Number.isNaN(date.getTime()) ? new Date() : date,
      view: this.getAttribute("view") === "day" ? "day" : "week",
      timeZone: this.getAttribute("timezone") ?? undefined,
      slotMinutes: number(this.getAttribute("slot-minutes")),
      weekScaleMinutes: number(this.getAttribute("week-scale")),
      rowHeight: number(this.getAttribute("row-height")),
      columnMinWidth: number(this.getAttribute("column-min-width")),
      // 0 = Sunday, 1 = Monday. This follows the host's country convention.
      weekStartsOn: normalizeWeekStart(this.getAttribute("week-starts-on")),
      locale: this.getAttribute("locale") ?? undefined,
      messages: this.#messages,
      width,
      height: Math.max(1, height - 48), // the header does not scroll
      ...this.#data,
    };
  }

  /** `details="off"` disables the built-in sheet; events still fire. */
  get #detailsEnabled(): boolean {
    return this.getAttribute("details") !== "off";
  }

  /** Original appointment behind a card, with recurrence fallback. */
  #appointmentOf(id: string): Appointment | undefined {
    const exact = this.#data.appointments.find((ag) => ag.id === id);
    if (exact) return exact;
    return this.#data.appointments.find((ag) => ag.id === seriesIdOf(id));
  }


  /** First service label, whether data arrived as a single object or a list. */
  #serviceOf(appointment: Appointment | undefined): string {
    return appointment ? getAppointmentServiceLabel(appointment) : "";
  }

  #openSheet(data: DetailsData): void {
    const locale = normalizeAgendaLocale(this.getAttribute("locale") ?? undefined);
    const messages = getAgendaMessages(locale, this.#messages);
    openDetails(this.#surface, data, (action) => {
      // The library does not send WhatsApp messages or charge anyone. It emits
      // which button was clicked. The host app owns the real action and data.
      this.#emit("appointment-action", {
        action,
        id: data.id,
      });
    }, { locale, messages });
  }

  #showDetails(event: AgendaLayoutEvent): void {
    if (!this.#detailsEnabled) return;
    const appointment = this.#appointmentOf(event.id);

    this.#openSheet({
      id: event.id,
      timeLabel: event.timeLabel,
      dayKey: event.dayKey,
      durationMinutes: Math.max(0, event.endMinute - event.startMinute),
      clientName: event.title,
      clientPhone: getAppointmentClientPhone(appointment ?? null),
      serviceName: event.subtitle || this.#serviceOf(appointment),
      professionalName: event.professionalName,
      notes: getAppointmentNotes(appointment ?? null),
      status: event.status,
      isPaid: event.isPaid,
      price: getAppointmentPrice(appointment ?? null),
      color: event.color,
    });
  }

  #showMonthDetails(entry: AgendaMonthEntry, dayKey: string): void {
    if (!this.#detailsEnabled) return;
    const appointment = this.#appointmentOf(entry.id);
    const minutes = appointment ? getAppointmentDurationMinutes(appointment, 0) : 0;

    this.#openSheet({
      id: entry.id,
      // The month model stores the start; the end comes from appointment length.
      timeLabel: minutes
        ? formatAgendaTimeRange(
            entry.startMinute,
            entry.startMinute + minutes,
            normalizeAgendaLocale(this.getAttribute("locale") ?? undefined)
          )
        : formatAgendaTime(
            entry.startMinute,
            normalizeAgendaLocale(this.getAttribute("locale") ?? undefined)
          ),
      dayKey,
      durationMinutes: minutes,
      clientName: entry.title,
      clientPhone: getAppointmentClientPhone(appointment ?? null),
      serviceName: this.#serviceOf(appointment),
      professionalName: entry.professionalName,
      notes: getAppointmentNotes(appointment ?? null),
      status: entry.status,
      isPaid: ["pago", "paid"].includes((getAppointmentPaymentStatus(appointment) ?? "").toLowerCase()),
      price: getAppointmentPrice(appointment ?? null),
      color: entry.color,
    });
  }

  #emit(name: string, detail: unknown): void {
    this.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true }));
  }

  /** Rebuilds the model and redraws. Safe to call as often as needed. */
  render(): void {
    const input = this.#buildInput();
    if (!input) return;

    // Redraw rebuilds the full DOM. An open sheet would be anchored to a node
    // that no longer exists.
    closeDetails(this.#surface);

    if (this.getAttribute("view") === "month") {
      renderAgendaMonth(
        this.#surface,
        buildAgendaMonthLayout({
          date: input.date,
          appointments: this.#data.appointments,
          professionals: this.#data.professionals,
          timeZone: input.timeZone,
          locale: input.locale,
          messages: input.messages,
          colorByProfessional: this.#data.colorByProfessional,
          weekStartsOn: input.weekStartsOn,
          width: this.clientWidth,
          height: this.clientHeight - 32,
        }),
        {
          onSelectEntry: (id, dayKey, entry) => {
            this.#showMonthDetails(entry, dayKey);
            this.#emit("select-event", { id, dayKey, entry });
          },
          onSelectDay: (dayKey) => this.#emit("select-day", { dayKey }),
          messages: getAgendaMessages(input.locale, this.#messages),
        }
      );
      return;
    }

    const timeZone = input.timeZone ?? DEFAULT_TIME_ZONE;
    const scrollToMinute = this.hasAttribute("scroll-to-now")
      ? zonedNow(timeZone).minute
      : undefined;

    const layout = buildAgendaLayout(input);
    const interactions = createValidatedInteractions(
      input,
      layout.stepMinutes,
      (name, detail) => this.#emit(name, detail),
      this.hasAttribute("block-past-slots"),
    );

    renderAgenda(this.#surface, layout, {
      onSelectEvent: (event, native) => {
        this.#showDetails(event);
        this.#emit("select-event", { event, native });
      },
      onSelectSlot: (hit, native) => this.#emit("select-slot", { hit, native }),
      onMove: interactions.onMove,
      onResize: interactions.onResize,
      onSelectRange: interactions.onSelectRange,
      professionals: this.#data.professionals,
      scrollToMinute,
      messages: getAgendaMessages(input.locale, this.#messages),
    });
  }
}
