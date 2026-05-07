/**
 * exercicioUtils.ts — Utilitários para modalidades de exercício
 */
import type { ModalidadeExercicio, Exercício, WorkoutSeries, WorkoutExerciseSummary } from '../types';

/** Retorna a modalidade do exercício, defaultando para forca_dinamica */
export function getModalidade(ex: Pick<Exercício, 'modalidade'>): ModalidadeExercicio {
  return ex.modalidade ?? 'forca_dinamica';
}

/** Retorna true para modalidades que não usam carga (peso) */
export function isCardioModalidade(mod: ModalidadeExercicio): boolean {
  return mod === 'corrida' || mod === 'cardio_livre' || mod === 'isometria';
}

/** Converte segundos para string "MM:SS" ou "H:MM:SS" */
export function formatarTempo(segundos: number): string {
  if (!segundos || segundos <= 0) return '0:00';
  const h = Math.floor(segundos / 3600);
  const m = Math.floor((segundos % 3600) / 60);
  const s = Math.floor(segundos % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Calcula pace em min/km a partir de distância (metros) e tempo (segundos) */
export function calcularPace(distanciaMetros: number, tempoSegundos: number): string {
  if (!distanciaMetros || !tempoSegundos) return '–';
  const minPerKm = (tempoSegundos / 60) / (distanciaMetros / 1000);
  const min = Math.floor(minPerKm);
  const sec = Math.round((minPerKm - min) * 60);
  return `${min}:${String(sec).padStart(2, '0')}/km`;
}

/** Formata distância em metros: "1500m" ou "2.5km" */
export function formatarDistancia(metros: number): string {
  if (metros >= 1000) return `${(metros / 1000).toFixed(metros % 1000 === 0 ? 0 : 1)}km`;
  return `${metros}m`;
}

/**
 * Formata o resultado de uma série para exibição no histórico.
 * Ex: "12 × 80kg" | "1.5km em 8:30 (5:40/km)" | "45s" | "15 rep"
 */
export function formatarSerie(serie: Pick<WorkoutSeries, 'repeticoesReais' | 'pesoReal' | 'distanciaMetros' | 'tempoSegundos' | 'paceMinKm' | 'modalidade'>): string {
  const mod = serie.modalidade ?? 'forca_dinamica';
  switch (mod) {
    case 'forca_dinamica':
      return `${serie.repeticoesReais ?? 0} × ${serie.pesoReal ?? 0}kg`;
    case 'peso_corporal':
      return `${serie.repeticoesReais ?? 0} rep`;
    case 'corrida': {
      const dist = serie.distanciaMetros ? formatarDistancia(serie.distanciaMetros) : '–';
      const tempo = serie.tempoSegundos ? `em ${formatarTempo(serie.tempoSegundos)}` : '';
      const pace = serie.distanciaMetros && serie.tempoSegundos
        ? ` (${calcularPace(serie.distanciaMetros, serie.tempoSegundos)})`
        : '';
      return `${dist} ${tempo}${pace}`.trim();
    }
    case 'isometria': {
      const tempo = serie.tempoSegundos ? formatarTempo(serie.tempoSegundos) : '–';
      const reps = serie.repeticoesReais ? ` × ${serie.repeticoesReais}` : '';
      return `${tempo}${reps}`;
    }
    case 'cardio_livre':
      return serie.tempoSegundos ? formatarTempo(serie.tempoSegundos) : '–';
    default:
      return `${serie.repeticoesReais ?? 0} × ${serie.pesoReal ?? 0}kg`;
  }
}

/**
 * Formata o resumo de um exercício (WorkoutExerciseSummary) para exibição.
 */
export function formatarResumoExercicio(summary: {
  modalidade?: ModalidadeExercicio;
  seriesRealizadas: number;
  repeticoesReais: number;
  pesoMax: number;
  tempoTotalSegundos?: number;
  distanciaTotalMetros?: number;
}): string {
  const mod = summary.modalidade ?? 'forca_dinamica';
  const s = summary.seriesRealizadas;
  switch (mod) {
    case 'forca_dinamica':
      return `${s}×${summary.repeticoesReais} @ ${summary.pesoMax}kg`;
    case 'peso_corporal':
      return `${s}×${summary.repeticoesReais}`;
    case 'corrida': {
      const dist = summary.distanciaTotalMetros ? formatarDistancia(summary.distanciaTotalMetros) : '–';
      const tempo = summary.tempoTotalSegundos ? formatarTempo(summary.tempoTotalSegundos) : '';
      const pace = summary.distanciaTotalMetros && summary.tempoTotalSegundos
        ? ` · ${calcularPace(summary.distanciaTotalMetros, summary.tempoTotalSegundos)}`
        : '';
      return `${dist}${tempo ? ` em ${tempo}` : ''}${pace}`;
    }
    case 'isometria': {
      const tempo = summary.tempoTotalSegundos ? formatarTempo(summary.tempoTotalSegundos) : '–';
      return `${s}s · ${tempo} total`;
    }
    case 'cardio_livre':
      return summary.tempoTotalSegundos ? formatarTempo(summary.tempoTotalSegundos) : '–';
    default:
      return `${s}×${summary.repeticoesReais} @ ${summary.pesoMax}kg`;
  }
}

/** Labels para os inputs de série por modalidade */
export const COLUNAS_SERIE: Record<ModalidadeExercicio, Array<{ key: string; label: string; unit?: string }>> = {
  forca_dinamica: [
    { key: 'repeticoes', label: 'Reps' },
    { key: 'pesoKg', label: 'Peso', unit: 'kg' },
  ],
  peso_corporal: [
    { key: 'repeticoes', label: 'Reps' },
  ],
  corrida: [
    { key: 'distanciaMetros', label: 'Dist.', unit: 'm' },
    { key: 'tempoSegundos', label: 'Tempo', unit: 's' },
  ],
  isometria: [
    { key: 'tempoSegundos', label: 'Tempo', unit: 's' },
    { key: 'repeticoes', label: 'Reps (opc.)' },
  ],
  cardio_livre: [
    { key: 'tempoSegundos', label: 'Tempo', unit: 's' },
  ],
};

/** Texto de label da modalidade para exibição */
export const LABEL_MODALIDADE: Record<ModalidadeExercicio, string> = {
  forca_dinamica: 'Força (reps × kg)',
  peso_corporal: 'Peso corporal',
  corrida: 'Corrida',
  isometria: 'Isometria',
  cardio_livre: 'Cardio',
};

// ─── Summary builders ─────────────────────────────────────────────────────────

export interface RawSerieInput {
  peso: number;
  reps: number;
  tempoSegundos?: number;
  distanciaMetros?: number;
}

/**
 * Constrói um WorkoutExerciseSummary a partir de séries brutas de um único exercício.
 */
export function buildExercicioSummary(
  base: {
    exercicioId: string;
    exercicioNome: string;
    grupoMuscular: string;
    modalidade: ModalidadeExercicio;
  },
  series: RawSerieInput[]
): WorkoutExerciseSummary {
  const isCardio = isCardioModalidade(base.modalidade);
  const maxEntry = series.reduce(
    (best, s) => s.peso > best.peso ? s : best,
    series[0] ?? { peso: 0, reps: 0 }
  );
  const tempoTotal = series.reduce((sum, s) => sum + (s.tempoSegundos ?? 0), 0);
  const distanciaTotal = series.reduce((sum, s) => sum + (s.distanciaMetros ?? 0), 0);
  return {
    exercicioId: base.exercicioId,
    exercicioNome: base.exercicioNome,
    grupoMuscular: base.grupoMuscular,
    modalidade: base.modalidade,
    seriesRealizadas: series.length,
    repeticoesReais: series.reduce((sum, s) => sum + s.reps, 0),
    pesoMax: isCardio ? 0 : (maxEntry?.peso ?? 0),
    repsAtMax: isCardio ? 0 : (maxEntry?.reps ?? 0),
    volumeTotal: isCardio ? 0 : series.reduce((sum, s) => sum + s.peso * s.reps, 0),
    ...(tempoTotal ? { tempoTotalSegundos: tempoTotal } : {}),
    ...(distanciaTotal ? { distanciaTotalMetros: distanciaTotal } : {}),
  };
}

/**
 * Agrupa WorkoutSeries[] por exercício e constrói o array de WorkoutExerciseSummary.
 * Usado em updateWorkout para recalcular o summary após edição de séries.
 */
export function buildSummaryFromSeries(series: WorkoutSeries[]): WorkoutExerciseSummary[] {
  const map = new Map<string, { base: Parameters<typeof buildExercicioSummary>[0]; items: RawSerieInput[] }>();
  for (const s of series) {
    const mod = s.modalidade ?? 'forca_dinamica';
    if (!map.has(s.exercicioId)) {
      map.set(s.exercicioId, {
        base: { exercicioId: s.exercicioId, exercicioNome: s.exercicioNome, grupoMuscular: s.grupoMuscular, modalidade: mod },
        items: [],
      });
    }
    map.get(s.exercicioId)!.items.push({
      peso: s.pesoReal,
      reps: s.repeticoesReais,
      tempoSegundos: s.tempoSegundos,
      distanciaMetros: s.distanciaMetros,
    });
  }
  return [...map.values()].map(({ base, items }) => buildExercicioSummary(base, items));
}
