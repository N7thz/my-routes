---
name: My Routes
description: Painel de trabalho monocromático para empresas, agenda e rotas de visita, escuro por natureza.
colors:
  night: "#000000"
  night-card: "oklch(0.145 0 0)"
  night-popover: "oklch(0.17 0 0)"
  night-muted: "oklch(0.2 0 0)"
  night-secondary: "oklch(0.22 0 0)"
  night-accent: "oklch(0.24 0 0)"
  night-sidebar: "oklch(0.12 0 0)"
  chalk: "#ffffff"
  chalk-soft: "rgb(255 255 255 / 0.7)"
  chalk-muted: "rgb(255 255 255 / 0.6)"
  chalk-input: "rgb(255 255 255 / 0.45)"
  chalk-line: "rgb(255 255 255 / 0.1)"
  paper: "#ffffff"
  paper-muted: "oklch(0.965 0 0)"
  paper-secondary: "oklch(0.955 0 0)"
  paper-accent: "oklch(0.94 0 0)"
  paper-sidebar: "oklch(0.975 0 0)"
  ink: "#000000"
  ink-muted: "rgb(0 0 0 / 0.6)"
  ink-line: "rgb(0 0 0 / 0.1)"
  signal-red-dark: "oklch(0.65 0.22 15)"
  signal-red-light: "oklch(0.577 0.245 27.325)"
  signal-green: "#10b981"
  signal-amber: "#f59e0b"
typography:
  headline:
    fontFamily: "General Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    letterSpacing: "-0.025em"
  title:
    fontFamily: "General Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.25
  metric:
    fontFamily: "General Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    fontFeature: "tnum"
  body:
    fontFamily: "General Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
  label:
    fontFamily: "General Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    letterSpacing: "0.05em"
  mono:
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
    fontSize: "0.8125rem"
    fontWeight: 400
rounded:
  sm: "16px"
  md: "18px"
  lg: "20px"
  xl: "24px"
  full: "9999px"
spacing:
  control-x: "20px"
  field-x: "16px"
  card: "24px"
  grid: "40px"
components:
  button-primary:
    backgroundColor: "{colors.chalk}"
    textColor: "{colors.night}"
    rounded: "{rounded.full}"
    padding: "8px 20px"
    height: "40px"
  button-primary-light:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.full}"
    padding: "8px 20px"
    height: "40px"
  button-outline:
    backgroundColor: "{colors.night}"
    textColor: "{colors.chalk}"
    rounded: "{rounded.full}"
    padding: "8px 20px"
    height: "40px"
  button-ghost-hover:
    backgroundColor: "{colors.night-accent}"
    textColor: "{colors.chalk}"
    rounded: "{rounded.full}"
  input:
    backgroundColor: "{colors.night}"
    textColor: "{colors.chalk}"
    rounded: "{rounded.full}"
    padding: "8px 16px"
    height: "40px"
  card:
    backgroundColor: "{colors.night-card}"
    textColor: "{colors.chalk}"
    rounded: "{rounded.lg}"
    padding: "{spacing.card}"
  popover:
    backgroundColor: "{colors.night-popover}"
    textColor: "{colors.chalk}"
    rounded: "{rounded.md}"
  badge:
    backgroundColor: "{colors.night-secondary}"
    textColor: "{colors.chalk}"
    rounded: "{rounded.full}"
    padding: "2px 10px"
  sidebar:
    backgroundColor: "{colors.night-sidebar}"
    textColor: "{colors.chalk-soft}"
---

# Design System: My Routes

## Overview

**Creative North Star: "Painel noturno"**

My Routes é um painel de trabalho que mora no escuro: fundo preto puro, superfícies em degraus de cinza neutro e texto branco com opacidade controlada. A origem é a estética Web3 premium (General Sans, pílulas, luz difusa atrás de tudo), mas aplicada a uma ferramenta de operação: densidade de painel, listas, tabelas, calendário e mapa. O luxo está na sobriedade e no acabamento, não em decoração.

Não existe cor de marca. A hierarquia vem só de contraste (branco sobre preto, opacidades 100/70/60/45/10) e de forma (tudo que se clica é pílula). Cor saturada é reservada para sinalização de estado. Atrás do app há uma atmosfera fixa: duas manchas de luz nos cantos e uma grade fina de 40px, quase invisíveis, que dão profundidade de "painel à noite" sem competir com o conteúdo.

O tema claro existe e é completo (inversão exata: papel branco, tinta preta), mas o tema escuro é a referência. Toda tela nova é desenhada primeiro no escuro.

**Key Characteristics:**
- Monocromático absoluto; cor só para estado.
- Controles em pílula (botões, campos, selects, badges, botões do calendário).
- Superfícies em degraus de cinza neutro (croma 0), sem matiz.
- Atmosfera fixa de luz e grade atrás do app.
- Movimento curto e funcional no app; movimento cinematográfico só no login.

## Colors

Preto, branco e degraus neutros; saturação apenas como sinal.

### Neutral (tema escuro, referência)
- **Noite** (`night`): fundo da página e dos campos. Preto puro, nunca cinza.
- **Noite Cartão** (`night-card`): cartões e painéis apoiados sobre a noite.
- **Noite Popover** (`night-popover`): menus, selects, dialogs e sheets; um degrau acima do cartão.
- **Noite Fosca / Secundária / Destaque** (`night-muted`, `night-secondary`, `night-accent`): fundos de skeleton, badges secundários e hover de itens, em degraus crescentes.
- **Noite Lateral** (`night-sidebar`): a barra lateral, um tom abaixo do cartão.
- **Giz** (`chalk`): texto principal e preenchimento do botão primário.
- **Giz Suave** (`chalk-soft`): texto dos itens da barra lateral.
- **Giz Fosco** (`chalk-muted`): texto secundário, descrições, rótulos de coluna.
- **Giz Campo** (`chalk-input`): borda de campos e de botões outline.
- **Linha de Giz** (`chalk-line`): bordas de cartões, divisórias, contornos.

### Neutral (tema claro)
- **Papel** (`paper`), **Papel Fosco / Secundário / Destaque** (`paper-muted`, `paper-secondary`, `paper-accent`), **Papel Lateral** (`paper-sidebar`): os mesmos papéis invertidos.
- **Tinta** (`ink`), **Tinta Fosca** (`ink-muted`), **Linha de Tinta** (`ink-line`): texto, texto secundário e bordas.

### Signal
- **Sinal Vermelho** (`signal-red-dark` no escuro, `signal-red-light` no claro): ações destrutivas e erros.
- **Sinal Verde** (`signal-green`, família emerald do Tailwind): concluído, sucesso, valor positivo. Use `emerald-700` no claro e `emerald-400/500` no escuro para texto.
- **Sinal Âmbar** (`signal-amber`, família amber do Tailwind): atenção, pendente, endereço não encontrado. Use `amber-700` no claro e `amber-400` no escuro para texto.

### Named Rules
**The No Brand Color Rule.** Não existe cor de destaque. Botão primário é giz sobre noite (ou tinta sobre papel). Nunca introduza um azul, roxo ou gradiente colorido como "cor da marca".

**The Signal Only Rule.** Verde, âmbar e vermelho aparecem só para comunicar estado. Se tirar a cor muda apenas a aparência e não a informação, a cor não deveria estar lá.

**The Zero Chroma Rule.** Todo cinza tem croma 0 (`oklch(L 0 0)`). Nada de cinza azulado ou quente.

## Typography

**Display/Body Font:** General Sans (local, pesos 400/500/600/700), com ui-sans-serif, system-ui
**Mono Font:** JetBrains Mono, para valores técnicos

**Character:** Uma única família geométrica e firme faz tudo; a hierarquia vem de peso e tamanho, não de troca de fonte.

### Hierarchy
- **Headline** (700, 1.5rem, tracking -0.025em): título de página.
- **Title** (600, 1.125rem, line-height 1.25): título de cartão, dialog e sheet.
- **Metric** (700, 1.25rem, números tabulares): contadores e totais; pode levar cor de sinal.
- **Body** (400, 0.875rem; campos usam 1rem no celular para não dar zoom): texto corrido, listas, células.
- **Label** (500, 0.75rem, tracking 0.05em, caixa alta): cabeçalhos de coluna do calendário e rótulos de seção.
- **Mono** (400, 0.8125rem): CNPJ, coordenadas, IDs.

### Named Rules
**The One Family Rule.** Só General Sans na interface. JetBrains Mono apenas para dados técnicos, nunca para títulos ou decoração.

**The Tabular Numbers Rule.** Todo número que se compara (contagens, distâncias, horários) usa `tabular-nums`.

## Layout

App com barra lateral fixa à esquerda no desktop e conteúdo à direita; no celular a lateral vira sheet. O conteúdo é denso como um painel: listas e tabelas ocupam a largura, cartões agrupam blocos relacionados. Ritmo de espaçamento na escala de 4px do Tailwind; cartões e dialogs usam 24px de respiro interno, campos 16px laterais, botões 20px laterais.

A atmosfera é fixa (`position: fixed`, atrás de tudo) e não rola com o conteúdo: grade de 40×40px com linhas a 4,5% de opacidade e duas manchas radiais de luz (60vmax no canto superior esquerdo, 50vmax no inferior direito) a 10% no escuro.

Dialogs ocupam no máximo `100% - 2rem` de largura e `100dvh - 2rem` de altura, com rolagem interna. Sheets laterais têm 3/4 da tela, até 24rem a partir de `sm`; sheets de cima ou de baixo, até 85dvh.

## Elevation & Depth

Profundidade vem de degraus tonais, não de sombra. No escuro, cada nível sobe um passo de luminosidade (noite → lateral → cartão → popover) e o cartão ganha um fio de luz interno no topo (`inset 0 1px 0 0 rgb(255 255 255 / 0.1)`), como borda iluminada de vidro. No claro, o cartão usa uma sombra ambiente difusa (`0 2px 12px rgb(0 0 0 / 0.06)`). Overlays modais escurecem o fundo com preto a 80%.

### Shadow Vocabulary
- **Fio de luz** (`inset 0 1px 0 0 rgb(255 255 255 / 0.1)`): cartões no tema escuro.
- **Ambiente claro** (`0 2px 12px rgb(0 0 0 / 0.06)`): cartões no tema claro.
- **Hover elevado** (`shadow-md` do Tailwind): botão primário e destrutivo no hover.
- **Flutuante** (`shadow-md` / `shadow-lg`): popovers, selects, dialogs e sheets.

### Named Rules
**The Light Edge Rule.** No escuro, elevação é luz na borda superior, não sombra embaixo. Sombra preta sobre fundo preto não existe.

## Shapes

Duas formas convivem: **pílula** para tudo que se aciona ou preenche (botões, campos, selects, badges, botões e o "hoje" do calendário) e **retângulo bem arredondado** para tudo que contém (cartões e dialogs a 20px, menus a 18px, itens de menu a 16px). Bordas são finas: 1px com a linha de giz/tinta; botões outline usam 1,5px com a cor de campo, para ficarem um pouco mais presentes que os cartões.

### Named Rules
**The Pill Means Action Rule.** Se é pílula, dá para clicar ou digitar. Contêineres nunca são pílula.

## Components

### Buttons
Firmes e táteis: crescem 3% no hover e afundam 1px ao pressionar.
- **Shape:** pílula (9999px); altura 40px (sm 36px, lg 44px, ícone 40×40).
- **Primary:** giz sobre noite no escuro, tinta sobre papel no claro; 600, 0.875rem, 20px laterais. Hover: 90% de opacidade, sombra média e escala 1.03 (só com movimento permitido).
- **Destructive:** sinal vermelho, mesmo comportamento do primário.
- **Outline:** fundo da página, borda de 1,5px na cor de campo; hover vai para o fundo de destaque.
- **Secondary / Ghost / Link:** fundo secundário; só hover de destaque; texto sublinhado no hover.
- **Focus:** anel de 2px na cor do texto principal, com 2px de afastamento.
- **Pílula em camadas** (`.pill-layered`): só no login. Contorno externo branco de 0,6px, 3px de folga, pílula interna e um risco de luz borrado no topo.

### Chips (Badges)
- **Style:** pílula, 0.75rem 600, 2px × 10px.
- **Variants:** primário (preenchido), secundário (fundo secundário + linha), destrutivo e outline (só borda de campo).

### Cards / Containers
- **Corner Style:** 20px.
- **Background:** noite cartão / papel.
- **Shadow Strategy:** fio de luz no escuro, ambiente no claro (ver Elevation & Depth).
- **Border:** 1px de linha de giz/tinta.
- **Internal Padding:** 24px.

### Inputs / Fields
- **Style:** pílula de 40px, fundo da página, borda na cor de campo (45% de opacidade), 16px laterais. Texto de 1rem no celular e 0.875rem a partir de `md`. Selects seguem o mesmo desenho, com chevron a 50%.
- **Focus:** anel de 2px na cor do texto com 2px de afastamento; a borda não muda.
- **Disabled:** 50% de opacidade e cursor bloqueado.

### Menus, Popovers e Dialogs
- **Popover/Select/Menu:** fundo popover, 18px de canto, 4px de respiro, itens de 16px de canto; item destacado vai para o fundo de destaque. Entram com escala 0.95 → 1 e opacidade em 150ms, a partir da origem do gatilho.
- **Dialog:** 20px de canto, 24px de respiro, largura até 32rem, overlay preto a 80%; entra com escala 0.95 e opacidade em 200ms.
- **Estado por atributo:** estilize pelos atributos do ui-sdk (`data-open`, `data-highlighted`, `data-starting-style`, `data-ending-style`).

### Navigation
- **Sidebar:** fundo lateral, texto em giz suave. Itens em pílula (12px × 8px, 0.875rem); hover no fundo de destaque com texto pleno; ativo no fundo de destaque, peso 500 e contorno interno de 1px na linha de giz. Ícones Lucide de 16px. Recolhida, vira coluna de ícones de 32px; no celular abre como sheet lateral.

### Calendário (FullCalendar)
- Integrado por variáveis: eventos preenchidos na cor primária com 8px de canto; botões da barra em pílula, agrupados com pontas arredondadas só nas extremidades; dia de hoje como círculo invertido; cabeçalhos de coluna em Label; linha do "agora" na cor do texto.

### Mapa
- Estilo neutro (MapTiler `dataviz-v4` / `dataviz-v4-dark`; sem chave, OpenFreeMap `positron` / `dark`). A rota é uma linha na cor do texto; a próxima parada é um marcador invertido (giz no escuro, tinta no claro), as pendentes ficam em cinza e as visitadas em verde de sinal.
- Marcador da posição do usuário na cor do texto, pulsando (escala 1 → 2,6 e some, `userPulse`). Nada de azul "de GPS".
- O mapa é o único lugar onde a área de conteúdo pode ir de borda a borda.

## Do's and Don'ts

### Do:
- **Do** desenhar primeiro no tema escuro e conferir a inversão no claro.
- **Do** usar pílula para todo controle acionável e 20px de canto para contêineres.
- **Do** expressar hierarquia com opacidade do texto (100 / 70 / 60) antes de pensar em cor.
- **Do** reservar verde, âmbar e vermelho para estado, com os tons de texto definidos para cada tema.
- **Do** usar `tabular-nums` em números comparáveis e JetBrains Mono em CNPJ e coordenadas.
- **Do** manter os movimentos do app entre 150 e 200ms, com `ease-out`, respeitando `prefers-reduced-motion`.

### Don't:
- **Don't** criar cor de marca, gradiente colorido ou cinza com matiz.
- **Don't** usar texto em gradiente, vídeo de fundo, entrada escalonada (`hero-enter`) ou pílula em camadas fora do login.
- **Don't** colocar sombra preta sob elementos no tema escuro; use o fio de luz.
- **Don't** fazer cartões ou painéis em formato de pílula.
- **Don't** estilizar estado com atributos do Radix (`data-[state=open]`); use os do ui-sdk.
- **Don't** reforçar a grade e as manchas de fundo: elas ficam abaixo de 10% de opacidade.
