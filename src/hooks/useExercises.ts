import { useQuery } from '@tanstack/react-query';
import { workoutService } from '../lib/workoutService';
import { useAppStore } from '../store/appStore';

export const EXERCISES_QUERY_KEY = 'exercises';

export function useExercises() {
  const user = useAppStore((s) => s.user);
  return useQuery({
    queryKey: [EXERCISES_QUERY_KEY],
    queryFn: () => workoutService.getExercises(),
    enabled: !!user,
    staleTime: 10 * 60 * 1000, // exercícios raramente mudam; revalida a cada 10 min
  });
}
