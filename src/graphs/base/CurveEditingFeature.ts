import type {Board} from "jsxgraph";
import type {PointControlledCurve} from "../../bezeg/api/curve/point-controlled-curve";
import type {AbstractJXGPointControlledCurve, PointControlledCurveAttributes} from "../curves/object/AbstractJXGPointControlledCurve";

export enum SelectedCurveOption {
    MOVE_CURVE, ADD_POINTS, DELETE_POINTS
}

export type EditableCurve = AbstractJXGPointControlledCurve<PointControlledCurve, PointControlledCurveAttributes>;

/** The scene state the feature owns; the graph stores it in its scene state under the same keys. */
export interface CurveEditingState {
    selectedCurveOption: SelectedCurveOption;
    curveSelected: boolean;
}

/** What the editing feature needs from the graph that composes it. Everything is read at call time. */
export interface CurveEditingHost {
    /** The live board; only called while the graph is mounted. */
    board(): Board;
    curves(): readonly EditableCurve[];
    /** Points that are not part of a curve (construction points) but still block selecting a curve beneath them. */
    allPoints(): JXG.Point[];
    editingMode(): SelectedCurveOption;
    /** True while the graph itself disables pointer editing (for example while Farin points are shown). */
    inputsDisabled(): boolean;
    /** True while a figure export owns the board. */
    interactionLocked(): boolean;
    setEditingState(patch: Partial<CurveEditingState>): void;
    /**
     * Deselects the selected curve. The graph's own `deselectSelectedCurve` runs, so graphs that clean up
     * around a deselection still do.
     */
    deselectSelectedCurve(): void;
    /** Selects a curve the user clicked. The graph's own `selectCurve` runs, so subclass overrides are not bypassed. */
    selectCurve(curve: EditableCurve): void;
    unsuspendBoardUpdate(): void;
    refreshWorkspace(): void;
}

/**
 * Pointer handling, curve selection and the editing mode (move, add point, delete point) of a graph with curves.
 * The graph composes one instance and delegates to it; the feature has no React or graph-global state of its own.
 */
export class CurveEditingFeature {
    constructor(private readonly host: CurveEditingHost) {
    }

    getSelectedCurve(): EditableCurve | undefined {
        return this.host.curves().filter(curve => curve.isSelected())[0];
    }

    /** Selects a curve and, optionally, switches the editing mode in the same update. */
    select(curve: EditableCurve, additionalState: Partial<CurveEditingState> = {}): void {
        curve.select();
        this.host.setEditingState({curveSelected: true, ...additionalState});
    }

    /** Deselects the selected curve and returns to the move mode. */
    deselect(): void {
        this.getSelectedCurve()!.deselect();
        this.host.setEditingState({curveSelected: false, selectedCurveOption: SelectedCurveOption.MOVE_CURVE});
    }

    setMode(selectedCurveOption: SelectedCurveOption): void {
        this.host.setEditingState({selectedCurveOption});
    }

    getMouseCoords(e: PointerEvent) {
        const board = this.host.board();
        const pos = board.getMousePosition(e);
        return new JXG.Coords(JXG.COORDS_BY_SCREEN, pos, board);
    }

    handleDown(e: PointerEvent): void {
        if (this.host.inputsDisabled() || this.host.interactionLocked()) {
            return;
        }
        const board = this.host.board();
        board.suspendUpdate();
        const coords = this.getMouseCoords(e);
        const mode = this.host.editingMode();
        let selectedCurve, selectableCurve;
        if (mode === SelectedCurveOption.MOVE_CURVE) {
            selectedCurve = this.getSelectedCurve();
            if (selectedCurve) {
                selectedCurve.coords = coords;
                if (selectedCurve.isMouseInsidePaddedBoundingBox()) {
                    selectedCurve.processMouseDown(e);
                } else {
                    this.host.deselectSelectedCurve();
                }
            }
            selectedCurve = this.getSelectedCurve();
            if (!selectedCurve) {
                if (!this.host.allPoints().some(p => p.hasPoint(coords.scrCoords[1], coords.scrCoords[2]))) {
                    selectableCurve = this.host.curves().filter(curve => curve.isSelectable(e))[0];
                    if (selectableCurve) {
                        this.host.selectCurve(selectableCurve);
                    }
                }
            }
            this.host.unsuspendBoardUpdate();
            return;
        }
        let canCreate = true;

        for (let el of board.objectsList) {
            if (JXG.isPoint(el) && el.hasPoint(coords.scrCoords[1], coords.scrCoords[2])) {
                canCreate = false;
                break;
            }
        }
        const selected = this.getSelectedCurve();
        if (canCreate && mode === SelectedCurveOption.ADD_POINTS && selected) {
            selected.addPoint(coords.usrCoords[1], coords.usrCoords[2]);
        }
        if (!canCreate && mode === SelectedCurveOption.DELETE_POINTS && selected) {
            selected.getJxgPoints().every((point, i) => {
                if (point.hasPoint(coords.scrCoords[1], coords.scrCoords[2])) {
                    if (selected.getJxgPoints().length > 1) { selected.removePoint(i); }
                    return false;
                }
                return true;
            });
        }

        this.host.unsuspendBoardUpdate();
        this.host.refreshWorkspace();
    }

    handleUp(e: PointerEvent): void {
        if (this.host.interactionLocked()) return;
        if (this.host.editingMode() !== SelectedCurveOption.MOVE_CURVE) {
            // only handle when we're just moving curve
            return;
        }
        const selectedCurve = this.getSelectedCurve();
        if (selectedCurve && selectedCurve.needToProcessMoveEvent()) {
            this.host.board().suspendUpdate();
            selectedCurve.processMouseUp(e);
            this.host.unsuspendBoardUpdate();
        }
    }

    handleMove(e: PointerEvent): void {
        if (this.host.interactionLocked()) return;
        if (this.host.editingMode() !== SelectedCurveOption.MOVE_CURVE) {
            return;
        }
        const selectedCurve = this.getSelectedCurve();
        if (!selectedCurve?.needToProcessMoveEvent()) {
            selectedCurve?.processMouseCursor(e);
        }
        if (selectedCurve && selectedCurve.needToProcessMoveEvent()) {
            this.host.board().suspendUpdate();
            selectedCurve.processMouseMove(e);
            this.host.unsuspendBoardUpdate();
        }
    }
}
