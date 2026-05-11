import { useMutation } from '@tanstack/react-query';
import { workoutService } from '../lib/workoutService';
import { createUserScopedQuery } from './queryFactory';
import type { Plano } from '../types';

export const PLANOS_QUERY_KEY = 'planos';

const { useData: usePlanos, useInvalidate: useInvalidatePlanos } =
  createUserScopedQuery(PLANOS_QUERY_KEY, () => workoutService.getPlanos(), {
    staleTime: 5 * 60 * 1000,
  });

export { usePlanos, useInvalidatePlanos };

export function useUpdatePlano() {
  const invalidate = useInvalidatePlanos();
  return useMutation({
    mutationFn: (plano: Plano) => workoutService.updatePlano(plano),
    onSuccess: invalidate,
  });
}

export function useDeletePlano() {
  const invalidate = useInvalidatePlanos();
  return useMutation({
    mutationFn: (planoId: string) => workoutService.deletePlano(planoId),
    onSuccess: invalidate,
  });
}

export function useDeleteAllPlanos() {
  const invalidate = useInvalidatePlanos();
  return useMutation({
    mutationFn: () => workoutService.deleteAllPlanos(),
    onSuccess: invalidate,
  });
}

export function useDeleteManyPlanos() {
  const invalidate = useInvalidatePlanos();
  return useMutation({
    mutationFn: (ids: string[]) => workoutService.deleteManyPlanos(ids),
    onSuccess: invalidate,
  });
}
