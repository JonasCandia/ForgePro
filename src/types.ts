export interface Exercício {
  id: string;
  nome: string;
  grupoMuscular: string;
}

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