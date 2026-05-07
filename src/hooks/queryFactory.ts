import { useQuery, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';
import { useAppStore } from '../store/appStore';

type ExtraOptions<T> = Pick<
  UseQueryOptions<T>,
  'staleTime' | 'retry' | 'gcTime' | 'refetchOnWindowFocus'
>;

/**
 * Factory que encapsula o padrão repetido de useQuery + useInvalidate
 * para queries escopadas por usuário (queryKey = [key, user?.uid]).
 */
export function createUserScopedQuery<T>(
  key: string,
  queryFn: () => Promise<T>,
  options?: ExtraOptions<T>
) {
  function useData() {
    const user = useAppStore((s) => s.user);
    return useQuery({
      queryKey: [key, user?.uid] as [string, string | undefined],
      queryFn,
      enabled: !!user,
      ...options,
    });
  }

  function useInvalidate() {
    const queryClient = useQueryClient();
    const user = useAppStore((s) => s.user);
    return () => queryClient.invalidateQueries({ queryKey: [key, user?.uid] });
  }

  return { useData, useInvalidate };
}
