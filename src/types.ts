export interface Exercício {
  id: string;
  nome: string;
  grupoMuscular: string;
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
}

export interface Plano {
  id: string;
  userId: string;
  semana: number;
  diaDaSemana: string;
  nomeTreino: string;
  exercicios: ExercicioNoPlano[];
}

export interface Profile {
  uid?: string;
  nome: string;
  pesoCorporal?: number;
  altura?: number;
  objetivo?: 'cutting' | 'bulking' | 'manutencao';
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
  seriesRealizadas: number;
  repeticoesReais: number;
  pesoMax: number;
  repsAtMax: number;
  volumeTotal: number;
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