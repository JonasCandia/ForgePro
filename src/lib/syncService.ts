/**
 * syncService.ts
 *
 * Processa a fila de operações offline (syncQueue do IndexedDB)
 * e escreve no Firestore quando a conexão é restaurada.
 *
 * Para evitar dependência circular com workoutService, este arquivo
 * chama o Firestore diretamente para as operações da fila.
 */
import { doc, setDoc, arrayUnion } from 'firebase/firestore';
import { db, auth } from './firebase';
import {
  getPendingSyncItems,
  removeSyncItem,
  incrementSyncRetry,
  enqueueSync,
  localDb,
} from './localDb';
import type { BodyMeasurement } from '../types';

const MAX_RETRIES = 5;

// ─── Public: enqueue offline writes ──────────────────────────────────────────

export async function offlineSaveMeasurement(
  data: Omit<BodyMeasurement, 'id' | 'userId' | 'createdAt'>
): Promise<string> {
  if (!auth.currentUser) throw new Error('User must be logged in');
  const uid = auth.currentUser.uid;

  // Persist locally immediately with a temp id
  const tempId = `local_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const localItem: BodyMeasurement = { id: tempId, userId: uid, createdAt: null, ...data };
  await localDb.measurements.put(localItem);

  // Enqueue for later sync
  await enqueueSync({
    operation: 'saveMeasurement',
    payload: data,
    userId: uid,
    timestamp: Date.now(),
    retries: 0,
  });

  return tempId;
}

export async function offlineSaveManualWorkout(
  payload: any,
  objetivo?: string
): Promise<void> {
  if (!auth.currentUser) throw new Error('User must be logged in');
  await enqueueSync({
    operation: 'saveManualWorkout',
    payload: { data: payload, objetivo },
    userId: auth.currentUser.uid,
    timestamp: Date.now(),
    retries: 0,
  });
}

// ─── processQueue ─────────────────────────────────────────────────────────────

let _processing = false;

export async function processQueue(): Promise<void> {
  if (_processing) return;
  if (!navigator.onLine) return;
  if (!auth.currentUser) return;

  _processing = true;
  try {
    const items = await getPendingSyncItems();
    for (const item of items) {
      if (item.retries >= MAX_RETRIES) {
        console.warn('[syncService] Dropping item after max retries:', item);
        await removeSyncItem(item.id!);
        continue;
      }

      try {
        if (item.operation === 'saveMeasurement') {
          const uid = item.userId;
          const data = item.payload as Omit<BodyMeasurement, 'id' | 'userId' | 'createdAt'>;
          const id = `m_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
          const monthKey = data.data.slice(0, 7); // YYYY-MM
          const measurement: BodyMeasurement = { id, userId: uid, createdAt: new Date().toISOString(), ...data };
          await setDoc(
            doc(db, 'users', uid, 'measurements', monthKey),
            { entries: arrayUnion(measurement) },
            { merge: true }
          );
        } else if (item.operation === 'saveManualWorkout') {
          // Lazy-import to avoid circular dep
          const { workoutService } = await import('./workoutService');
          await workoutService.saveManualWorkout(item.payload.data, item.payload.objetivo);
        }

        await removeSyncItem(item.id!);
      } catch (err) {
        console.warn('[syncService] Failed to sync item, will retry:', err);
        await incrementSyncRetry(item.id!);
      }
    }
  } finally {
    _processing = false;
  }
}

// ─── isOnline helper ──────────────────────────────────────────────────────────

export function isOnline(): boolean {
  return navigator.onLine;
}
