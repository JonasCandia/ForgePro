---
description: "Analisa dependências, detecta código duplicado e sugere refatorações no projeto atual"
name: "Auditar e Refatorar Duplicatas"
argument-hint: "Diretório alvo (opcional, padrão: src/)"
agent: "agent"
tools: [vscode, execute, read, agent, edit/createFile, edit/createJupyterNotebook, edit/editFiles, edit/editNotebook, edit/rename, search, web, browser, todo]
---

Você é um especialista em qualidade de código e engenharia de software. Sua missão é realizar uma auditoria completa no projeto atual, identificando dependências, detectando código duplicado e propondo refatorações precisas e justificadas.

---

## PASSO 1 — Leitura das Dependências

Antes de qualquer análise, identifique o ecossistema tecnológico do projeto lendo os arquivos de manifesto de dependências presentes na raiz:

- **Node.js / TypeScript**: `package.json` (campos `dependencies` e `devDependencies`)
- **Python**: `requirements.txt`, `pyproject.toml` ou `setup.py`
- **Java**: `pom.xml` ou `build.gradle`
- **Go**: `go.mod`
- **Rust**: `Cargo.toml`
- **.NET**: `*.csproj` ou `*.sln`

Liste as **10 bibliotecas e frameworks mais relevantes** encontrados, indicando nome, versão e finalidade (ex: "React 18 — UI declarativa", "Zod — validação de esquemas").

Esse contexto será usado para justificar as sugestões de refatoração nos passos seguintes.

---

## PASSO 2 — Varredura por Código Duplicado

Percorra recursivamente os arquivos do projeto a partir do diretório `src/` (ou o argumento fornecido), **excluindo**: `node_modules/`, `.git/`, `dist/`, `build/`, `coverage/`, `__pycache__/`.

Aplique as seguintes heurísticas de detecção:

1. **Blocos idênticos ou quase idênticos**: funções, classes ou trechos com diferenças mínimas (apenas nomes de variáveis ou valores literais).
2. **Lógica repetida**: mesma sequência de operações (validação → transformação → retorno) em mais de um arquivo.
3. **Código morto**: funções exportadas nunca importadas, variáveis declaradas e não usadas, rotas registradas sem uso.
4. **Componentes/hooks similares** (React/Vue/Angular): estrutura idêntica variando apenas em props ou configuração.

Para cada ocorrência encontrada, apresente no seguinte formato:

```
📌 Duplicata detectada
  Arquivos: [caminho/arquivo1.ts (linhas X–Y)] e [caminho/arquivo2.ts (linhas A–B)]
  Tipo: [bloco idêntico | lógica similar | código morto | componente duplicado]
  Similaridade estimada: [alta | média]
  Trecho representativo:
    [primeiras 5–10 linhas do trecho duplicado]
```

---

## PASSO 3 — Sugestões de Refatoração

Para cada duplicata do Passo 2, proponha uma solução concreta, justificada pelas dependências identificadas no Passo 1.

Estruture cada sugestão assim:

```
🔧 Refatoração sugerida para: [nome/descrição da duplicata]

  Estratégia: [Extração de função | Hook customizado | Utilitário compartilhado |
               Padrão Strategy | Template Method | Herança | Composição | Remoção de código morto]

  Justificativa baseada nas dependências:
    Ex: "Como o projeto utiliza React 18, recomendamos extrair a lógica repetida em
         um hook customizado `useFetchData`, eliminando as duplicatas em UserList.tsx
         e ProductList.tsx."

  ANTES (código atual):
  [trecho duplicado original]

  DEPOIS (código refatorado):
  [novo utilitário/hook/função + exemplo de uso nos arquivos afetados]

  Arquivos a modificar:
    - [caminho/arquivo1] — remover trecho, importar novo utilitário
    - [caminho/arquivo2] — idem
    - [caminho/utils/novoArquivo] — criar com a lógica extraída
```

---

## FORMATO FINAL DE SAÍDA

Apresente o resultado em três seções bem delimitadas:

### 1. Dependências Identificadas
Tabela: Biblioteca | Versão | Finalidade

### 2. Duplicatas Encontradas
Lista numerada com todos os achados do Passo 2.

### 3. Plano de Refatoração
Lista numerada com todas as sugestões do Passo 3, na mesma ordem das duplicatas.

---

> Seja preciso nos caminhos de arquivo e números de linha. Reporte apenas o que for efetivamente encontrado no código. Se nenhuma duplicata for encontrada, informe explicitamente.
