import { useMutation } from '@tanstack/react-query';
import { workoutService } from '../lib/workoutService';
import { createUserScopedQuery } from './queryFactory';
import type { TAFScore } from '../types';
import { calcularResultadoTAF } from '../lib/tafUtils';

export const TAF_SCORES_QUERY_KEY = 'tafScores';

const { useData: useTAFScores, useInvalidate: useInvalidateTAFScores } =
  createUserScopedQuery(TAF_SCORES_QUERY_KEY, () => workoutService.getTAFScores());

export { useTAFScores, useInvalidateTAFScores };

export function useSaveTAFScore() {
  const invalidate = useInvalidateTAFScores();
  return useMutation({
    mutationFn: (
      input: Pick<TAFScore, 'data' | 'barraFixa' | 'remadorAbdominal' | 'corrida12min' | 'observacoes' | 'simulado'>
    ) => {
      const { ptsBarra, ptsAbdominal, ptsCorreida, notaFinal, conceito } =
        calcularResultadoTAF(input.barraFixa, input.remadorAbdominal, input.corrida12min);
      return workoutService.saveTAFScore({
        ...input,
        ptsBarra,
        ptsAbdominal,
        ptsCorreida,
        notaFinal,
        conceito,
      });
    },
    onSuccess: invalidate,
  });
}

export function useDeleteTAFScore() {
  const invalidate = useInvalidateTAFScores();
  return useMutation({
    mutationFn: (scoreId: string) => workoutService.deleteTAFScore(scoreId),
    onSuccess: invalidate,
  });
}
