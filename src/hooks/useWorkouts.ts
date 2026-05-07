import { workoutService } from '../lib/workoutService';
import { createUserScopedQuery } from './queryFactory';

export const WORKOUTS_QUERY_KEY = 'workouts';

const { useData: useWorkouts, useInvalidate: useInvalidateWorkouts } =
  createUserScopedQuery(WORKOUTS_QUERY_KEY, () => workoutService.getWorkouts());

export { useWorkouts, useInvalidateWorkouts };
