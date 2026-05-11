# Roadmap de Alterações — ForgePro

> Gerado em: 11/05/2026  
> Base: `alteracoes.md`

---

## Visão Geral

| # | Área | Prioridade | Complexidade | Status |
|---|------|-----------|--------------|--------|
| 1 | Sessões com nome livre + dashboard baseado em execução real | Alta | Média | Pendente |
| 2 | Remover foto de perfil | Média | Baixa | Pendente |
| 3 | Exportação JSON do histórico | Alta | Baixa | Pendente |
| 4 | Planos Circuito — melhorar execução | Alta | Alta | Pendente |
| 5 | Executar Plano — inputs mm:ss e bloqueio descanso | Alta | Média | Pendente |
| 6 | Importação — prompt ESPC antes do exemplo | Média | Baixa | Pendente |
| 7 | Página de Plano — nova UI interativa | Média | Alta | Pendente |
| 8 | Histórico — remover seção "Consistência Anual 2025" | Baixa | Baixa | Pendente |

---

## 1. Sessões com Nome Livre (sem vínculo com dia fixo)

**Arquivo afetado:** `src/types.ts`, `src/components/screens/ExecutePlannedWorkout.tsx`, `src/components/screens/Dashboard.tsx`, `src/constants.ts`

### Conceito
Os planos não devem estar amarrados a um dia específico da semana. Cada sessão tem um **nome descritivo** (ex.: "Pernas", "Simulado TAF", "Treino A") e, opcionalmente, uma **sugestão de dia** (ex.: "sugere Segunda") — mas quem decide em qual dia executar é o usuário no momento da execução.

O Dashboard precisa de uma nova forma de exibir a frequência semanal, já que não haverá mais dias planejados fixos para comparar.

### Problema atual
O campo `diaDaSemana` (interface `Plano` em `src/types.ts` linha 71) aceita strings como `"Segunda"`, `"Quarta"` e o Dashboard (`Dashboard.tsx` linhas 19-22) usa um dicionário fixo para mapear esses nomes em índices de dia da semana. Isso acopla o plano ao calendário e impede nomes livres.

### Solução — Plano/Sessão

1. **`src/types.ts`:** renomear `diaDaSemana` para `nomeSessao: string` e adicionar campo opcional `diaSugerido?: string` (valor livre, sem validação de dia da semana).
2. **`src/components/screens/ExecutePlannedWorkout.tsx`:** no seletor de sessão, exibir `nomeSessao`. Se `diaSugerido` existir, mostrar como hint secundário (ex.: `"Pernas · sugerido: Segunda"`).
3. **`src/constants.ts`** (linhas 286, 295, 307, 316): atualizar o `JSON_EXEMPLO` substituindo `"Segunda"` / `"Quarta"` por `"Treino A"`, `"Treino B"`, etc., e incluir `"diaSugerido"` como campo opcional no exemplo.
4. **`src/components/screens/ImportPlan.tsx`:** ajustar warnings que referenciam "dias" para referenciar "sessões".
5. **Migração retrocompatível:** ao ler planos antigos, se `nomeSessao` for `undefined`, usar `diaDaSemana` como fallback (`nomeSessao ?? diaDaSemana`). Não forçar reescrita dos dados.

### Solução — Dashboard (frequência semanal)

Em vez de marcar quais dias da semana têm treino *planejado*, o heatmap/indicador semanal deve ser baseado apenas em **treinos realizados** (histórico real).

**Nova proposta para o widget semanal:**
- Exibir os **7 dias da semana atual** (D S T Q Q S S) como antes.
- Marcar em destaque apenas os dias em que houve um **workout registrado** na semana corrente.
- Remover completamente a lógica `plannedWeekdays` que consultava os planos para inferir dias planejados.
- Resultado: o indicador reflete execução real, não intenção, o que é mais honesto e independe de como a sessão foi nomeada.

### Critério de Aceite
- Planos com `nomeSessao: "Pernas"`, `"Simulado TAF"`, `"Treino 1"` são criados, importados e executados sem erros.
- O campo `diaSugerido` aparece como dica visual na tela de execução, sem obrigatoriedade.
- O widget semanal do Dashboard exibe apenas dias com treino **realizado**, sem depender de dias planejados.
- Planos antigos (com `diaDaSemana`) continuam funcionando sem migração forçada.

---

## 2. Remover Foto de Perfil

**Arquivos afetados:** `src/components/screens/UserProfile.tsx`, `src/App.tsx`, `src/types.ts`

### Problema
A interface `Profile` (`src/types.ts` linha 94) tem o campo `fotoUrl?`. Em `UserProfile.tsx` (linhas 26, 39, 55, 106-122) há preview de avatar e input de URL de foto. Em `App.tsx` (linha 202) o avatar do usuário é renderizado com `user.photoURL` ou DiceBear.

### Solução
1. **`src/types.ts`:** remover (ou marcar como `@deprecated`) o campo `fotoUrl`.
2. **`src/components/screens/UserProfile.tsx`:**
   - Remover o bloco de estado `fotoUrl` (linha 26).
   - Remover o bloco JSX "Avatar preview" + label "URL da Foto" (linhas 106-122).
   - Remover `fotoUrl` do objeto salvo (linha 55).
3. **`src/App.tsx`:** remover a tag `<img>` do avatar dropdown (linhas 202-203) ou substituir por um ícone de usuário simples.

### Critério de Aceite
- Página de perfil não exibe campo de URL de foto.
- Nenhum componente renderiza `<img>` com URL externa de avatar.

---

## 3. Exportação JSON do Histórico

**Arquivo afetado:** `src/components/screens/History.tsx`, `src/lib/exportUtils.ts`

### Problema
O histórico já exporta CSV (`exportToCSV` — linha 226 de History.tsx). Falta exportar os dados brutos em JSON para análise externa.

### Solução
1. **`src/lib/exportUtils.ts`:** adicionar função `exportToJSON(workouts)` que serializa o array de workouts e dispara download via `Blob` + `URL.createObjectURL`.
2. **`src/components/screens/History.tsx`:** adicionar botão "Exportar JSON" ao lado do botão CSV existente (linha ~226), chamando `exportToJSON(workouts)`.

### Critério de Aceite
- Botão "Exportar JSON" visível na tela de histórico.
- Clique gera download de arquivo `.json` com todos os registros de treino.

---

## 4. Planos Circuito — Melhorar Execução

**Arquivo afetado:** `src/components/screens/ExecutePlannedWorkout.tsx`, `src/types.ts`

### Conceito
Em um circuito, os exercícios são executados **em sequência sem pausa entre eles**. O descanso ocorre **ao final de cada ciclo completo** (todas as estações) — não entre exercícios individuais. Além disso, durante a execução cada exercício precisa exibir claramente **o que fazer**, substituindo (ou complementando) a prévia TAF pela instrução de execução real.

### Problemas atuais
1. O descanso é tratado como inter-exercício, quando deveria ser inter-ciclo.
2. Aquecimento e alongamento entram no fluxo do circuito, distorcendo a contagem.
3. O card de cada exercício exibe a "previsão TAF" (regras oficiais do teste), mas não mostra as instruções práticas de execução: se é até a falha, se há tempo máximo, meta de repetições, etc.

### Solução

#### 4a. Estrutura de fases
Ao carregar um plano `circuito_taf` ou `simulado`, separar os exercícios em três fases antes de renderizar:

| Fase | Critério |
|------|----------|
| Aquecimento | `exercicioId === 'custom_aq'` |
| Circuito | todos os demais |
| Alongamento | `exercicioId === 'custom_along'` |

Renderizar cada fase com cabeçalho visual distinto. Aquecimento e alongamento ficam fora da contagem de ciclos.

#### 4b. Descanso ao fim do ciclo (não entre exercícios)
- Remover o acionamento automático do rest timer ao concluir um exercício individual dentro do circuito.
- Ao finalizar a **última estação do ciclo**, iniciar o timer de descanso com o valor de `tempoDescansoCircuito` (campo a adicionar em `Plano`, padrão sugerido: 60s).
- Enquanto o descanso inter-ciclo estiver rodando, bloquear o início do próximo ciclo (aproveitar `restingCardIdx`).

#### 4c. Card de instrução de execução
Substituir (ou colocar antes) a prévia TAF por um bloco de **instruções práticas do exercício**. Hierarquia de informação dentro do card:

1. **Nome do exercício** + modalidade (badge existente).
2. **Meta de execução** — derivada dos campos do `ExercicioNoPlano`:
   - Se `repeticoesPlanejadas > 0` → "X reps" (ou "Até a falha" se marcado).
   - Se `tempoPlanejadoSegundos > 0` → "X s" com timer.
   - Se ambos → mostrar os dois.
3. **Timer de início (5 s)** — quando o exercício tem `tempoPlanejadoSegundos`, ao clicar em "Iniciar" exibir uma contagem regressiva de 5 s antes de começar o timer principal do exercício. Isso dá tempo de se posicionar.
4. **Indicador "ATÉ A FALHA"** — adicionar campo booleano `ateAFalha?: boolean` em `ExercicioNoPlano`. Se `true`, exibir badge vermelho "ATÉ A FALHA" e não exigir preenchimento de repetições para salvar a série.
5. **Observações do plano** (`observacoesPlano`) — exibir abaixo da meta, se preenchido.
6. **Prévia TAF / regras oficiais** — manter, mas rebaixar para seção colapsável "Regras TAF ▾", visível apenas sob demanda.

#### 4d. Campos novos em `ExercicioNoPlano` (`src/types.ts`)
```ts
ateAFalha?: boolean;          // se true, sem meta de reps obrigatória
```

#### 4e. Campo novo em `Plano` (`src/types.ts`)
```ts
tempoDescansoCircuito?: number;  // segundos de descanso ao fim de cada ciclo
```

### Critério de Aceite
- Aquecimento e alongamento aparecem em seções separadas e não contam como estações do circuito.
- O timer de descanso só dispara ao concluir a **última estação do ciclo**, não entre exercícios.
- Cada card exibe meta de execução (reps, tempo ou falha) de forma proeminente.
- Exercícios com `tempoPlanejadoSegundos` exibem contagem regressiva de 5 s antes do timer principal ao clicar em "Iniciar".
- Exercícios com `ateAFalha: true` exibem badge "ATÉ A FALHA" e permitem salvar série sem preencher reps.
- A seção de regras TAF fica colapsada por padrão.

---

## 5. Executar Plano — Inputs mm:ss e Bloqueio de Descanso

**Arquivo afetado:** `src/components/screens/ExecutePlannedWorkout.tsx`

### Problema
- Inputs de tempo aceitam somente segundos brutos, sem formato amigável.
- O card de descanso pode estar minimizado e o usuário consegue iniciar outro exercício mesmo com descanso rolando.
- O tempo de descanso só aparece no card expandido.

### Solução

#### 5a. Input mm:ss
1. Criar componente interno `TimeInput` (ou função helper) que exibe um campo no formato `MM:SS`.
2. Ao mudar o valor, converter `MM:SS` → segundos para armazenar no estado `tempoSegundos`.
3. Ao exibir, converter segundos → `MM:SS`.
4. Aplicar nos campos de tempo de todas as modalidades com timer (isometria, corrida, cardio_livre).

#### 5b. Descanso visível e bloqueante
1. **Exibir o tempo restante no card fechado (minimizado):** quando `restMinimized === true`, mostrar o contador regressivo em miniatura no header do card (ex.: badge `REST 1:23`).
2. **Bloquear início de exercício:** enquanto `timerActive === true && restingCardIdx !== null`, desabilitar o botão de iniciar série nos demais cards.

### Critério de Aceite
- Campos de tempo exibem e aceitam entrada no formato `MM:SS`.
- Com descanso ativo e card minimizado, o tempo restante aparece no header.
- Nenhum exercício pode ser iniciado enquanto o timer de descanso estiver rodando.

---

## 6. Importação — Prompt ESPC antes do Exemplo

**Arquivo afetado:** `src/components/screens/ImportPlan.tsx`, `src/constants.ts`

### Problema
O botão "Copiar Exemplo" (linha 180 de ImportPlan.tsx) copia o `JSON_EXEMPLO` diretamente, sem contexto de como preencher corretamente cada campo.

### Solução
1. **`src/constants.ts`:** criar uma constante `PROMPT_ESPC` com um prompt no formato ESPC (Estrutura, Solicitação, Parâmetros, Contexto) explicando:
   - O schema esperado (campos obrigatórios vs opcionais).
   - Exemplos de `tipoSessao`, `modalidade`, `nomeSessao`.
   - Regras de preenchimento (ex.: `repeticoesPlanejadas` deve ser número, não string).
2. **`src/components/screens/ImportPlan.tsx`:** ao clicar em "Copiar Exemplo", copiar `PROMPT_ESPC + JSON.stringify(JSON_EXEMPLO)` em vez de só o JSON. Ou adicionar botão separado "Copiar Prompt para IA".

### Critério de Aceite
- O conteúdo copiado inclui o prompt ESPC antes do JSON de exemplo.
- O prompt descreve claramente como preencher cada campo.

---

## 7. Página de Plano — Nova UI Interativa

**Arquivo afetado:** `src/components/screens/ViewPlan.tsx`

### Contexto atual
A `ViewPlan.tsx` já tem accordion por dia e inline edit por exercício — a estrutura funcional existe. O problema é de **hierarquia visual, ritmo e densidade de informação**: tudo tem o mesmo peso, o card de semana parece uma lista genérica, e não há personalidade alinhada ao tom do produto (Brutal · Preciso · Focado).

### Processo recomendado — skill `impeccable`

A skill `impeccable` deve ser invocada em sequência para guiar a redesign sem desperdiçar código:

| Etapa | Comando | O que faz |
|-------|---------|-----------|
| 1 | `npx impeccable shape ViewPlan` | Gera um design brief com wireframe textual, hierarquia de informação e decisões de layout ANTES de escrever código. Requer aprovação explícita antes de avançar. |
| 2 | `npx impeccable critique ViewPlan` | Avalia a UI atual com score heurístico (visual hierarchy, cognitive load, touch targets, copy). Aponta o que está funcionando e o que não está. |
| 3 | `npx impeccable bolder ViewPlan` | Amplifica o design: sem gradiente de texto, sem cards idênticos, sem hero-metric template. Alinha ao tom FORGE. |
| 4 | `npx impeccable layout ViewPlan` | Corrige espaçamento, ritmo vertical e alinhamento. Varia padding intencionalmente em vez de espaçamento uniforme. |
| 5 | `npx impeccable craft ViewPlan` | Implementa o código final com as decisões confirmadas nos passos anteriores. |

> **Importante:** o `craft` só deve rodar após `shape` ter sido aprovado. Nunca direto.

### Diretrizes de design para o brief (shape)

Orientações derivadas do `PRODUCT.md` e das leis do `impeccable` para o contexto ForgePro:

**Registro:** product (app de academia, não landing page).  
**Cor:** estratégia Restrained — neutros tintados com accent `brand` ≤10%. Sem gradient text. Sem glassmorphism decorativo.  
**Tema:** dark obrigatório (academia, luz baixa, tela na mão).  
**Motion:** ease-out-expo em acordeões e transições. Sem bounce.  

**Problemas a atacar no shape:**
1. **Seletor de semana** — as pills atuais têm peso visual igual ao conteúdo. Considerar navegação por swipe horizontal ou um único seletor compacto com seta, liberando espaço vertical.
2. **Card de sessão** — o cabeçalho (nome do dia + badge de tipo) precisa de hierarquia mais forte. `nomeSessao` deve ser o elemento dominante, com `tipoSessao` como badge secundário.
3. **Lista de exercícios** — hoje é uma tabela implícita. Explorar row-layout com número de série destacado como elemento âncora visual (em vez de ícone genérico + texto plano).
4. **Inline edit** — o modo de edição atual entra e sai do mesmo card sem sinalização clara. Deve haver uma transição visual que indica estado ativo de edição (borda `brand`, fundo ligeiramente diferente).
5. **Progressão de carga entre semanas** — atualmente invisível. Adicionar micro-indicador (seta ↑ / ↓ ou `+5kg`) quando o peso planejado difere da semana anterior.

**Anti-referências a evitar (do PRODUCT.md):**  
- Cards idênticos com gradiente SaaS  
- Ícones genéricos sem propósito  
- Hero-metric template (número grande + label pequeno)

### Critério de Aceite
- `impeccable shape` foi rodado e o design brief foi aprovado antes de qualquer código.
- `impeccable critique` foi executado e os pontos levantados foram endereçados.
- A página reflete hierarquia visual clara: semana → sessão → exercícios → séries.
- Micro-indicador de progressão de carga entre semanas implementado.
- Modo de inline edit com sinalização visual de estado ativo.

---

## 8. Histórico — Remover "Consistência Anual 2025"

**Arquivo afetado:** `src/components/screens/History.tsx`

### Problema
A seção "Consistência Anual" (linha 239-245 de History.tsx) exibe um heatmap hardcoded para 2025, que está desatualizado.

### Solução
- **Opção A (simples):** remover completamente o bloco JSX do heatmap anual (linhas ~239 em diante).
- **Opção B (melhor):** tornar o ano dinâmico (`new Date().getFullYear()`), exibindo sempre o ano corrente.

### Critério de Aceite
- A seção "Consistência Anual 2025" não aparece mais (ou exibe o ano atual corretamente).

---

## Ordem de Execução Sugerida

```
Sprint 1 (Quick Wins — baixa complexidade, alto valor)
├── [8] Remover Consistência Anual 2025
├── [2] Remover Foto de Perfil
└── [3] Exportação JSON do Histórico

Sprint 2 (Core UX — fluxo de execução)
├── [5a] Inputs mm:ss em Executar Plano
├── [5b] Descanso visível e bloqueante
└── [6] Prompt ESPC no Copiar Exemplo

Sprint 3 (Estrutura — requer mais planejamento)
├── [1] Dias nominais → nome livre de sessão
└── [4] Circuito — separar fases + descanso mínimo

Sprint 4 (Melhoria contínua)
└── [7] Nova UI da Página de Plano
```

---

## Dependências e Riscos

| Item | Dependência | Risco |
|------|-------------|-------|
| [1] | Migração de dados existentes no Firestore/Dexie com `diaDaSemana` | Alto — dados antigos podem quebrar se o campo for renomeado sem migração |
| [4] | [1] deve estar estável antes de refatorar circuito | Médio |
| [7] | Decisão de UI antes de implementar (avaliar bibliotecas de DnD) | Médio |
| [2] | Verificar se Firebase Auth usa `photoURL` em algum fluxo de login | Baixo |

---

_Relatório gerado com base na análise de `alteracoes.md` e inspeção dos arquivos `src/types.ts`, `src/components/screens/ExecutePlannedWorkout.tsx`, `src/components/screens/History.tsx`, `src/components/screens/UserProfile.tsx`, `src/components/screens/ImportPlan.tsx`, `src/App.tsx` e `src/constants.ts`._
