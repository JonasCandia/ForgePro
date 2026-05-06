/**
 * tafUtils.ts — Lógica de pontuação e conceitos do TAF CBMRS
 * Baseado na Instrução Reguladora n.º 001/Sec.Exec./GCG/2024, Anexo F
 */
import type { ConceitoTAF } from '../types';
import {
  TAF_BARRA_MASC_25_29,
  TAF_ABDOMINAL_MASC_25_29,
  TAF_CORRIDA_MASC_25_29,
} from '../constants';

/**
 * Faz lookup em uma tabela de (minValor, pontuação), ordenada do maior para o menor.
 * Retorna a pontuação correspondente ao primeiro threshold que o valor atinge.
 * Retorna 0 se ficar abaixo de todos os thresholds.
 */
function lookupPontuacao(
  tabela: ReadonlyArray<readonly [number, number]>,
  valor: number,
): number {
  for (const [min, pts] of tabela) {
    if (valor >= min) return pts;
  }
  return 0;
}

/** Converte repetições de barra fixa (masc. 25-29) → pontuação 0–10 */
export function pontuacaoBarraFixa(reps: number): number {
  return lookupPontuacao(TAF_BARRA_MASC_25_29, reps);
}

/** Converte repetições de abdominal remador em 1 min (masc. 25-29) → pontuação 0–10 */
export function pontuacaoAbdominal(reps: number): number {
  return lookupPontuacao(TAF_ABDOMINAL_MASC_25_29, reps);
}

/** Converte metros percorridos na corrida de 12 min (masc. 25-29) → pontuação 0–10 */
export function pontuacaoCorreida(metros: number): number {
  return lookupPontuacao(TAF_CORRIDA_MASC_25_29, metros);
}

/**
 * Calcula a nota final do TAF.
 * Fórmula oficial (Anexo F, IR 001/2024):
 *   Pontuação Final = (B + A + 2×C) / 4
 * onde B, A, C são as pontuações individuais (0–10).
 */
export function calcularNotaTAF(
  ptsBarra: number,
  ptsAbdominal: number,
  ptsCorreida: number,
): number {
  const nota = (ptsBarra + ptsAbdominal + 2 * ptsCorreida) / 4;
  return Math.round(nota * 10) / 10; // arredonda para 1 casa decimal
}

/**
 * Mapeia a nota final para um conceito, conforme tabela da IR.
 * EXCELENTE: 10.0
 * MUITO BOM: 8.5–9.9
 * BOM: 7.0–8.4
 * REGULAR: 5.0–6.9
 * INSUFICIENTE: < 5.0
 */
export function calcularConceitoTAF(nota: number): ConceitoTAF {
  if (nota >= 10.0) return 'Excelente';
  if (nota >= 8.5)  return 'Muito Bom';
  if (nota >= 7.0)  return 'Bom';
  if (nota >= 5.0)  return 'Regular';
  return 'Insuficiente';
}

/**
 * Retorna todas as pontuações e nota final a partir dos resultados brutos.
 */
export function calcularResultadoTAF(
  barraFixa: number,
  remadorAbdominal: number,
  corrida12min: number,
) {
  const ptsBarra    = pontuacaoBarraFixa(barraFixa);
  const ptsAbdominal = pontuacaoAbdominal(remadorAbdominal);
  const ptsCorreida = pontuacaoCorreida(corrida12min);
  const notaFinal   = calcularNotaTAF(ptsBarra, ptsAbdominal, ptsCorreida);
  const conceito    = calcularConceitoTAF(notaFinal);
  return { ptsBarra, ptsAbdominal, ptsCorreida, notaFinal, conceito };
}

/**
 * Projeta o impacto de melhorar um único exercício na nota final,
 * mantendo os outros dois valores fixos.
 */
export function projetarNotaTAF(
  campo: 'barraFixa' | 'remadorAbdominal' | 'corrida12min',
  novoValor: number,
  atual: { barraFixa: number; remadorAbdominal: number; corrida12min: number },
): number {
  const vals = { ...atual, [campo]: novoValor };
  const { notaFinal } = calcularResultadoTAF(vals.barraFixa, vals.remadorAbdominal, vals.corrida12min);
  return notaFinal;
}
