import { GoogleCalendarView } from "@/components/google-calendar-view";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col p-6">
      <GoogleCalendarView />
    </div>
  );
}
