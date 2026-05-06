/**
 * localDb.ts — IndexedDB via Dexie.js
 *
 * Usado como camada de cache offline para:
 *   - workouts (WorkoutSession finalizadas)
 *   - series   (WorkoutSeries por workout)
 *   - measurements (BodyMeasurement)
 *   - exercises (Exercício — catálogo)
 *   - syncQueue — operações pendentes para sincronizar com Firestore
 */
import Dexie, { type Table } from 'dexie';
import type { WorkoutSession, WorkoutSeries, BodyMeasurement, Exercício } from '../types';

// ─── SyncQueue ────────────────────────────────────────────────────────────────

export type SyncOperation = 'saveMeasurement' | 'saveManualWorkout';

export interface SyncQueueItem {
  id?: number;          // auto-increment PK
  operation: SyncOperation;
  payload: any;
  userId: string;
  timestamp: number;
  retries: number;
}

// ─── Dexie DB ────────────────────────────────────────────────────────────────

/** WorkoutSession cached locally; _userId is a denormalised index for fast lookup */
export type CachedWorkout = WorkoutSession & { _userId: string };

class ForgeProDB extends Dexie {
  workouts!: Table<CachedWorkout>;
  series!: Table<WorkoutSeries>;
  measurements!: Table<BodyMeasurement>;
  exercises!: Table<Exercício>;
  syncQueue!: Table<SyncQueueItem>;

  constructor() {
    super('forgepro_v1');
    this.version(1).stores({
      workouts:     'id, _userId, status, data',
      series:       'id, workoutId, userId',
      measurements: 'id, userId, data',
      exercises:    'id, nome',
      syncQueue:    '++id, operation, userId, timestamp',
    });
  }
}

export const localDb = new ForgeProDB();

// ─── Cache helpers ────────────────────────────────────────────────────────────

export async function cacheWorkouts(userId: string, workouts: WorkoutSession[]) {
  const items: CachedWorkout[] = workouts.map(w => ({ ...w, _userId: userId }));
  await localDb.workouts.bulkPut(items);
}

export async function getCachedWorkouts(userId: string): Promise<WorkoutSession[]> {
  const items = await localDb.workouts.where('_userId').equals(userId).toArray();
  return items.map(({ _userId, ...w }) => w as WorkoutSession);
}

export async function cacheExercises(exercises: Exercício[]) {
  await localDb.exercises.bulkPut(exercises);
}

export async function getCachedExercises(): Promise<Exercício[]> {
  return localDb.exercises.toArray();
}

export async function cacheMeasurements(userId: string, measurements: BodyMeasurement[]) {
  await localDb.measurements.bulkPut(measurements);
}

export async function getCachedMeasurements(userId: string): Promise<BodyMeasurement[]> {
  return localDb.measurements.where('userId').equals(userId).sortBy('data');
}

export async function cacheSeries(series: WorkoutSeries[]) {
  await localDb.series.bulkPut(series);
}

export async function getCachedSeries(workoutId: string): Promise<WorkoutSeries[]> {
  return localDb.series.where('workoutId').equals(workoutId).toArray();
}

// ─── SyncQueue helpers ────────────────────────────────────────────────────────

export async function enqueueSync(item: Omit<SyncQueueItem, 'id'>): Promise<void> {
  await localDb.syncQueue.add(item);
}

export async function getPendingSyncItems(): Promise<SyncQueueItem[]> {
  return localDb.syncQueue.orderBy('timestamp').toArray();
}

export async function removeSyncItem(id: number): Promise<void> {
  await localDb.syncQueue.delete(id);
}

export async function incrementSyncRetry(id: number): Promise<void> {
  await localDb.syncQueue.where('id').equals(id).modify(item => {
    item.retries += 1;
  });
}
