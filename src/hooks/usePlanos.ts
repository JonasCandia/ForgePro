import { useQuery } from '@tanstack/react-query';
import { workoutService } from '../lib/workoutService';
import { useAppStore } from '../store/appStore';

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
