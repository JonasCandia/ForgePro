/**
 * Estimativas de 1RM (Repetição Máxima) usando quatro fórmulas clássicas.
 * Válidas para séries entre 1 e 15 repetições.
 */

export interface Estimativas1RM {
  epley: number;
  brzycki: number;
  lander: number;
  oconner: number;
  media: number;
}

/**
 * Calcula estimativas de 1RM pelas quatro fórmulas e retorna a média arredondada.
 * Retorna o peso original se reps estiver fora do intervalo válido (1–15).
 */
export function calcular1RMDetalhado(peso: number, reps: number): Estimativas1RM {
  if (reps <= 0 || reps > 15 || peso <= 0) {
    return { epley: peso, brzycki: peso, lander: peso, oconner: peso, media: peso };
  }

  const epley   = Math.round(peso * (1 + reps / 30) * 10) / 10;
  const brzycki = Math.round(peso * (36 / (37 - reps)) * 10) / 10;
  const lander  = Math.round((peso * 100) / (101.3 - 2.67123 * reps) * 10) / 10;
  const oconner = Math.round(peso * (1 + 0.025 * reps) * 10) / 10;
  const media   = Math.round(((epley + brzycki + lander + oconner) / 4) * 10) / 10;

  return { epley, brzycki, lander, oconner, media };
}

/**
 * Retorna apenas a média arredondada das quatro fórmulas de 1RM.
 * Substitui diretamente a antiga função `calcularERM`.
 */
export function calcular1RM(peso: number, reps: number): number {
  return calcular1RMDetalhado(peso, reps).media;
}

// ========== Projeção de PR ==========

export interface ProjecaoPR {
  pesoAlvo: number;
  semanas: number;
  slopeKgPorSemana: number;
}

/**
 * Estima quando o usuário vai bater o próximo PR com base na taxa de progressão recente.
 * Usa regressão linear sobre os últimos 8 pontos do histórico.
 * Retorna null se houver menos de 4 pontos ou se a progressão for zero/negativa.
 */
export function projetarPR(
  historico: { data: string; pesoMax: number }[]
): ProjecaoPR | null {
  if (historico.length < 4) return null;

  const sorted = historico
    .slice()
    .sort((a, b) => a.data.localeCompare(b.data))
    .slice(-8);

  const n = sorted.length;
  const baseDate = new Date(sorted[0].data).getTime();
  const MS_POR_SEMANA = 7 * 24 * 60 * 60 * 1000;

  const pontos = sorted.map(p => ({
    x: (new Date(p.data).getTime() - baseDate) / MS_POR_SEMANA,
    y: p.pesoMax,
  }));

  const sumX = pontos.reduce((acc, p) => acc + p.x, 0);
  const sumY = pontos.reduce((acc, p) => acc + p.y, 0);
  const sumXY = pontos.reduce((acc, p) => acc + p.x * p.y, 0);
  const sumX2 = pontos.reduce((acc, p) => acc + p.x * p.x, 0);

  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return null;

  const slope = (n * sumXY - sumX * sumY) / denom;
  if (slope <= 0) return null;

  const prAtual = sorted[sorted.length - 1].pesoMax;
  const incremento = 2.5;
  const pesoAlvo = Math.ceil(prAtual / incremento + 1) * incremento;
  const semanas = Math.ceil((pesoAlvo - prAtual) / slope);

  return {
    pesoAlvo,
    semanas,
    slopeKgPorSemana: Math.round(slope * 100) / 100,
  };
}
