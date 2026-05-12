# Inovações ForgePro — 2026-05-08

## Ideias Propostas

### 1. Sugestão Automática de Carga
**Categoria:** UX / Dados  
**Impacto esperado:** Elimina a fricção de lembrar o peso anterior. Ao abrir o registro de uma série, o campo de peso já vem preenchido com a carga da última sessão + incremento sugerido baseado no histórico.  
**Como implementar:** No `workoutService`, ao iniciar uma série, consultar o Dexie pelos últimos 3 registros do exercício. Aplicar a progressão média de carga. Pré-preencher o campo de peso no componente `ExecutePlannedWorkout`. Usuário confirma ou sobrescreve.  
**Esforço estimado:** Médio

---

### 2. Timer de Descanso Automático
**Categoria:** UX  
**Impacto esperado:** Ao confirmar uma série, o timer inicia sozinho — sem toque extra. Usuário não perde tempo procurando onde iniciar o descanso enquanto ainda está ofegante.  
**Como implementar:** No evento de submit de série em `ExecutePlannedWorkout`, disparar um estado global de `restTimer` no `appStore` com duração configurável por grupo muscular (padrão: 90s). Exibir overlay persistente no bottom da tela com contagem regressiva e botão "Pular".  
**Esforço estimado:** Baixo

---

### 3. Alerta Silencioso de Estagnação
**Categoria:** Dados  
**Impacto esperado:** O usuário descobre que está estagnado antes de perder semanas. Nenhuma notificação intrusiva — apenas um indicador visual no exercício durante a sessão.  
**Como implementar:** Em `performanceUtils`, detectar se as últimas 3 sessões do exercício registraram o mesmo `pesoMax`. Se sim, adicionar flag `estagnado: true` ao objeto retornado. Em `ExecutePlannedWorkout`, exibir um ícone discreto (triângulo) ao lado do nome do exercício com a informação "3 sessões sem progressão".  
**Esforço estimado:** Baixo

---

### 4. Resumo Semanal no Histórico
**Categoria:** Dados  
**Impacto esperado:** Em vez de rolagem infinita de sessões individuais, o usuário enxerga a semana como unidade: volume total por grupo muscular, melhor PR da semana, sessões realizadas vs planejadas.  
**Como implementar:** Em `History.tsx`, adicionar modo de agrupamento semanal. Agregar sessões por `isoWeek`. Calcular `volumeTotal` (sets × reps × kg) por `grupoMuscular`. Exibir como lista colapsável por semana — tap para expandir sessões individuais.  
**Esforço estimado:** Médio

---

### 5. Warm-up Automático
**Categoria:** UX  
**Impacto esperado:** Antes do primeiro exercício principal da sessão, o app sugere séries de aquecimento calculadas automaticamente (50%, 70%, 85% da carga de trabalho). Zero configuração manual.  
**Como implementar:** No início de `ExecutePlannedWorkout`, identificar o primeiro exercício com `modalidade = 'forca_dinamica'`. Gerar 2–3 séries de aquecimento virtuais (não persistidas) com percentuais fixos do `pesoPlanejado`. Exibir como checklist descartável antes das séries reais. Usuário pode ignorar o bloco inteiro com um swipe.  
**Esforço estimado:** Médio

---

### 6. Notificação de Próximo Treino
**Categoria:** UX / Integração  
**Impacto esperado:** No dia do treino planejado, uma notificação PWA aparece com o nome da sessão e os exercícios principais. O usuário chega na academia sabendo o que vem por aí.  
**Como implementar:** Usar a API `Notification` + `ServiceWorker` já presente no PWA. Ao finalizar uma sessão, agendar notificação para o próximo `diaDaSemana` do plano usando `setTimeout` persistido via `localDb`. Conteúdo: nome do treino + primeiros 3 exercícios. Sem sons, sem vibração em loop.  
**Esforço estimado:** Alto

---

### 7. Exportação de Semana em PDF
**Categoria:** Dados  
**Impacto esperado:** Gera em 1 tap um PDF com o resumo da semana — sessões, volumes, PRs — útil para registro pessoal ou compartilhamento com um treinador.  
**Como implementar:** Em `exportUtils`, adicionar função `exportWeekToPdf(isoWeek)` usando a lib `jspdf` (já presente ou a adicionar como dependência leve). Estrutura: cabeçalho com período, tabela por sessão, linha de PRs novos. Acionar via botão no modo de resumo semanal do Histórico.  
**Esforço estimado:** Médio
