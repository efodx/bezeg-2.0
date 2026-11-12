import type BaseGraph from './base/BaseGraph';
import type {BaseGraphState} from './base/BaseGraph';
import type {DemonstrationId} from '../demonstrations';
import type {RegisteredDemonstrationId} from './graphLoaders';

/**
 * Executable graph constructors of the legacy families, behind graph-route lazy imports; registered families load via `graphLoaders.ts`.
 * Every family is registered now, so the table is empty; task 06 step 4 retires it.
 */
export const graphFactories: Record<Exclude<DemonstrationId, RegisteredDemonstrationId>, () => BaseGraph<BaseGraphState>> = {};
