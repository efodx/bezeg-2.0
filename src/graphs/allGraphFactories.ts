import type {DemonstrationId} from '../demonstrations';
import type BaseGraph from './base/BaseGraph';
import type {BaseGraphState} from './base/BaseGraph';
import {graphFactories} from './graphFactories';
import {registeredGraphLoaders} from './graphLoaders';

/**
 * Tests only: every Demonstration's constructor, the legacy table plus the resolved feature-registered loaders, so
 * all-graph contract sweeps keep covering registered families. Production code resolves per route and never imports this.
 */
const registered = await Promise.all(Object.entries(registeredGraphLoaders).map(async ([id, load]) => [id, await load()] as const));
export const allGraphFactories = {...graphFactories, ...Object.fromEntries(registered)} as Record<DemonstrationId, () => BaseGraph<BaseGraphState>>;
