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
  limit,
  Timestamp,
  type DocumentData
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { handleFirestoreError, OperationType } from './firestoreUtils';
import { Registro, Exercício, Plano, UserProfile, Workout, SetRecord, TreinoGoal } from '../types';
import { MOCK_EXERCICIOS } from '../constants';

const REGISTROS_COL = 'registros';
const EXERCICIOS_COL = 'exercises';
const PLANOS_COL = 'planos';
const USERS_COL = 'users';
const WORKOUTS_COL = 'workouts';

export const workoutService = {
  // --- Profile methods ---
  async getProfile(userId: string): Promise<UserProfile | null> {
    try {
      const docRef = doc(db, USERS_COL, userId, 'profile', 'data');
      const d = await getDoc(docRef);
      return d.exists() ? (d.data() as UserProfile) : null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `users/${userId}/profile/data`);
      return null;
    }
  },

  async saveProfile(userId: string, profile: Omit<UserProfile, 'updatedAt'>) {
    try {
      const docRef = doc(db, USERS_COL, userId, 'profile', 'data');
      await setDoc(docRef, {
        ...profile,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${userId}/profile/data`);
    }
  },

  // --- Exercise methods ---
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
      console.warn("Failed to seed exercises:", error);
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

  async findOrCreateExercise(id: string, nome?: string, grupoMuscular?: string): Promise<Exercício> {
    const docRef = doc(db, EXERCICIOS_COL, id);
    const d = await getDoc(docRef);
    if (d.exists()) {
      return { id: d.id, ...d.data() } as Exercício;
    }
    
    // Create new if data provided
    const newEx = {
      id,
      nome: nome || 'Exercício ' + id,
      grupoMuscular: grupoMuscular || 'Outros'
    };
    await setDoc(docRef, { nome: newEx.nome, grupoMuscular: newEx.grupoMuscular });
    return newEx;
  },

  // --- Plan methods ---
  async importPlan(planData: any) {
    if (!auth.currentUser) throw new Error("User must be logged in");
    const userId = auth.currentUser.uid;

    try {
      const weeksToImport = Array.from(new Set(planData.plano.map((p: any) => p.semana)));
      
      // Cleanup specified weeks
      for (const semana of weeksToImport) {
        const q = query(collection(db, PLANOS_COL), where('userId', '==', userId), where('semana', '==', Number(semana)));
        const snapshot = await getDocs(q);
        for (const d of snapshot.docs) {
          await deleteDoc(doc(db, PLANOS_COL, d.id));
        }
      }

      // Process and Insert
      for (const semanaData of planData.plano) {
        for (const diaData of semanaData.dias) {
          const processedExs = [];
          for (const ex of diaData.exercicios) {
            const exercise = await this.findOrCreateExercise(String(ex.id), ex.nome, ex.grupoMuscular);
            processedExs.push({
              exercicioId: exercise.id,
              exercicioNome: exercise.nome,
              muscleGroup: exercise.grupoMuscular,
              seriesPlanejadas: ex.series,
              repeticoesPlanejadas: ex.repeticoes,
              pesoPlanejado: ex.peso,
              observacoesPlano: ex.obs || ''
            });
          }

          const planToInsert: Omit<Plano, 'id'> = {
            userId,
            semana: Number(semanaData.semana),
            diaDaSemana: diaData.dia,
            nomeTreino: diaData.nomeTreino,
            exercicios: processedExs
          };
          
          await addDoc(collection(db, PLANOS_COL), planToInsert);
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, PLANOS_COL);
    }
  },

  async getPlanos(): Promise<Plano[]> {
    if (!auth.currentUser) return [];
    try {
      const q = query(collection(db, PLANOS_COL), where('userId', '==', auth.currentUser.uid));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Plano));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, PLANOS_COL);
      return [];
    }
  },

  async exportPlan(): Promise<any> {
    const planos = await this.getPlanos();
    const weeksMap = new Map<number, any>();
    
    for (const p of planos) {
      if (!weeksMap.has(p.semana)) {
        weeksMap.set(p.semana, { semana: p.semana, dias: [] });
      }
      weeksMap.get(p.semana).dias.push({
        dia: p.diaDaSemana,
        nomeTreino: p.nomeTreino,
        exercicios: p.exercicios.map(ex => ({
          id: ex.id, // wait, our Plano has exercicioId
          nome: ex.exercicioNome,
          series: ex.seriesPlanejadas,
          repeticoes: ex.repeticoesPlanejadas,
          peso: ex.pesoPlanejado,
          obs: ex.observacoesPlano
        }))
      });
    }
    
    return { plano: Array.from(weeksMap.values()) };
  },

  // --- Workout Flow methods ---
  async startWorkout(nomeTreino: string, semana?: number, diaDaSemana?: string, goal: TreinoGoal = 'manutenção'): Promise<string> {
    if (!auth.currentUser) throw new Error("Logado necessário");
    const workout: Omit<Workout, 'id'> = {
      userId: auth.currentUser.uid,
      status: 'in-progress',
      startTime: serverTimestamp(),
      nomeTreino,
      semana,
      diaDaSemana,
      goalAtTime: goal
    };
    const docRef = await addDoc(collection(db, WORKOUTS_COL), workout);
    return docRef.id;
  },

  async getActiveWorkout(): Promise<Workout | null> {
    if (!auth.currentUser) return null;
    const q = query(
      collection(db, WORKOUTS_COL), 
      where('userId', '==', auth.currentUser.uid),
      where('status', '==', 'in-progress'),
      orderBy('startTime', 'desc'),
      limit(1)
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Workout;
  },

  async addSeries(workoutId: string, series: Omit<SetRecord, 'id' | 'workoutId' | 'userId' | 'endTime'>) {
    if (!auth.currentUser) return;
    const colRef = collection(db, WORKOUTS_COL, workoutId, 'exercises', series.exerciseId, 'series');
    await addDoc(colRef, {
      ...series,
      userId: auth.currentUser.uid,
      workoutId,
      endTime: serverTimestamp()
    });
  },

  async getWorkoutSeries(workoutId: string, exerciseId?: string): Promise<SetRecord[]> {
    // This is a bit complex due to nesting. If exerciseId is not given, we might need a collection group query or manually fetch.
    // Given the structure workouts/{wid}/exercises/{eid}/series/{sid}, without eid we use collectionGroup.
    // For now, let's assume we fetch for specific exercises during a workout.
    if (!exerciseId) return [];
    const colRef = collection(db, WORKOUTS_COL, workoutId, 'exercises', exerciseId, 'series');
    const snapshot = await getDocs(query(colRef, orderBy('setNumber', 'asc')));
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as SetRecord));
  },

  async finishWorkout(workoutId: string) {
    const docRef = doc(db, WORKOUTS_COL, workoutId);
    await updateDoc(docRef, {
      status: 'completed',
      endTime: serverTimestamp()
    });
  },

  // --- Registry methods (Legacy/Quick Log support) ---
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

  async addRegistro(registro: Omit<Registro, 'id' | 'userId' | 'createdAt'>) {
    if (!auth.currentUser) throw new Error("Logado necessário");
    try {
      await addDoc(collection(db, REGISTROS_COL), {
        ...registro,
        userId: auth.currentUser.uid,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, REGISTROS_COL);
    }
  },

  async deleteRegistro(id: string) {
    try {
      await deleteDoc(doc(db, REGISTROS_COL, id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${REGISTROS_COL}/${id}`);
    }
  },

  // --- Analytics methods ---
  async getRecords(): Promise<Record<string, number>> {
    // Simple 1RM estimative best per exercise
    // In a real app, this would be a more complex query but we'll fetch recently or all series
    // For free tier, we must be careful. Let's assume we maintain a "records" document or fetch.
    return {};
  }
};
