# ForgePro — Plano de Atualizações

> Derivado das respostas ao documento `questoesAprimoramento.md` (06/05/2026).  
> Cada item indica **o que fazer**, **onde fazer** e **como fazer**.

---

## BLOCO 1 — Remoções (limpeza da codebase)

### 1.1 — Remover Google GenAI SDK

**Por quê:** Descartado pelo usuário. A dependência está instalada mas sem uso na UI; mantê-la aumenta o bundle desnecessariamente.

**O que fazer:**
- Desinstalar `@google/genai` via `npm uninstall @google/genai`
- Remover qualquer import residual relacionado em arquivos `src/`
- Remover variáveis de ambiente de chave de API GenAI (`.env`, `vite.config.ts`) se existirem

**Arquivos afetados:** `package.json`, qualquer arquivo em `src/` com import de `@google/genai`

---

### 1.2 — Remover Express

**Por quê:** O usuário não sabe para qual finalidade foi adicionado; a única hipótese (proxy GenAI) foi descartada junto com o GenAI.

**O que fazer:**
- Desinstalar `express` e `@types/express` via `npm uninstall express @types/express`
- Remover `tsx` se foi instalado exclusivamente para rodar o servidor Express
- Verificar se há algum arquivo `server.ts` ou similar na raiz e removê-lo

**Arquivos afetados:** `package.json`, eventual `server.ts`

---

## BLOCO 2 — Monitoramento Biométrico

### 2.1 — Tela de Medidas Corporais

**O que fazer:**  
Criar uma nova tela `BodyMeasurements.tsx` em `src/components/screens/` para registro periódico de:
- Peso corporal (kg)
- Circunferência do braço (cm)
- Cintura (cm)
- Quadril (cm)
- Pescoço (cm)

Cada registro deve ter uma data associada (campo `data: string`) para permitir análise de tendência.

**Como armazenar:**  
Criar uma nova coleção Firestore: `users/{uid}/measurements/{docId}` com o shape:
```ts
interface BodyMeasurement {
  id: string;
  userId: string;
  data: string; // ISO date
  pesoKg?: number;
  bracoCm?: number;
  cinturaCm?: number;
  quadrilCm?: number;
  pescocoCm?: number;
  createdAt: any;
}
```
Adicionar `BodyMeasurement` ao arquivo `src/types.ts`.  
Adicionar métodos `saveMeasurement` e `getMeasurements` ao `workoutService.ts`.

**Navegação:**  
Adicionar o tipo `'measurements'` ao union `Screen` em `App.tsx` e incluir botão de acesso na navbar ou dentro da tela `UserProfile`.

---

### 2.2 — Gráfico de Evolução do Peso Corporal

**O que fazer:**  
Dentro da tela `BodyMeasurements.tsx` (ou na tela `Progress.tsx` como nova aba), exibir um `AreaChart` (Recharts, já instalado) com o peso ao longo do tempo.

**Como fazer:**  
- Buscar os registros via `workoutService.getMeasurements()`
- Ordenar por data
- Mapear para `{ date: string, peso: number }`
- Renderizar com `<AreaChart>` do Recharts

---

### 2.3 — Lembretes para Preenchimento Regular

**O que fazer:**  
Adicionar lógica no Dashboard para verificar se o usuário registrou medidas nos últimos N dias (sugestão: 7 dias) e, caso não tenha, exibir um banner/card de alerta com botão de atalho para a tela de medidas.

**Como fazer:**  
- No `Dashboard.tsx`, buscar o último registro de medidas via `workoutService.getMeasurements({ limit: 1 })`
- Se `lastMeasurement` for `null` ou a data for há mais de 7 dias, renderizar um `<div>` de aviso com `onClick={() => onNavigate('measurements')}`

---

### 2.4 — Integração Futura com Zepp / Zepp Life

**Status:** Avaliar em fase posterior.  
**Ponto de atenção:** Ambos os apps (Zepp e Zepp Life da Amazfit) expõem dados via a API **Zepp Health Open Platform**. A integração exigiria um backend (Firebase Functions) para gerenciar o OAuth 2.0 e armazenar o token de acesso do usuário. Reservar espaço na UI e no `Profile` para um campo `zeppConnected: boolean`.

---

## BLOCO 3 — Calendário Visual de Treinos

### 3.1 — Calendário Planejado vs. Realizado

**O que fazer:**  
Criar um componente `WorkoutCalendar.tsx` (ou adicionar como seção no `Dashboard.tsx`) que exiba uma grade mensal onde cada dia é colorido conforme o status:
- **Cinza:** sem plano e sem treino
- **Amarelo/laranja:** dia com plano importado, mas treino não realizado
- **Verde (brand):** treino realizado

**Como fazer:**  
- Usar `date-fns` (já instalado) para gerar a grade de dias do mês: `eachDayOfInterval({ start: startOfMonth(now), end: endOfMonth(now) })`
- Cruzar os `Plano[]` (dias planejados) com as `WorkoutSession[]` (dias realizados) para determinar o status de cada dia
- Renderizar como grid CSS 7 colunas com `<button>` por dia, clicável para navegar ao histórico daquele dia

**Localização sugerida:** Seção abaixo dos cards de resumo no `Dashboard.tsx`

---

## BLOCO 4 — Cálculo de 1RM com Múltiplas Fórmulas

**O que fazer:**  
Substituir o uso exclusivo da fórmula de Epley por uma média de quatro fórmulas clássicas:

| Fórmula | Expressão |
|---|---|
| Epley | `peso × (1 + reps / 30)` |
| Brzycki | `peso × (36 / (37 - reps))` |
| Lander | `peso × 100 / (101.3 - 2.67123 × reps)` |
| O'Conner | `peso × (1 + 0.025 × reps)` |

**Como fazer:**  
- Criar uma função utilitária `calcular1RM(peso: number, reps: number): number` em um novo arquivo `src/lib/performanceUtils.ts`
- A função retorna a **média arredondada** das quatro fórmulas (excluindo fórmulas inválidas para reps > 15)
- Substituir a função `calcularERM` em `Records.tsx` pela nova função importada de `performanceUtils.ts`
- Exibir opcionalmente os valores individuais de cada fórmula como tooltip na tela de Recordes

---

## BLOCO 5 — Gráficos e Visualização

### 5.1 — Novos tipos de gráfico com Recharts

**O que fazer:**  
Adicionar os seguintes gráficos usando componentes Recharts (já instalado, sem nova dependência):

| Gráfico | Tipo Recharts | Onde usar |
|---|---|---|
| Evolução do peso corporal | `AreaChart` | Tela `BodyMeasurements` |
| Volume de treino por grupo muscular | `BarChart` | Tela `Progress` — nova aba |
| Mapa de grupos musculares da semana | `RadarChart` | Dashboard ou Progress |

**Como fazer para o RadarChart:**  
- Listar todos os grupos musculares dos `exerciciosSummary` das sessões da semana atual
- Contar séries por grupo
- Mapear para `[{ subject: 'Peitoral', value: 8 }, ...]`
- Renderizar com `<RadarChart>` + `<Radar>` + `<PolarGrid>` do Recharts

---

### 5.2 — Migração para Nivo (visualizações avançadas)

**O que fazer:**  
Instalar `@nivo/core` e os pacotes de gráfico desejados para visualizações que o Recharts não suporta bem:

```bash
npm install @nivo/core @nivo/calendar @nivo/bar @nivo/radar
```

**Uso prioritário do Nivo:**
- **`@nivo/calendar`** — heatmap de calendário de treinos (estilo GitHub contributions), exibindo frequência de treinos por dia ao longo do ano
- Os demais gráficos (bar, radar, area) podem ser mantidos em Recharts por enquanto para evitar duplicidade de libs

**Onde colocar o heatmap:**  
Nova seção "Consistência Anual" na tela `History.tsx` ou `Progress.tsx`

---

## BLOCO 6 — Offline-First com IndexedDB (Dexie.js)

**O que fazer:**  
Implementar camada de cache local para que o registro e a execução de treinos funcionem sem conexão e sincronizem ao reconectar.

**Como fazer:**

1. **Instalar Dexie.js:**
   ```bash
   npm install dexie
   ```

2. **Criar `src/lib/localDb.ts`:**  
   Definir um banco IndexedDB com as tabelas:
   - `workouts` (espelha `WorkoutSession`)
   - `series` (espelha `WorkoutSeries`)
   - `measurements` (espelha `BodyMeasurement`)
   - `syncQueue` (fila de operações pendentes: `{ id, collection, operation, payload }`)

3. **Estratégia de sincronização:**  
   - Leitura: sempre tentar Firestore primeiro; em falha, ler do Dexie
   - Escrita: escrever no Dexie imediatamente + adicionar à `syncQueue`; ao detectar conexão (evento `online`), processar a fila e escrever no Firestore

4. **Testar o PWA:**  
   Rodar `npm run build && npm run preview` e validar a instalação como app e o comportamento offline no Chrome DevTools (aba Application → Service Workers)

---

## BLOCO 7 — Gerenciamento de Estado Global

### 7.1 — Zustand

**O que fazer:**  
Instalar e configurar Zustand para estado global compartilhado entre telas:

```bash
npm install zustand
```

**Criar `src/store/appStore.ts`** com os slices:
- `user` — usuário autenticado (atual: gerenciado em `App.tsx` com `useState`)
- `profile` — dados do perfil (atual: carregado individualmente em cada tela)
- `activeWorkout` — sessão de treino em andamento (atual: estado local de `ExecutePlannedWorkout`)

**Benefício imediato:** eliminar re-fetch do perfil em múltiplas telas; atualização em um lugar reflete em todo o app.

---

### 7.2 — TanStack Query (React Query)

**O que fazer:**  
Instalar e configurar para caching e invalidação automática das queries Firestore:

```bash
npm install @tanstack/react-query
```

**Configurar `QueryClient` em `src/main.tsx`** com `QueryClientProvider`.

**Converter as chamadas mais frequentes para hooks:**
- `useWorkouts()` — substitui `workoutService.getWorkouts()` chamado em Dashboard, Progress, Records e History
- `useExercises()` — substitui `workoutService.getExercises()` chamado em LogWorkout e Progress
- `useProfile()` — substitui `workoutService.getUserProfile()` chamado em UserProfile e Dashboard

**Benefício:** dados em cache entre navegações de tela, sem loading spinner a cada visita.

---

## BLOCO 8 — Manutenção de Autenticação

**Nenhuma mudança necessária.** Google Auth permanece como único método. Sem ação.

---

## Resumo — Ordem de Execução Sugerida

| Prioridade | Bloco | Ação |
|---|---|---|
| 🔴 1 | Bloco 1 | Remover GenAI e Express (limpeza imediata) |
| 🔴 2 | Bloco 4 | Atualizar cálculo de 1RM com múltiplas fórmulas |
| 🟠 3 | Bloco 7 | Instalar Zustand + React Query |
| 🟠 4 | Bloco 2 | Criar tela de Medidas Corporais + gráfico de peso |
| 🟠 5 | Bloco 3 | Calendário planejado vs. realizado no Dashboard |
| 🟡 6 | Bloco 5.1 | Novos gráficos (BarChart, RadarChart, AreaChart) com Recharts |
| 🟡 7 | Bloco 6 | Offline-first com Dexie.js + validar PWA |
| 🟢 8 | Bloco 5.2 | Heatmap anual com Nivo |
| 🔵 9 | Bloco 2.4 | Pesquisar API Zepp Health para integração futura |

---

*Gerado em 06/05/2026 com base nas respostas ao `questoesAprimoramento.md`.*
