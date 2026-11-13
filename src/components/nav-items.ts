import { BuildingIcon, CalendarIcon, HomeIcon, RouteIcon, UserIcon } from "lucide-react";

/** Seções do app, na ordem em que aparecem na barra lateral e na barra inferior. */
export const navItems = [
  { title: "Início", href: "/", icon: HomeIcon },
  { title: "Agenda", href: "/agenda", icon: CalendarIcon },
  { title: "Empresas", href: "/empresas", icon: BuildingIcon },
  { title: "Rotas", href: "/rotas", icon: RouteIcon },
  { title: "Perfil", href: "/perfil", icon: UserIcon },
];
