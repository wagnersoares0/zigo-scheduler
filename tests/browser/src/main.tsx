import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Agenda } from "@zigoschedule/scheduler-react";
import type { Appointment } from "@zigoschedule/scheduler-engine";
import "@zigoschedule/scheduler-element";
import "@zigoschedule/scheduler-react/styles.css";
import "./style.css";
import {
  DAY_KEY,
  TIME_ZONE,
  appointment,
  blocks,
  businessHours,
  colors,
  elementAppointments,
  lunchBreak,
  professionals,
  reactAppointments,
} from "./data";

type SchedulerElement = HTMLElement & {
  appointments: Appointment[];
  blocks: typeof blocks;
  professionals: typeof professionals;
  businessHours: typeof businessHours;
  lunchBreak: typeof lunchBreak;
  colorByProfessional: Record<string, string>;
};

type MoveDetail = {
  id: string;
  startsAt: string;
  endsAt: string;
  professionalId: string | null;
};

type ResizeDetail = MoveDetail & {
  startMinute: number;
  endMinute: number;
};

function sameAppointment(id: string, update: Partial<Appointment>) {
  return (appointmentItem: Appointment): Appointment =>
    appointmentItem.id === id ? { ...appointmentItem, ...update } : appointmentItem;
}

function ReactScheduler() {
  const [appointments, setAppointments] = useState(reactAppointments);
  const [log, setLog] = useState("ready");

  return (
    <section className="panel" data-testid="react-panel">
      <h2>React package</h2>
      <div className="schedulerBox">
        <Agenda
          date={new Date(`${DAY_KEY}T12:00:00`)}
          appointments={appointments}
          blocks={blocks}
          professionals={professionals}
          businessHours={businessHours}
          lunchBreak={lunchBreak}
          timeZone={TIME_ZONE}
          locale="en-US"
          view="day"
          slotMinutes={15}
          weekScaleMinutes={30}
          weekStartsOn={0}
          rowHeight={34}
          columnMinWidth={300}
          blockPastSlots={false}
          colorMode="appointment"
          detailsMode="modal"
          detailsActions={["whatsapp", "reminder", "edit", "cancel", "charge"]}
          onMove={({ appointmentId, startsAt, professionalId }) => {
            setAppointments((current) =>
              current.map(sameAppointment(appointmentId, { startsAt, professionalId })),
            );
            setLog(`react:move:${appointmentId}:${startsAt}:${professionalId ?? ""}`);
          }}
          onResize={({ appointmentId, durationMinutes, startsAt }) => {
            const update = startsAt ? { durationMinutes, startsAt } : { durationMinutes };
            setAppointments((current) =>
              current.map(sameAppointment(appointmentId, update)),
            );
            setLog(`react:resize:${appointmentId}:${durationMinutes}`);
          }}
          onSelectRange={(range) => {
            setLog(`react:range:${range.professionalId ?? ""}:${range.startMinute}-${range.endMinute}`);
          }}
          onBlocked={(message) => {
            setLog(`react:blocked:${message}`);
          }}
          onDetailsAction={({ action, appointment: selected }) => {
            setLog(`react:action:${action}:${selected.id}`);
          }}
        />
      </div>
      <output data-testid="react-log">{log}</output>
    </section>
  );
}

function ElementScheduler({
  id,
  initialAppointments,
}: {
  id: string;
  initialAppointments: Appointment[];
}) {
  const elementRef = useRef<SchedulerElement | null>(null);
  const [appointments, setAppointments] = useState(initialAppointments);
  const [log, setLog] = useState("ready");

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;
    element.appointments = appointments;
    element.blocks = blocks;
    element.professionals = professionals;
    element.businessHours = businessHours;
    element.lunchBreak = lunchBreak;
    element.colorByProfessional = {
      maya: colors.blue,
      noah: colors.green,
    };
  }, [appointments]);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const onMove = (event: Event) => {
      const detail = (event as CustomEvent<MoveDetail>).detail;
      setAppointments((current) =>
        current.map(sameAppointment(detail.id, {
          startsAt: detail.startsAt,
          professionalId: detail.professionalId,
        })),
      );
      setLog(`element:move:${detail.id}:${detail.startsAt}:${detail.endsAt}:${detail.professionalId ?? ""}`);
    };
    const onResize = (event: Event) => {
      const detail = (event as CustomEvent<ResizeDetail>).detail;
      setAppointments((current) =>
        current.map(sameAppointment(detail.id, {
          startsAt: detail.startsAt,
          durationMinutes: detail.endMinute - detail.startMinute,
        })),
      );
      setLog(`element:resize:${detail.id}:${detail.startsAt}:${detail.endsAt}`);
    };
    const onBlocked = (event: Event) => {
      const detail = (event as CustomEvent<{ message?: string; code?: string }>).detail;
      setLog(`element:blocked:${detail.code ?? ""}:${detail.message ?? ""}`);
    };
    const onAction = (event: Event) => {
      const detail = (event as CustomEvent<{ action: string; id: string }>).detail;
      setLog(`element:action:${detail.action}:${detail.id}`);
    };

    element.addEventListener("move-event", onMove);
    element.addEventListener("resize-event", onResize);
    element.addEventListener("blocked-event", onBlocked);
    element.addEventListener("appointment-action", onAction);
    return () => {
      element.removeEventListener("move-event", onMove);
      element.removeEventListener("resize-event", onResize);
      element.removeEventListener("blocked-event", onBlocked);
      element.removeEventListener("appointment-action", onAction);
    };
  }, []);

  return (
    <section className="panel" data-testid={`${id}-panel`}>
      <h2>Web Component {id}</h2>
      <zigo-scheduler
        ref={elementRef}
        id={id}
        view="day"
        date={DAY_KEY}
        timezone={TIME_ZONE}
        locale="en-US"
        slot-minutes="15"
        row-height="34"
        column-min-width="300"
        week-starts-on="0"
        block-past-slots
      />
      <output data-testid={`${id}-log`}>{log}</output>
    </section>
  );
}

function App() {
  return (
    <main>
      <header>
        <strong>Zigo Scheduler browser gate</strong>
        <span data-testid="ready">ready</span>
      </header>
      <ReactScheduler />
      <ElementScheduler id="element-a" initialAppointments={elementAppointments("element")} />
      <ElementScheduler
        id="element-b"
        initialAppointments={[
          appointment("element-b-only", 10, 0, "noah", "Second Instance", "Isolation check", colors.green),
        ]}
      />
      <ElementScheduler
        id="element-c"
        initialAppointments={[
          appointment("element-c-only", 9, 30, "maya", "Third Instance", "Move isolation", colors.rose),
        ]}
      />
      <ElementScheduler
        id="element-d"
        initialAppointments={[
          appointment("element-d-only", 13, 30, "noah", "Fourth Instance", "Resize isolation", colors.amber, 45),
        ]}
      />
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
