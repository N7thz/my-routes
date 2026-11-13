import type { Metadata } from "next";

// A página de login é client component; o metadata dela mora aqui.
export const metadata: Metadata = {
  title: "Entrar",
  description: "Entre no My Routes com sua conta Google ou Notion.",
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
