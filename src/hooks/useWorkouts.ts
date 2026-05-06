import { useQuery, useQueryClient } from '@tanstack/react-query';
import { workoutService } from '../lib/workoutService';
import { useAppStore } from '../store/appStore';

export const WORKOUTS_QUERY_KEY = 'workouts';

export function useWorkouts() {
  const user = useAppStore((s) => s.user);
  return useQuery({
    queryKey: [WORKOUTS_QUERY_KEY, user?.uid],
    queryFn: () => workoutService.getWorkouts(),
    enabled: !!user,
  });
}

export function useInvalidateWorkouts() {
  const queryClient = useQueryClient();
  const user = useAppStore((s) => s.user);
  return () => queryClient.invalidateQueries({ queryKey: [WORKOUTS_QUERY_KEY, user?.uid] });
}
