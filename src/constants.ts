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
          "dia": "Segunda-feira",
          "nomeTreino": "Upper Body (Foco Empurre)",
          "exercicios": [
            { 
              "id": "1", 
              "nome": "Supino Reto", 
              "grupoMuscular": "Peitoral", 
              "series": 4, 
              "repeticoes": 8, 
              "peso": 60, 
              "obs": "Manter técnica rigorosa" 
            },
            { 
              "id": "new_ex_01", 
              "nome": "Supino Fly Máquina", 
              "grupoMuscular": "Peitoral", 
              "series": 3, 
              "repeticoes": 12, 
              "peso": 45, 
              "obs": "Squeeze no final da contração" 
            }
          ]
        }
      ]
    }
  ]
};
