import { Exercício } from './types';

// ─── TAF CBMRS — Tabelas oficiais (Anexo F, IR 001/Sec.Exec./GCG/2024) ────────
// Faixa etária 25-29 anos, masculino

/**
 * Tabela de barra fixa — masculino, 25-29 anos.
 * Cada tupla: [minReps, pontuacao]
 * Ordenado do maior para o menor para facilitar lookup.
 */
export const TAF_BARRA_MASC_25_29: ReadonlyArray<readonly [number, number]> = [
  [14, 10.0],
  [13, 9.5],
  [12, 9.0],
  [11, 8.5],
  [10, 8.0],
  [9,  7.5],
  [8,  7.0],
  [7,  6.5],
  [6,  6.0],
  [5,  5.5],
  [4,  5.0],
  [3,  4.5],
  [2,  3.5],
  [1,  1.0],
] as const;

/**
 * Tabela de abdominal remador — masculino, 25-29 anos.
 * Cada tupla: [minReps, pontuacao]
 */
export const TAF_ABDOMINAL_MASC_25_29: ReadonlyArray<readonly [number, number]> = [
  [46, 10.0],
  [45, 9.5],
  [44, 9.0],
  [43, 8.5],
  [42, 8.0],
  [41, 7.5],
  [40, 7.0],
  [39, 6.5],
  [38, 6.0],
  [37, 5.5],
  [36, 5.0],
  [35, 4.5],
  [34, 4.0],
  [33, 3.5],
  [32, 3.0],
  [31, 2.5],
  [30, 2.0],
  [29, 1.5],
  [28, 1.0],
] as const;

/**
 * Tabela de corrida 12 min — masculino, 25-29 anos.
 * Cada tupla: [minMetros, pontuacao]
 */
export const TAF_CORRIDA_MASC_25_29: ReadonlyArray<readonly [number, number]> = [
  [3100, 10.0],
  [3050, 9.8],
  [3000, 9.6],
  [2950, 9.4],
  [2900, 9.2],
  [2850, 9.0],
  [2800, 8.8],
  [2750, 8.6],
  [2700, 8.4],
  [2650, 8.2],
  [2600, 8.0],
  [2550, 7.8],
  [2500, 7.6],
  [2450, 7.4],
  [2400, 7.2],
  [2350, 7.0],
  [2300, 6.8],
  [2250, 6.6],
  [2200, 6.4],
  [2150, 6.2],
  [2100, 6.0],
  [2050, 5.8],
  [2000, 5.6],
  [1950, 5.4],
  [1900, 5.2],
  [1850, 5.0],
  [1800, 4.8],
  [1750, 4.6],
  [1700, 4.4],
  [1650, 4.2],
  [1600, 4.0],
  [1550, 3.8],
  [1500, 3.6],
  [1450, 3.4],
  [1400, 3.2],
  [1350, 3.0],
  [1300, 2.8],
  [1250, 2.6],
  [1200, 2.4],
  [1150, 2.2],
  [1100, 2.0],
  [1050, 1.9],
  [1000, 1.8],
  [950,  1.7],
  [900,  1.6],
  [850,  1.0],
] as const;

/** Thresholds de conceito por nota final (Anexo F, seção 1) */
export const TAF_CONCEITO_THRESHOLDS = {
  Excelente:  10.0,
  'Muito Bom': 8.5,
  Bom:         7.0,
  Regular:     5.0,
  Insuficiente: 0.0,
} as const;

/** Metas do plano de 8 semanas (conceito Muito Bom, 25-29 anos) */
export const TAF_METAS_MUITO_BOM = {
  barraFixa:       10, // ≥10 reps → 8.0 pts
  remadorAbdominal: 39, // ≥39 reps → 6.5 pts (nota final precisa ser ≥8.5)
  corrida12min:    2850, // ≥2850 m → 9.0 pts
} as const;



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
    },
    {
      "semana": 2,
      "dias": [
        {
          "dia": "Segunda",
          "nomeTreino": "Peito e Tríceps (sobrecarga)",
          "exercicios": [
            { "id": 1, "series": 4, "repeticoes": 10, "peso": 42.5, "obs": "" },
            { "id": 7, "series": 3, "repeticoes": 12, "peso": 17.5, "obs": "" },
            { "id": "custom_01", "nome": "Crossover no Cabo", "grupoMuscular": "Peitoral", "series": 3, "repeticoes": 15, "peso": 12, "obs": "" }
          ]
        },
        {
          "dia": "Quarta",
          "nomeTreino": "Pernas (sobrecarga)",
          "exercicios": [
            { "id": 2, "series": 4, "repeticoes": 10, "peso": 82.5, "obs": "" }
          ]
        }
      ]
    }
  ]
};
