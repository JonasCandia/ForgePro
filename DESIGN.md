---
name: FORGE PRO
description: Caderno de campo digital do atleta. Registros brutos, progressão visível, zero ruído.
colors:
  voltage: "#CCFF00"
  void: "#0A0A0A"
  forge-surface: "#111111"
  forge-surface-raised: "#1A1A1A"
  forge-outline: "#222222"
  forge-border: "#333333"
  body-text: "#D1D5DB"
  muted-text: "#6B7280"
  subtle-text: "#4B5563"
  error: "#EF4444"
  warning-bg: "#78350F"
  warning-text: "#FDE68A"
typography:
  display:
    fontFamily: "Lexend, sans-serif"
    fontWeight: 900
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Lexend, sans-serif"
    fontWeight: 700
    letterSpacing: "-0.015em"
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.625rem"
    fontWeight: 700
    letterSpacing: "0.1em"
  mono:
    fontFamily: "JetBrains Mono, ui-monospace, SFMono-Regular, monospace"
    fontWeight: 400
    letterSpacing: "0.025em"
rounded:
  sm: "4px"
  md: "8px"
  lg: "12px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.voltage}"
    textColor: "#000000"
    typography: "{typography.display}"
    rounded: "{rounded.sm}"
    padding: "12px 24px"
  button-primary-hover:
    backgroundColor: "{colors.voltage}"
    textColor: "#000000"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.body-text}"
    rounded: "{rounded.sm}"
    padding: "12px 24px"
  card:
    backgroundColor: "{colors.forge-surface}"
    rounded: "{rounded.lg}"
    padding: "24px"
  form-input:
    backgroundColor: "{colors.forge-surface-raised}"
    textColor: "#FFFFFF"
    rounded: "{rounded.sm}"
    padding: "12px 16px"
  form-input-focus:
    backgroundColor: "{colors.forge-surface-raised}"
    textColor: "#FFFFFF"
  nav-item-active:
    textColor: "{colors.voltage}"
  nav-item-inactive:
    textColor: "{colors.muted-text}"
---

# Design System: FORGE PRO

## 1. Overview

**Creative North Star: "O Caderno de Campo do Guerreiro"**

FORGE não é um app fitness. É um diário de operações. Cada tela é uma entrada de campo: dados brutos, registros precisos, sem ornamento. O visual reflete a mentalidade do atleta que treina para performance, não para audiência. A interface deve sentir como um instrumento, não uma vitrine.

A escuridão não é uma escolha estética: é a condição de uso. Academia às 6h, luz ambiente baixa, tela na mão, músculo doendo. O único elemento que rompe o vácuo é o Voltage, `#CCFF00`, uma cor com presença física, que não pede atenção — exige. Ela aparece apenas onde importa: ação primária, estado ativo, dado crítico.

Este sistema rejeita explicitamente: o cheerfulness do Nike Training Club, os gradientes de hero-metric SaaS, o grid de cards idênticos com ícone + título + texto, e qualquer cor que possa ser descrita como "motivacional". A disciplina não precisa de encorajamento visual.

**Key Characteristics:**
- Dark absoluto com um único acento de alta voltagem
- Tipografia display em caixa alta, sem curvas, sem concessão
- Dados em destaque; chrome invisível
- Transições rápidas e exponenciais; sem bounce, sem elastic
- Mobile-first com touch targets generosos e resposta tátil imediata

## 2. Colors: A Paleta Void + Voltage

O sistema opera em dois polos: o Void (ausência total de luz) e o Voltage (saída de energia máxima). Entre eles, uma escala de superfícies em cinza-forja que estrutura a hierarquia sem distração.

### Primary
- **Voltage** (`#CCFF00` / `oklch(93% 0.28 126)`): O único acento do sistema. Usado em botões primários, estado ativo de navegação, indicadores de progresso e dados críticos. Sua raridade é a fonte do seu poder: aparece em ≤10% de qualquer tela, nunca como fundo decorativo.

### Neutral: Escala Forja
- **Void** (`#0A0A0A`): Background da aplicação. A ausência. Nenhum elemento vive aqui sem propósito.
- **Forge Surface** (`#111111`): Superfície de cards, nav bar, modais. Um degrau acima do Void.
- **Forge Surface Raised** (`#1A1A1A`): Inputs, hover de superfície, segundo nível de elevação tonal.
- **Forge Outline** (`#222222`): Bordas de cards, divisórias. Visible apenas como estrutura, nunca como decoração.
- **Forge Border** (`#333333`): Bordas de inputs em estado normal.
- **Body Text** (`#D1D5DB`): Texto de conteúdo primário sobre fundos escuros.
- **Muted Text** (`#6B7280`): Labels, metadados, texto secundário.
- **Subtle Text** (`#4B5563`): Placeholders, texto desabilitado, weekday labels no calendário.

### Status
- **Error** (`#EF4444`): Erros e ações destrutivas (logout, delete). Nunca usado como decoração.
- **Warning** (`#78350F` bg / `#FDE68A` text): Banner offline. Tom amarelo-âmbar sobre fundo escuro.

### Named Rules
**A Regra do Voltage.** O acento `#CCFF00` é usado em ≤10% de qualquer tela. Ele não aparece em backgrounds de seções, não faz gradiente, não colore texto decorativo. Cada aparição é uma declaração.

**A Regra do Modo Claro.** Em light mode, todas as superfícies viram tons de cinza (`#f5f5f5` / `#ffffff` / `#ebebeb`), mas o Voltage permanece idêntico. O acento não tem modo claro alternativo.

## 3. Typography

**Display Font:** Lexend (Google Fonts, wght 400–800; fallback: sans-serif)
**Body Font:** Inter (Google Fonts, wght 400–700; fallback: ui-sans-serif, system-ui)
**Data/Mono Font:** JetBrains Mono (Google Fonts, wght 400–700; fallback: ui-monospace, SFMono-Regular)

**Character:** Lexend carrega os títulos com autoridade: black weight, uppercase, tracking negativo. Inter resolve o conteúdo com neutralidade absoluta. JetBrains Mono fala a linguagem dos dados: pace, séries, cargas, status de conexão.

### Hierarchy
- **Display** (Lexend, 900, uppercase, tracking -0.025em): Nomes de screen, hero callouts, nome do app. Nunca em bloco de texto longo.
- **Title** (Lexend, 700, uppercase, tracking -0.015em): Cabeçalhos de seção dentro das telas (`text-sm font-black uppercase tracking-tighter`).
- **Body** (Inter, 400–500, `1rem`, line-height 1.5): Conteúdo de exercícios, descrições, observações. Máx. 65ch por linha em desktop.
- **Label** (Inter, 700, `0.625rem`, uppercase, tracking 0.1em): Rótulos de campos, categorias de dados (`input-label`). Sempre caixa alta, sempre tracking-widest.
- **Mono** (JetBrains Mono, 400, tracking 0.025em): Cargas (kg), pace (min/km), status de conexão, timestamps, dados numéricos precisos.

### Named Rules
**A Regra do Uppercase.** Labels de dados, títulos de seção e botões são sempre uppercase via Lexend. Texto de conteúdo (nomes de exercícios, observações, resultados) é title-case via Inter. Misturar os dois na mesma linha é o único caso onde coexistem — jamais o mesmo papel com as duas fontes.

## 4. Elevation

O sistema é **flat-by-default com elevação tonal**. A hierarquia de profundidade é transmitida por diferença de cor de background (`#0A0A0A` → `#111111` → `#1A1A1A`), não por sombras decorativas. Sombras existem em dois casos funcionais: ancoragem estrutural de cards e o glow do Voltage em elementos interativos.

### Shadow Vocabulary
- **Card Structural** (`box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25)`): Cards e superfícies elevadas (`shadow-2xl`). Âncora visual, não decoração. Desaparece em light mode com ajuste de opacidade.
- **Dropdown Ambient** (`box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)`): Dropdowns e overlays (`shadow-xl`). Separa do fundo sem dramatismo.
- **Voltage Focus Glow** (`box-shadow: 0 0 0 2px oklch(93% 0.28 126 / 0.18), 0 0 14px 0 oklch(93% 0.28 126 / 0.07)`): Inputs em foco e ícones de nav ativos (`filter: drop-shadow`). O único uso expressivo de luz — sinaliza estado interativo, não decoração.
- **FAB Voltage Shadow** (`box-shadow: shadow-brand/25`): Botão flutuante de novo treino. Conecta o botão ao acento do sistema.

### Named Rules
**A Regra Flat-by-Default.** Superfícies são flat em repouso. Sombras aparecem apenas como resposta a estado (hover, elevação, focus) ou ancoragem estrutural de containers. Glassmorphism (`backdrop-blur` decorativo) nunca.

## 5. Components

Componentes do FORGE são pesados e imediatos: pressione, acontece, sem demora. Nenhum componente pede atenção; todos respondem ao toque.

### Buttons
- **Shape:** `rounded` (4px) em todos os botões. Sem curvas suaves. Cantos retos comunicam precisão, não amabilidade.
- **Primary** (`btn-primary`): Voltage background (`#CCFF00`), texto preto, Lexend 700 bold, uppercase, tracking-tighter, `py-3 px-6`. `hover:brightness-110`, `active:scale-[0.98] active:brightness-90`.
- **Secondary** (`btn-secondary`): Transparente, borda Forge Border (`#333`), texto Body Text, mesma tipografia do primary. `hover:bg-white/5`. Nunca com preenchimento de cor de acento.
- **Focus / Acessibilidade:** Ambos respondem ao teclado via `:focus-visible` herdado do Tailwind. Não sobrescrever.

### Cards / Containers
- **Corner Style:** `rounded-xl` (12px). Mais suave que os botões para criar hierarquia visual entre containers e controles.
- **Background:** Forge Surface (`#111111`).
- **Shadow Strategy:** Card Structural (`shadow-2xl`) como âncora. Ver Elevation.
- **Border:** Forge Outline (`#222222`), 1px. Estrutural, não decorativo.
- **Internal Padding:** `p-6` (24px). Sempre consistente. Sub-seções dentro do card usam `space-y-3` ou `space-y-4` para ritmo.

### Inputs / Fields
- **Style:** Forge Surface Raised background (`#1A1A1A`), Forge Border (`#333`) em repouso, `rounded` (4px), `py-3 px-4`.
- **Focus:** Borda muda para Voltage (`border-brand`), sem `ring`. Voltage Focus Glow via `box-shadow`.
- **Labels:** Sempre `input-label` — Inter 700, `0.625rem`, uppercase, tracking-widest, Muted Text (`#6B7280`), `mb-1.5`.
- **Placeholder:** Subtle Text (`#4B5563`).
- **Disabled:** Reduzir opacidade para 40%. Nunca alterar a cor de fundo.

### Navigation
- **Top Bar (desktop + mobile):** `h-16`, Forge Surface background, Forge Outline border-bottom, sticky z-50. Logo: Voltage bg `p-1.5 rounded`, ícone Dumbbell preto. Wordmark: Lexend black italic tracking-tighter em Voltage.
- **Desktop Nav:** Tabs inline na top bar, `text-[11px] font-bold uppercase tracking-widest`. Ativo: texto Voltage + `border-b-2 border-brand`. Inativo: Muted Text + `border-transparent`.
- **Mobile Bottom Nav:** Forge Surface background, Forge Outline border-top. 7 tabs + FAB. Ativo: texto Voltage + `scale-110` no ícone + Voltage drop-shadow glow. Inativo: Muted Text. Label: `text-[9px]` Inter bold uppercase.
- **HUD Sliding Indicator:** Faixa `h-[2px]` em Forge Outline; segmento ativo em Voltage com `box-shadow` Voltage glow. Translada com `cubic-bezier(0.16, 1, 0.3, 1)` 280ms.
- **FAB (Novo Treino):** `w-14 h-14 rounded-full bg-voltage text-black`, `fixed bottom-[5.5rem] right-4`. Ativo: `scale-110 shadow-brand/40`. Inativo: `shadow-brand/25 hover:brightness-110`.

### Offline Banner (componente de estado)
- Background `bg-yellow-900/90`, border `border-yellow-700/50`, `backdrop-blur-sm`. Texto `text-[11px] font-bold uppercase tracking-wider text-yellow-300`. Ícone `WifiOff` em `text-yellow-400`. Sticky abaixo da top bar.

### Signature Component: HUD Nav Indicator
O indicador deslizante da nav mobile é o componente mais expressivo do sistema. Uma faixa de 2px que se move entre tabs com ease-out-expo, com Voltage glow que persiste no estado ativo. Não é decoração: é o cursor do sistema, dizendo "você está aqui" com precisão militar.

## 6. Do's and Don'ts

### Do:
- **Do** usar Voltage (`#CCFF00`) exclusivamente em ações primárias, estados ativos e indicadores de progresso. A raridade é a força do acento.
- **Do** usar Lexend black (900) uppercase para todos os títulos de tela e botões primários. Nunca Lexend em peso regular como display.
- **Do** usar JetBrains Mono para qualquer dado numérico preciso: cargas em kg, pace em min/km, status de conexão, timestamps, pontuações TAF.
- **Do** aplicar `rounded` (4px) em controles interativos (botões, inputs) e `rounded-xl` (12px) em containers (cards). A diferença de raio cria hierarquia entre container e controle.
- **Do** usar elevação tonal (background progressivamente mais claro) antes de recorrer a sombras para criar profundidade.
- **Do** animar com `ease-out-expo` (`cubic-bezier(0.16, 1, 0.3, 1)`) ou `ease-out-quint` (`cubic-bezier(0.22, 1, 0.36, 1)`). Entradas de tela: 220ms. Itens em lista: 200ms com stagger 40–290ms. FAB pop: 0.38s.
- **Do** respeitar `prefers-reduced-motion`: colapsar `screen-enter`, `forge-pop` e `stagger-items` para sem animação, opacity 1, transform none.
- **Do** usar `input-label` (Inter 700, 0.625rem, uppercase, tracking-widest, Muted Text) para todos os rótulos de campos de formulário sem exceção.
- **Do** manter o conteúdo de body em máximo 65ch de largura em desktop para legibilidade.

### Don't:
- **Don't** usar Nike Training Club, Peloton, ou qualquer aesthetic "cheerful fitness" como referência. Sem gradientes motivacionais, sem emojis, sem cores vibrantes além do Voltage.
- **Don't** usar o hero-metric template: número grande + label pequeno + stats de suporte + gradient accent. É SaaS clichê; FORGE mostra dados brutos em hierarquia tipográfica simples.
- **Don't** criar grids de cards idênticos com ícone + título + texto repetido. Se o conteúdo é listável, use lista. Cards são para containers de sessão, não para navegação de categoria.
- **Don't** usar `border-left` maior que 1px como accent stripe em cards, itens de lista ou alertas. Nenhum caso justifica. Substituir por background tint ou borda completa.
- **Don't** usar `background-clip: text` com gradiente. Texto Voltage é `color: #CCFF00` sólido. Ênfase via peso ou tamanho, nunca via gradiente.
- **Don't** usar `backdrop-filter: blur` decorativamente. Glassmorphism não existe neste sistema. A única exceção permitida é o offline banner com blur funcional para separar do conteúdo.
- **Don't** animar propriedades CSS de layout (`width`, `height`, `padding`, `margin`). Animar apenas `transform` e `opacity`.
- **Don't** usar bounce (`cubic-bezier`) ou easing elástico. O sistema é preciso e imediato, não lúdico.
- **Don't** criar modais como primeira solução para qualquer interação. Explorar alternativas inline ou progressive disclosure antes.
- **Don't** usar `#000000` ou `#ffffff` puros. O fundo mais escuro é Void (`#0A0A0A`). O texto mais claro é Body Text (`#D1D5DB`).
