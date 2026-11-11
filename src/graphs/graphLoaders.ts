import type BaseGraph from './base/BaseGraph';
import type {BaseGraphState} from './base/BaseGraph';
import {projectiveGraphLoaders} from './projective/runtime';
import {trigGraphLoaders} from './trig/runtime';
import {lineGraphLoaders} from './lines/runtime';
import {isometryGraphLoaders} from './isometry/runtime';

/**
 * Runtime root composition of the feature-registered families (explicit imports, no discovery). A new registered family
 * adds one spread here, one in `src/demonstrations.ts` and one in `PresetImport.ts`. Demonstrations not listed here still
 * use the legacy table `graphFactories.ts`.
 */
export const registeredGraphLoaders = {...projectiveGraphLoaders, ...trigGraphLoaders, ...lineGraphLoaders, ...isometryGraphLoaders};
export type RegisteredDemonstrationId = keyof typeof registeredGraphLoaders;

export const isRegisteredDemonstrationId = (id: string): id is RegisteredDemonstrationId => Object.prototype.hasOwnProperty.call(registeredGraphLoaders, id);

/** Resolves the constructor of a registered Demonstration. */
export const loadRegisteredGraphFactory = (id: RegisteredDemonstrationId): Promise<() => BaseGraph<BaseGraphState>> => registeredGraphLoaders[id]();
