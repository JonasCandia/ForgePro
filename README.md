# FORGE - Seu Treino Sob Medida

FORGE é um aplicativo web progressivo projetado para atletas e entusiastas da musculação que buscam precisão e acompanhamento detalhado de sua evolução. Esqueça as planilhas manuais; o FORGE conecta seus planos de treino diretamente à nuvem.

## 🚀 Funcionalidades

- **Autenticação Segura**: Login via Google para manter seus dados sincronizados.
- **Execução de Planos**: Siga sua programação semanal exercício por exercício, com metas de peso e repetições pré-definidas.
- **Importação Inteligente**: Carregue toda a sua programação mensal ou semanal via JSON em segundos.
- **Registro Manual**: Flexibilidade para registrar exercícios avulsos fora do plano.
- **Histórico Detalhado**: Visualize cada série realizada, com filtros por data e exercício.
- **Gráficos de Evolução**: Acompanhe o aumento de carga ao longo do tempo com gráficos interativos.
- **Design Mobile-First**: Interface brutalista e moderna otimizada para uso rápido dentro da academia.

## 🛠️ Tecnologias

- **Frontend**: React 19 + Vite
- **Estilização**: Tailwind CSS 4
- **Backend/Database**: Firebase (Firestore & Authentication)
- **Animações**: Motion
- **Gráficos**: Recharts
- **Ícones**: Lucide React

## 📥 Importando Planos

O FORGE permite que você importe sua rotina usando um formato JSON específico. Vá em **"Importar Plano"** no menu principal e cole seu código.

### Exemplo de Estrutura JSON:

```json
{
  "plano": [
    {
      "semana": 1,
      "dias": [
        {
          "dia": "Segunda",
          "nomeTreino": "Peito e Tríceps",
          "exercicios": [
            { "id": 1, "series": 4, "repeticoes": 10, "peso": 40, "obs": "Foco na cadência" },
            { "id": 7, "series": 3, "repeticoes": 12, "peso": 15, "obs": "" }
          ]
        }
      ]
    }
  ]
}
```

*Nota: Os IDs dos exercícios devem corresponder aos IDs do catálogo do sistema (ex: 1 para Supino Reto).*

## 🏁 Como Rodar Localmente

1. Clone o repositório.
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Configure o Firebase:
   - Crie um arquivo `firebase-applet-config.json` na raiz com suas credenciais.
4. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

---
Desenvolvido com foco em performance e resultados. **FORGE YOUR BETTER SELF.**
