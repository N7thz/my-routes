"use client";

export function SourceToggle({
  label,
  color,
  active,
  onClick,
}: {
  label: string;
  color: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={active ? `Ocultar ${label}` : `Mostrar ${label}`}
      className={`flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs transition-colors ${
        active ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/50"
      }`}
    >
      <span
        className="size-2 rounded-full transition-opacity"
        style={{ backgroundColor: color, opacity: active ? 1 : 0.3 }}
      />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
