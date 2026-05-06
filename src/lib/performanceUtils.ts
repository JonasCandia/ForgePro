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
