# Product

## Register

product

## Users

Usuário único: o próprio dono do app. Praticante de musculação, uso pessoal, geralmente com o celular na mão dentro da academia. Sessões curtas e focadas — precisa registrar ou executar um treino rápido sem fricção. Sem tempo para navegar, interface deve responder ao instante em que a atenção é escassa e o corpo está cansado.

## Product Purpose

FORGE é um app PWA mobile-first de acompanhamento e gerenciamento pessoal de treinos de musculação. Permite importar planos, executar treinos guiados, registrar cargas, acompanhar evolução por gráficos e comparar o planejado com o realizado em um calendário. Sucesso = o usuário nunca perde um dado de treino e consegue ver sua progressão de carga ao longo das semanas.

## Brand Personality

**Brutal · Preciso · Focado**

Voz direta, imperativa, sem adornos. Tom de quem já sabe o que precisa fazer e só quer executar. Zero encorajamento vazio. Zero jargão motivacional. Números e fatos.

## Anti-references

- Apps fitness coloridos e amigáveis: Nike Training Club, Peloton — cheerful demais, fofo demais.
- Dashboards SaaS genéricos: hero-metric template, grid de cards idênticos com gradiente, SaaS-cream.
- Interface clínica/médica fria: branco asséptico, ícones genéricos, zero personalidade.

## Strategic Design Principles

1. **Cada pixel serve a uma ação.** Se não está ajudando o usuário a registrar, executar ou revisar — corta.
2. **Dados antes de decoração.** A progressão de carga é a estrela; o chrome deve sumir.
3. **Dark por razão física.** Luz ambiente baixa da academia + tela na mão + foco = dark obrigatório. Não é estética — é ergonomia.
4. **Mobile-first sem concessões.** Touch targets generosos, sem hover states como única affordance.
5. **O silêncio comunica disciplina.** Espaço negativo intencional pesa mais que qualquer elemento decorativo.

## Business Rules

### Modalidades de exercício

Cada exercício tem uma `modalidade` que determina quais métricas são registradas por série:

| Modalidade | Campos registrados |
|---|---|
| `forca_dinamica` (padrão) | repetições + peso (kg) |
| `peso_corporal` | repetições apenas, sem peso |
| `corrida` | distância (metros) + tempo (segundos) → pace calculado em min/km |
| `isometria` | tempo (segundos) + repetições opcionais |
| `cardio_livre` | tempo (segundos) apenas |

Modalidades sem carga (`corrida`, `cardio_livre`, `isometria`) nunca exibem campo de peso. O volume total (`sets × reps × kg`) só é calculado para `forca_dinamica`.

### Sessão de treino

- Estados possíveis: `em_andamento` e `finalizado`. Apenas sessões `finalizado` entram no histórico e nos cálculos de PR.
- Uma sessão pode ser **planejada** (originada de um `Plano`) ou **livre** (criada manualmente).
- Sessões planejadas carregam `planoId`, `semana`, `diaDaSemana` e `tipoSessao` do plano original.
- As séries ficam embutidas no documento da sessão (`series[]`) — não existe subcoleção separada.

### Tipos de sessão TAF

Usado em planos e sessões com `objetivo = 'taf'`:

`forca` | `intervalado` | `circuito_taf` | `corrida_longa` | `descanso` | `simulado` | `prevencao_lesao`

Sessões do tipo `simulado` são marcadas com `simulado: true` no `TAFScore` e não contam como teste oficial.

### Cálculo TAF (IR 001/2024, Anexo F, CBMRS)

Três provas: barra fixa (reps), abdominal remador (reps em 1 min), corrida de 12 min (metros).

Cada prova converte para pontuação 0–10 via lookup em tabela oficial (por sexo biológico e faixa etária).

**Fórmula da nota final:**
```
Nota = (ptsBarra + ptsAbdominal + 2 × ptsCorreida) / 4
```

| Conceito | Nota |
|---|---|
| Excelente | 10.0 |
| Muito Bom | 8.5–9.9 |
| Bom | 7.0–8.4 |
| Regular | 5.0–6.9 |
| Insuficiente | < 5.0 |

Faixas etárias válidas: `18_24`, `25_29`, `30_34`, `35_39`, `40_44`, `45_mais`. Sexo biológico (`M` / `F`) seleciona a tabela correta.

### 1RM estimado

Calculado como média de 4 fórmulas clássicas: Epley, Brzycki, Lander, O'Conner. Válido apenas para séries de 1 a 15 repetições. Fora desse intervalo, retorna o peso registrado sem modificação.

### Projeção de PR

Regressão linear sobre os últimos 8 registros históricos de `pesoMax` por exercício. Requer mínimo de 4 pontos. Retorna `null` se a progressão for zero ou negativa (usuário estagnado ou em deload). A projeção indica peso-alvo e número de semanas estimadas para alcançar o próximo recorde.

### Plano de treino

Estrutura: `semana` (inteiro) + `diaDaSemana` (string) + `nomeTreino` + `exercicios[]`. Suporta `bloco` de periodização (ex.: bloco 1 = semanas 1–4, bloco 2 = semanas 5–8). Planos são importados via JSON e nunca editados diretamente na UI (somente via reimportação).

### Perfil do usuário

Objetivo (`objetivo`) determina o contexto de todos os cálculos e filtros:

- `cutting`: foco em volume e déficit calórico
- `bulking`: foco em progressão de carga e superávit
- `manutencao`: equilíbrio
- `taf`: ativa fluxos TAF (score, simulados, sessões específicas)

### Medidas corporais

Campos opcionais por registro: `pesoKg`, `bracoCm`, `cinturaCm`, `quadrilCm`, `pescocoCm`. Cada entrada é um snapshot com data ISO (YYYY-MM-DD). Exibidos como série temporal em gráficos de evolução.

### Sincronização offline-first

1. Toda escrita é persistida primeiro no IndexedDB (Dexie) — nunca espera a rede.
2. Se online, sincroniza imediatamente para o Firestore.
3. Se offline, a operação entra na `syncQueue` (IndexedDB) e é processada quando a conexão é restaurada.
4. Máximo de 5 tentativas por item. Após isso, o item é descartado com log de aviso.
5. Leituras usam cache local como fallback quando offline.

### Pace (corrida)

Calculado automaticamente a partir de `distanciaMetros` e `tempoSegundos`:

```
pace (min/km) = (tempoSegundos / 60) / (distanciaMetros / 1000)
```

Exibido no formato `MM:SS/km`.

### Integrações com apps terceiros

Não haverá integração com nenhum app ou plataforma externa: sem Strava, Garmin, Apple Health, Google Fit, Zepp Health ou similares. O campo `zeppConnected` no perfil é reservado para uso futuro, mas não está ativo e não deve ser exposto na UI. FORGE é um sistema fechado; todos os dados entram manualmente pelo próprio usuário.

### Progressão de cargas

Não existe progressão automática de carga. O app não sugere, calcula nem aplica aumentos de peso entre sessões. O usuário decide a carga de cada série no momento do treino. O 1RM estimado e a projeção de PR são informações de leitura apenas, nunca usadas para pré-preencher campos ou recomendar valores.
