# ForgePro — Relatório de UX e Qualidade de Interface
**Versão:** 1.0 — 12 de maio de 2026
**Metodologia:** Revisão de código-fonte completa + Avaliação heurística (Nielsen, 10 critérios) + Teste de carga cognitiva + Análise de personas de uso

---

## Sumário Executivo

O ForgePro tem uma identidade visual sólida e decisões técnicas corretas: dark mode motivado por ergonomia de academia, tipografia tripartite funcional e um sistema de retomada de sessão de treino que é vantagem competitiva real. A pontuação geral nas heurísticas de usabilidade foi **25/40** — acima da média para produtos desta categoria, mas com problemas específicos que impactam diretamente o critério de sucesso do produto ("o usuário nunca perde um dado de treino").

Os problemas encontrados estão organizados por impacto real no usuário, do mais crítico ao cosmético.

---

## Pontuação por Heurística

| # | Critério | Nota | Observação |
|---|---|---|---|
| 1 | Visibilidade do sistema | 3/4 | Bons indicadores de loading; falta feedback após sincronização com Firebase |
| 2 | Linguagem do usuário | 3/4 | Português correto; sigla "TAF" sem glossário para novos usuários |
| 3 | Controle e liberdade | 3/4 | Botões "Voltar" presentes; sem confirmação em ação destrutiva "Finalizar Treino" |
| 4 | Consistência visual | 3/4 | Tokens bem definidos; mistura de `rounded-xl` e `rounded-lg` em componentes similares |
| 5 | Prevenção de erros | 2/4 | Sem validação de inputs negativos; sem confirmação em exclusão de séries |
| 6 | Reconhecimento vs. memorização | 3/4 | Valores anteriores pré-preenchidos; alguns ícones sem label em views compactas |
| 7 | Eficiência para usuários avançados | 2/4 | Sem atalhos; caminho para "Executar Plano" exige 4 interações |
| 8 | Design minimalista | 3/4 | Bom foco; contaminado por nav de 7 itens e fontes de 8–9px em dados |
| 9 | Recuperação de erros | 2/4 | Erros de save silenciosos; usuário não sabe quando uma operação falha |
| 10 | Ajuda e documentação | 1/4 | Nenhum tooltip, onboarding ou texto de orientação nas telas principais |
| **Total** | | **25/40** | |

---

## Problemas Encontrados e Ideias de Solução

---

### 1. Navegação mobile com 7 abas — Sobrecarga cognitiva crítica

**Impacto:** Alto — afeta todas as sessões de treino

**Descrição:**
O menu inferior de navegação mobile contém 7 abas simultâneas: Início, Histórico, Plano, Progresso, TAF, Recordes e Prevenção. Pesquisas de usabilidade (Miller / Cowan) estabelecem que humanos conseguem processar no máximo 4 itens em memória de trabalho. Com 7 abas em ~375px de largura, cada aba fica com aproximadamente 54px, tornando os labels próximos de ilegíveis — especialmente com o usuário em pé, com uma mão ocupada e atenção dividida durante o intervalo de descanso de uma série.

Adicionalmente, há 3 zonas de navegação concorrentes no mesmo app: bottom nav, FAB flutuante e dropdown de avatar no topo.

**Ideias de solução:**
- Reduzir o bottom nav para **4 abas fixas**: Início, Histórico, Progresso e "Mais".
- A aba "Mais" abre um **bottom sheet** listando as seções secundárias: Plano, TAF, Recordes, Prevenção, Medidas e Importar.
- O FAB de "Novo Treino" permanece como ação primária flutuante, isolado visualmente.
- Telas que são secundárias por natureza (Importar, Medidas) podem ser acessadas apenas pelo bottom sheet ou pelo dropdown de avatar.
- Isso reduz o esforço de decisão de 7 para 4 opções na navegação principal — dentro do limite cognitivo recomendado.

---

### 2. Textos abaixo de 11px em dados relevantes — Ilegibilidade em contexto de academia

**Impacto:** Alto — afeta leitura de dados durante o treino

**Descrição:**
Diversas labels de dados utilizam classes `text-[10px]`, `text-[9px]` e `text-[8px]`. O caso mais crítico é o span `←evolução` no widget TAF do Dashboard, renderizado em 8px. Em termos tipográficos, 8px equivale a aproximadamente 6pt — abaixo do limite de legibilidade de qualquer fonte em qualquer condição. Para um usuário com mãos suadas, tela com brilho médio e distância de leitura variável (academia), esses textos se tornam invisíveis na prática.

**Ideias de solução:**
- Estabelecer um **floor absoluto de 11px** para qualquer texto que carregue informação de valor (dados, labels, badges).
- Textos puramente decorativos de seção (cabeçalhos de grupo) podem ficar em 10px.
- Tudo abaixo de 10px deve ser **substituído por ícone** (sem label) ou removido.
- Revisar o widget TAF no Dashboard: a barra de mini-histórico de notas pode usar altura em vez de labels textuais para comunicar evolução.
- Para o desktop, repensar se esses dados precisam de labels alfanuméricas ou se ícones + tooltips são suficientes.

---

### 3. Falhas de save silenciosas — Risco de perda de dados

**Impacto:** Crítico — contradiz o critério de sucesso do produto

**Descrição:**
Em múltiplos pontos do código (`LogWorkout`, `ExecutePlannedWorkout`, `TAFScore` e outros), blocos `catch` capturam erros de operações de save e os descartam com `console.error()` sem nenhum feedback ao usuário. Se o Firebase retornar erro por timeout, token expirado ou problema de rede, o usuário verá a tela de "Treino Salvo!" ou simplesmente retornará à Home — sem saber que os dados não foram persistidos. Este é o cenário de maior risco para o produto, cujo critério central de sucesso é "o usuário nunca perde um dado de treino."

**Ideias de solução:**
- Implementar um **componente de toast** global (ou banner inline) que exiba mensagens de erro e sucesso de forma não bloqueante.
- Em caso de falha no save, exibir mensagem clara: _"Falha ao salvar. Dados retidos localmente — tente novamente."_
- Aproveitar a flag `isOnline` já existente no app para contextualizar: se offline, mostrar _"Sem conexão — salvo localmente. Sincronização automática ao reconectar."_
- Para operações críticas (finalizar treino, salvar score TAF), adicionar um estado de **retry explícito** com botão de tentar novamente, em vez de descartar silenciosamente.
- Garantir que o Dexie (banco local) sempre receba o dado antes da tentativa Firebase, de forma que nenhuma informação seja perdida mesmo que a nuvem falhe.

---

### 4. FAB "Novo Treino" não cobre o fluxo de plano — Desorientação para usuários com plano ativo

**Impacto:** Médio — afeta o fluxo mais frequente do produto

**Descrição:**
O Floating Action Button fixado no canto inferior direito está rotulado como "Novo Treino" e dispara `LogWorkout` (treino livre). Porém, para um usuário que usa plano de treino — o fluxo mais sofisticado e provavelmente o mais frequente para usuários ativos — o FAB não faz nada útil. O caminho para executar um treino planejado exige: Dashboard → navegar até o card de "Executar Plano" → selecionar semana → selecionar dia → iniciar. São 4 interações antes de ver o primeiro exercício.

**Ideias de solução:**
- Se o usuário tiver um plano ativo, o FAB deve **perguntar o contexto** ao ser pressionado: um bottom sheet rápido com duas opções — "Executar Plano" e "Treino Livre" — resolve sem adicionar fricção para nenhum dos dois perfis.
- Alternativamente, detectar se há um treino do plano previsto para hoje e **exibir acesso direto no Dashboard**: um card prioritário "Hoje: Treino A — 6 exercícios [Iniciar]" colapsando a seleção de semana/dia.
- O caminho de 4 interações pode ser reduzido para 2 (tocar FAB → escolher → iniciar) sem grandes mudanças de arquitetura.

---

### 5. Cores em hexadecimal sem tinting de neutros — Identidade genérica

**Impacto:** Baixo-médio — cosmético, mas afeta coesão de identidade

**Descrição:**
Os tokens de cor do design system estão definidos em hexadecimal puro: `#0A0A0A` para background, `#111111` para surface, `#CCFF00` para a cor brand. Neutros próximos de preto (`#0A0A0A`, `#111111`) são neutros sem saturação — o que resulta em um "tema escuro genérico" em vez de uma identidade própria. A prática recomendada é tinting: adicionar frações mínimas de croma na direção da cor brand. Com chroma 0.005–0.01 em OKLCH, o resultado é imperceptível em isolamento, mas coeso quando visto em conjunto — a sensação de que o app "pertence a si mesmo".

Adicionalmente, o light mode foi implementado sobrescrevendo classes do Tailwind diretamente no CSS (`.light .text-gray-200 { color: #1a1a1a }`), o que é frágil: se o Tailwind gerar hashes de classe em produção, essas sobrescritas quebram silenciosamente.

**Ideias de solução:**
- Migrar tokens de cor para **OKLCH** em `index.css`:
  - `--color-background: oklch(8% 0.006 125)`
  - `--color-surface: oklch(10% 0.005 125)`
  - `--color-brand: oklch(92% 0.28 125)`
- Para o light mode, usar **CSS custom properties** com sobrescrita por seletor de classe (`.light { --color-background: oklch(96% 0.004 125) }`), em vez de sobrescrever classes utilitárias do Tailwind.

---

### 6. Animação `forge-pop` com overshoot — Inconsistência de motion

**Impacto:** Baixo — cosmético, mas contradiz o brand "brutal · preciso"

**Descrição:**
A animação `@keyframes forge-pop`, usada na tela de confirmação de treino salvo, tem um keyframe em 65% com `transform: scale(1.1)` — produzindo overshoot (o elemento "ultrapassa" o tamanho final antes de assentar). Esse comportamento caracteriza efeito bounce ou elastic, que o design system do ForgePro explicitamente proíbe: _"No bounce, no elastic."_ A curva de easing `cubic-bezier(0.22, 1, 0.36, 1)` é excelente e está correta, mas é neutralizada pelo keyframe intermediário.

**Ideias de solução:**
- Remover o keyframe de 65%. A animação deve ir diretamente de `scale(0.8); opacity: 0` para `scale(1); opacity: 1`, deixando a curva de easing cuidar da desaceleração.
- Isso mantém a "pop" sem bounce, compatível com a identidade de precisão do produto.

---

### 7. Indicador "CONECTADO" pulsando continuamente — Perda de significado

**Impacto:** Baixo — cosmético, mas afeta leitura de status

**Descrição:**
O badge de status de conexão no topo da tela usa `animate-pulse` permanentemente enquanto o usuário está online. O pulse contínuo é um antipadrão: perde significado semântico (pulso comunica "atividade", não "estado estável") e pode ser confundido com indicador de carregamento em andamento. O mesmo `animate-pulse` é usado em skeleton loaders — o que torna a linguagem visual inconsistente.

**Ideias de solução:**
- Remover o `animate-pulse` do estado "CONECTADO" estático. O ponto pode ser sólido e estável quando online.
- Usar `animate-pulse` **apenas durante transições**: ao reconectar (mudar de offline para online) animar por ~2 segundos, depois parar.
- Isso preserva o significado do pulse como sinal de mudança de estado, e não de estado permanente.

---

### 8. Ações destrutivas sem confirmação — Risco de perda de dados

**Impacto:** Médio — risco de erro do usuário

**Descrição:**
Remover uma série de um exercício em `LogWorkout` ou em `ExecutePlannedWorkout` não exige confirmação. Durante a execução de um treino, um toque acidental no botão de remover série desfaz um registro que o usuário acabou de completar, sem possibilidade de recuperação. Da mesma forma, "Finalizar Treino" não apresenta confirmação — apesar de ser uma ação irreversível que muda o status da sessão de `em_andamento` para `finalizado`.

**Ideias de solução:**
- Para **remover série**: substituir a exclusão imediata por um estado de "undo" temporário (banner por 3–5 segundos com opção de desfazer), sem modal bloqueante.
- Para **Finalizar Treino**: um bottom sheet de confirmação rápido com resumo da sessão (N exercícios, N séries, N minutos) e botão "Confirmar e Finalizar". Isso também serve como reforço positivo — o usuário vê o que realizou antes de fechar.

---

### 9. Ausência de onboarding e estados vazios orientativos

**Impacto:** Médio — afeta usuários novos e primeiros acessos

**Descrição:**
Exceto pelo estado vazio da tela TAF (que exibe um call-to-action adequado para registrar o primeiro simulado), as demais telas principais não orientam o usuário em estado vazio. Um usuário recém-cadastrado que abre o Histórico, o Progresso ou os Recordes encontra telas em branco sem explicação do que falta fazer ou por onde começar.

**Ideias de solução:**
- Para cada tela com estado vazio, adicionar um **empty state** com:
  - Ícone ou ilustração mínima.
  - Uma linha de contexto: _"Seus treinos aparecerão aqui depois da primeira sessão."_
  - Um call-to-action direto para a ação que preencherá a tela: _"Registrar primeiro treino"_ ou _"Importar plano"_.
- Para o primeiro login, exibir um **fluxo de onboarding de 2–3 passos** (modal ou série de tooltips): definir perfil → importar plano (opcional) → registrar primeiro treino. Sem paredes de texto — cada passo tem uma ação.

---

### 10. Navegação desktop com 9 itens sem agrupamento

**Impacto:** Baixo — afeta uso em tablet/desktop

**Descrição:**
A barra de navegação desktop exibe 9 itens em sequência linear sem separadores ou agrupamento visual: Início, Plano, Histórico, Progresso, Recordes, Medidas, TAF, Prevenção, Importar. Itens de natureza distinta (ações como Importar, ferramentas como TAF, visualizações como Progresso) estão no mesmo nível hierárquico sem distinção.

**Ideias de solução:**
- Agrupar visualmente com um separador `|` ou espaçamento extra entre categorias: **Treino** (Início, Log, Executar) | **Análise** (Histórico, Progresso, Recordes) | **Ferramentas** (TAF, Prevenção, Medidas, Importar).
- Ou reduzir os itens fixos para os 5 mais usados e mover os restantes para um dropdown "Mais" no desktop também.

---

## O Que Está Funcionando Bem

Estes pontos não precisam de intervenção e representam vantagens competitivas reais do produto.

**1. Sistema de retomada de sessão em andamento.**
Se o usuário fechar o app durante um treino, ao reabrir o ForgePro a sessão é restaurada automaticamente — série a série, com inputs preservados. Esta funcionalidade não existe na maioria dos apps de academia e é um diferencial direto para o problema de "perder dados de treino".

**2. Hierarquia tipográfica tripartite.**
O uso de Inter (corpo), Lexend (ações e labels) e JetBrains Mono (dados numéricos) com contraste de peso e escala cria legibilidade e ordem visual sem depender exclusivamente de cor. Funciona em dark e light mode.

**3. Estados de loading com skeleton e reduced-motion.**
Todos os estados de carregamento usam skeleton loaders animados com `animate-pulse motion-reduce:animate-none` — respeitando `prefers-reduced-motion`. Este nível de atenção a acessibilidade de movimento é raro em produtos desta categoria e demonstra maturidade de implementação.

---

## Próximos Passos Recomendados

| Prioridade | Problema | Esforço estimado |
|---|---|---|
| P0 | Navegação mobile — reduzir de 7 para 4 tabs | Médio |
| P1 | Fontes abaixo de 11px — floor tipográfico | Baixo |
| P1 | Erros silenciosos de save — toast de feedback | Médio |
| P2 | FAB contextualizável (plano vs. livre) | Baixo |
| P2 | Confirmação em ações destrutivas | Baixo |
| P3 | Empty states e onboarding mínimo | Médio |
| P3 | Migração de cores para OKLCH + tinting de neutros | Baixo |
| P3 | Correção da animação `forge-pop` | Muito baixo |
| P3 | Indicador de status sem pulse permanente | Muito baixo |
| P3 | Agrupamento da nav desktop | Muito baixo |
