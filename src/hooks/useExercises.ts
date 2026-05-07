import { workoutService } from '../lib/workoutService';
import { createUserScopedQuery } from './queryFactory';

export const EXERCISES_QUERY_KEY = 'exercises';

// exercícios raramente mudam; revalida a cada 10 min
const { useData: useExercises } = createUserScopedQuery(
  EXERCISES_QUERY_KEY,
  () => workoutService.getExercises(),
  { staleTime: 10 * 60 * 1000 }
);

export { useExercises };
