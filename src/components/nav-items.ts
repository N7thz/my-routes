import { BuildingIcon, HomeIcon, RouteIcon, UserIcon } from "lucide-react";

/** Seções do app, na ordem em que aparecem na barra lateral e na barra inferior. */
export const navItems = [
  { title: "Início", href: "/", icon: HomeIcon },
  { title: "Empresas", href: "/empresas", icon: BuildingIcon },
  { title: "Rotas", href: "/rotas", icon: RouteIcon },
  { title: "Perfil", href: "/perfil", icon: UserIcon },
];
