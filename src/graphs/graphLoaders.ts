import type BaseGraph from './base/BaseGraph';
import type {BaseGraphState} from './base/BaseGraph';
import {projectiveGraphLoaders} from './projective/runtime';
import {trigGraphLoaders} from './trig/runtime';
import {lineGraphLoaders} from './lines/runtime';
import {isometryGraphLoaders} from './isometry/runtime';
import {circleConstructionGraphLoaders} from './compgeo/circleConstruction/runtime';
import {combinatoricsGraphLoaders} from './combinatorics/runtime';
import {randomGraphLoaders} from './random/runtime';
import {kinematicsGraphLoaders} from './curves/kinematics/runtime';
import {recursionGraphLoaders} from './recursion/runtime';
import {wavesGraphLoaders} from './functions/waves/runtime';
import {bsplineGraphLoaders} from './curves/bspline/runtime';
import {basicsGraphLoaders} from './basics/runtime';
import {phGraphLoaders} from './curves/ph/runtime';
import {parameterizationGraphLoaders} from './curves/parametrisations/runtime';
import {bezierGraphLoaders} from './curves/bezier/runtime';
import {rationalGraphLoaders} from './curves/rational/runtime';
import {complexBatchDGraphLoaders} from './complex/batchD/runtime';
import {mechanicsGraphLoaders} from './mechanics/runtime';
import {dynamicsGraphLoaders} from './dynamics/runtime';
import {solidsGraphLoaders} from './solids/runtime';
import {levelSetsGraphLoaders} from './levelsets/runtime';

/**
 * Runtime root composition of the feature-registered families (explicit imports, no discovery). A new registered family
 * adds one spread here, one in `src/demonstrations.ts` and one in `PresetImport.ts`. Demonstrations not listed here still
 * use the legacy table `graphFactories.ts`.
 */
export const registeredGraphLoaders = {...projectiveGraphLoaders, ...trigGraphLoaders, ...lineGraphLoaders, ...isometryGraphLoaders, ...circleConstructionGraphLoaders, ...combinatoricsGraphLoaders, ...randomGraphLoaders, ...kinematicsGraphLoaders, ...recursionGraphLoaders, ...wavesGraphLoaders, ...mechanicsGraphLoaders, ...dynamicsGraphLoaders, ...solidsGraphLoaders, ...levelSetsGraphLoaders, ...complexBatchDGraphLoaders, ...bsplineGraphLoaders, ...basicsGraphLoaders, ...phGraphLoaders, ...parameterizationGraphLoaders, ...bezierGraphLoaders, ...rationalGraphLoaders};
export type RegisteredDemonstrationId = keyof typeof registeredGraphLoaders;

export const isRegisteredDemonstrationId = (id: string): id is RegisteredDemonstrationId => Object.prototype.hasOwnProperty.call(registeredGraphLoaders, id);

/** Resolves the constructor of a registered Demonstration. */
export const loadRegisteredGraphFactory = (id: RegisteredDemonstrationId): Promise<() => BaseGraph<BaseGraphState>> => registeredGraphLoaders[id]();
