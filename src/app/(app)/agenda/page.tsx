import type { Metadata } from "next";
import { GoogleCalendarView } from "@/components/google-calendar-view";

export const metadata: Metadata = {
  title: "Agenda",
  description: "Eventos do Google Agenda e empresas agendadas.",
};

export default function AgendaPage() {
  return (
    <div className="flex flex-1 flex-col p-6">
      {/* O título visível é o do próprio calendário (mês/semana); o h1 fica para leitores de tela. */}
      <h1 className="sr-only">Agenda</h1>
      <GoogleCalendarView />
    </div>
  );
}
