import { Exercício } from './types';

export const MOCK_EXERCICIOS: Exercício[] = [
  { id: '1', nome: 'Supino Reto', grupoMuscular: 'Peitoral' },
  { id: '2', nome: 'Agachamento Livre', grupoMuscular: 'Quadríceps' },
  { id: '3', nome: 'Levantamento Terra', grupoMuscular: 'Costas/Pernas' },
  { id: '4', nome: 'Desenvolvimento Militar', grupoMuscular: 'Ombros' },
  { id: '5', nome: 'Remada Curvada', grupoMuscular: 'Costas' },
  { id: '6', nome: 'Rosca Direta', grupoMuscular: 'Bíceps' },
  { id: '7', nome: 'Tríceps Corda', grupoMuscular: 'Tríceps' },
  { id: '8', nome: 'Crucifixo Inclinado', grupoMuscular: 'Peitoral' },
  { id: '9', nome: 'Stiff', grupoMuscular: 'Posteriores' },
  { id: '10', nome: 'Elevação Lateral', grupoMuscular: 'Ombros' },
];

export const JSON_EXEMPLO = {
  "plano": [
    {
      "semana": 1,
      "dias": [
        {
          "dia": "Segunda",
          "nomeTreino": "Peito e Tríceps",
          "exercicios": [
            { "id": 1, "series": 4, "repeticoes": 10, "peso": 40, "obs": "aquecimento antes" },
            { "id": 7, "series": 3, "repeticoes": 12, "peso": 15, "obs": "" },
            { "id": "custom_01", "nome": "Crossover no Cabo", "grupoMuscular": "Peitoral", "series": 3, "repeticoes": 15, "peso": 10, "obs": "finalização" }
          ]
        },
        {
          "dia": "Quarta",
          "nomeTreino": "Pernas",
          "exercicios": [
            { "id": 2, "series": 4, "repeticoes": 10, "peso": 80, "obs": "" }
          ]
        }
      ]
    }
  ]
};
