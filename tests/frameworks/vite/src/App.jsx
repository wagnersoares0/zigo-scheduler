import { useState } from "react";
import { createRoot } from "react-dom/client";
import { Agenda } from "@zigoschedule/scheduler-react";
import "@zigoschedule/scheduler-react/styles.css";
import "./styles.css";
import {
  DAY_KEY,
  TIME_ZONE,
  businessHours,
  initialAppointments,
  professionals,
} from "./data";

function App() {
  const [appointments, setAppointments] = useState(initialAppointments);
  const [lastChange, setLastChange] = useState("ready");

  return (
    <main className="page">
      <h1 data-testid="vite-ready">Vite consumer</h1>
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
            setLastChange(`move:${appointmentId}`);
          }}
          onResize={({ appointmentId, durationMinutes, startsAt }) => {
            setAppointments((current) =>
              current.map((appointment) =>
                appointment.id === appointmentId
                  ? { ...appointment, durationMinutes, startsAt: startsAt ?? appointment.startsAt }
                  : appointment
              )
            );
            setLastChange(`resize:${appointmentId}`);
          }}
        />
      </div>
      <output data-testid="last-change">{lastChange}</output>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
