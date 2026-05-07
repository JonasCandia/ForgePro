import { workoutService } from '../lib/workoutService';
import { createUserScopedQuery } from './queryFactory';

export const PROFILE_QUERY_KEY = 'profile';

const { useData: useProfile, useInvalidate: useInvalidateProfile } =
  createUserScopedQuery(PROFILE_QUERY_KEY, () => workoutService.getUserProfile(), { retry: 1 });

export { useProfile, useInvalidateProfile };
