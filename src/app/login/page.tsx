"use client";

import { signIn } from "@/lib/auth-client";
import { GridPattern } from "@/components/ui/grid-pattern";
import { cn } from "@/lib/utils";
import { useState, type CSSProperties, type ReactNode } from "react";

function NotionIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true" fill="currentColor">
      <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.14c-.093-.514.28-.887.747-.933zM1.936 1.035l13.31-.98c1.634-.14 2.055-.047 3.082.7l4.249 2.986c.7.513.934.653.934 1.213v16.378c0 1.026-.373 1.634-1.68 1.726l-15.458.934c-.98.047-1.448-.093-1.962-.747l-3.129-4.06c-.56-.747-.793-1.306-.793-1.96V2.667c0-.839.374-1.54 1.447-1.632z" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

type Provider = "google" | "notion";

// Atraso da animação de entrada: cada item entra 120ms depois do anterior.
const ordem = (i: number) => ({ "--i": i }) as CSSProperties;

// Paradas do desenho de rota à direita (coordenadas no viewBox 0 0 400 400).
const PARADAS: Array<[number, number]> = [
  [48, 318], [118, 232], [92, 128], [196, 84], [262, 176], [214, 286], [332, 252], [352, 112],
];

function BotaoCamadas({
  primario,
  children,
  ...props
}: {
  primario?: boolean;
  children: ReactNode;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <span className="pill-layered w-full sm:w-auto">
      <button
        type="button"
        className={cn(
          "inline-flex h-11 w-full items-center justify-center gap-3 rounded-full px-7 text-sm font-semibold",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-black",
          "disabled:cursor-not-allowed [&_svg]:size-5 [&_svg]:shrink-0",
          primario ? "bg-white text-black" : "bg-black text-white",
        )}
        {...props}
      >
        {children}
      </button>
    </span>
  );
}

function DesenhoRota() {
  const linha = PARADAS.map(([x, y]) => `${x},${y}`).join(" ");
  return (
    <svg viewBox="0 0 400 400" className="w-full max-w-md" aria-hidden="true" fill="none">
      <polyline points={linha} stroke="rgb(255 255 255 / 0.2)" strokeWidth="1" strokeDasharray="2 6" strokeLinecap="round" />
      {PARADAS.map(([x, y], i) => (
        <g key={`${x}-${y}`}>
          <circle cx={x} cy={y} r="14" stroke="rgb(255 255 255 / 0.1)" />
          <circle cx={x} cy={y} r="3.5" fill="#ffffff" className="hero-blink" style={ordem(i)} />
        </g>
      ))}
    </svg>
  );
}

export default function LoginPage() {
  const [loading, setLoading] = useState<Provider | null>(null);

  async function handleSignIn(provider: Provider) {
    setLoading(provider);
    await signIn.social({ provider, callbackURL: "/" });
    setLoading(null);
  }

  return (
    // O hero é só escuro (DESIGN.md): a classe "dark" fixa os tokens aqui, qualquer que seja o tema do app.
    <div className="dark relative flex min-h-[100dvh] flex-1 items-center overflow-hidden bg-black text-white">
      {/* Fundo em movimento no lugar do vídeo: manchas de luz + grade, sob overlay preto 50%. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="hero-drift absolute -left-[10%] top-[-20%] size-[60vmax] rounded-full bg-[radial-gradient(closest-side,rgb(255_255_255/0.22),transparent)]" />
        <div
          className="hero-drift absolute -right-[15%] bottom-[-30%] size-[55vmax] rounded-full bg-[radial-gradient(closest-side,rgb(255_255_255/0.16),transparent)]"
          style={{ animationDelay: "-11s" }}
        />
        <GridPattern
          className={cn(
            "[mask-image:radial-gradient(900px_circle_at_70%_40%,white,transparent)]",
            "fill-white/5 stroke-white/20",
          )}
        />
        <div className="absolute inset-0 bg-black/50" />
      </div>

      <div className="relative z-10 mx-auto grid w-full max-w-[1280px] items-center gap-12 px-6 py-16 md:grid-cols-[1.1fr_0.9fr]">
        <div className="flex flex-col items-start">
          <div
            className="hero-enter inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[0.8125rem] font-medium"
            style={ordem(0)}
          >
            <span className="size-1 rounded-full bg-white" />
            <span className="text-white/60">Rotas do dia</span>
            <span className="text-white">My Routes</span>
          </div>

          <h1
            className="hero-enter text-gradient-hero mt-6 max-w-[14ch] pb-2 text-4xl font-bold leading-[1.1] tracking-tight md:text-[clamp(2.5rem,5vw,4rem)]"
            style={ordem(1)}
          >
            Suas visitas, na ordem certa.
          </h1>

          <p className="hero-enter mt-5 max-w-[46ch] text-base leading-[1.6] text-white/70" style={ordem(2)}>
            Empresas, rotas e agenda no mesmo lugar. Entre com a sua conta para continuar.
          </p>

          <div className="hero-enter mt-9 flex w-full flex-col gap-3 sm:w-auto sm:flex-row" style={ordem(3)}>
            <BotaoCamadas primario onClick={() => handleSignIn("google")} disabled={loading !== null}>
              <GoogleIcon />
              {loading === "google" ? "Redirecionando..." : "Continuar com Google"}
            </BotaoCamadas>

            <BotaoCamadas onClick={() => handleSignIn("notion")} disabled={loading !== null}>
              <NotionIcon />
              {loading === "notion" ? "Redirecionando..." : "Continuar com Notion"}
            </BotaoCamadas>
          </div>
        </div>

        <div className="hero-enter hidden justify-center md:flex" style={ordem(4)}>
          <DesenhoRota />
        </div>
      </div>
    </div>
  );
}
