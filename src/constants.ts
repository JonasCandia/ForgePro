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

// ─── TAF — Tabelas por faixa etária e sexo (estimativas baseadas na IR 001/2024) ──
// Apenas MASC_25_29 é verificada diretamente da regulação; demais são estimativas
// baseadas no padrão de ajuste por faixa etária do CBMRS.

type TAFTable = ReadonlyArray<readonly [number, number]>;

/** Cria tabela com thresholds deslocados por `delta` (positivo = mais fácil). */
function shiftTable(base: TAFTable, delta: number): TAFTable {
  return base
    .map(([min, pts]) => [min + delta, pts] as const)
    .filter(([min]) => min > 0);
}

// ── Barra Fixa ──────────────────────────────────────────────────────────────
export const TAF_BARRA_MASC_18_24 = shiftTable(TAF_BARRA_MASC_25_29,  1);
// TAF_BARRA_MASC_25_29 already exported above
export const TAF_BARRA_MASC_30_34 = shiftTable(TAF_BARRA_MASC_25_29, -2);
export const TAF_BARRA_MASC_35_39 = shiftTable(TAF_BARRA_MASC_25_29, -4);
export const TAF_BARRA_MASC_40_44 = shiftTable(TAF_BARRA_MASC_25_29, -6);
export const TAF_BARRA_MASC_45_MAIS = shiftTable(TAF_BARRA_MASC_25_29, -7);

export const TAF_BARRA_FEM_18_24   = shiftTable(TAF_BARRA_MASC_25_29, -5);
export const TAF_BARRA_FEM_25_29   = shiftTable(TAF_BARRA_MASC_25_29, -6);
export const TAF_BARRA_FEM_30_34   = shiftTable(TAF_BARRA_MASC_25_29, -7);
export const TAF_BARRA_FEM_35_39   = shiftTable(TAF_BARRA_MASC_25_29, -8);
export const TAF_BARRA_FEM_40_44   = shiftTable(TAF_BARRA_MASC_25_29, -9);
export const TAF_BARRA_FEM_45_MAIS = shiftTable(TAF_BARRA_MASC_25_29, -10);

// ── Abdominal Remador ────────────────────────────────────────────────────────
export const TAF_ABDOMINAL_MASC_18_24   = shiftTable(TAF_ABDOMINAL_MASC_25_29,  2);
// TAF_ABDOMINAL_MASC_25_29 already exported above
export const TAF_ABDOMINAL_MASC_30_34   = shiftTable(TAF_ABDOMINAL_MASC_25_29, -2);
export const TAF_ABDOMINAL_MASC_35_39   = shiftTable(TAF_ABDOMINAL_MASC_25_29, -4);
export const TAF_ABDOMINAL_MASC_40_44   = shiftTable(TAF_ABDOMINAL_MASC_25_29, -8);
export const TAF_ABDOMINAL_MASC_45_MAIS = shiftTable(TAF_ABDOMINAL_MASC_25_29, -10);

export const TAF_ABDOMINAL_FEM_18_24    = shiftTable(TAF_ABDOMINAL_MASC_25_29, -14);
export const TAF_ABDOMINAL_FEM_25_29    = shiftTable(TAF_ABDOMINAL_MASC_25_29, -16);
export const TAF_ABDOMINAL_FEM_30_34    = shiftTable(TAF_ABDOMINAL_MASC_25_29, -18);
export const TAF_ABDOMINAL_FEM_35_39    = shiftTable(TAF_ABDOMINAL_MASC_25_29, -20);
export const TAF_ABDOMINAL_FEM_40_44    = shiftTable(TAF_ABDOMINAL_MASC_25_29, -24);
export const TAF_ABDOMINAL_FEM_45_MAIS  = shiftTable(TAF_ABDOMINAL_MASC_25_29, -26);

// ── Corrida 12 min ──────────────────────────────────────────────────────────
export const TAF_CORRIDA_MASC_18_24   = shiftTable(TAF_CORRIDA_MASC_25_29,   100);
// TAF_CORRIDA_MASC_25_29 already exported above
export const TAF_CORRIDA_MASC_30_34   = shiftTable(TAF_CORRIDA_MASC_25_29,  -100);
export const TAF_CORRIDA_MASC_35_39   = shiftTable(TAF_CORRIDA_MASC_25_29,  -250);
export const TAF_CORRIDA_MASC_40_44   = shiftTable(TAF_CORRIDA_MASC_25_29,  -400);
export const TAF_CORRIDA_MASC_45_MAIS = shiftTable(TAF_CORRIDA_MASC_25_29,  -500);

export const TAF_CORRIDA_FEM_18_24    = shiftTable(TAF_CORRIDA_MASC_25_29,  -600);
export const TAF_CORRIDA_FEM_25_29    = shiftTable(TAF_CORRIDA_MASC_25_29,  -700);
export const TAF_CORRIDA_FEM_30_34    = shiftTable(TAF_CORRIDA_MASC_25_29,  -800);
export const TAF_CORRIDA_FEM_35_39    = shiftTable(TAF_CORRIDA_MASC_25_29,  -900);
export const TAF_CORRIDA_FEM_40_44    = shiftTable(TAF_CORRIDA_MASC_25_29, -1050);
export const TAF_CORRIDA_FEM_45_MAIS  = shiftTable(TAF_CORRIDA_MASC_25_29, -1150);

/** Lookup unificado de tabelas por `sexo_faixa`. */
export const TAF_TABLES: Record<string, { barra: TAFTable; abdominal: TAFTable; corrida: TAFTable }> = {
  M_18_24:   { barra: TAF_BARRA_MASC_18_24,   abdominal: TAF_ABDOMINAL_MASC_18_24,   corrida: TAF_CORRIDA_MASC_18_24 },
  M_25_29:   { barra: TAF_BARRA_MASC_25_29,   abdominal: TAF_ABDOMINAL_MASC_25_29,   corrida: TAF_CORRIDA_MASC_25_29 },
  M_30_34:   { barra: TAF_BARRA_MASC_30_34,   abdominal: TAF_ABDOMINAL_MASC_30_34,   corrida: TAF_CORRIDA_MASC_30_34 },
  M_35_39:   { barra: TAF_BARRA_MASC_35_39,   abdominal: TAF_ABDOMINAL_MASC_35_39,   corrida: TAF_CORRIDA_MASC_35_39 },
  M_40_44:   { barra: TAF_BARRA_MASC_40_44,   abdominal: TAF_ABDOMINAL_MASC_40_44,   corrida: TAF_CORRIDA_MASC_40_44 },
  M_45_mais: { barra: TAF_BARRA_MASC_45_MAIS, abdominal: TAF_ABDOMINAL_MASC_45_MAIS, corrida: TAF_CORRIDA_MASC_45_MAIS },
  F_18_24:   { barra: TAF_BARRA_FEM_18_24,    abdominal: TAF_ABDOMINAL_FEM_18_24,    corrida: TAF_CORRIDA_FEM_18_24 },
  F_25_29:   { barra: TAF_BARRA_FEM_25_29,    abdominal: TAF_ABDOMINAL_FEM_25_29,    corrida: TAF_CORRIDA_FEM_25_29 },
  F_30_34:   { barra: TAF_BARRA_FEM_30_34,    abdominal: TAF_ABDOMINAL_FEM_30_34,    corrida: TAF_CORRIDA_FEM_30_34 },
  F_35_39:   { barra: TAF_BARRA_FEM_35_39,    abdominal: TAF_ABDOMINAL_FEM_35_39,    corrida: TAF_CORRIDA_FEM_35_39 },
  F_40_44:   { barra: TAF_BARRA_FEM_40_44,    abdominal: TAF_ABDOMINAL_FEM_40_44,    corrida: TAF_CORRIDA_FEM_40_44 },
  F_45_mais: { barra: TAF_BARRA_FEM_45_MAIS,  abdominal: TAF_ABDOMINAL_FEM_45_MAIS,  corrida: TAF_CORRIDA_FEM_45_MAIS },
};

export const MOCK_EXERCICIOS: Exercício[] = [
  // ── Catálogo base ─────────────────────────────────────────────────────────
  { id: '1',  nome: 'Supino Reto',              grupoMuscular: 'Peitoral' },
  { id: '2',  nome: 'Agachamento Livre',         grupoMuscular: 'Quadríceps' },
  { id: '3',  nome: 'Levantamento Terra',        grupoMuscular: 'Costas/Pernas' },
  { id: '4',  nome: 'Desenvolvimento Militar',   grupoMuscular: 'Ombros' },
  { id: '5',  nome: 'Remada Curvada',            grupoMuscular: 'Costas' },
  { id: '6',  nome: 'Rosca Direta',              grupoMuscular: 'Bíceps' },
  { id: '7',  nome: 'Tríceps Corda',             grupoMuscular: 'Tríceps' },
  { id: '8',  nome: 'Crucifixo Inclinado',       grupoMuscular: 'Peitoral' },
  { id: '9',  nome: 'Stiff',                     grupoMuscular: 'Posteriores' },
  { id: '10', nome: 'Elevação Lateral',          grupoMuscular: 'Ombros' },

  // ── TAF — Exercícios oficiais ──────────────────────────────────────────────
  {
    id: 'custom_b01',
    nome: 'Barra Fixa',
    grupoMuscular: 'Dorsais/Braços',
    modalidade: 'peso_corporal',
    modalidadeTAF: 'barra_fixa',
    regrasOficiais: 'Queixo acima da barra; extensão total dos braços no retorno; sem balanço do corpo.',
  },
  {
    id: 'custom_ab01',
    nome: 'Abdominal Remador',
    grupoMuscular: 'Abdominal',
    modalidade: 'peso_corporal',
    modalidadeTAF: 'remador_abdominal',
    regrasOficiais: 'Mãos atrás da cabeça; cotovelos tocam os joelhos; braços passam lateralmente pelas pernas; retorno completo ao solo.',
  },

  // ── Peito ──────────────────────────────────────────────────────────────────
  { id: 'custom_supino_barra',     nome: 'Supino Barra',            grupoMuscular: 'Peitoral',            modalidade: 'forca_dinamica' },
  { id: 'custom_supino_halt',      nome: 'Supino com Halteres',     grupoMuscular: 'Peitoral',            modalidade: 'forca_dinamica' },

  // ── Costas ─────────────────────────────────────────────────────────────────
  { id: 'custom_polia_alta',       nome: 'Puxada Polia Alta Pronada',  grupoMuscular: 'Dorsais',          modalidade: 'forca_dinamica' },
  { id: 'custom_remada_curv',      nome: 'Remada Curvada Barra',       grupoMuscular: 'Costas',           modalidade: 'forca_dinamica' },

  // ── Pernas ─────────────────────────────────────────────────────────────────
  { id: 'custom_agach_front',      nome: 'Agachamento Frontal',        grupoMuscular: 'Quadríceps/Glúteos', modalidade: 'forca_dinamica' },
  { id: 'custom_agach_hack',       nome: 'Agachamento Hack',           grupoMuscular: 'Quadríceps/Glúteos', modalidade: 'forca_dinamica' },
  { id: 'custom_agach_bulgaro',    nome: 'Agachamento Búlgaro',        grupoMuscular: 'Quadríceps/Glúteos', modalidade: 'peso_corporal' },
  { id: 'custom_terra_rom_halt',   nome: 'Terra Romeno com Halteres',  grupoMuscular: 'Posterior/Glúteos',  modalidade: 'forca_dinamica' },
  { id: 'custom_terra_rom_barra',  nome: 'Terra Romeno com Barra',     grupoMuscular: 'Posterior/Glúteos',  modalidade: 'forca_dinamica' },
  // IDs canônicos usados no plano TAF (custom_ponte01 / custom_nordic01)
  { id: 'custom_ponte01',          nome: 'Ponte de Glúteo com Mini Band', grupoMuscular: 'Glúteos',        modalidade: 'peso_corporal' },
  { id: 'custom_nordic01',         nome: 'Nordic Hamstring Curl (Excêntrico)', grupoMuscular: 'Posterior de Coxa', modalidade: 'peso_corporal' },

  // ── Core ───────────────────────────────────────────────────────────────────
  { id: 'custom_c01',              nome: 'Prancha Isométrica',         grupoMuscular: 'Core',               modalidade: 'isometria' },
  { id: 'custom_c02',              nome: 'Prancha com Peso',           grupoMuscular: 'Core',               modalidade: 'isometria' },
  { id: 'custom_prancha_perna',    nome: 'Prancha com Elevação de Perna', grupoMuscular: 'Core/Glúteos',   modalidade: 'peso_corporal' },

  // ── Estabilização / Prevenção ──────────────────────────────────────────────
  { id: 'custom_equil01',          nome: 'Equilíbrio Unipodal (Olhos Fechados)', grupoMuscular: 'Estabilização', modalidade: 'isometria' },

  // ── Ombros / Rotadores Escapulares ────────────────────────────────────────
  { id: 'custom_desenv_halt',      nome: 'Desenvolvimento com Halteres', grupoMuscular: 'Ombros',          modalidade: 'forca_dinamica' },
  { id: 'custom_face_pull',        nome: 'Face Pull',                  grupoMuscular: 'Rotadores Escapulares', modalidade: 'forca_dinamica' },
  { id: 'custom_band_pull',        nome: 'Band Pull Apart',            grupoMuscular: 'Rotadores Escapulares', modalidade: 'peso_corporal' },

  // ── Bíceps ────────────────────────────────────────────────────────────────
  { id: 'custom_rosca_martelo',    nome: 'Rosca Martelo',              grupoMuscular: 'Bíceps',             modalidade: 'forca_dinamica' },
  { id: 'custom_rosca_inclinada',  nome: 'Rosca Inclinada',            grupoMuscular: 'Bíceps',             modalidade: 'forca_dinamica' },

  // ── Panturrilha ───────────────────────────────────────────────────────────
  { id: 'custom_panturrilha',      nome: 'Elevação de Calcanhares',    grupoMuscular: 'Panturrilha',         modalidade: 'peso_corporal' },
  { id: 'custom_panturrilha_halt', nome: 'Elevação de Calcanhares com Halteres', grupoMuscular: 'Panturrilha', modalidade: 'forca_dinamica' },

  // ── Mobilidade de Quadril ─────────────────────────────────────────────────
  { id: 'custom_hip_9090',         nome: 'Hip 90/90 (Mobilidade)',     grupoMuscular: 'Mobilidade/Quadril',  modalidade: 'isometria' },
  { id: 'custom_pigeon_pose',      nome: 'Pigeon Pose (Alongamento)',  grupoMuscular: 'Mobilidade/Quadril',  modalidade: 'isometria' },

  // ── Cardio / Corrida ───────────────────────────────────────────────────────
  { id: 'custom_aq',               nome: 'Aquecimento',               grupoMuscular: 'Full Body',           modalidade: 'cardio_livre' },
  { id: 'custom_along',            nome: 'Alongamento',               grupoMuscular: 'Flexibilidade',       modalidade: 'cardio_livre' },
  { id: 'custom_r01',              nome: 'Corrida Intervalada',       grupoMuscular: 'Cardio',              modalidade: 'corrida' },
  { id: 'custom_r02',              nome: 'Corrida Contínua',          grupoMuscular: 'Cardio',              modalidade: 'cardio_livre' },
  { id: 'custom_r03',              nome: 'Corrida de Velocidade',     grupoMuscular: 'Cardio',              modalidade: 'corrida' },
  { id: 'custom_r04',              nome: 'Corrida Ritmo TAF',         grupoMuscular: 'Cardio',              modalidade: 'corrida' },
];

export const PROMPT_ESPC = `Converta o plano de treino que vou descrever para o formato JSON abaixo. Não invente exercícios, séries ou cargas — use exatamente o que eu informar.

## ESTRUTURA DO JSON
\`\`\`
{
  "plano": [
    {
      "semana": 1,
      "dias": [
        {
          "dia": "Treino A",          // nome livre da sessão (ex: "Pernas", "Peito", "Simulado TAF")
          "nomeTreino": "...",        // título descritivo
          "exercicios": [
            {
              "id": 1,                // ID numérico se for exercício do catálogo; string se for personalizado
              "nome": "...",          // obrigatório se id for string
              "grupoMuscular": "...", // obrigatório se id for string
              "series": 3,           // número inteiro
              "repeticoes": 10,      // número inteiro; use 0 para exercícios baseados em tempo
              "peso": 40,            // kg (decimal permitido, ex: 42.5); 0 para peso corporal
              "obs": ""              // observações opcionais
            }
          ]
        }
      ]
    }
  ]
}
\`\`\`

## REGRAS
- \`"dia"\`: nome descritivo livre — NÃO use dias da semana ("Segunda", "Terça")
- \`"series"\`, \`"repeticoes"\`, \`"peso"\`: sempre números, NUNCA strings
- Para tempo (isometria, corrida): \`"repeticoes": 0\` e informe o tempo em \`"obs"\`
- Responda APENAS com o JSON, sem explicações ou texto adicional

## MEU PLANO
`;


export const JSON_EXEMPLO = {
  "plano": [
    {
      "semana": 1,
      "dias": [
        {
          "dia": "Treino A",
          "diaSugerido": "Segunda",
          "nomeTreino": "Peito e Tríceps",
          "exercicios": [
            { "id": 1, "series": 4, "repeticoes": 10, "peso": 40, "obs": "aquecimento antes" },
            { "id": 7, "series": 3, "repeticoes": 12, "peso": 15, "obs": "" },
            { "id": "custom_01", "nome": "Crossover no Cabo", "grupoMuscular": "Peitoral", "series": 3, "repeticoes": 15, "peso": 10, "obs": "finalização" }
          ]
        },
        {
          "dia": "Treino B",
          "diaSugerido": "Quarta",
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
          "dia": "Treino A",
          "diaSugerido": "Segunda",
          "nomeTreino": "Peito e Tríceps (sobrecarga)",
          "exercicios": [
            { "id": 1, "series": 4, "repeticoes": 10, "peso": 42.5, "obs": "" },
            { "id": 7, "series": 3, "repeticoes": 12, "peso": 17.5, "obs": "" },
            { "id": "custom_01", "nome": "Crossover no Cabo", "grupoMuscular": "Peitoral", "series": 3, "repeticoes": 15, "peso": 12, "obs": "" }
          ]
        },
        {
          "dia": "Treino B",
          "diaSugerido": "Quarta",
          "nomeTreino": "Pernas (sobrecarga)",
          "exercicios": [
            { "id": 2, "series": 4, "repeticoes": 10, "peso": 82.5, "obs": "" }
          ]
        }
      ]
    }
  ]
};
