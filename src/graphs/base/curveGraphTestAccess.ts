import BaseCurveGraph from './BaseCurveGraph';
import type BaseGraph from './BaseGraph';
import type {BaseGraphState} from './BaseGraph';
import BasePhBezierCurveGraph from '../curves/ph/BasePhBezierCurveGraph';

/** Tests only: the protected members of a curve-workspace graph that the point tests drive. Throws when the graph is not a curve graph. */
export function curveAccess(graph: BaseGraph<BaseGraphState>) {
    if (!(graph instanceof BaseCurveGraph)) throw new Error('not a curve graph');
    return {
        select: () => graph['selectCurve'](graph['getFirstJxgCurve']()),
        first: () => graph['getFirstJxgCurve'](),
        points: () => graph['getFirstJxgCurve']().getCurve().getPoints(),
        board: () => graph['board'] as JXG.Board,
        editing: () => graph['editing'],
        deleteMode: (mode: number) => graph['setCurveState']({selectedCurveOption: mode}),
        phPoints: () => graph instanceof BasePhBezierCurveGraph ? graph.getFirstCurveAsPHBezierCurve().w : undefined,
    };
}
