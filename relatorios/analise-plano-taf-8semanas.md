# Relatório Técnico — Plano TAF 8 Semanas × ForgePro

> **Data:** 08/05/2026 · **Versão:** 2.0 (pós-correções)
> **Escopo:** Comparação fiel entre o texto descritivo do plano de 8 semanas e o JSON gerado para importação; análise do estado atual do serviço; lacunas remanescentes; proposta de JSON corrigido por semana; e roadmap de melhorias para o app.

---

## 1. Estado Atual — O que Já Foi Corrigido

Antes da análise de lacunas, é importante registrar o que foi resolvido nas iterações anteriores de código.

### 1.1 Correções no `importPlanMerge` (`workoutService.ts`)

| Campo | Antes | Depois |
|---|---|---|
| `repeticoesPlanejadas` | Aceita string — quebra cálculos | Sanitizado: `typeof n === 'number' ? n : 0` |
| `exercicioNome` | Catálogo sempre vencia o JSON | JSON explícito tem prioridade; catálogo é fallback |
| `modalidade` | Ignorado | Mapeado para o Firestore |
| `modalidadeTAF` | Ignorado | Mapeado para o Firestore |
| `tempoPlanejadoSegundos` | Ignorado | Mapeado para o Firestore |
| `distanciaPlanejadaMetros` | Ignorado | Mapeado para o Firestore |
| `tipoSessao` | Ignorado | Lido de `diaData.tipoSessao` |
| `bloco` | Ignorado | Lido de `semanaData.bloco` |

### 1.2 Correções no catálogo (`constants.ts`)

| Antes | Depois |
|---|---|
| 10 exercícios, sem `modalidade`, sem `modalidadeTAF` | 35 exercícios com `modalidade`, `modalidadeTAF` e `regrasOficiais` onde aplicável |
| Exercícios TAF ausentes | `custom_b01` (Barra Fixa) e `custom_ab01` (Abdominal Remador) com regras oficiais |
| Sem prevenção individualizada | `custom_ponte01`, `custom_nordic01`, `custom_prancha_perna`, `custom_equil01` |
| Sem ombros, bíceps, panturrilha, mobilidade de quadril | `custom_desenv_halt`, `custom_face_pull`, `custom_band_pull`, `custom_rosca_martelo`, `custom_panturrilha`, `custom_hip_9090`, `custom_pigeon_pose` e mais |

### 1.3 Correção em `ExercicioNoPlano` (`types.ts`)

Campo `modalidadeTAF?` adicionado à interface — permite que as telas acessem o vínculo com a prova TAF com segurança de tipo.

---

## 2. Lacunas Remanescentes no JSON Original

O serviço está preparado para receber dados ricos, **mas o JSON original não os fornece**. Toda a análise a seguir refere-se ao JSON entregue pelo usuário, não ao serviço.

---

### 2.1 `repeticoes` com valor string em 7 exercícios

O serviço sanitiza para `0`, mas isso apaga a intenção do treino. O app não tem como distinguir "zero reps" de "máximo esforço".

**Ocorrências:**

| Semana | Exercício | Valor inválido | Valor correto |
|---|---|---|---|
| 1–4 | Barra Fixa | `"máximo possível"` / `"máx."` | `0` + `obs` explicando esforço máximo |
| 5–7 | Barra Fixa com Lastro | `"6-8"` | `6` (mínimo da faixa) |
| 5–7 | Abdominal Remador Intensivo | `"máx em 45s"` | `0` + `tempoPlanejadoSegundos: 45` |

---

### 2.2 IDs numéricos apontam para exercícios errados

O catálogo tem `id: '1'` = "Supino Reto", `id: '2'` = "Agachamento Livre", `id: '3'` = "Levantamento Terra". O JSON usa esses IDs com nomes e cargas de variantes diferentes.

| ID no JSON | Nome no catálogo (gravado no histórico) | Nome real no treino | Divergência |
|---|---|---|---|
| `1` | Supino Reto | Supino com Halteres / Supino Barra | Diferente |
| `2` | Agachamento Livre | Agachamento Frontal / Agachamento Hack | Diferente |
| `3` | Levantamento Terra | Terra Romeno com Halteres / Barra | Diferente |

**Impacto:** O histórico, os recordes pessoais e os gráficos de progressão ficam vinculados ao nome errado. Um "PR de Terra Romeno" aparece como "Levantamento Terra" nos Records e Progress.

**Correção imediata:**

```json
// ANTES
{ "id": 1, "series": 3, "repeticoes": 10, "peso": 40 }

// DEPOIS
{ "id": "custom_agach_front", "nome": "Agachamento Frontal", "grupoMuscular": "Quadríceps/Glúteos",
  "modalidade": "forca_dinamica", "series": 3, "repeticoes": 10, "peso": 40 }
```

---

### 2.3 Cinco exercícios colapsados em dois itens de circuito

O JSON representa o "Circuito TAF" e o "Circuito de Prevenção" como um item genérico cada, descartando a capacidade de rastreamento individual.

#### Circuito TAF (3 exercícios → 1 item)

O texto prescreve, por volta: **Barra Fixa 1 min + Abdominal Remador 1 min + Corrida 400m forte**. Com um único item `"Circuito TAF (3 voltas)"` é impossível:
- Registrar reps de barra e abdominal separadamente por volta
- Vincular automaticamente ao TAFScore
- Visualizar a evolução de cada exercício nos gráficos de Progress

#### Circuito de Prevenção (4 exercícios → 1 item)

O texto prescreve: **Ponte de Glúteo + Nordic Hamstring Curl + Prancha com Elevação + Equilíbrio Unipodal**. Com um único item é impossível:
- Rastrear aderência individual (ex.: o atleta pode pular o Nordic)
- Ver evolução do equilíbrio unipodal ao longo das 8 semanas
- Identificar qual exercício de prevenção está sendo negligenciado

---

### 2.4 Quatro exercícios soterrados em `obs` de outros

Os exercícios abaixo aparecem no texto como movimentos com volume próprio, mas foram enterrados no campo `obs` de outro exercício. O app não os rastreia.

| Exercício | Enterrado em | Semanas | ID correto no catálogo |
|---|---|---|---|
| Puxada Polia Alta Pronada | `obs` da Barra Fixa | 1–4 | `custom_polia_alta` |
| Remada Curvada Barra | `obs` da Barra Fixa | 5–8 | `custom_remada_curv` |
| Agachamento Búlgaro | `obs` do Circuito de Prevenção | 5–8 | `custom_agach_bulgaro` |
| Saltos Excêntricos na Barra | `obs` da Barra Fixa | 1–4 (condicional) | `custom_b01` (série adicional com obs) |

---

### 2.5 Nenhum exercício declara `modalidade`

Sem este campo, o serviço armazena `undefined`. O app usa `getModalidade()` que faz fallback para `forca_dinamica` — o que é incorreto para barra, abdominal, prancha, corrida e aquecimento.

**Consequência prática em `ExecutePlannedWorkout`:** o card de entrada de uma série de corrida vai mostrar campos de peso e repetições em vez de distância e tempo.

---

### 2.6 Aquecimento e Alongamento sem tempo estruturado

Todos os aquecimentos estão como `series: 1, repeticoes: 10, peso: 0` — sem sentido para uma atividade de 10 minutos. O app não pode mostrar um cronômetro de aquecimento ou registrar a duração.

---

### 2.7 `tipoSessao` e `bloco` ausentes

Nenhum dos 32 dias do plano declara `tipoSessao` ou `bloco`. O serviço agora os mapeia quando presentes, mas se ausentes no JSON, o Firestore fica sem esses metadados.

**Custo:** a tela de ExecutePlannedWorkout não pode adaptar a interface por tipo de sessão (ex.: mostrar cronômetro de 1 minuto automaticamente no circuito TAF, ou exibir alerta de simulado).

---

## 3. JSON Corrigido — Exemplos por Bloco

### 3.1 Semana 1 — Segunda (padrão de correção aplicável a todas as semanas de força)

```json
{
  "semana": 1,
  "bloco": 1,
  "dias": [
    {
      "dia": "Segunda",
      "nomeTreino": "Força e Resistência Muscular (Base)",
      "tipoSessao": "forca",
      "exercicios": [
        {
          "id": "custom_aq",
          "nome": "Aquecimento + Mobilidade",
          "grupoMuscular": "Full Body",
          "modalidade": "cardio_livre",
          "series": 1,
          "repeticoes": 1,
          "tempoPlanejadoSegundos": 600,
          "peso": 0,
          "obs": "10 min: mobilidade de ombros, escápulas e quadril"
        },
        {
          "id": "custom_b01",
          "nome": "Barra Fixa",
          "grupoMuscular": "Dorsais/Braços",
          "modalidade": "peso_corporal",
          "modalidadeTAF": "barra_fixa",
          "series": 5,
          "repeticoes": 0,
          "peso": 0,
          "obs": "Se <5 reps: 5x máx; se 5-8 reps: 5x5. Queixo acima da barra, sem balanço."
        },
        {
          "id": "custom_polia_alta",
          "nome": "Puxada Polia Alta Pronada",
          "grupoMuscular": "Dorsais",
          "modalidade": "forca_dinamica",
          "series": 2,
          "repeticoes": 13,
          "peso": 50,
          "obs": "Complemento à barra — fortalecimento de base"
        },
        {
          "id": "custom_agach_front",
          "nome": "Agachamento Frontal",
          "grupoMuscular": "Quadríceps/Glúteos",
          "modalidade": "forca_dinamica",
          "series": 3,
          "repeticoes": 10,
          "peso": 40,
          "obs": "Controle total; sem dor no joelho"
        },
        {
          "id": "custom_supino_halt",
          "nome": "Supino com Halteres",
          "grupoMuscular": "Peitoral",
          "modalidade": "forca_dinamica",
          "series": 3,
          "repeticoes": 10,
          "peso": 20,
          "obs": ""
        },
        {
          "id": "custom_terra_rom_halt",
          "nome": "Terra Romeno com Halteres",
          "grupoMuscular": "Posterior/Glúteos",
          "modalidade": "forca_dinamica",
          "series": 3,
          "repeticoes": 12,
          "peso": 30,
          "obs": "Alongamento dos ísquios; costas retas"
        },
        {
          "id": "custom_c01",
          "nome": "Prancha Isométrica",
          "grupoMuscular": "Core",
          "modalidade": "isometria",
          "series": 3,
          "repeticoes": 1,
          "tempoPlanejadoSegundos": 45,
          "peso": 0,
          "obs": "Corpo rígido; quadril neutro"
        }
      ]
    }
  ]
}
```

### 3.2 Semana 1 — Quinta (Circuito TAF expandido)

```json
{
  "dia": "Quinta",
  "nomeTreino": "Específico TAF (Circuito)",
  "tipoSessao": "circuito_taf",
  "exercicios": [
    {
      "id": "custom_aq",
      "nome": "Aquecimento",
      "grupoMuscular": "Full Body",
      "modalidade": "cardio_livre",
      "series": 1,
      "repeticoes": 1,
      "tempoPlanejadoSegundos": 300,
      "peso": 0,
      "obs": "5 min bike ou corda naval + ativação escapular"
    },
    {
      "id": "custom_b01",
      "nome": "Barra Fixa (Circuito)",
      "grupoMuscular": "Dorsais/Braços",
      "modalidade": "peso_corporal",
      "modalidadeTAF": "barra_fixa",
      "series": 3,
      "repeticoes": 0,
      "tempoPlanejadoSegundos": 60,
      "peso": 0,
      "obs": "1 min máx reps por volta; descanso 3 min entre voltas; anotar total por volta"
    },
    {
      "id": "custom_ab01",
      "nome": "Abdominal Remador (Circuito)",
      "grupoMuscular": "Abdominal",
      "modalidade": "peso_corporal",
      "modalidadeTAF": "remador_abdominal",
      "series": 3,
      "repeticoes": 0,
      "tempoPlanejadoSegundos": 60,
      "peso": 0,
      "obs": "1 min máx reps por volta; cotovelos tocam joelhos; retorno completo ao solo"
    },
    {
      "id": "custom_r01",
      "nome": "Corrida 400m (Circuito)",
      "grupoMuscular": "Cardio",
      "modalidade": "corrida",
      "series": 3,
      "repeticoes": 1,
      "distanciaPlanejadaMetros": 400,
      "peso": 0,
      "obs": "Ritmo forte; anotar tempo de cada 400m"
    },
    {
      "id": "custom_along",
      "nome": "Alongamento Final",
      "grupoMuscular": "Flexibilidade",
      "modalidade": "cardio_livre",
      "series": 1,
      "repeticoes": 1,
      "tempoPlanejadoSegundos": 420,
      "peso": 0,
      "obs": "5-10 min ênfase posterior de coxa e peitoral"
    }
  ]
}
```

### 3.3 Sábado — Circuito de Prevenção expandido (aplicável semanas 1–8)

```json
{
  "id": "custom_ponte01",
  "nome": "Ponte de Glúteo com Mini Band",
  "grupoMuscular": "Glúteos",
  "modalidade": "peso_corporal",
  "series": 2,
  "repeticoes": 20,
  "peso": 0,
  "obs": "Mini band acima dos joelhos; apertar glúteos no topo"
},
{
  "id": "custom_nordic01",
  "nome": "Nordic Hamstring Curl (Excêntrico)",
  "grupoMuscular": "Posterior de Coxa",
  "modalidade": "peso_corporal",
  "series": 2,
  "repeticoes": 7,
  "peso": 0,
  "obs": "Descida excêntrica controlada (3-4 seg); parcial se necessário"
},
{
  "id": "custom_prancha_perna",
  "nome": "Prancha com Elevação Alternada de Perna",
  "grupoMuscular": "Core/Glúteos",
  "modalidade": "peso_corporal",
  "series": 2,
  "repeticoes": 10,
  "peso": 0,
  "obs": "10 elevações por perna; quadril estável"
},
{
  "id": "custom_equil01",
  "nome": "Equilíbrio Unipodal (Olhos Fechados)",
  "grupoMuscular": "Estabilização",
  "modalidade": "isometria",
  "series": 2,
  "repeticoes": 1,
  "tempoPlanejadoSegundos": 30,
  "peso": 0,
  "obs": "30 seg por perna; superfície firme"
}
```

---

## 4. Mapeamento Completo — Texto vs. JSON vs. Estado do App

| # | Elemento do plano textual | Status no JSON original | Status no app (pós-correções) |
|---|---|---|---|
| Aquecimento 10 min com tempo | `repeticoes: 10` (sem sentido) | ⚠️ JSON incorreto | ✅ Serviço aceita `tempoPlanejadoSegundos` |
| Barra Fixa — reps máximas | `"máximo possível"` (string) | ❌ Tipo quebrado | ✅ Serviço sanitiza para `0` |
| Barra Fixa — `modalidadeTAF` | Ausente | ❌ TAFScore não vincula | ✅ Catálogo tem; serviço mapeia |
| Puxada Polia Alta (complemento) | Dentro de `obs` da Barra Fixa | ❌ Não rastreado | ✅ ID `custom_polia_alta` disponível |
| Agachamento Frontal | `id: 2` → "Agachamento Livre" | ❌ Nome errado no histórico | ✅ ID `custom_agach_front` disponível |
| Supino com Halteres | `id: 1` → "Supino Reto" | ❌ Nome errado no histórico | ✅ ID `custom_supino_halt` disponível |
| Terra Romeno | `id: 3` → "Levantamento Terra" | ❌ Nome errado no histórico | ✅ IDs `custom_terra_rom_halt/barra` disponíveis |
| Prancha Isométrica — tempo | `repeticoes: 45` (sem campo tempo) | ⚠️ Interpretado como reps | ✅ Serviço aceita `tempoPlanejadoSegundos` |
| Corrida Intervalada — distância | `repeticoes: 400` (sem campo distância) | ⚠️ Parcialmente correto | ✅ Serviço aceita `distanciaPlanejadaMetros` |
| Corrida Contínua — duração | `repeticoes: 25` (sem campo tempo) | ⚠️ Interpretado como reps | ✅ Serviço aceita `tempoPlanejadoSegundos` |
| Circuito TAF — 3 exercícios | 1 item genérico | ❌ Sem rastreamento individual | ✅ 3 IDs disponíveis no catálogo |
| Abdominal Remador — regras | Apenas em `obs` | ⚠️ Visível mas não oficial | ✅ `regrasOficiais` no catálogo |
| Circuito Prevenção — 4 exercícios | 1 item genérico | ❌ Sem rastreamento individual | ✅ 4 IDs disponíveis no catálogo |
| Agachamento Búlgaro | Dentro de `obs` da Prevenção | ❌ Não rastreado | ✅ ID `custom_agach_bulgaro` disponível |
| `tipoSessao` por dia | Ausente | ❌ Filtros inutilizáveis | ✅ Serviço mapeia quando presente |
| `bloco` por semana | Ausente | ❌ Sem diferenciação Bloco 1/2 | ✅ Serviço mapeia quando presente |
| Remada Curvada (complemento Bloco 2) | Dentro de `obs` da Barra | ❌ Não rastreado | ✅ ID `custom_remada_curv` disponível |
| Barra com Lastro (Bloco 2) | `id: "custom_b02"` (inexistente) | ❌ ID não existe no catálogo | ⚠️ Seria criado como exercício novo — mas `custom_b01` com `obs` basta |

---

## 5. Cobertura de Grupos Musculares

### 5.1 Grupos presentes no plano e no catálogo

| Grupo Muscular | Exercícios no Plano | IDs Disponíveis no Catálogo |
|---|---|---|
| Dorsais/Braços | Barra Fixa, Puxada Polia | `custom_b01`, `custom_polia_alta` |
| Costas | Remada Curvada | `custom_remada_curv` |
| Peitoral | Supino Halteres, Supino Barra | `custom_supino_halt`, `custom_supino_barra` |
| Quadríceps/Glúteos | Agachamento Frontal, Hack, Búlgaro | `custom_agach_front`, `custom_agach_hack`, `custom_agach_bulgaro` |
| Posterior de Coxa | Terra Romeno, Nordic Curl | `custom_terra_rom_halt`, `custom_terra_rom_barra`, `custom_nordic01` |
| Glúteos | Ponte de Glúteo | `custom_ponte01` |
| Core | Prancha Isométrica, c/ Peso, c/ Elevação | `custom_c01`, `custom_c02`, `custom_prancha_perna` |
| Abdominal | Abdominal Remador | `custom_ab01` |
| Estabilização | Equilíbrio Unipodal | `custom_equil01` |
| Cardio | Corridas + Aquecimento | `custom_aq`, `custom_r01–r04` |

### 5.2 Grupos adicionados ao catálogo mas ausentes no plano atual

| Grupo | Exercícios disponíveis | Justificativa para incluir |
|---|---|---|
| Ombros | `custom_desenv_halt`, `id: 4` (Dev. Militar) | Sustentação da postura na barra; alívio de tensão cervical na corrida |
| Rotadores Escapulares | `custom_face_pull`, `custom_band_pull` | Previne impingement de ombro com volume alto de barra — crítico após semana 4 |
| Bíceps isolado | `custom_rosca_martelo`, `id: 6` (Rosca Direta) | Força de curl reforça a fase inicial de pull-up; previne tendinopatia de bíceps |
| Panturrilha | `custom_panturrilha`, `custom_panturrilha_halt` | Absorção de impacto; redução de risco de canelite em volume crescente de corrida |
| Mobilidade de Quadril | `custom_hip_9090`, `custom_pigeon_pose` | O plano cita "mobilidade de quadril" no aquecimento mas nunca a formaliza como exercício rastreável |

---

## 6. Roadmap de Melhorias para o App

### 6.1 Melhorias de alta prioridade

#### 6.1.1 Timer automático por modalidade no ExecutePlannedWorkout

O app já lê `tempoPlanejadoSegundos`, mas não mostra automaticamente um cronômetro regressivo ao iniciar um exercício de modalidade `isometria` ou `cardio_livre`. A proposta:
- Ao abrir o card de série, se `modalidade === 'isometria'` e `tempoPlanejadoSegundos > 0`, iniciar um timer visual (círculo de progresso animado)
- Ao finalizar o timer, registrar a série automaticamente com o tempo como `tempoSegundos`
- Para `cardio_livre`, mostrar cronômetro progressivo (crescente)

#### 6.1.2 Detecção de sessão TAF e modo circuito

Quando `tipoSessao === 'circuito_taf'` ou `'simulado'`, o app poderia:
- Agrupar os exercícios visualmente como voltas (não como lista linear)
- Mostrar um contador de voltas completadas
- No modo `simulado`: apresentar cada exercício em sequência forçada, com aviso de "Agora barra fixa — 1 tentativa", bloqueando a ordem incorreta

#### 6.1.3 Widget de progresso TAF no Dashboard

Hoje o Dashboard tem o calendário planejado vs. realizado. Falta um widget que mostre:
- Última pontuação TAF simulada × meta (Muito Bom)
- Barra de progresso por disciplina (Barra Fixa / Abdominal / Corrida)
- Projeção: "No ritmo atual, você atingirá a meta na semana X"

Dados já existem nos `TAFScore` e `TAF_METAS_MUITO_BOM`.

---

### 6.2 Melhorias de média prioridade

#### 6.2.1 Filtro de sessões por `tipoSessao` na tela History

A tela History lista workouts por data. Com `tipoSessao` populado, seria possível filtrar por tipo: "ver só os simulados", "ver só os intervalados", "ver só os de força". Isso permite avaliar consistência por tipo de estímulo.

#### 6.2.2 Comparação de bloco no Progress

A tela Progress tem gráficos de evolução por exercício e volume por grupo muscular. Com o campo `bloco` disponível, seria possível adicionar uma aba "Bloco 1 vs. Bloco 2" que compara volume e intensidade médios entre os dois blocos de 4 semanas — feedback direto sobre o efeito da periodização.

#### 6.2.3 Validação de `regrasOficiais` na série

Ao registrar uma série de `custom_ab01` ou `custom_b01`, exibir uma tooltip ou modal com as `regrasOficiais` do exercício antes de confirmar. Reduz reps inválidas no treino (e no simulado).

#### 6.2.4 Exportação do JSON com campos completos

A exportação atual (`exportPlan`) serializa os dados do Firestore. Com os novos campos mapeados, a exportação já virá mais rica. Porém, o JSON exportado usa os IDs do Firestore (gerados automaticamente), não os IDs semânticos (`custom_b01`). Seria útil manter o ID semântico num campo separado (`catalogId`) para que o JSON exportado seja reimportável.

#### 6.2.5 Onboarding de importação com preview

Ao colar o JSON na tela ImportPlan, antes de processar, mostrar um preview visual:
- Quantas semanas serão importadas
- Lista de exercícios novos que serão criados no catálogo
- Alerta de exercícios com IDs inválidos ou `repeticoes` string
- Confirmação "Importar" só fica ativa se não houver erros críticos

---

### 6.3 Melhorias de baixa prioridade / roadmap futuro

#### 6.3.1 Progressão automática de carga

O plano de 8 semanas já define cargas crescentes por semana (ex.: Agachamento Frontal: 40 → 42,5 → 45 → 47,5 kg). O app poderia aprender esse padrão e sugerir automaticamente a carga da próxima sessão com base na progressão planejada e no histórico real.

#### 6.3.2 Detecção de `repeticoes` string na importação

Adicionar validação no `importPlanMerge` que, além de sanitizar para `0`, registra um aviso acessível ao usuário (ex.: um array de warnings retornado junto com o resultado) para que o importador saiba exatamente quais campos foram sanitizados.

#### 6.3.3 Módulo de prevenção dedicado

A tela atual foca em treinos de força e TAF. Um módulo de "Prevenção & Mobilidade" poderia:
- Rastrear especificamente os 4 exercícios do circuito de prevenção semana a semana
- Alertar se o atleta pulou mais de 2 sessões de prevenção seguidas (risco de lesão elevado)
- Exibir gráfico de aderência ao circuito de prevenção separado do volume de força

#### 6.3.4 Suporte a faixa etária dinâmica no TAFScore

Hoje as tabelas TAF estão hardcoded para masculino 25-29 anos. O `Profile` tem `objetivo: 'taf'` mas não tem `faixaEtaria` ou `sexo`. Adicionar esses campos ao perfil e usar tabelas corretas por faixa ampliaria o uso do app para outros candidatos.

#### 6.3.5 Integração com o corredor — GPS / esteira

O campo `distanciaMetros` já existe em `WorkoutSeries`. Integrar com a API de Geolocalização do browser (ou futuramente com Zepp Health, já reservado em `Profile.zeppConnected`) permitiria registrar corridas reais com distância e pace automáticos, sem entrada manual.

---

## 7. Checklist Final de Ações

### No JSON (responsabilidade do gerador/usuário)

| Prioridade | Ação |
|---|---|
| 🔴 Alta | Substituir `id: 1/2/3` pelos IDs semânticos corretos (`custom_agach_front`, `custom_supino_halt`, etc.) |
| 🔴 Alta | Corrigir `repeticoes` string → number (barra: `0`, range "6-8": `6`, "45s": `0` + `tempoPlanejadoSegundos: 45`) |
| 🔴 Alta | Expandir circuito TAF em 3 entradas separadas + circuito de prevenção em 4 entradas |
| 🔴 Alta | Extrair Puxada Polia, Remada Curvada e Agachamento Búlgaro de `obs` para entradas próprias |
| 🟡 Média | Adicionar `modalidade` a todos os exercícios |
| 🟡 Média | Adicionar `tempoPlanejadoSegundos` a Prancha, Aquecimento, Corrida Contínua, Equilíbrio |
| 🟡 Média | Adicionar `distanciaPlanejadaMetros` a todas as corridas intervaladas |
| 🟡 Média | Adicionar `tipoSessao` por dia e `bloco` por semana |
| 🟡 Média | Adicionar `modalidadeTAF` nos exercícios de barra e abdominal |
| 🟠 Baixa | Considerar adicionar 1-2 exercícios de ombro/rotadores escapulares nas sessões de força a partir da semana 3 |
| 🟠 Baixa | Formalizar exercícios de mobilidade de quadril no aquecimento das terças e quintas |

### No App (backlog de desenvolvimento)

| Prioridade | Ação |
|---|---|
| 🔴 Alta | Timer automático por modalidade no ExecutePlannedWorkout |
| 🔴 Alta | Modo circuito / simulado TAF com agrupamento visual por volta |
| 🟡 Média | Widget de progresso TAF no Dashboard com projeção de meta |
| 🟡 Média | Filtro por `tipoSessao` na tela History |
| 🟡 Média | Preview de importação com validação antes de processar |
| 🟡 Média | Comparação Bloco 1 vs. Bloco 2 na tela Progress |
| 🟡 Média | Exibir `regrasOficiais` ao registrar série de exercício TAF |
| 🟠 Baixa | Módulo de Prevenção & Mobilidade com rastreamento de aderência |
| 🟠 Baixa | Progressão automática de carga baseada no plano e histórico |
| 🟠 Baixa | `faixaEtaria` + `sexo` no Profile para tabelas TAF dinâmicas |
| 🟠 Baixa | Integração GPS / Zepp Health para corridas com pace automático |


---

