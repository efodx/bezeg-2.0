import {LessonAction, UnsupportedLessonActionError} from "../../learning/model";
import {BARYCENTRIC_TOLERANCE} from "../../bezeg/impl/patch/triangular-bezier-patch";
import type {LessonActionFeature} from "../base/lesson/LessonActionRegistry";
import {CAMERA_PRESETS, type CameraPresetName} from "./surface-view/surfaceMath";
import {SUBDIVISION_RANGE} from "./tensorSubdivision";

type PatchAction<K extends LessonAction['kind']> = Extract<LessonAction, {kind: K}>;
export type PatchVisibilityTarget = PatchAction<'patch-visibility'>['target'];

/** The tensor patch demonstration with a split and elevation (`patch-subdivision`). */
export interface TensorSubdivisionLessonHost {
    readonly kind: 'tensor';
    canElevateIn(direction: 'u' | 'v'): boolean;
    /** Shows the pieces of the split at `value` in `direction`. */
    showSplit(direction: 'u' | 'v', value: number): void;
    elevate(direction: 'u' | 'v'): void;
}

/** The triangular patch demonstration: exact elevation by one degree and the three-piece split preview. */
export interface TriangularSubdivisionLessonHost {
    readonly kind: 'triangular';
    degree(): number;
    maxDegree(): number;
    elevate(): void;
    showSplitPreview(): void;
}

/** What the patch lesson actions need from the surface graph that uses them; no view, renderer or label access. */
export interface PatchLessonHost {
    readonly kind: 'tensor' | 'triangular';
    /** The visibility switches this graph really has. */
    visibilityTargets(): ReadonlySet<PatchVisibilityTarget>;
    setVisibility(target: PatchVisibilityTarget, visible: boolean): void;
    setParameters(u: number, v: number): void;
    applyCameraPreset(view: CameraPresetName): void;
    /** Present on graphs that can split and elevate. */
    subdivision(): TensorSubdivisionLessonHost | TriangularSubdivisionLessonHost | undefined;
}

function isFiniteNumber(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value);
}

function isDirection(value: unknown): value is 'u' | 'v' {
    return value === 'u' || value === 'v';
}

function checkEvaluation(kind: PatchLessonHost['kind'], action: PatchAction<'patch-evaluation'>): void {
    const {u, v, w} = action;
    if (!isFiniteNumber(u) || !isFiniteNumber(v) || (w !== undefined && !isFiniteNumber(w))) {
        throw new Error('The patch parameters must be finite numbers.');
    }
    if (kind === 'tensor') {
        if (w !== undefined) throw new Error('A tensor product patch has the parameters u and v only; w is not allowed.');
        if (u < 0 || u > 1 || v < 0 || v > 1) throw new Error('The patch parameters u and v must lie in [0, 1].');
        return;
    }
    const tolerance = BARYCENTRIC_TOLERANCE;
    if (u < -tolerance || v < -tolerance || u + v > 1 + tolerance) {
        throw new Error('The barycentric parameters must be non-negative with u + v at most 1.');
    }
    if (w !== undefined && (w < -tolerance || Math.abs(u + v + w - 1) > tolerance)) {
        throw new Error('The barycentric parameters u, v and w must be non-negative and sum to 1.');
    }
}

/**
 * Evaluation, visibility, split, elevation and camera preset handlers the surface (patch) graphs share. Invalid
 * payloads throw before any state is written, never clamp.
 */
export function patchLessonActions(host: PatchLessonHost): LessonActionFeature {
    return registry => {
        registry.on('patch-evaluation', action => {
            checkEvaluation(host.kind, action);
            host.setParameters(action.u, action.v);
        });
        const targets: readonly PatchVisibilityTarget[] = ['control-net', 'iso-curves', 'boundary-curves', 'decasteljau-scheme', 'tangent-plane', 'normal', 'twist', 'shading'];
        for (const target of targets) {
            registry.onDiscriminated('patch-visibility', target, action => {
                if (typeof action.visible !== 'boolean') throw new Error('The patch visibility must be true or false.');
                host.setVisibility(target, action.visible);
            }, {supports: () => host.visibilityTargets().has(target)});
        }
        registry.on('patch-subdivide', action => {
            const sub = host.subdivision();
            if (!sub) throw new UnsupportedLessonActionError(action);
            if (sub.kind === 'triangular') {
                if (action.direction !== undefined || action.value !== undefined) throw new Error('Subdividing a triangular patch takes no direction or value.');
                sub.showSplitPreview();
                return;
            }
            const {direction, value} = action;
            if (!isDirection(direction)) throw new Error("The subdivision direction must be 'u' or 'v'.");
            if (!isFiniteNumber(value) || value < SUBDIVISION_RANGE.min || value > SUBDIVISION_RANGE.max) {
                throw new Error(`The subdivision value must be a number from ${SUBDIVISION_RANGE.min} to ${SUBDIVISION_RANGE.max}.`);
            }
            sub.showSplit(direction, value);
        }, {supports: () => host.subdivision() !== undefined});
        registry.on('patch-elevate', action => {
            const sub = host.subdivision();
            if (!sub) throw new UnsupportedLessonActionError(action);
            if (sub.kind === 'triangular') {
                if (action.direction !== undefined) throw new Error('Elevating a triangular patch takes no direction.');
                if (sub.degree() >= sub.maxDegree()) throw new Error(`The patch already has the highest degree, ${sub.maxDegree()}.`);
                sub.elevate();
                return;
            }
            if (!isDirection(action.direction)) throw new Error("The elevation direction must be 'u' or 'v'.");
            if (!sub.canElevateIn(action.direction)) throw new Error('The patch already has the highest degree in this direction.');
            sub.elevate(action.direction);
        }, {supports: () => host.subdivision() !== undefined});
        registry.on('camera-preset', action => {
            if (typeof action.view !== 'string' || !Object.prototype.hasOwnProperty.call(CAMERA_PRESETS, action.view)) {
                throw new Error(`The camera view must be one of ${Object.keys(CAMERA_PRESETS).join(', ')}.`);
            }
            host.applyCameraPreset(action.view as CameraPresetName);
        });
    };
}
