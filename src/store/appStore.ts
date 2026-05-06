import { create } from 'zustand';
import { User } from 'firebase/auth';

interface AppState {
  user: User | null;
  activeWorkoutId: string | null;
  setUser: (user: User | null) => void;
  setActiveWorkoutId: (id: string | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  activeWorkoutId: null,
  setUser: (user) => set({ user }),
  setActiveWorkoutId: (id) => set({ activeWorkoutId: id }),
}));
