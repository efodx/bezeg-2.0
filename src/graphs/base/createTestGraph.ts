/**
 * `createGraph` for tests that mount a real graph by demonstration id. It lives apart from `realGraphTestHarness` so
 * that importing the harness does not import every graph: only tests that need a graph by id depend on them.
 */
import BaseGraph, {BaseGraphState} from './BaseGraph';
import {allGraphFactories as graphFactories} from '../allGraphFactories';
import type {DemonstrationId} from '../../demonstrations';
import TensorDeCasteljauGraph from '../patches/TensorDeCasteljauGraph';
import TensorDerivativesGraph from '../patches/TensorDerivativesGraph';
import TensorSubdivisionGraph from '../patches/TensorSubdivisionGraph';
import TensorJoinGraph from '../patches/TensorJoinGraph';
import TensorPatchGraph from '../patches/TensorPatchGraph';
import TriangularPatchGraph from '../patches/TriangularPatchGraph';
import CoonsPatchGraph from '../patches/CoonsPatchGraph';
import SolidsGraph from '../solids/SolidsGraph';
import {FakeSurfaceView} from '../patches/FakeSurfaceView';
import {registerSurfaceView} from './realGraphTestHarness';

/**
 * A graph as `graphFactories` builds it, except that a graph with a surface view gets a fake one: jsdom has no WebGL,
 * and the real view would fail to start. Every other graph is the factory's own.
 */
export function createGraph(id: DemonstrationId): BaseGraph<BaseGraphState> {
    if (id !== 'patch-tensor' && id !== 'patch-decasteljau' && id !== 'patch-derivatives' && id !== 'patch-subdivision' && id !== 'patch-joins' && id !== 'patch-triangular' && id !== 'patch-coons' && id !== 'solids') return graphFactories[id]();
    const view = new FakeSurfaceView();
    const options = {viewFactory: () => view};
    const graph = id === 'solids' ? new SolidsGraph(options) : id === 'patch-tensor' ? new TensorPatchGraph(options) : id === 'patch-decasteljau' ? new TensorDeCasteljauGraph(options) : id === 'patch-derivatives' ? new TensorDerivativesGraph(options) : id === 'patch-subdivision' ? new TensorSubdivisionGraph(options) : id === 'patch-joins' ? new TensorJoinGraph(options) : id === 'patch-coons' ? new CoonsPatchGraph(options) : new TriangularPatchGraph(options);
    registerSurfaceView(graph, view);
    return graph as unknown as BaseGraph<BaseGraphState>;
}
