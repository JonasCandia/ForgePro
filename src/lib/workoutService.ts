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
  setDoc
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { handleFirestoreError, OperationType } from './firestoreUtils';
import { Registro, Exercício, Plano } from '../types';
import { MOCK_EXERCICIOS } from '../constants';

const REGISTROS_COL = 'registros';
const EXERCICIOS_COL = 'exercicios';
const PLANOS_COL = 'planos';

export const workoutService = {
  // Sync mock exercises to Firestore (one-time or if empty)
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

  async addRegistro(registro: Omit<Registro, 'id' | 'createdAt' | 'userId'>) {
    if (!auth.currentUser) throw new Error("User must be logged in");
    
    try {
      const docRef = await addDoc(collection(db, REGISTROS_COL), {
        ...registro,
        userId: auth.currentUser.uid,
        createdAt: serverTimestamp()
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
      return snapshot.docs.map(d => ({ 
        id: d.id, 
        ...d.data(),
      } as Registro));
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

  // Plan Methods
  async importPlan(planData: any) {
    if (!auth.currentUser) throw new Error("User must be logged in");
    const userId = auth.currentUser.uid;

    try {
      const weeksToImport = [...new Set(planData.plano.map((p: any) => p.semana))];
      
      for (const semana of weeksToImport) {
        const q = query(collection(db, PLANOS_COL), where('userId', '==', userId), where('semana', '==', semana));
        const snapshot = await getDocs(q);
        for (const d of snapshot.docs) {
          await deleteDoc(doc(db, PLANOS_COL, d.id));
        }
      }

      const exercises = await this.getExercises();
      const exMap = new Map(exercises.map(ex => [ex.id, ex.nome]));

      for (const semanaData of planData.plano) {
        for (const diaData of semanaData.dias) {
          const planToInsert: Omit<Plano, 'id'> = {
            userId,
            semana: (semanaData.semana),
            diaDaSemana: diaData.dia,
            nomeTreino: diaData.nomeTreino,
            exercicios: diaData.exercicios.map((ex: any) => ({
              exercicioId: String(ex.id),
              exercicioNome: exMap.get(String(ex.id)) || 'Exercício Desconhecido',
              seriesPlanejadas: ex.series,
              repeticoesPlanejadas: ex.repeticoes,
              pesoPlanejado: ex.peso,
              observacoesPlano: ex.obs || ''
            }))
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
  }
};
