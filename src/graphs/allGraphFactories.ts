import type {DemonstrationId} from '../demonstrations';
import type BaseGraph from './base/BaseGraph';
import type {BaseGraphState} from './base/BaseGraph';
import {registeredGraphLoaders} from './graphLoaders';

/**
 * Tests only: every Demonstration's constructor, the resolved feature-registered loaders, so
 * all-graph contract sweeps cover every family. Production code resolves per route and never imports this.
 */
const registered = await Promise.all(Object.entries(registeredGraphLoaders).map(async ([id, load]) => [id, await load()] as const));
export const allGraphFactories = Object.fromEntries(registered) as Record<DemonstrationId, () => BaseGraph<BaseGraphState>>;
