import { useState } from "react";
import { createRoot } from "react-dom/client";
import { Agenda } from "@zigoschedule/scheduler-react";
import type { Appointment, BusinessHours, Professional } from "@zigoschedule/scheduler-engine";
import "@zigoschedule/scheduler-react/styles.css";
import "./styles.css";

const professionals: Professional[] = [
  { id: "maya", name: "Dr. Maya Lee", photoUrl: "/team/maya.jpg", opensAt: "09:00", closesAt: "17:00" },
  { id: "noah", name: "Noah Carter", photoUrl: "/team/noah.jpg", opensAt: "08:30", closesAt: "16:30" },
];

const businessHours: BusinessHours = {
  sunday: { active: false },
  monday: { active: true, opensAt: "09:00", closesAt: "17:00" },
  tuesday: { active: true, opensAt: "09:00", closesAt: "17:00" },
  wednesday: { active: true, opensAt: "09:00", closesAt: "17:00" },
  thursday: { active: true, opensAt: "09:00", closesAt: "17:00" },
  friday: { active: true, opensAt: "09:00", closesAt: "17:00" },
  saturday: { active: true, opensAt: "09:00", closesAt: "13:00" },
};

const initialAppointments: Appointment[] = [
  {
    id: "appt_1001",
    startsAt: "2026-08-12T16:00:00.000Z",
    durationMinutes: 60,
    bufferAfterMinutes: 10,
    clientName: "Olivia Carter",
    clientPhone: "+1 415 555 0198",
    professionalId: "maya",
    status: "confirmed",
    paymentStatus: "paid",
    price: 120,
    services: [{ name: "Physical therapy follow-up", durationMinutes: 60, price: 120 }],
    appointmentColor: "#2563eb",
  },
  {
    id: "appt_1002",
    startsAt: "2026-08-12T17:00:00.000Z",
    durationMinutes: 45,
    clientName: "Lucas Bennett",
    professionalId: "noah",
    status: "pending",
    services: [{ name: "Dental screening", durationMinutes: 45, price: 90 }],
    appointmentColor: "#0f766e",
  },
];

function App() {
  const [appointments, setAppointments] = useState(initialAppointments);

  return (
    <main className="page">
      <Agenda
        date={new Date("2026-08-12T12:00:00.000Z")}
        view="day"
        locale="en-US"
        timeZone="America/New_York"
        appointments={appointments}
        professionals={professionals}
        businessHours={businessHours}
        lunchBreak={{ startMinute: 12 * 60, endMinute: 13 * 60, startsAt: "12:00", endsAt: "13:00" }}
        detailsMode="modal"
        slotMinutes={15}
        weekStartsOn={0}
        onMove={({ appointmentId, startsAt, professionalId }) => {
          setAppointments((current) =>
            current.map((appointment) =>
              appointment.id === appointmentId
                ? { ...appointment, startsAt, professionalId: professionalId ?? appointment.professionalId }
                : appointment
            )
          );
        }}
        onResize={({ appointmentId, durationMinutes, startsAt }) => {
          setAppointments((current) =>
            current.map((appointment) =>
              appointment.id === appointmentId
                ? { ...appointment, durationMinutes, startsAt: startsAt ?? appointment.startsAt }
                : appointment
            )
          );
        }}
      />
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
