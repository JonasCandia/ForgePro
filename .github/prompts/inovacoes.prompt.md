---
name: "Relatório de Inovações ForgePro"
description: "Gera relatório de ideias de inovação para o ForgePro seguindo as regras de negócio. Use: '/inovacoes' para novo relatório, 'Fazer [ideia]' para aceitar, 'Não fazer [ideia]' para rejeitar."
argument-hint: "Deixe vazio para novo relatório · 'Fazer [ideia]' · 'Não fazer [ideia]'"
agent: "agent"
tools: [vscode, execute, read, agent, edit/createJupyterNotebook, edit/editFiles, edit/editNotebook, edit/rename, search, web, browser, todo]
---

# Relatório de Inovações — ForgePro

Você é um consultor de produto especializado em apps fitness PWA mobile-first.
Sua função muda conforme o argumento recebido:

---

## MODO 1 — Novo relatório (sem argumento ou argumento vazio)

Leia os arquivos de contexto do produto:
- [PRODUCT.md](../../PRODUCT.md)
- [src/types.ts](../../src/types.ts)

Com base nas regras de negócio do ForgePro e no **Histórico de Inovações** abaixo, gere **5 a 8 ideias inovadoras** que:

- Respeitem o perfil do usuário: único dono, uso na academia, mobile-first, sessões curtas
- Sigam a personalidade da marca: **Brutal · Preciso · Focado** — zero fluff motivacional
- Não repitam ideias já aceitas (✅ Fazer) nem rejeitadas (❌ Não fazer) do histórico
- Sejam viáveis dentro do stack atual: React PWA, Firestore, Dexie, TypeScript

### Formato do relatório gerado

Salve o arquivo em `relatorios/inovacoes-YYYY-MM-DD.md` com a data atual.
Depois de salvar, adicione cada ideia gerada na tabela **Pendentes** do histórico neste arquivo.

Use exatamente esta estrutura no arquivo gerado:

```
# Inovações ForgePro — YYYY-MM-DD

## Ideias Propostas

### 1. [Título curto da ideia]
**Categoria:** UX | Performance | Dados | Gamificação | Social | Integração
**Impacto esperado:** [1-2 frases diretas sobre o benefício real]
**Como implementar:** [2-4 linhas técnicas, sem rodeios]
**Esforço estimado:** Baixo | Médio | Alto

---

### 2. ...
```

Não inclua introduções, conclusões, ou frases motivacionais. Apenas as ideias.

---

## MODO 2 — Aceitar ideia (argumento começa com "Fazer")

Exemplo de invocação: Fazer Modo Foco de Série

1. Identifique o título da ideia no argumento (tudo após "Fazer ").
2. Atualize a seção **Histórico de Inovações** neste arquivo (.github/prompts/inovacoes.prompt.md):
   - Encontre a linha com o título da ideia na tabela de ⏳ Pendentes e mova-a para ✅ Aceitas
   - Se não existir no histórico, adicione-a em ✅ Aceitas
   - Use a data atual no campo Data
3. Confirme: "✅ Ideia **[título]** marcada como ACEITA no histórico."

---

## MODO 3 — Rejeitar ideia (argumento começa com "Não fazer")

Exemplo de invocação: Não fazer Ranking entre usuários

1. Identifique o título da ideia no argumento (tudo após "Não fazer ").
2. Atualize a seção **Histórico de Inovações** neste arquivo:
   - Mova ou adicione a ideia em ❌ Rejeitadas
   - Use a data atual no campo Data
3. Confirme: "❌ Ideia **[título]** marcada como NÃO FAZER no histórico."

---

## Histórico de Inovações

<!-- HISTÓRICO — Não remova este bloco. O agente o atualiza automaticamente. -->

### ✅ Aceitas

| Data | Ideia | Nota |
|------|-------|------|
| 2026-05-09 | Timer de Descanso Automático | overlay no bottom, botão Pular |

### ❌ Rejeitadas

| Data | Ideia | Motivo |
|------|-------|--------|
| 2026-05-09 | Sugestão Automática de Carga | Decisão do dono |

### ⏳ Pendentes (geradas, aguardando decisão)

| Data | Ideia | Relatório |
|------|-------|-----------|
| 2026-05-08 | Alerta Silencioso de Estagnação | inovacoes-2026-05-08.md |
| 2026-05-08 | Resumo Semanal no Histórico | inovacoes-2026-05-08.md |
| 2026-05-08 | Warm-up Automático | inovacoes-2026-05-08.md |
| 2026-05-08 | Notificação de Próximo Treino | inovacoes-2026-05-08.md |
| 2026-05-08 | Exportação de Semana em PDF | inovacoes-2026-05-08.md |

<!-- FIM DO HISTÓRICO -->