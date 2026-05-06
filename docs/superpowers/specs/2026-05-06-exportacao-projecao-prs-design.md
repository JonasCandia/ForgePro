# ForgePro — Exportação CSV + Projeção de PRs

**Data:** 2026-05-06  
**Status:** Aprovado para implementação  
**Ciclo:** 1 de 2 (Correlação Biometria × Performance fica para o ciclo 2, após módulo de medidas ter histórico real)

---

## 1. Contexto e Motivação

O ForgePro acumula um histórico rico de séries, cargas e sessões. Duas lacunas identificadas:

1. **Os dados ficam presos no app.** Não há como extraí-los para análise externa (Excel, IA generativa) ou backup manual. O fluxo desejado é: exportar CSV → alimentar IA externa (ChatGPT/Gemini) → receber plano JSON → importar via `ImportPlan` já existente.

2. **A tela de Recordes mostra onde você está, mas não para onde vai.** A projeção de PRs fecha esse gap — usando o histórico de progressão para estimar quando o próximo recorde será batido.

---

## 2. Escopo

### Incluído

- Exportação de histórico completo como CSV (download direto no browser)
- Botão de exportação em `UserProfile` e em `History`
- Projeção de PRs por regressão linear simples, visível na tela `Records`
- Linha de tendência tracejada no gráfico de evolução existente
- Badge textual "~X semanas para Ykg"

### Excluído

- Exportação em PDF
- Importação de CSV (importação continua somente via JSON de plano)
- Meta manual de PR (o usuário define alvo) — YAGNI neste ciclo
- Correlação Biometria × Performance — depende de histórico de medidas, entra no ciclo 2
- IA integrada ao app — processamento de IA é externo e deliberado

---

## 3. Feature 1 — Exportação CSV

### 3.1 Arquivo novo: `src/lib/exportUtils.ts`

Responsabilidade única: converter dados de séries para string CSV e disparar download.

```ts
// Assinatura pública
export function exportToCSV(
  sessions: WorkoutSession[],
  series: WorkoutSeries[]
): void
```

O join é feito dentro da função: `series.map(s => ({ ...s, session: sessions.find(w => w.id === s.workoutId) }))`.

**Colunas do CSV (ordem):**

| Coluna | Fonte |
|---|---|
| `data` | `WorkoutSession.data` (via `s.workoutId`) |
| `nomeTreino` | `WorkoutSession.nomeTreino` (via `s.workoutId`) |
| `exercicio` | `WorkoutSeries.exercicioNome` |
| `grupoMuscular` | `WorkoutSeries.grupoMuscular` |
| `serie` | `WorkoutSeries.serieNum` |
| `reps` | `WorkoutSeries.repeticoesReais` |
| `peso` | `WorkoutSeries.pesoReal` |
| `volume` | `reps × peso` (calculado) |

**Mecanismo de download:**
```ts
const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = `forgepro-historico-${new Date().toISOString().slice(0,10)}.csv`;
a.click();
URL.revokeObjectURL(url);
```

Sem dependências externas. Sem chamada de rede.

### 3.2 Arquivos modificados

**`src/components/screens/UserProfile.tsx`**  
Adicionar botão "Exportar Histórico (CSV)" na seção de dados/configurações. O botão chama `exportToCSV(sessions, series)` onde ambos vêm do hook `useWorkouts` (já disponível via TanStack Query — sem re-fetch).

**`src/components/screens/History.tsx`**  
Adicionar botão secundário no header da tela. Mesmo comportamento.

### 3.3 Fluxo de dados

```
Usuário clica "Exportar"
  → sessions + series já em cache (TanStack Query / useWorkouts)
  → exportUtils.exportToCSV(sessions, series)
  → join em memória: series → session via workoutId
  → Blob CSV gerado em memória
  → Download automático no browser
  → URL revogada imediatamente
```

Sem loading state necessário — operação síncrona sobre dados já carregados.

---

## 4. Feature 2 — Projeção de PRs

### 4.1 Função nova em `src/lib/performanceUtils.ts`

Este arquivo já existe no projeto (cálculo de 1RM com múltiplas fórmulas). A projeção entra como função adicional.

```ts
interface ProjecaoPR {
  pesoAlvo: number;   // próximo marco redondo acima do PR atual
  semanas: number;    // estimativa arredondada para cima
  slope: number;      // kg/semana (para debug / tooltip)
}

export function projetarPR(
  historico: { data: string; pesoMax: number }[]
): ProjecaoPR | null
```

**Regras de negócio:**
- Retorna `null` se `historico.length < 4`
- Retorna `null` se `slope ≤ 0` (estagnado ou regressão)
- Usa os últimos 8 pontos do histórico (janela deslizante)
- `pesoAlvo` = próximo múltiplo de 2.5kg acima do PR atual
- `semanas` = `Math.ceil((pesoAlvo - prAtual) / slope)`

**Algoritmo — regressão linear (sem dependência):**
```
x = semana ordinal (0, 1, 2, ...)
y = pesoMax

n = pontos
slope = (n·Σxy − Σx·Σy) / (n·Σx² − (Σx)²)
```

Implementado em ~20 linhas, sem lib externa.

### 4.2 Componente `Records.tsx`

**Linha tracejada no gráfico:**  
O `LineChart` do Recharts já existe. Adicionar uma segunda `<Line>` com `strokeDasharray="4 2"` e cor secundária, alimentada pelo dataset de projeção (pontos futuros calculados pelo slope).

**Badge textual:**  
Abaixo do PR atual de cada exercício, exibir:
```
→ ~X semanas para Ykg
```
Usando a cor `text-muted-foreground` do tema. Se `projetarPR()` retornar `null`, o badge simplesmente não renderiza — sem estado vazio explícito.

**Seleção de exercício:**  
A tela `Records` já permite selecionar um exercício para ver o gráfico de evolução. A projeção usa o exercício atualmente selecionado — sem UI adicional.

---

## 5. Dependências Técnicas

| Item | Status |
|---|---|
| `WorkoutSeries` (tipo) | Já existe em `src/types.ts` |
| `useWorkouts` hook | Já existe em `src/hooks/useWorkouts.ts` |
| `performanceUtils.ts` | Já existe — apenas adicionar função |
| Recharts `LineChart` | Já em uso em `Records.tsx` |
| TanStack Query cache | Planejado no Bloco 7 do roadmap |
| Zero novas dependências npm | ✓ |

---

## 6. Ciclo 2 — Correlação Biometria × Performance (futuro)

Após o módulo de medidas corporais (`BodyMeasurements`) acumular histórico real:

- Nova aba "Correlação" na tela `Progress`
- Gráfico duplo: eixo Y esquerdo = peso corporal, eixo Y direito = carga máxima do exercício selecionado, eixo X = tempo
- Painel por fase (cutting/bulking/manutenção): performance média de cada exercício durante cada objetivo registrado no perfil
- Fonte: `BodyMeasurement[]` cruzado com `WorkoutSession[]` por data

Esse ciclo não tem data — entra quando houver dados suficientes para a análise fazer sentido.

---

## 7. Ordem de Implementação Sugerida

1. `src/lib/exportUtils.ts` — função pura, testável isoladamente
2. Botão de exportação em `UserProfile`
3. Botão de exportação em `History`
4. `projetarPR()` em `performanceUtils.ts`
5. Linha tracejada + badge em `Records.tsx`
