import { workoutService } from '../lib/workoutService';
import { createUserScopedQuery } from './queryFactory';

export const MEASUREMENTS_QUERY_KEY = 'measurements';

const { useData: useMeasurements, useInvalidate: useInvalidateMeasurements } =
  createUserScopedQuery(MEASUREMENTS_QUERY_KEY, () => workoutService.getMeasurements());

export { useMeasurements, useInvalidateMeasurements };
