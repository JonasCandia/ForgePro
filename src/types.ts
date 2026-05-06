/**
 * Modalidade de movimento do exercício.
 * Determina quais métricas são registradas por série.
 * - forca_dinamica: reps + peso (padrão)
 * - peso_corporal: só reps, sem peso
 * - corrida: distância (m) + tempo (s) → pace
 * - isometria: tempo (s) + reps opcionais
 * - cardio_livre: só tempo (s)
 */
export type ModalidadeExercicio =
  | 'forca_dinamica'
  | 'peso_corporal'
  | 'corrida'
  | 'isometria'
  | 'cardio_livre';

export interface Exercício {
  id: string;
  nome: string;
  grupoMuscular: string;
  /** Modalidade de movimento — define campos exibidos no registro de séries */
  modalidade?: ModalidadeExercicio;
  modalidadeTAF?: 'barra_fixa' | 'remador_abdominal' | 'corrida_12min';
  regrasOficiais?: string;
}

/** @deprecated use WorkoutSession + WorkoutSeries */
export interface Registro {
  id: string;
  userId: string;
  data: string;
  exercicioId: string;
  exercicioNome: string;
  series: number;
  repeticoes: number;
  pesoKg: number;
  observacoes: string;
  origem?: 'Manual' | 'Plano';
  createdAt: any;
}

export interface ExercicioNoPlano {
  exercicioId: string;
  exercicioNome: string;
  seriesPlanejadas: number;
  repeticoesPlanejadas: number;
  pesoPlanejado: number;
  observacoesPlano: string;
  /** Modalidade herdada do catálogo no momento da importação */
  modalidade?: ModalidadeExercicio;
  /** Tempo planejado por série em segundos (isometria/corrida/cardio_livre) */
  tempoPlanejadoSegundos?: number;
  /** Distância planejada por série em metros (corrida) */
  distanciaPlanejadaMetros?: number;
}

export type TipoSessaoTAF =
  | 'forca'
  | 'intervalado'
  | 'circuito_taf'
  | 'corrida_longa'
  | 'descanso'
  | 'simulado'
  | 'prevencao_lesao';

export interface Plano {
  id: string;
  userId: string;
  semana: number;
  diaDaSemana: string;
  nomeTreino: string;
  exercicios: ExercicioNoPlano[];
  /** Bloco de periodização (ex.: 1 = semanas 1-4, 2 = semanas 5-8) */
  bloco?: number;
  /** Tipo de sessão para planos TAF */
  tipoSessao?: TipoSessaoTAF;
}

export interface Profile {
  uid?: string;
  nome: string;
  pesoCorporal?: number;
  altura?: number;
  objetivo?: 'cutting' | 'bulking' | 'manutencao' | 'taf';
  fotoUrl?: string;
  zeppConnected?: boolean; // reservado para integração futura Zepp Health
  createdAt?: any;
  updatedAt?: any;
}

export interface BodyMeasurement {
  id: string;
  userId: string;
  data: string; // ISO date YYYY-MM-DD
  pesoKg?: number;
  bracoCm?: number;
  cinturaCm?: number;
  quadrilCm?: number;
  pescocoCm?: number;
  createdAt?: any;
}

export interface WorkoutExerciseSummary {
  exercicioId: string;
  exercicioNome: string;
  grupoMuscular?: string;
  modalidade?: ModalidadeExercicio;
  seriesRealizadas: number;
  repeticoesReais: number;
  pesoMax: number;
  repsAtMax: number;
  volumeTotal: number;
  /** Tempo total acumulado em segundos (isometria/corrida/cardio_livre) */
  tempoTotalSegundos?: number;
  /** Distância total acumulada em metros (corrida) */
  distanciaTotalMetros?: number;
}

export interface WorkoutSession {
  id: string;
  userId: string;
  data: string;
  nomeTreino?: string;
  semana?: number;
  diaDaSemana?: string;
  planoId?: string;
  status: 'em_andamento' | 'finalizado';
  objetivo?: string;
  exerciciosSummary: WorkoutExerciseSummary[];
  /** Séries embutidas no documento (nova estrutura — elimina subcoleção series/) */
  series?: WorkoutSeries[];
  createdAt?: any;
}

export interface WorkoutSeries {
  id: string;
  workoutId: string;
  userId: string;
  exercicioId: string;
  exercicioNome: string;
  grupoMuscular?: string;
  serieNum: number;
  repeticoesPlanejadas?: number;
  pesoPlanejado?: number;
  repeticoesReais: number;
  pesoReal: number;
  falhou: boolean;
  tempoDescanso?: number;
  iniciadoEm?: string;
  finalizadoEm?: string;
  observacoes?: string;
  objetivo?: string;
  data?: string;
  /** Distância percorrida em metros (para séries de corrida/cardio) */
  distanciaMetros?: number;
  /** Duração da série em segundos (para corrida e isometria) */
  tempoSegundos?: number;
  /** Pace em min/km (calculado ou informado para corridas) */
  paceMinKm?: number;
  /** Modalidade do exercício no momento do registro */
  modalidade?: ModalidadeExercicio;
}

export type ConceitoTAF = 'Excelente' | 'Muito Bom' | 'Bom' | 'Regular' | 'Insuficiente';

export interface TAFScore {
  id: string;
  userId: string;
  /** ISO date YYYY-MM-DD */
  data: string;
  /** Repetições de barra fixa realizadas */
  barraFixa: number;
  /** Repetições de abdominal remador em 1 min */
  remadorAbdominal: number;
  /** Distância percorrida em metros na corrida de 12 min */
  corrida12min: number;
  /** Pontuação de barra (1–10 conforme tabela IR/CBMRS) */
  ptsBarra: number;
  /** Pontuação de abdominal (1–10) */
  ptsAbdominal: number;
  /** Pontuação de corrida (1–10) */
  ptsCorreida: number;
  /** Nota final: (ptsBarra + ptsAbdominal + 2×ptsCorreida) / 4 */
  notaFinal: number;
  conceito: ConceitoTAF;
  observacoes?: string;
  /** true = simulado de treino; false = teste oficial */
  simulado?: boolean;
  createdAt?: any;
}

export interface PersonalRecord {
  exercicioId: string;
  exercicioNome: string;
  grupoMuscular?: string;
  pesoMax: number;
  repsAtMax: number;
  estimado1RM: number;
  data: string;
}