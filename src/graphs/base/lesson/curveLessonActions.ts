import {UnsupportedLessonActionError} from "../../../learning/model";
import {AbstractJXGPointControlledCurve} from "../../curves/object/AbstractJXGPointControlledCurve";
import {AbstractJXGBezierCurve, EXTRAPOLATION_T_MAX, EXTRAPOLATION_T_MIN} from "../../curves/object/AbstractJXGBezierCurve";
import {JXGRationalBezierCurve} from "../../curves/object/JXGRationalBezierCurve";
import {LessonActionFeature} from "./LessonActionRegistry";

function isClassOrSubclass(candidate: Function | undefined, base: Function): boolean {
    return candidate !== undefined && (candidate === base || candidate.prototype instanceof base);
}

/** What the curve lesson features need from the graph that uses them. */
export interface CurveLessonHost {
    /** The curve lesson visibility and evaluation actions apply to. */
    curve(): AbstractJXGPointControlledCurve<any, any>;
    /** The adapter class of the curves the graph starts with, known before any board exists. */
    curveClass(): (new (...args: any[]) => unknown) | undefined;
    boardUpdate(): void;
}

/**
 * Visibility and evaluation handlers every graph with curves shares: control polygon, convex hull, De Casteljau
 * scheme (Bézier curves), weights (rational curves) and the evaluation point.
 */
export function curveVisibilityActions(host: CurveLessonHost): LessonActionFeature {
    return registry => {
        registry.onDiscriminated('curve-visibility', 'control-polygon', action => {
            host.curve().showControllPolygon(action.visible);
            host.boardUpdate();
        });
        registry.onDiscriminated('curve-visibility', 'convex-hull', action => {
            host.curve().showConvexHull(action.visible);
            host.boardUpdate();
        });
        // Only graphs whose curves can show the scheme (Bézier family) or weights (rational) handle these actions.
        registry.onDiscriminated('curve-visibility', 'decasteljau-scheme', action => {
            const curve = host.curve();
            if (!(curve instanceof AbstractJXGBezierCurve)) throw new UnsupportedLessonActionError(action);
            curve.showCurrentDecasteljauScheme(action.visible);
            host.boardUpdate();
        }, {supports: () => isClassOrSubclass(host.curveClass(), AbstractJXGBezierCurve)});
        registry.onDiscriminated('curve-visibility', 'weights', action => {
            const curve = host.curve();
            if (!(curve instanceof JXGRationalBezierCurve)) throw new UnsupportedLessonActionError(action);
            curve.showwWeights(action.visible);
            host.boardUpdate();
        }, {supports: () => isClassOrSubclass(host.curveClass(), JXGRationalBezierCurve)});
        registry.on('curve-evaluation', action => {
            host.curve().showEvaluationPoint(action.parameter);
            host.boardUpdate();
        });
    };
}

/** The degree elevation handler of the elevation demonstrations. */
export function degreeElevationAction(elevate: () => void): LessonActionFeature {
    return registry => registry.on('degree-elevation', () => elevate());
}

/** The extrapolation parameter and extrapolate handlers shared by the Bézier and the rational extrapolation graphs. */
export function extrapolationActions(host: {
    setParameter(value: number): void;
    extrapolate(): void;
}): LessonActionFeature {
    return registry => {
        registry.on('extrapolation-parameter', action => {
            const value = action.value;
            if (typeof value !== 'number' || !Number.isFinite(value) || value < EXTRAPOLATION_T_MIN || value > EXTRAPOLATION_T_MAX) {
                throw new Error(`The extrapolation parameter must be a number from ${EXTRAPOLATION_T_MIN} to ${EXTRAPOLATION_T_MAX}.`);
            }
            host.setParameter(value);
        });
        registry.on('extrapolate', () => host.extrapolate());
    };
}
