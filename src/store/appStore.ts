import { create } from 'zustand';
import { User } from 'firebase/auth';

export interface Toast {
  id: string;
  type: 'error' | 'success';
  message: string;
}

interface AppState {
  user: User | null;
  activeWorkoutId: string | null;
  toasts: Toast[];
  setUser: (user: User | null) => void;
  setActiveWorkoutId: (id: string | null) => void;
  addToast: (type: Toast['type'], message: string) => void;
  removeToast: (id: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  activeWorkoutId: null,
  toasts: [],
  setUser: (user) => set({ user }),
  setActiveWorkoutId: (id) => set({ activeWorkoutId: id }),
  addToast: (type, message) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    set((s) => ({ toasts: [...s.toasts, { id, type, message }] }));
  },
  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export const useToast = () => useAppStore((s) => s.addToast);
