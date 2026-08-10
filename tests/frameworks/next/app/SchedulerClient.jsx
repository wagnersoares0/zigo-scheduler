"use client";

import { useState } from "react";
import { Agenda } from "@zigoschedule/scheduler-react";
import {
  DAY_KEY,
  TIME_ZONE,
  businessHours,
  initialAppointments,
  professionals,
} from "./data";

export default function SchedulerClient() {
  const [appointments, setAppointments] = useState(initialAppointments);

  return (
    <div className="scheduler">
      <Agenda
        date={new Date(`${DAY_KEY}T12:00:00`)}
        view="day"
        locale="en-US"
        timeZone={TIME_ZONE}
        appointments={appointments}
        professionals={professionals}
        businessHours={businessHours}
        slotMinutes={15}
        rowHeight={34}
        columnMinWidth={280}
        blockPastSlots={false}
        detailsMode="modal"
        onMove={({ appointmentId, startsAt, professionalId }) => {
          setAppointments((current) =>
            current.map((appointment) =>
              appointment.id === appointmentId ? { ...appointment, startsAt, professionalId } : appointment
            )
          );
        }}
      />
    </div>
  );
}
