import { useQuery, useQueryClient } from '@tanstack/react-query';
import { workoutService } from '../lib/workoutService';
import { useAppStore } from '../store/appStore';

export const PROFILE_QUERY_KEY = 'profile';

export function useProfile() {
  const user = useAppStore((s) => s.user);
  return useQuery({
    queryKey: [PROFILE_QUERY_KEY, user?.uid],
    queryFn: () => workoutService.getUserProfile(),
    enabled: !!user,
    retry: 1,
  });
}

export function useInvalidateProfile() {
  const queryClient = useQueryClient();
  const user = useAppStore((s) => s.user);
  return () => queryClient.invalidateQueries({ queryKey: [PROFILE_QUERY_KEY, user?.uid] });
}
