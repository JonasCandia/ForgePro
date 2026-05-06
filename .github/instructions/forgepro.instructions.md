---
description: "Use when writing, reviewing, creating or refactoring any code in ForgePro. Covers mobile-first layout, TypeScript strict patterns, Tailwind CSS v4 tokens, Zustand + React Query state management, Firebase/Firestore conventions, offline-first with Dexie, naming conventions, and accessibility."
applyTo: "**/*.tsx, **/*.ts, **/*.css"
---

# ForgePro — Diretrizes de Desenvolvimento

## Princípio Central: Mobile-First

Toda interface começa com o layout mobile e evolui para telas maiores.

- **Sempre** escreva estilos base para mobile (sem prefixo de breakpoint).
- Use `sm:`, `md:`, `lg:` somente para **ampliar** o layout em telas maiores, nunca para esconder o layout base.
- Nunca use breakpoints para criar o layout principal em mobile como exceção — mobile é a regra.

```tsx
// correto — base mobile, expande para md
<div className="flex flex-col gap-4 md:flex-row md:gap-6">

// errado — esconde no mobile e mostra no desktop como layout principal
<div className="hidden md:flex flex-row gap-6">
```

- Bottom navigation bar: padrão para mobile (`md:hidden`). Desktop: header horizontal (`hidden md:flex`).
- Touch targets mínimos: **44×44 px** (`min-h-11 min-w-11`).
- Evite `hover:` como único feedback visual — use `active:` e `focus-visible:` também.

---

## TypeScript

- **Sem `any`**: defina tipos concretos. Use `unknown` + type guard quando incerto.
- **Union literals** em vez de `enum`:
  ```ts
  type Screen = 'dashboard' | 'log-workout' | 'history';
  ```
- **Payloads de criação/atualização** com `Omit<T, 'id' | 'uid'>`.
- **Arrays constantes** tipados com `as const` + union derivado:
  ```ts
  const MUSCLE_GROUPS = ['chest', 'back', 'legs'] as const;
  type MuscleGroup = (typeof MUSCLE_GROUPS)[number];
  ```
- **Interfaces de props** declaradas no arquivo `types.ts`, não inline no componente.
- **Type assertions em dados externos** (Firestore, APIs) são aceitáveis no mapeamento, mas não validam em runtime.
- **Error handling**: `try/catch` com `finally` em handlers assíncronos; nunca exponha stack traces ao usuário.
- Constantes globais: `UPPER_SNAKE_CASE` (ex: `WORKOUTS_COL`, `MAX_RETRIES`).

---

## Componentes React

- **Named function exports** — nunca arrow functions no nível de módulo:
  ```ts
  // correto
  export function Dashboard({ ... }: DashboardProps) { ... }
  // evitar
  export const Dashboard = ({ ... }) => { ... }
  ```
- **Views puras** (sem side-effects diretos) com `React.memo`:
  ```ts
  export default React.memo(function ProgressScreen({ ... }: ProgressProps) { ... });
  ```
- **Imports de React explícitos**: `import React, { useState, useEffect } from 'react'`
- **Cleanup de subscriptions** sempre no retorno do `useEffect`:
  ```ts
  useEffect(() => {
    const unsub = onSnapshot(...);
    return () => unsub();
  }, [uid]);
  ```
- **`useMemo`** para dados derivados (totais, filtros), com array de deps preciso.
- Evite incluir funções do store como dependências de `useMemo`/`useCallback`.
- Screens ficam em `src/components/screens/`. Não há pasta de componentes atômicos; crie `src/components/ui/` se necessário.
- Navegação: adicione novos screens via `switch/case` em `App.tsx` com `useState<Screen>`.

---

## Tailwind CSS v4 — Tokens do Projeto

Use **somente** os tokens definidos em `src/index.css`. Não hardcode valores de cor ou tipografia.

| Token | Valor | Uso |
|---|---|---|
| `brand` | `#CCFF00` | Destaque, CTAs, indicadores ativos |
| `background` | `#0A0A0A` | Fundo da app |
| `surface` | `#111111` / `#1A1A1A` | Cards, modais, inputs |
| `font-display` | `Lexend` | Headings, nav |
| `font-mono` | `JetBrains Mono` | Dados numéricos, séries |

Classes de componentes reutilizáveis disponíveis (definidas via `@layer components`):
`btn-primary`, `btn-secondary`, `card`, `form-input`, `input-label`

```tsx
// correto
<button className="btn-primary">Salvar</button>
<div className="card p-4">...</div>

// evitar
<button className="bg-[#CCFF00] text-black font-bold rounded-lg px-4 py-2">Salvar</button>
```

---

## State Management

### Zustand (`appStore.ts`)
- Estado global mínimo: `user` (Firebase User) e `activeWorkoutId`.
- Estado + actions na mesma interface TypeScript, sem slices, sem immer.
- Computed values como métodos usando `get()`:
  ```ts
  getActiveWorkout: () => get().workouts.find(w => w.id === get().activeWorkoutId)
  ```
- Desestruture apenas o necessário: `const { user } = useAppStore()`.

### React Query
- Cache e sincronização de dados do servidor.
- `queryKey` padrão: `['entity', user.uid]` ou `['entity', user.uid, id]`.
- Toda mutação usa `useMutation` com `onSuccess` invalidando as queries afetadas.

### ThemeContext
- Tema claro/escuro via `ThemeContext` com persistência em `localStorage`.
- Acesse com `useTheme()` — nunca leia `localStorage` diretamente em componentes.

---

## Firebase / Firestore

- **Caminho de coleções** — padrão do projeto:
  ```
  users/{uid}/profile/data
  workouts/{uid}/sessions/{sessionId}
  measurements/{uid}/entries/{entryId}
  planos/{uid}/...
  ```
- **Toda operação Firestore** passa por `workoutService.ts` (singleton) — nunca chame `db` diretamente em componentes.
- **Erros Firestore** devem passar por `handleFirestoreError()` de `firestoreUtils.ts`.
- Auth: verifique `user` do store antes de qualquer operação; não acesse `auth.currentUser` diretamente em componentes.

---

## Offline-First (Dexie + syncService)

- Toda escrita vai **primeiro para o Dexie** (IndexedDB), depois para o Firestore via `syncService`.
- `syncService` mantém `syncQueue` com retry (máx. 5 tentativas) — não reimplemente essa lógica.
- Detecte conectividade via `navigator.onLine` ou o hook `useOnlineSync` — nunca bloqueie a UI por falta de conexão.
- Loading states usam skeleton:
  ```tsx
  if (isLoading) return <div className="h-8 w-full rounded bg-surface animate-pulse" />;
  ```

---

## Animações (Motion/React)

- Modais e painéis deslizantes usam `motion/react` + `AnimatePresence`.
- Padrão de entrada de modal:
  ```tsx
  <motion.div
    initial={{ y: 50, scale: 0.9, opacity: 0 }}
    animate={{ y: 0, scale: 1, opacity: 1 }}
    exit={{ y: 50, scale: 0.9, opacity: 0 }}
    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
  />
  ```

---

## Acessibilidade

- Botões com apenas ícone **devem** ter `aria-label` descritivo:
  ```tsx
  <button aria-label="Fechar modal"><XIcon /></button>
  ```
- Inputs sempre associados a um `<label>` via `htmlFor`/`id`.
- Hierarquia de headings respeitada: um `h1` por tela, `h2`/`h3` para seções.
- Textos de UI em **pt-BR**; variáveis, funções e tipos em **inglês**.

---

## Convenções de Nomenclatura

| Item | Convenção | Exemplo |
|---|---|---|
| Arquivos de componente | PascalCase | `LogWorkout.tsx` |
| Hooks | camelCase + prefixo `use` | `useWorkouts.ts` |
| Libs / utils | camelCase | `syncService.ts` |
| Constantes globais | UPPER_SNAKE_CASE | `WORKOUTS_COL` |
| Tipos / Interfaces | PascalCase | `WorkoutSession`, `Profile` |
| Funções / variáveis | camelCase | `handleSubmit`, `isLoading` |

---

## Anti-padrões a Evitar

- `any` em qualquer store, tipo ou função
- Lógica Firestore diretamente em componentes (use `workoutService` ou hooks)
- Seeding de dados dentro de callbacks `onSnapshot` (risco de loop infinito)
- Expor chaves de API ou credenciais no bundle do cliente
- Layouts que só funcionam em desktop e "degradam" para mobile
- `hover:` como único estado interativo (inacessível em touch)
- Duplicar tokens de cor/tipografia em vez de usar as classes de componente existentes
