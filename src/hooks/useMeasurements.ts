import { useQuery, useQueryClient } from '@tanstack/react-query';
import { workoutService } from '../lib/workoutService';
import { useAppStore } from '../store/appStore';

export const MEASUREMENTS_QUERY_KEY = 'measurements';

export function useMeasurements() {
  const user = useAppStore((s) => s.user);
  return useQuery({
    queryKey: [MEASUREMENTS_QUERY_KEY, user?.uid],
    queryFn: () => workoutService.getMeasurements(),
    enabled: !!user,
  });
}

export function useInvalidateMeasurements() {
  const queryClient = useQueryClient();
  const user = useAppStore((s) => s.user);
  return () => queryClient.invalidateQueries({ queryKey: [MEASUREMENTS_QUERY_KEY, user?.uid] });
}
