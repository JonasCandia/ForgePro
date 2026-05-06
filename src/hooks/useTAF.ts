import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workoutService } from '../lib/workoutService';
import { useAppStore } from '../store/appStore';
import type { TAFScore } from '../types';
import { calcularResultadoTAF } from '../lib/tafUtils';

export const TAF_SCORES_QUERY_KEY = 'tafScores';

export function useTAFScores() {
  const user = useAppStore((s) => s.user);
  return useQuery({
    queryKey: [TAF_SCORES_QUERY_KEY, user?.uid],
    queryFn: () => workoutService.getTAFScores(),
    enabled: !!user,
  });
}

export function useSaveTAFScore() {
  const queryClient = useQueryClient();
  const user = useAppStore((s) => s.user);

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
        ptsCorreida: ptsCorreida,
        notaFinal,
        conceito,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TAF_SCORES_QUERY_KEY, user?.uid] });
    },
  });
}

export function useDeleteTAFScore() {
  const queryClient = useQueryClient();
  const user = useAppStore((s) => s.user);

  return useMutation({
    mutationFn: (scoreId: string) => workoutService.deleteTAFScore(scoreId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TAF_SCORES_QUERY_KEY, user?.uid] });
    },
  });
}
