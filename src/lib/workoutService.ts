import {
  collection,
  addDoc,
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
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { handleFirestoreError, OperationType } from './firestoreUtils';
import {
  Registro,
  Exercício,
  Plano,
  WorkoutSession,
  WorkoutSeries,
  WorkoutExerciseSummary,
  Profile,
} from '../types';
import { MOCK_EXERCICIOS } from '../constants';

const REGISTROS_COL = 'registros';
const EXERCICIOS_COL = 'exercicios';
const PLANOS_COL = 'planos';
const WORKOUTS_COL = 'workouts';
const SERIES_COL = 'series';
const USERS_COL = 'users';

export const workoutService = {

  // ===== PROFILE =====

  async getUserProfile(): Promise<Profile | null> {
    if (!auth.currentUser) return null;
    try {
      const ref = doc(db, USERS_COL, auth.currentUser.uid, 'profile', 'data');
      const snap = await getDoc(ref);
      return snap.exists() ? (snap.data() as Profile) : null;
    } catch (error) {
      console.warn('Failed to get user profile:', error);
      return null;
    }
  },

  async saveUserProfile(data: Omit<Profile, 'uid' | 'createdAt'>): Promise<void> {
    if (!auth.currentUser) throw new Error('User must be logged in');
    try {
      const ref = doc(db, USERS_COL, auth.currentUser.uid, 'profile', 'data');
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
        `${USERS_COL}/${auth.currentUser.uid}/profile`
      );
    }
  },

  // ===== EXERCISES =====

  async seedExercises() {
    try {
      const q = query(collection(db, EXERCICIOS_COL));
      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        for (const ex of MOCK_EXERCICIOS) {
          const { id, ...data } = ex;
          await setDoc(doc(db, EXERCICIOS_COL, id), data);
        }
      }
    } catch (error) {
      console.warn('Failed to seed exercises:', error);
    }
  },

  async getExercises(): Promise<Exercício[]> {
    try {
      const q = query(collection(db, EXERCICIOS_COL));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Exercício));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, EXERCICIOS_COL);
      return [];
    }
  },

  async createExercicio(data: { nome: string; grupoMuscular: string }): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, EXERCICIOS_COL), data);
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, EXERCICIOS_COL);
      throw error;
    }
  },

  // ===== WORKOUTS (new structure) =====

  async createActiveWorkout(data: {
    nomeTreino?: string;
    semana?: number;
    diaDaSemana?: string;
    planoId?: string;
    objetivo?: string;
  }): Promise<string> {
    if (!auth.currentUser) throw new Error('User must be logged in');
    try {
      const docRef = await addDoc(collection(db, WORKOUTS_COL), {
        ...data,
        userId: auth.currentUser.uid,
        data: new Date().toISOString(),
        status: 'em_andamento',
        exerciciosSummary: [],
        createdAt: serverTimestamp(),
      });
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, WORKOUTS_COL);
      throw error;
    }
  },

  async getActiveWorkout(): Promise<WorkoutSession | null> {
    if (!auth.currentUser) return null;
    try {
      const q = query(
        collection(db, WORKOUTS_COL),
        where('userId', '==', auth.currentUser.uid),
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
    try {
      const docRef = await addDoc(
        collection(db, WORKOUTS_COL, workoutId, SERIES_COL),
        { ...seriesData, workoutId, userId: auth.currentUser.uid }
      );
      return docRef.id;
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.CREATE,
        `${WORKOUTS_COL}/${workoutId}/${SERIES_COL}`
      );
      throw error;
    }
  },

  async getSeriesForWorkout(workoutId: string): Promise<WorkoutSeries[]> {
    try {
      const q = query(collection(db, WORKOUTS_COL, workoutId, SERIES_COL));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as WorkoutSeries));
    } catch (error) {
      console.warn('Failed to get series for workout:', error);
      return [];
    }
  },

  async finalizeWorkout(
    workoutId: string,
    exerciciosSummary: WorkoutExerciseSummary[]
  ): Promise<void> {
    try {
      await updateDoc(doc(db, WORKOUTS_COL, workoutId), {
        status: 'finalizado',
        exerciciosSummary,
        finalizadoEm: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `${WORKOUTS_COL}/${workoutId}`);
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
    const uid = auth.currentUser.uid;
    const now = new Date().toISOString();
    try {
      const workoutRef = await addDoc(collection(db, WORKOUTS_COL), {
        userId: uid,
        data: now,
        nomeTreino: data.nomeTreino || 'Treino Manual',
        status: 'finalizado',
        objetivo: objetivo || null,
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

      for (const e of data.entries) {
        for (let s = 1; s <= e.series; s++) {
          await addDoc(collection(db, WORKOUTS_COL, workoutRef.id, SERIES_COL), {
            workoutId: workoutRef.id,
            userId: uid,
            exercicioId: e.exercicioId,
            exercicioNome: e.exercicioNome,
            grupoMuscular: e.grupoMuscular || '',
            serieNum: s,
            repeticoesReais: e.repeticoes,
            pesoReal: e.pesoKg,
            falhou: false,
            observacoes: e.observacoes || '',
            objetivo: objetivo || null,
            data: now,
          } as Omit<WorkoutSeries, 'id'>);
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, WORKOUTS_COL);
    }
  },

  async getWorkouts(): Promise<WorkoutSession[]> {
    if (!auth.currentUser) return [];
    try {
      const q = query(
        collection(db, WORKOUTS_COL),
        where('userId', '==', auth.currentUser.uid),
        where('status', '==', 'finalizado'),
        orderBy('data', 'desc')
      );
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as WorkoutSession));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, WORKOUTS_COL);
      return [];
    }
  },

  async deleteWorkout(workoutId: string): Promise<void> {
    try {
      const seriesSnap = await getDocs(
        collection(db, WORKOUTS_COL, workoutId, SERIES_COL)
      );
      const batch = writeBatch(db);
      seriesSnap.docs.forEach(d => batch.delete(d.ref));
      batch.delete(doc(db, WORKOUTS_COL, workoutId));
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${WORKOUTS_COL}/${workoutId}`);
    }
  },

  // ===== PLANS =====

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
      for (const semana of weeksToImport) {
        const q = query(
          collection(db, PLANOS_COL),
          where('userId', '==', userId),
          where('semana', '==', semana)
        );
        const snapshot = await getDocs(q);
        for (const d of snapshot.docs) {
          await deleteDoc(doc(db, PLANOS_COL, d.id));
        }
      }

      for (const semanaData of planData.plano) {
        for (const diaData of semanaData.dias) {
          await addDoc(collection(db, PLANOS_COL), {
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
    } catch (error) {
      if (error instanceof Error) throw error;
      handleFirestoreError(error, OperationType.WRITE, PLANOS_COL);
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
    try {
      const q = query(
        collection(db, PLANOS_COL),
        where('userId', '==', auth.currentUser.uid)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Plano));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, PLANOS_COL);
      return [];
    }
  },

  // ===== LEGACY (kept for any remaining usages) =====

  async addRegistro(registro: Omit<Registro, 'id' | 'createdAt' | 'userId'>) {
    if (!auth.currentUser) throw new Error('User must be logged in');
    try {
      const docRef = await addDoc(collection(db, REGISTROS_COL), {
        ...registro,
        userId: auth.currentUser.uid,
        createdAt: serverTimestamp(),
      });
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, REGISTROS_COL);
    }
  },

  async getRegistros(): Promise<Registro[]> {
    if (!auth.currentUser) return [];
    try {
      const q = query(
        collection(db, REGISTROS_COL),
        where('userId', '==', auth.currentUser.uid),
        orderBy('data', 'desc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Registro));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, REGISTROS_COL);
      return [];
    }
  },

  async deleteRegistro(id: string) {
    try {
      await deleteDoc(doc(db, REGISTROS_COL, id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${REGISTROS_COL}/${id}`);
    }
  },
};

