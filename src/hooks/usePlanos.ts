import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workoutService } from '../lib/workoutService';
import { useAppStore } from '../store/appStore';
import type { Plano } from '../types';

export const PLANOS_QUERY_KEY = 'planos';

export function usePlanos() {
  const user = useAppStore((s) => s.user);
  return useQuery({
    queryKey: [PLANOS_QUERY_KEY, user?.uid],
    queryFn: () => workoutService.getPlanos(),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
}

export function useInvalidatePlanos() {
  const qc = useQueryClient();
  const user = useAppStore((s) => s.user);
  return () => qc.invalidateQueries({ queryKey: [PLANOS_QUERY_KEY, user?.uid] });
}

export function useUpdatePlano() {
  const qc = useQueryClient();
  const user = useAppStore((s) => s.user);
  return useMutation({
    mutationFn: (plano: Plano) => workoutService.updatePlano(plano),
    onSuccess: () => qc.invalidateQueries({ queryKey: [PLANOS_QUERY_KEY, user?.uid] }),
  });
}

export function useDeletePlano() {
  const qc = useQueryClient();
  const user = useAppStore((s) => s.user);
  return useMutation({
    mutationFn: (planoId: string) => workoutService.deletePlano(planoId),
    onSuccess: () => qc.invalidateQueries({ queryKey: [PLANOS_QUERY_KEY, user?.uid] }),
  });
}
