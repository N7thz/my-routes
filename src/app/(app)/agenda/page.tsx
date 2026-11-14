import type { Metadata } from "next";
import { GoogleCalendarView } from "@/components/google-calendar-view";

export const metadata: Metadata = {
  title: "Agenda",
  description: "Eventos do Google Agenda e empresas agendadas.",
};

export default function AgendaPage() {
  return (
    <div className="flex flex-1 flex-col p-6">
      <GoogleCalendarView />
    </div>
  );
}
