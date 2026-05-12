# ForgePro — Relatório de UX e Qualidade de Interface
**Versão:** 2.0 — 12 de maio de 2026
**Metodologia:** Revisão de código-fonte completa (13 screens + sistema de design) + Avaliação heurística Nielsen (10 critérios) + Teste de carga cognitiva + Análise de personas de uso + Persona específica do produto

---

## Sumário Executivo

O ForgePro tem uma identidade visual sólida e decisões técnicas corretas: dark mode motivado por ergonomia de academia, tipografia tripartite funcional e um sistema de retomada de sessão de treino que é vantagem competitiva real. A pontuação geral nas heurísticas de usabilidade foi **25/40** — acima da média para produtos desta categoria, mas com problemas específicos que impactam diretamente o critério de sucesso do produto ("o usuário nunca perde um dado de treino").

Os problemas encontrados estão organizados por impacto real no usuário, do mais crítico ao cosmético.

---

## Pontuação por Heurística

| # | Critério | Nota | Observação |
|---|---|---|---|
| 1 | Visibilidade do sistema | 3/4 | `useToast` implementado apenas em History e UserProfile; ausente nos screens críticos de treino |
| 2 | Linguagem do usuário | 3/4 | Português correto; sigla "TAF" sem glossário; typo em UserProfile: "Primeiro acesso é configure..." |
| 3 | Controle e liberdade | 3/4 | `onBack` em todos os sub-screens; ViewPlan confirma delete; LogWorkout e ExecutePlannedWorkout não confirmam |
| 4 | Consistência visual | 2/4 | Classe `input-field` em TAFScore não existe no CSS; `form-input` nos outros screens; `rounded-xl` e `rounded-lg` misturados |
| 5 | Prevenção de erros | 2/4 | TAFScore tem `min={0}` nos campos; LogWorkout não valida; peso corporal = 0 invalida 1RM silenciosamente |
| 6 | Reconhecimento vs. memorização | 3/4 | Valores anteriores pré-preenchidos na execução; heatmap sem legenda de intensidade |
| 7 | Eficiência para usuários avançados | 2/4 | History tem seleção em lote; sem atalhos; ExecutePlannedWorkout exige 4 toques para iniciar |
| 8 | Design minimalista | 3/4 | Bom foco; contaminado por nav de 7 itens e textos de 8-9px em dados |
| 9 | Recuperação de erros | 2/4 | `catch` silenciosos na maioria dos screens; apenas UserProfile e History têm toast |
| 10 | Ajuda e documentação | 1/4 | Records e TAFScore têm banners de contexto; restante dos screens não orienta em estado vazio |
| **Total** | | **25/40** | |

---

## Problemas Encontrados e Ideias de Solução

---

### 1. Classe CSS `input-field` indefinida em TAFScore — Campos sem estilo

**Impacto:** Crítico — campos de entrada da tela mais sensível do produto podem estar sem estilo

**Descrição:**
`TAFScore.tsx` usa a classe `input-field` em todos os campos de entrada de resultados. Porém, `input-field` não está definida em `index.css` — apenas `form-input` existe. Todos os outros 12 screens usam `form-input`. Isso significa que os campos de barra fixa, abdominal e corrida de 12 minutos provavelmente recebem apenas o estilo base do navegador: sem background, sem border consistente, sem focus ring da brand.

**Arquivo:** `src/components/screens/TAFScore.tsx`

**Ideias de solução:**
- Substituir todas as ocorrências de `input-field` por `form-input` em `TAFScore.tsx`.
- Ou, se `input-field` foi intencionalmente diferente, defini-la em `index.css` e documentar a distinção.
- Adicionar busca no CI por classes CSS não reconhecidas para evitar regressões futuras.

---

### 2. Falhas de save silenciosas na maioria dos screens — Risco de perda de dados

**Impacto:** Crítico — contradiz o critério de sucesso do produto

**Descrição:**
`useToast` foi implementado em **History** e **UserProfile**, mas está ausente nos screens críticos. Em `LogWorkout.handleFinish` e em `ExecutePlannedWorkout`, blocos `catch` capturam erros e os descartam com `console.error()` sem nenhum feedback ao usuário. Se o Firebase retornar erro por timeout, token expirado ou problema de rede, o usuário vê a tela de "Treino Salvo!" sem saber que os dados não foram persistidos.

**Arquivos:** `src/components/screens/LogWorkout.tsx`, `src/components/screens/ExecutePlannedWorkout.tsx`, `src/components/screens/TAFScore.tsx`

**Ideias de solução:**
- Expandir o `useToast` (já em `appStore.ts`) para todos os screens que fazem operações de save.
- Em caso de falha: "Falha ao salvar. Dados retidos localmente — tente novamente."
- Usar a flag `isOnline` existente: se offline, "Sem conexão — salvo localmente. Sincronização automática ao reconectar."
- Para operações críticas (finalizar treino, salvar score TAF), adicionar **retry explícito** com botão "Tentar novamente", em vez de descartar silenciosamente.
- Garantir que o Dexie sempre receba o dado antes da tentativa Firebase.

---

### 3. Navegação mobile com 7 abas — Sobrecarga cognitiva

**Impacto:** Alto — afeta todas as sessões de treino

**Descrição:**
O menu inferior contém 7 abas simultâneas: Início, Histórico, Plano, Progresso, TAF, Recordes e Prevenção. Pesquisas de usabilidade (Miller/Cowan) estabelecem que humanos processam no máximo 4 itens em memória de trabalho. Com 7 abas em 375px, cada aba tem aproximadamente 54px — alvos de toque borderline para uso com uma mão dentro da academia.

Adicionalmente, há 3 zonas de navegação concorrentes: bottom nav, FAB flutuante e dropdown de avatar no topo.

**Arquivo:** `src/App.tsx`

**Ideias de solução:**
- Reduzir o bottom nav para **4 abas fixas**: Início, Histórico, Progresso e "Mais".
- A aba "Mais" abre um **bottom sheet** com as seções secundárias: Plano, TAF, Recordes, Prevenção, Medidas e Importar.
- O FAB de "Novo Treino" permanece como ação primária flutuante.
- Isso reduz o esforço de decisão de 7 para 4 opções — dentro do limite cognitivo recomendado.

---

### 4. Textos de 8-9px em dados relevantes — Ilegibilidade em academia

**Impacto:** Alto — afeta leitura de dados durante o treino

**Descrição:**
Casos críticos encontrados na revisão completa:

- `text-[8px]` no span `←evolução` no widget TAF do Dashboard
- `fontSize: 8` e `fontSize: 9` inline no `CalendarHeatmap` de History
- `text-[9px]` nos headers da tabela de Prevenção
- `text-[10px]` no parágrafo de legenda de 1RM em Records

8px equivale a aproximadamente 6pt — abaixo do limite de legibilidade de qualquer fonte. Para um usuário com mãos suadas e tela com brilho médio, esses textos tornam-se invisíveis.

**Arquivos:** `src/components/screens/Dashboard.tsx`, `src/components/screens/History.tsx`, `src/components/screens/Prevention.tsx`, `src/components/screens/Records.tsx`

**Ideias de solução:**
- Estabelecer **floor absoluto de 11px** para qualquer texto que carregue informação de valor.
- Tudo abaixo de 10px deve ser substituído por ícone (sem label) ou removido.
- Heatmap: substituir labels de 8px por `title` attribute (tooltip nativo) e manter label do mês em 10px.
- Widget TAF do Dashboard: substituir o span `←evolução` por ícone de seta com `aria-label`.
- Tabela de Prevenção: usar apenas ícones com tooltip nos headers, sem texto de 9px.

---

### 5. FAB "Novo Treino" não cobre o fluxo de plano

**Impacto:** Alto — afeta o fluxo mais frequente do produto

**Descrição:**
O FAB dispara `LogWorkout` (treino livre). Para quem usa plano de treino — o fluxo mais sofisticado e provavelmente o mais frequente para usuários ativos — o FAB não faz nada útil. O caminho para executar um treino planejado exige: Dashboard, localizar card "Executar Plano", selecionar semana, selecionar dia, iniciar. São 4 interações antes de ver o primeiro exercício.

**Arquivo:** `src/App.tsx`

**Ideias de solução:**
- Se o usuário tiver plano ativo, o FAB exibe um **bottom sheet** rápido: "Executar Plano" ou "Treino Livre".
- Ou: detectar treino do plano previsto para hoje e exibir no Dashboard um card prioritário "Hoje: Treino A — 6 exercícios [Iniciar]" que elimina a seleção de semana/dia.
- O caminho de 4 interações reduz para 2 sem mudança de arquitetura.

---

### 6. Ações destrutivas sem confirmação

**Impacto:** Médio — risco de perda de dado por toque acidental

**Descrição:**
Remover série em `LogWorkout` e `ExecutePlannedWorkout` não exige confirmação. Um toque acidental durante o intervalo de descanso desfaz um registro completado sem recuperação. `ViewPlan` implementa confirmação de delete corretamente — mas a mesma lógica não foi replicada no fluxo de treino.

"Finalizar Treino" em `ExecutePlannedWorkout` também não confirma, apesar de mudar o status de `em_andamento` para `finalizado` irreversivelmente.

**Arquivos:** `src/components/screens/LogWorkout.tsx`, `src/components/screens/ExecutePlannedWorkout.tsx`

**Ideias de solução:**
- Para **remover série**: undo temporário (banner por 3-5 segundos com opção de desfazer), sem modal bloqueante.
- Para **Finalizar Treino**: bottom sheet de confirmação com resumo da sessão (N exercícios, N séries, N minutos) e botão "Confirmar e Finalizar". Serve também como reforço positivo.

---

### 7. Heatmap anual inacessível em mobile

**Impacto:** Médio — funcionalidade de destaque fica inutilizável em mobile

**Descrição:**
O `CalendarHeatmap` em `History.tsx` é construído com posicionamento absoluto em pixels fixos (`CELL = 10px`, `GAP = 2px`). Um ano completo (52 semanas) ocupa aproximadamente 624px de largura — mais que qualquer tela mobile em retrato. O `overflow-x-auto` existe, mas scroll horizontal em elemento interno não é descoberto naturalmente.

Labels de dia usam `fontSize: 8` e de mês `fontSize: 9` em inline styles — ilegíveis em qualquer tela.

**Arquivo:** `src/components/screens/History.tsx`

**Ideias de solução:**
- Em mobile (viewport < 640px), trocar o heatmap anual por **visão de 12 semanas rolável verticalmente** — mais legível e mais relevante para o uso imediato.
- No desktop, manter o heatmap anual mas aumentar `CELL` para 12px e `GAP` para 3px.
- Substituir `fontSize: 8` por classe `text-[10px]` (floor mínimo).
- Adicionar legenda de intensidade: `0 · 1 · 2 · 3+` com os quadrados coloridos correspondentes.

---

### 8. Perfil TAF incompleto não gera alerta em TAFScore

**Impacto:** Médio — nota calculada pode estar errada sem o usuário saber

**Descrição:**
Se o usuário não configurou sexo e faixa etária em UserProfile, `calcularResultadoTAFComPerfil` usa valores padrão silenciosamente. A nota calculada pode ser de uma tabela errada, e o usuário não recebe nenhum aviso.

O toggle "É um simulado?" tem `simulado: true` como default — se o usuário esquecer de desmarcar, uma prova oficial é registrada como simulado e não entra na progressão oficial.

**Arquivo:** `src/components/screens/TAFScore.tsx`

**Ideias de solução:**
- Exibir acima do formulário: "Tabela em uso: [Sexo] · [Faixa etária]". Se não configurado, exibir alerta com link para o perfil.
- Mudar default do toggle para `false` (prova oficial) com label mais claro: "Marcar como simulado (não conta como resultado oficial)."

---

### 9. Empty states sem orientação em Progress e Prevention

**Impacto:** Médio — usuário novo não sabe o que fazer

**Descrição:**
`Records.tsx` tem empty state adequado com CTA. `TAFScore.tsx` também. Mas em `Progress.tsx` (aba Evolução sem exercício selecionado, aba Blocos sem dados) e em `Prevention.tsx` sem histórico, o usuário vê a tela em branco sem orientação.

**Arquivos:** `src/components/screens/Progress.tsx`, `src/components/screens/Prevention.tsx`

**Ideias de solução:**
- Progress/Evolução: "Selecione um exercício acima para ver a curva de progressão de carga."
- Progress/Blocos: "Os blocos aparecem depois de treinos nas semanas 1-4 (bloco 1) e 5+ (bloco 2)."
- Prevention sem histórico: "Nenhum exercício de prevenção registrado ainda." + botão "Registrar Treino".
- CTAs devem ser botões que naveguem para a ação correspondente — não só texto.

---

### 10. Typo em UserProfile e labels de screen frágeis

**Impacto:** Baixo-médio — credibilidade do produto

**Descrição:**
Em `UserProfile.tsx`, o banner de primeiro acesso diz: "Primeiro acesso é configure seu perfil..." — erro gramatical.

Na nav desktop em `App.tsx`, um ternário encadeado traduz labels de screen. Novos screens adicionados sem atualizar esse ternário aparecem com a string bruta do enum (ex: `'manage-workouts'`).

**Arquivos:** `src/components/screens/UserProfile.tsx`, `src/App.tsx`

**Ideias de solução:**
- Corrigir o typo: "Configure seu perfil para personalizar a sua experiência."
- Extrair mapa de labels para constante em `constants.ts`:
  ```ts
  const SCREEN_LABELS: Partial<Record<Screen, string>> = {
    home: 'Início', plan: 'Plano', history: 'Histórico', ...
  };
  ```

---

### 11. Cores em hexadecimal sem tinting de neutros

**Impacto:** Baixo-médio — cosmético, mas afeta coesão de identidade

**Descrição:**
Tokens de cor em hexadecimal puro: `#0A0A0A` (background), `#111111` (surface). Neutros sem saturação resultam em "tema escuro genérico". Light mode sobrescreve classes do Tailwind diretamente, o que é frágil em produção.

**Arquivos:** `src/index.css`, `src/theme.css`

**Ideias de solução:**
- Migrar tokens para OKLCH com tinting sutil:
  - `--color-background: oklch(8% 0.006 125)`
  - `--color-surface: oklch(10% 0.005 125)`
  - `--color-brand: oklch(92% 0.28 125)`
- Light mode via CSS custom properties sobrescrita por seletor de classe em vez de utilitários do Tailwind.

---

### 12. Animação `forge-pop` com overshoot e indicador de status pulsando

**Impacto:** Baixo — cosmético, mas contradiz o brand "brutal · preciso"

**Descrição:**
`@keyframes forge-pop` tem keyframe em 65% com `transform: scale(1.1)` — overshoot que produz efeito bounce. O design system proíbe bounce explicitamente.

O badge de status usa `animate-pulse` permanentemente no estado online — pulse contínuo perde significado semântico (pulso = atividade, não estado estável).

**Arquivo:** `src/index.css`, `src/App.tsx`

**Ideias de solução:**
- `forge-pop`: remover o keyframe de 65%. Ir de `scale(0.8); opacity: 0` para `scale(1); opacity: 1` diretamente.
- Badge de status: remover `animate-pulse` do estado estático. Usar pulse apenas durante transições (offline → online), animar por ~2 segundos, depois parar.

---

## Personas — Red Flags

As personas foram selecionadas com base no perfil do produto: atleta com celular na mão dentro da academia, sessões curtas, atenção fragmentada.

---

### Casey — O Usuário Mobile Distraído

**Perfil:** Usa o celular com uma mão, dentro da academia, frequentemente interrompido entre séries. Volta ao app depois de 90 segundos de descanso. Não quer precisar pensar.

**Red flags encontrados:**

- **Nav com 7 abas de 54px.** Um toque errado durante o descanso manda Casey para "Prevenção" quando queria "Início". Recuperar a navegação exige dois toques adicionais — e o descanso acabou.
- **FAB leva ao treino errado.** Casey usa plano de treino. Toca no FAB esperando continuar a sessão planejada. Cai em "Registrar Treino Livre". Sai sem salvar nada.
- **Estado de treino em risco na interrupção.** Se Casey troca de app e o navegador descarta a sessão PWA, o treino em andamento depende de `loadPlanos` recarregar o workout ativo. Se o Firebase demorar ou falhar offline, Casey vê a tela de seleção de plano novamente, sem feedback de onde parou.
- **Inputs pequenos em ExecutePlannedWorkout.** Os campos de `pesoReal` e `repeticoesReais` em cards compactos com polegar suado são alvos imprecisos.

**Correções prioritárias:**
1. Nav com 4 abas e alvos de no mínimo 44px cada.
2. FAB contextual: se plano ativo, bottom sheet "Plano ou Livre?"
3. Garantir que o estado de execução seja recuperado com feedback visual claro, mesmo com Firebase lento.

---

### Alex — O Atleta de Alta Frequência

**Perfil:** Usa o app toda sessão, 4-6x por semana. Conhece o app de cor. Quer registrar uma série em menos de 5 segundos. Qualquer fricção desnecessária é inaceitável.

**Red flags encontrados:**

- **4 toques para iniciar um treino planejado.** Não há atalho. Para quem faz isso 5x por semana, 52 semanas, são mais de 1.000 toques extras no ano.
- **Progress/Evolução sem persistência de seleção.** Alex sempre quer ver o supino. Cada visita, precisa selecionar novamente no dropdown. O estado não é salvo em `localStorage`.
- **Heatmap de History requer scroll horizontal não óbvio.** Em mobile, o heatmap escapa para fora da tela sem sinalização visual clara de que há conteúdo além.
- **Desktop subutilizado.** O layout `max-w-4xl` centralizado não aproveita a largura no tablet. Sem atalhos de teclado para nenhuma ação.

**Correções prioritárias:**
1. Card "Hoje" no Dashboard com acesso direto ao treino planejado do dia.
2. Persistir último exercício selecionado em Progress em `localStorage`.
3. No heatmap, exibir indicador visual de scroll horizontal em mobile.

---

### Riley — O Testador Metódico

**Perfil:** Testa o que o app promete. Faz entradas inesperadas. Navega de forma não-linear. Descobre os problemas que nenhum desenvolvedor testou.

**Red flags encontrados:**

- **Refresh no meio de ExecutePlannedWorkout.** Riley dá F5 com treino em andamento. Se o Firebase estiver lento, `setLoading(false)` é chamado antes da resposta e o usuário vê a tela de seleção de plano, perdendo o contexto visual.
- **Peso = 0 em exercício de força invalida 1RM silenciosamente.** Riley registra série com `pesoReal = 0`. `calcular1RM(0, reps)` retorna 0. Dados no histórico mas não em Records, sem nenhum aviso.
- **ViewPlan vazio pós-delete sem CTA.** Riley deleta todos os planos em lote. A tela exibe estado vazio sem botão para reimportar.
- **Campo de tempo indefinido em plano misto.** Se o exercício não tem `tempoPlanejadoSegundos`, o campo aparece vazio. O usuário pode não perceber que precisa preencher.

**Correções prioritárias:**
1. No estado vazio de ViewPlan pós-delete, exibir botão "Importar Plano" diretamente.
2. Para `peso_corporal`, ocultar o campo de peso e documentar que o 1RM não será calculado.
3. Testar o fluxo de reload durante execução com Firebase lento e garantir feedback adequado.

---

### Marco — O Candidato ao TAF (Persona Específica do Produto)

**Perfil:** Militar ou servidor público em preparação para o TAF do CBMRS. Usa o ForgePro para monitorar barra, abdominal e corrida de 12 minutos. Tem data de exame definida. Para ele, um dado errado não é inconveniente — é reprovação.

**Red flags encontrados:**

- **Classe `input-field` indefinida.** Os campos dos três testes podem estar sem estilo algum — interface visualmente quebrada no momento mais crítico do produto.
- **Simulado marcado como padrão.** Toggle com `simulado: true` por padrão. Se Marco esquecer de desmarcar, uma prova oficial é registrada como simulado e não entra na progressão oficial.
- **Tabela de pontuação silenciosa.** Marco vê a nota estimada enquanto digita, mas não vê em qual tabela (sexo e faixa etária) ela foi calculada. Se o perfil estiver incompleto, a nota é calculada com valores padrão sem aviso.
- **Histórico sem linha de meta visual.** A tela TAF mostra evolução em tabela com delta, mas sem linha de meta "Muito Bom" — Marco compara mentalmente cada nota com 8.5.

**Correções prioritárias:**
1. Corrigir `input-field` para `form-input` — crítico e imediato.
2. Exibir "Tabela em uso: [Sexo] · [Faixa etária]" acima do formulário com link para perfil se incompleto.
3. Mudar default do toggle para `false` com label mais claro: "Marcar como simulado (não conta como resultado oficial)."
4. Adicionar linha de meta 8.5 no histórico de scores.

---

## O Que Está Funcionando Bem

**1. Sistema de retomada de sessão em andamento.**
Se o usuário fechar o app durante um treino, ao reabrir o ForgePro a sessão é restaurada automaticamente — série a série, com inputs preservados. Esta funcionalidade não existe na maioria dos apps de academia e é o diferencial direto para o critério "o usuário nunca perde dado de treino."

**2. Hierarquia tipográfica tripartite.**
Inter (corpo), Lexend (ações e labels) e JetBrains Mono (dados numéricos) com contraste de peso e escala cria legibilidade e ordem visual sem depender de cor. Funciona em dark e light mode.

**3. Skeleton loaders com reduced-motion.**
Todos os estados de carregamento usam `animate-pulse motion-reduce:animate-none`, respeitando `prefers-reduced-motion`. Raros PWAs de academia têm este nível de atenção a acessibilidade de movimento.

**4. History com seleção em lote.**
A funcionalidade de seleção múltipla para delete em lote é uma decisão de power-user correta. O heatmap anual é uma visualização motivacional que agrega valor real; só precisa de ajustes de legibilidade em mobile.

**5. ViewPlan com confirmação de delete.**
A tela de plano tem o padrão correto de confirmação inline antes de ações destrutivas. Este padrão deve ser replicado em LogWorkout e ExecutePlannedWorkout.

---

## Próximos Passos Recomendados

| Prioridade | Problema | Esforço |
|---|---|---|
| P0 — Crítico | Corrigir `input-field` para `form-input` em TAFScore | Muito baixo |
| P0 — Crítico | Expandir `useToast` para todos os screens com save | Médio |
| P1 — Alto | Nav mobile: reduzir para 4 abas + bottom sheet | Médio |
| P1 — Alto | Floor tipográfico de 11px — eliminar textos de 8-9px | Baixo |
| P1 — Alto | FAB contextual: plano vs. livre | Baixo |
| P2 — Médio | Confirmação em ações destrutivas (remover série, finalizar treino) | Baixo |
| P2 — Médio | Heatmap em mobile: visão alternativa de 12 semanas | Médio |
| P2 — Médio | Alerta de perfil TAF incompleto em TAFScore | Baixo |
| P2 — Médio | Default do toggle "simulado" para false | Muito baixo |
| P2 — Médio | Empty states orientativos em Progress e Prevention | Baixo |
| P3 — Baixo | Persistir seleção de exercício em Progress no localStorage | Muito baixo |
| P3 — Baixo | Typo em UserProfile e extração de SCREEN_LABELS | Muito baixo |
| P3 — Baixo | Migração de cores para OKLCH + tinting de neutros | Baixo |
| P3 — Baixo | Linha de meta 8.5 no histórico de scores TAF | Muito baixo |
| P3 — Baixo | Correção da animação `forge-pop` (remover overshoot) | Muito baixo |
| P3 — Baixo | Indicador de status sem pulse permanente | Muito baixo |