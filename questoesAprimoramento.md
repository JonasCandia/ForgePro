# ForgePro — Questões de Aprimoramento

> Documento de análise técnica e estratégica para evolução do app. Baseado na leitura das dependências e estrutura atual do código (maio/2026).

---

## 1. Stack Atual — Resumo Diagnóstico

| Camada | Tecnologia | Versão |
|---|---|---|
| Frontend | React | 19.0.1 |
| Linguagem | TypeScript | 5.8.2 |
| Build / Dev | Vite | 6.2.3 |
| Estilo | Tailwind CSS v4 | 4.1.14 |
| Animações | Motion (Framer) | 12.23.24 |
| Gráficos | Recharts | 3.8.1 |
| Backend/DB | Firebase (Firestore + Auth) | 12.12.1 |
| IA | Google GenAI SDK | 1.29.0 |
| Datas | date-fns | 4.1.0 |
| Ícones | Lucide React | 0.546.0 |
| PWA | vite-plugin-pwa | 1.3.0 |
| Servidor (aux) | Express | 4.21.2 |

---

## 2. Funcionalidades Existentes — Estado Atual

- Autenticação Google (Firebase Auth)
- Perfil do usuário: nome, peso, altura, objetivo (cutting / bulking / manutenção)
- Cadastro e seed de exercícios
- Registro manual de treino (`LogWorkout`)
- Execução de plano semanal estruturado (`ExecutePlannedWorkout`) com timer de descanso
- Histórico de sessões (`History`)
- Progresso por exercício — gráfico de linha de carga máxima e volume (`Progress`)
- Recordes pessoais com estimativa de 1RM via fórmula de Epley (`Records`)
- Importação de plano via JSON (`ImportPlan`)
- Dashboard com resumo mensal
- Tema claro/escuro (`ThemeContext`)
- Google GenAI SDK já presente — **sem uso mapeado na UI atual**

---

## 3. Questões sobre Novas Funcionalidades

### 3.1 — Inteligência Artificial (SDK GenAI já instalado)

- **O GenAI está integrado mas sem uso aparente na UI.** Qual seria o melhor ponto de entrada? devemos retirar ele

### 3.2 — Monitoramento e Controle Biométrico

- O perfil já prevê campos `medidasCorporais`, `calorias` e `sono`, mas **não há UI para eles**. Faz sentido ativar? sim e adicionar solicitações do sistema para que seja prenchido de forma regular.
  - Registro periódico de medidas (circunferência de braço, cintura, quadril, pescoço)? Podemos incluir
  - Controle de peso corporal ao longo do tempo com gráfico de tendência? tambem incluir
  - Registro diário de qualidade do sono (horas dormidas + nota subjetiva)?não incluir
  - Registro calórico diário com comparativo do objetivo (cutting/bulking)? não incluir
- Você usaria integração com app de saúde externo (Google Fit, Apple Health, Garmin Connect) para importar esses dados automaticamente? podemos pensar em uma conexão com os apps Zepp e Zepp Life.

### 3.3 — Periodização e Planejamento

- O plano atual é estático (JSON de semanas e dias). Faz sentido evoluir para **periodização progressiva automática**? os planos farei externamente e somente importarei no sistema.
- Seria útil ter um calendário visual de treinos planejados vs. realizados por semana? Sim

### 3.4 — Métricas Avançadas de Performance

- Atualmente o 1RM é estimado pela fórmula de Epley (`peso * 36 / (37 - reps)`). Você consideraria comparar com outras fórmulas (Brzycki, Lander, O'Conner) e exibir a média? sim
- Seria relevante calcular e exibir:
  - **Volume semanal por grupo muscular** (número de séries e tonelagem)?não
  - **Índice de recuperação** baseado no intervalo entre treinos do mesmo grupo?não
  - **Taxa de falha** por exercício ao longo do tempo?não
  - **Effort Score** (carga relativa ao 1RM estimado) para comparar intensidade entre sessões? não

### 3.5 — Nutrição

- Você quer incorporar nutrição ao app ou mantê-la como dado externo? não este app é somente de exercicios fisicos 
  

### 3.6 — Gamificação e Engajamento

- O app possui tela de Records — faria sentido expandir para um sistema de conquistas? não
  

### 3.7 — Social e Compartilhamento

- Você avaliaria features sociais leves? não

---

## 4. Questões sobre Tecnologias a Implementar

### 4.1 — Gráficos e Visualização

- **Recharts** está instalado e em uso, mas somente com `LineChart`. Você consideraria:
  - `BarChart` para volume semanal por grupo muscular?sim
  - `RadarChart` para mapa de grupos musculares treinados na semana (spider chart)?sim
  - `AreaChart` para evolução de peso corporal ao longo do tempo?sim
  - Migrar para **Nivo** ou **Victory** se precisar de visualizações mais ricas (heatmap de frequência, treemap de volume)? sim, quanto mais abrangente as avaliações melhor

### 4.2 — Offline e PWA

- `vite-plugin-pwa` está configurado — o service worker está ativo e a instalação como app funciona? não foi testado ainda
  - É necessário garantir que o registro e execução de treinos funcionem **100% offline** com sincronização posterior? sim
  - Faz sentido implementar **IndexedDB** (via Dexie.js) como cache local para as sessões antes de sincronizar com Firestore? sim
  - Push notifications para lembrar de treinar em dias planejados?não

### 4.3 — Gerenciamento de Estado

- Atualmente o estado é local (useState por tela). Para funcionalidades mais complexas, você avaliaria:
  - **Zustand** para estado global leve (sessão ativa, perfil, theme)?sim
  - **React Query (TanStack Query)** para caching e invalidação inteligente das queries Firestore?sim
  - Context API atual é suficiente ou já está gerando prop drilling?suficiente

### 4.4 — Roteamento

- A navegação é gerenciada manualmente com um tipo `Screen` em `App.tsx`. Isso já causa limitações?não
  - Faz sentido adotar **React Router v7** (ou **TanStack Router**) para URLs persistentes, botão voltar do browser e deep links? não há necessidade
  - Deep links seriam importantes para compartilhamento de treinos ou PRs?nãso

### 4.5 — Backend e Serverless

- O `express` está no projeto como dependência de produção. Para qual finalidade ele é (ou será) usado?não sei informar
  - Proxy para a API GenAI (evitar exposição de chave no client)? não será utilizado, retirar
  - Se sim, faria sentido migrar para **Firebase Functions** para manter tudo no mesmo ecossistema? sim
  

### 4.6 — Autenticação

- Atualmente só Google Auth está implementado. Você precisa de: somente google
  
### 4.7 — Testes

- Não há testes no projeto. Para um app de saúde, a confiabilidade é crítica: não faremos testes



---

*Documento gerado em 05/05/2026 com base na leitura do código-fonte e dependências do ForgePro.*
