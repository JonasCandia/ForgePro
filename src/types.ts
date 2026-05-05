export type TreinoGoal = 'cutting' | 'bulking' | 'manutenção';

export interface UserProfile {
  nome: string;
  pesoAtualKg: number;
  alturaCm: number;
  objetivo: TreinoGoal;
  photoURL?: string;
  updatedAt: any;
}

export interface Exercício {
  id: string;
  nome: string;
  grupoMuscular: string;
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

export interface Workout {
  id: string;
  userId: string;
  status: 'in-progress' | 'completed';
  startTime: any;
  endTime?: any;
  nomeTreino: string;
  semana?: number;
  diaDaSemana?: string;
  goalAtTime: TreinoGoal;
}

export interface SetRecord {
  id: string;
  userId: string;
  workoutId: string;
  exerciseId: string;
  exerciseNome: string;
  setNumber: number;
  plannedReps: number;
  plannedWeight: number;
  actualReps: number;
  actualWeight: number;
  restTimeSeconds: number;
  startTime: any;
  endTime: any;
  failed: boolean;
  origem: 'Manual' | 'Plano';
  goalAtTime: TreinoGoal;
  muscleGroup: string;
}

// Keep legacy Registro for migration or display of old data if needed
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
