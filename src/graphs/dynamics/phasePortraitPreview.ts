/**
 * The phase portrait's parameter preview (task 06, ADR 0067): the forward orbits of the seeds at another value of the matrix
 * entry `a`, as a pure function of the scene snapshot. No board, no graph state, no writes.
 */
import type {PreviewCurves, PreviewGeometry} from '../base/preview/previewGeometry';
import {derivePhase, ENTRY_SCALE, serializePhaseState, type PhaseState} from '../../dynamics/phaseModel';

/** Parameter keys with a preview, mapped to the stored matrix field they set. */
const FIELD = {'phase-a': 'A'} as const;

export const phasePortraitPreview: PreviewGeometry = ({preset}, key, value) => {
    const field = FIELD[key as keyof typeof FIELD];
    if (!field) return {};
    // The stored entry is on the quarter grid (`a = A / ENTRY_SCALE`), as the parameter write snaps it.
    const state = serializePhaseState({...(preset.data as PhaseState), [field]: Math.round(value * ENTRY_SCALE)});
    const curves: PreviewCurves = {forward: derivePhase(state).orbits.map(orbit => orbit.forward.map(([x, y]): [number, number] => [x, y]))};
    return curves;
};
