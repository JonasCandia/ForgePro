import { useEffect, useState } from 'react';
import { processQueue } from '../lib/syncService';
import { useQueryClient } from '@tanstack/react-query';

/**
 * useOnlineSync — detecta mudanças de conectividade e:
 *  - Ao ficar online: processa a syncQueue e invalida todas as queries
 *  - Expõe `isOnline` para componentes mostrarem indicadores de status
 */
export function useOnlineSync() {
  const queryClient = useQueryClient();
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      await processQueue();
      // Invalidate all cached queries so data re-fetches from Firestore
      queryClient.invalidateQueries();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Process any pending items from a previous session on mount
    if (navigator.onLine) {
      processQueue().catch(console.warn);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [queryClient]);

  return { isOnline };
}
