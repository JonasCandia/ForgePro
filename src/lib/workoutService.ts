import {
  collection,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  getDocs,
  serverTimestamp,
  setDoc,
  getDoc,
  writeBatch,
  arrayUnion,
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { handleFirestoreError, OperationType } from './firestoreUtils';
import {
  Exercício,
  Plano,
  WorkoutSession,
  WorkoutSeries,
  WorkoutExerciseSummary,
  Profile,
  BodyMeasurement,
} from '../types';
import { MOCK_EXERCICIOS } from '../constants';
import {
  cacheWorkouts, getCachedWorkouts,
  cacheExercises, getCachedExercises,
  cacheMeasurements, getCachedMeasurements,
} from './localDb';
import { isOnline, offlineSaveMeasurement, offlineSaveManualWorkout } from './syncService';

const EXERCICIOS_COL = 'exercicios';
const PLANOS_COL = 'planos';
const WORKOUTS_COL = 'workouts';
const USERS_COL = 'users';
const MEASUREMENTS_COL = 'measurements';

/** Gera ID único client-side */
function genId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export const workoutService = {

  // ===== PROFILE (stored directly in users/{uid} document) =====

  async getUserProfile(): Promise<Profile | null> {
    if (!auth.currentUser) return null;
    try {
      const snap = await getDoc(doc(db, USERS_COL, auth.currentUser.uid));
      return snap.exists() ? (snap.data() as Profile) : null;
    } catch (error) {
      console.warn('Failed to get user profile:', error);
      return null;
    }
  },

  async saveUserProfile(data: Omit<Profile, 'uid' | 'createdAt'>): Promise<void> {
    if (!auth.currentUser) throw new Error('User must be logged in');
    try {
      const ref = doc(db, USERS_COL, auth.currentUser.uid);
      const existing = await getDoc(ref);
      await setDoc(
        ref,
        {
          ...data,
          uid: auth.currentUser.uid,
          updatedAt: serverTimestamp(),
          ...(existing.exists() ? {} : { createdAt: serverTimestamp() }),
        },
        { merge: true }
      );
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.WRITE,
        `${USERS_COL}/${auth.currentUser.uid}`
      );
    }
  },

  // ===== EXERCISES =====

  async seedExercises() {
    try {
      const snapshot = await getDocs(collection(db, EXERCICIOS_COL));
      if (snapshot.empty) {
        const batch = writeBatch(db);
        for (const ex of MOCK_EXERCICIOS) {
          const { id, ...data } = ex;
          batch.set(doc(db, EXERCICIOS_COL, id), data);
        }
        await batch.commit();
      }
    } catch (error) {
      console.warn('Failed to seed exercises:', error);
    }
  },

  async getExercises(): Promise<Exercício[]> {
    try {
      const q = query(collection(db, EXERCICIOS_COL));
      const snapshot = await getDocs(q);
      const exercises = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Exercício));
      // Cache for offline use
      cacheExercises(exercises).catch(() => {});
      return exercises;
    } catch (error) {
      // Firestore failed — try IndexedDB cache
      const cached = await getCachedExercises();
      if (cached.length > 0) return cached;
      handleFirestoreError(error, OperationType.LIST, EXERCICIOS_COL);
      return [];
    }
  },

  async createExercicio(data: { nome: string; grupoMuscular: string }): Promise<string> {
    try {
      const ref = doc(collection(db, EXERCICIOS_COL));
      await setDoc(ref, data);
      return ref.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, EXERCICIOS_COL);
      throw error;
    }
  },

  // ===== WORKOUTS (users/{uid}/workouts/{id} — series[] embutido) =====

  async createActiveWorkout(data: {
    nomeTreino?: string;
    semana?: number;
    diaDaSemana?: string;
    planoId?: string;
    objetivo?: string;
  }): Promise<string> {
    if (!auth.currentUser) throw new Error('User must be logged in');
    const uid = auth.currentUser.uid;
    try {
      const ref = doc(collection(db, USERS_COL, uid, WORKOUTS_COL));
      await setDoc(ref, {
        ...data,
        userId: uid,
        data: new Date().toISOString(),
        status: 'em_andamento',
        exerciciosSummary: [],
        series: [],
        createdAt: serverTimestamp(),
      });
      return ref.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `${USERS_COL}/${uid}/${WORKOUTS_COL}`);
      throw error;
    }
  },

  async getActiveWorkout(): Promise<WorkoutSession | null> {
    if (!auth.currentUser) return null;
    const uid = auth.currentUser.uid;
    try {
      const q = query(
        collection(db, USERS_COL, uid, WORKOUTS_COL),
        where('status', '==', 'em_andamento')
      );
      const snap = await getDocs(q);
      if (snap.empty) return null;
      const d = snap.docs[0];
      return { id: d.id, ...d.data() } as WorkoutSession;
    } catch (error) {
      console.warn('Failed to get active workout:', error);
      return null;
    }
  },

  async addSeries(workoutId: string, seriesData: Omit<WorkoutSeries, 'id' | 'workoutId' | 'userId'>): Promise<string> {
    if (!auth.currentUser) throw new Error('User must be logged in');
    const uid = auth.currentUser.uid;
    const seriesId = genId();
    const series: WorkoutSeries = { id: seriesId, workoutId, userId: uid, ...seriesData };
    try {
      await updateDoc(doc(db, USERS_COL, uid, WORKOUTS_COL, workoutId), {
        series: arrayUnion(series),
      });
      return seriesId;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `${USERS_COL}/${uid}/${WORKOUTS_COL}/${workoutId}`);
      throw error;
    }
  },

  async getSeriesForWorkout(workoutId: string): Promise<WorkoutSeries[]> {
    if (!auth.currentUser) return [];
    const uid = auth.currentUser.uid;
    try {
      const snap = await getDoc(doc(db, USERS_COL, uid, WORKOUTS_COL, workoutId));
      if (!snap.exists()) return [];
      return (snap.data().series || []) as WorkoutSeries[];
    } catch (error) {
      console.warn('Failed to get series for workout:', error);
      return [];
    }
  },

  async finalizeWorkout(
    workoutId: string,
    exerciciosSummary: WorkoutExerciseSummary[]
  ): Promise<void> {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;
    try {
      await updateDoc(doc(db, USERS_COL, uid, WORKOUTS_COL, workoutId), {
        status: 'finalizado',
        exerciciosSummary,
        finalizadoEm: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `${USERS_COL}/${uid}/${WORKOUTS_COL}/${workoutId}`);
    }
  },

  async saveManualWorkout(
    data: {
      nomeTreino?: string;
      entries: Array<{
        exercicioId: string;
        exercicioNome: string;
        grupoMuscular?: string;
        series: number;
        repeticoes: number;
        pesoKg: number;
        observacoes?: string;
      }>;
    },
    objetivo?: string
  ): Promise<void> {
    if (!auth.currentUser) throw new Error('User must be logged in');
    if (!isOnline()) {
      await offlineSaveManualWorkout(data, objetivo);
      return;
    }
    const uid = auth.currentUser.uid;
    const now = new Date().toISOString();
    try {
      const workoutId = genId();
      const seriesArr: WorkoutSeries[] = [];
      for (const e of data.entries) {
        for (let s = 1; s <= e.series; s++) {
          seriesArr.push({
            id: genId(),
            workoutId,
            userId: uid,
            exercicioId: e.exercicioId,
            exercicioNome: e.exercicioNome,
            grupoMuscular: e.grupoMuscular || '',
            serieNum: s,
            repeticoesReais: e.repeticoes,
            pesoReal: e.pesoKg,
            falhou: false,
            observacoes: e.observacoes || '',
            objetivo: objetivo || undefined,
            data: now,
          });
        }
      }
      await setDoc(doc(db, USERS_COL, uid, WORKOUTS_COL, workoutId), {
        userId: uid,
        data: now,
        nomeTreino: data.nomeTreino || 'Treino Manual',
        status: 'finalizado',
        objetivo: objetivo || null,
        series: seriesArr,
        exerciciosSummary: data.entries.map(
          (e): WorkoutExerciseSummary => ({
            exercicioId: e.exercicioId,
            exercicioNome: e.exercicioNome,
            grupoMuscular: e.grupoMuscular || '',
            seriesRealizadas: e.series,
            repeticoesReais: e.repeticoes,
            pesoMax: e.pesoKg,
            repsAtMax: e.repeticoes,
            volumeTotal: e.pesoKg * e.repeticoes * e.series,
          })
        ),
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `${USERS_COL}/${uid}/${WORKOUTS_COL}`);
    }
  },

  async getWorkouts(): Promise<WorkoutSession[]> {
    if (!auth.currentUser) return [];
    const uid = auth.currentUser.uid;
    try {
      const q = query(
        collection(db, USERS_COL, uid, WORKOUTS_COL),
        where('status', '==', 'finalizado'),
        orderBy('data', 'desc')
      );
      const snap = await getDocs(q);
      const workouts = snap.docs.map(d => ({ id: d.id, ...d.data() } as WorkoutSession));
      cacheWorkouts(uid, workouts).catch(() => {});
      return workouts;
    } catch (error) {
      const cached = await getCachedWorkouts(uid);
      if (cached.length > 0) return cached;
      handleFirestoreError(error, OperationType.LIST, `${USERS_COL}/${uid}/${WORKOUTS_COL}`);
      return [];
    }
  },

  async deleteWorkout(workoutId: string): Promise<void> {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;
    try {
      await deleteDoc(doc(db, USERS_COL, uid, WORKOUTS_COL, workoutId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${USERS_COL}/${uid}/${WORKOUTS_COL}/${workoutId}`);
    }
  },

  // ===== PLANS (users/{uid}/planos/{id}) =====

  async importPlanMerge(planData: any): Promise<void> {
    if (!auth.currentUser) throw new Error('User must be logged in');
    const userId = auth.currentUser.uid;
    try {
      const exercises = await this.getExercises();
      const exMap = new Map<string, Exercício>(exercises.map(ex => [String(ex.id), ex] as [string, Exercício]));

      // Pre-pass: auto-create unknown exercises, or throw if name is missing
      for (const semanaData of planData.plano) {
        for (const diaData of semanaData.dias) {
          for (const ex of diaData.exercicios) {
            const exId = String(ex.id);
            if (!exMap.has(exId)) {
              if (!ex.nome) {
                throw new Error(
                  `Exercício com ID "${exId}" não encontrado no catálogo e o JSON não inclui o campo "nome". ` +
                    `Adicione "nome" e "grupoMuscular" ao exercício ou verifique o ID.`
                );
              }
              const newId = await this.createExercicio({
                nome: ex.nome,
                grupoMuscular: ex.grupoMuscular || 'Geral',
              });
              const newEx: Exercício = {
                id: newId,
                nome: ex.nome,
                grupoMuscular: ex.grupoMuscular || 'Geral',
              };
              exMap.set(exId, newEx);
              exMap.set(newId, newEx);
            }
          }
        }
      }

      // Delete existing docs for weeks being imported (merge by week number)
      const weeksToImport = [...new Set(planData.plano.map((p: any) => p.semana))];
      const existingSnap = await getDocs(collection(db, USERS_COL, userId, PLANOS_COL));
      const deleteBatch = writeBatch(db);
      for (const d of existingSnap.docs) {
        if (weeksToImport.includes(d.data().semana)) deleteBatch.delete(d.ref);
      }
      await deleteBatch.commit();

      const insertBatch = writeBatch(db);
      for (const semanaData of planData.plano) {
        for (const diaData of semanaData.dias) {
          const ref = doc(collection(db, USERS_COL, userId, PLANOS_COL));
          insertBatch.set(ref, {
            userId,
            semana: semanaData.semana,
            diaDaSemana: diaData.dia,
            nomeTreino: diaData.nomeTreino,
            exercicios: diaData.exercicios.map((ex: any) => {
              const exId = String(ex.id);
              const catalogEx = exMap.get(exId);
              return {
                exercicioId: exId,
                exercicioNome: catalogEx?.nome || ex.nome || 'Exercício Desconhecido',
                seriesPlanejadas: ex.series,
                repeticoesPlanejadas: ex.repeticoes,
                pesoPlanejado: ex.peso,
                observacoesPlano: ex.obs || '',
              };
            }),
          });
        }
      }
      await insertBatch.commit();
    } catch (error) {
      if (error instanceof Error) throw error;
      handleFirestoreError(error, OperationType.WRITE, `${USERS_COL}/${userId}/${PLANOS_COL}`);
    }
  },

  async importPlan(planData: any): Promise<void> {
    return this.importPlanMerge(planData);
  },

  async exportPlan(): Promise<any> {
    const planos = await this.getPlanos();
    if (planos.length === 0) return null;
    const semanas = [...new Set(planos.map(p => p.semana))].sort(
      (a, b) => Number(a) - Number(b)
    );
    return {
      plano: semanas.map(semana => {
        const diasPlanos = planos.filter(p => p.semana === semana);
        return {
          semana,
          dias: diasPlanos.map(p => ({
            dia: p.diaDaSemana,
            nomeTreino: p.nomeTreino,
            exercicios: p.exercicios.map(ex => ({
              id: ex.exercicioId,
              series: ex.seriesPlanejadas,
              repeticoes: ex.repeticoesPlanejadas,
              peso: ex.pesoPlanejado,
              obs: ex.observacoesPlano,
            })),
          })),
        };
      }),
    };
  },

  async getPlanos(): Promise<Plano[]> {
    if (!auth.currentUser) return [];
    const uid = auth.currentUser.uid;
    try {
      const snap = await getDocs(collection(db, USERS_COL, uid, PLANOS_COL));
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as Plano));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, `${USERS_COL}/${uid}/${PLANOS_COL}`);
      return [];
    }
  },

  // ===== MEASUREMENTS (users/{uid}/measurements/{YYYY-MM} — entries[] embutido) =====

  async getMeasurements(): Promise<BodyMeasurement[]> {
    if (!auth.currentUser) return [];
    const uid = auth.currentUser.uid;
    try {
      const snap = await getDocs(collection(db, USERS_COL, uid, MEASUREMENTS_COL));
      const all: BodyMeasurement[] = [];
      for (const d of snap.docs) {
        const entries = (d.data().entries || []) as BodyMeasurement[];
        all.push(...entries);
      }
      all.sort((a, b) => a.data.localeCompare(b.data));
      cacheMeasurements(all).catch(() => {});
      return all;
    } catch (error) {
      const cached = await getCachedMeasurements(uid);
      if (cached.length > 0) return cached;
      handleFirestoreError(error, OperationType.LIST, `${USERS_COL}/${uid}/${MEASUREMENTS_COL}`);
      return [];
    }
  },

  async saveMeasurement(data: Omit<BodyMeasurement, 'id' | 'userId' | 'createdAt'>): Promise<string> {
    if (!auth.currentUser) throw new Error('User must be logged in');
    if (!isOnline()) return offlineSaveMeasurement(data);
    const uid = auth.currentUser.uid;
    const id = `m_${genId()}`;
    const monthKey = data.data.slice(0, 7); // YYYY-MM
    const measurement: BodyMeasurement = {
      id,
      userId: uid,
      createdAt: new Date().toISOString(),
      ...data,
    };
    try {
      await setDoc(
        doc(db, USERS_COL, uid, MEASUREMENTS_COL, monthKey),
        { entries: arrayUnion(measurement) },
        { merge: true }
      );
      return id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `${USERS_COL}/${uid}/${MEASUREMENTS_COL}/${monthKey}`);
      throw error;
    }
  },

};

