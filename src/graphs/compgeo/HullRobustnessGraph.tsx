import React from "react";
import JXG from "jsxgraph";
import {currentLanguage, onLanguageChange, t} from "../../localization";
import {PointSetModel, setMode} from "../../compgeo/pointSetModel";
import {GraphSession} from "../base/GraphSession";
import {fitBoundingBox} from "../base/fitBoundingBox";
import {SceneStateUpdate} from "../base/SceneStore";
import {UnsupportedLessonActionError} from "../../learning/model";
import type {LessonAction} from "../../learning/model";
import {PointSetGraphState} from "./PointSetGraph";
import {PresetCollection} from "../base/presets/PresetCollection";
import {hullRobustnessCollection} from "./compgeoPresetCollections";
import {HULL_STEP_FIELD, HullTraceGraph, HullTraceGraphState} from "./HullTraceGraph";
import {PointSetExtension, PointSetExtraField, PointSetExtras} from "./pointSetPersistence";
import {HullTraceControls} from "./HullTraceControls";
import {HullAlgorithm, HullRun, parseHullAlgorithm, runHullTrace} from "./hullTraceRun";
import {
    ChainChoices, ChainReadout, KettnerControls, RobustnessChoiceActions, RobustnessModeSelect,
} from "./HullRobustnessControls";
import {
    clampKettnerCoordinate, DEFAULT_DUPLICATE_RULE, DEFAULT_KETTNER_CELL, DEFAULT_KETTNER_PANEL, DEFAULT_POP_RULE, DEFAULT_ROBUSTNESS_MODE,
    DuplicateRule, KETTNER_SIZE, KettnerCellIndex, KettnerPanel, kettnerCellReadout, parseDuplicateRule, parseKettnerCoordinate,
    parseKettnerPanel, parsePopRule, parseRobustnessMode, PopRule, RobustnessMode,
} from "./hullRobustnessReadout";
import {drawKettnerCell, drawKettnerImage, drawKettnerTitle} from "./kettnerBoard";

/** The Kettner map's view: the 64 x 64 cells with a margin for the axes and the title. */
const KETTNER_VIEW: readonly [number, number, number, number] = [-6, 72, 70, -6];
/** The chain view of the hull trace graph (its sample 1 with a half-unit margin). */
const CHAIN_VIEW: readonly [number, number, number, number] = [-1.5, 5.5, 5.5, -0.5];

const ARROW_CELLS: Readonly<Record<string, readonly [number, number]>> = {
    ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1],
};

const field = (name: string, parse: (value: unknown) => number | string | undefined, fallback: number | string): PointSetExtraField => ({name, parse, fallback});

/**
 * The robustness graph's declared scene beyond the point set: the hull trace's `algorithm` (accepted from a file, never kept:
 * this graph runs the monotone chain only) and `step` (clamped to the chain's run under the two rule choices), the view, the
 * two rule choices, the Kettner panel and the selected cell. An omitted field takes its default.
 */
const HULL_ROBUSTNESS_EXTENSION: PointSetExtension = Object.freeze({
    normalise: (model: PointSetModel) => setMode(model, "points"),
    fields: [
        field("algorithm", parseHullAlgorithm, "monotone-chain"), HULL_STEP_FIELD,
        field("mode", parseRobustnessMode, DEFAULT_ROBUSTNESS_MODE), field("pop", parsePopRule, DEFAULT_POP_RULE),
        field("duplicates", parseDuplicateRule, DEFAULT_DUPLICATE_RULE), field("panel", parseKettnerPanel, DEFAULT_KETTNER_PANEL),
        field("cellI", parseKettnerCoordinate, DEFAULT_KETTNER_CELL.i), field("cellJ", parseKettnerCoordinate, DEFAULT_KETTNER_CELL.j),
    ],
    settle(model: PointSetModel, values: PointSetExtras): PointSetExtras {
        const pop = parsePopRule(values.pop) ?? DEFAULT_POP_RULE;
        const duplicates = parseDuplicateRule(values.duplicates) ?? DEFAULT_DUPLICATE_RULE;
        const step = typeof values.step === "number" ? values.step : 0;
        return {...values, algorithm: "monotone-chain", step: runHullTrace("monotone-chain", model.points, {pop, duplicates}).clamp(step)};
    },
});

/** The saved configuration beyond the hull trace's: the view, the two rule choices and the Kettner panel and cell. */
export interface HullRobustnessGraphState extends HullTraceGraphState {
    mode: RobustnessMode;
    pop: PopRule;
    duplicates: DuplicateRule;
    panel: KettnerPanel;
    cellI: number;
    cellJ: number;
}

/**
 * Hull robustness (spec convexity-hulls-lessons A5, task 19): the monotone chain of `HullTraceGraph` with two rule choices, and a
 * fixed view of Kettner's inputs. Nothing a learner drags is evaluated in doubles (ADR 0021): the Kettner view only displays
 * `kettnerSignMap()`.
 *
 * - `chain` mode is the hull trace graph with the algorithm fixed to the monotone chain. `run()` passes the pop rule and the
 *   duplicates choice to `runHullTrace`; a change of either goes through `setState({..., step: 0})`, whose base wrapper resets the
 *   controller, so playback pauses and the trace returns to step 0. Next step, Play, Reset, the points, the lifecycle and the
 *   lesson animation commands are `HullTraceGraph`'s own.
 * - `kettner` mode shows the cell map of one panel (inexact double sign, or exact sign) as one board image, the selected cell's
 *   outline and a title: three board objects, none movable. The chain's point set stays in the scene state but is not drawn, and
 *   no point can be added, selected or dragged. A cell is chosen by a press on the board, the arrow keys on the focused board,
 *   or the inspector's fields.
 * - The scene state carries `mode` (the typed scene option: a lesson or a Preset names the view), `pop`, `duplicates`, `panel`,
 *   `cellI` and `cellJ`. A mode switch disposes the other mode's board objects and rebuilds them on return; the view of the chain
 *   is restored on return. The Preset collection is `hullRobustnessCollection` (key `compgeo-hull-robustness`).
 * - Ownership: the key listener, the press handler and the language subscription are registered on the session; the three Kettner
 *   objects are removed with the scene (`disposeFigureScene`) and when the mode changes.
 */
export class HullRobustnessGraph extends HullTraceGraph {
    private robustRunMemo?: {points: PointSetModel["points"]; pop: PopRule; duplicates: DuplicateRule; run: HullRun};
    private robustInputsMemo?: {step: number; pop: PopRule; duplicates: DuplicateRule};
    private kettnerImage?: {panel: KettnerPanel; element: JXG.GeometryElement};
    private kettnerCellFrame?: {i: number; j: number; element: JXG.GeometryElement};
    private kettnerTitle?: JXG.GeometryElement;
    private chainSceneDrawn = false;
    /** The mode whose view the board currently shows; undefined until the first sync (the board starts in its mode's view). */
    private shownMode?: RobustnessMode;
    private chainBox?: [number, number, number, number];
    /** The box before a scene replacement imports its data; a box that differs afterwards is a view the scene saved. */
    private boxBeforeImport?: readonly number[];
    private savedViewApplied = false;

    // ---- Reads ---------------------------------------------------------------------------------------------------

    get robustnessMode(): RobustnessMode {
        return ("mode" in this.state ? parseRobustnessMode(this.state.mode) : undefined) ?? DEFAULT_ROBUSTNESS_MODE;
    }

    get popRule(): PopRule {
        return ("pop" in this.state ? parsePopRule(this.state.pop) : undefined) ?? DEFAULT_POP_RULE;
    }

    get duplicateRule(): DuplicateRule {
        return ("duplicates" in this.state ? parseDuplicateRule(this.state.duplicates) : undefined) ?? DEFAULT_DUPLICATE_RULE;
    }

    get kettnerPanel(): KettnerPanel {
        return ("panel" in this.state ? parseKettnerPanel(this.state.panel) : undefined) ?? DEFAULT_KETTNER_PANEL;
    }

    /** The selected Kettner cell; a missing or invalid saved coordinate takes the default (41, 48). */
    get kettnerCell(): KettnerCellIndex {
        const i = "cellI" in this.state ? parseKettnerCoordinate(this.state.cellI) : undefined;
        const j = "cellJ" in this.state ? parseKettnerCoordinate(this.state.cellJ) : undefined;
        return {i: i ?? DEFAULT_KETTNER_CELL.i, j: j ?? DEFAULT_KETTNER_CELL.j};
    }

    /** This graph runs the monotone chain only; the algorithm choice of the hull trace graph is not offered. */
    override get algorithm(): HullAlgorithm {
        return "monotone-chain";
    }

    /** The chain trace of the current points under the active rule choices; recomputed only when one of them changes. */
    override run(): HullRun {
        const points = this.model.points;
        const pop = this.popRule;
        const duplicates = this.duplicateRule;
        const memo = this.robustRunMemo;
        if (memo && memo.points === points && memo.pop === pop && memo.duplicates === duplicates) return memo.run;
        const fresh = {points, pop, duplicates, run: runHullTrace("monotone-chain", points, {pop, duplicates})};
        this.robustRunMemo = fresh;
        return fresh.run;
    }

    override getInitialState(): HullRobustnessGraphState {
        return {
            ...super.getInitialState(), mode: DEFAULT_ROBUSTNESS_MODE, pop: DEFAULT_POP_RULE, duplicates: DEFAULT_DUPLICATE_RULE,
            panel: DEFAULT_KETTNER_PANEL, cellI: DEFAULT_KETTNER_CELL.i, cellJ: DEFAULT_KETTNER_CELL.j,
        };
    }

    // ---- State ---------------------------------------------------------------------------------------------------

    /** A patch with the robustness fields; `Partial<HullRobustnessGraphState>` is the one place that types them for the base store. */
    private robustPatch(fields: Partial<HullRobustnessGraphState>): Partial<PointSetGraphState> {
        return fields;
    }

    private writeRobust(fields: Partial<HullRobustnessGraphState>): void {
        const update: SceneStateUpdate<PointSetGraphState> = this.robustPatch(fields);
        this.setState(update);
    }

    /** The one algorithm is the monotone chain; asking for another is an unsupported lesson action, as in a graph without the choice. */
    override setAlgorithm(algorithm: HullAlgorithm): void {
        if (algorithm !== "monotone-chain") throw new UnsupportedLessonActionError({kind: "point-set", operation: "set-algorithm", algorithm});
        this.resetTrace();
    }

    /**
     * Lesson actions: `set-mode` (`chain` or `kettner`; the Voronoi modes are rejected), `set-pop-rule`, `set-duplicates` and
     * `select-cell` run the very methods of the controls, then pause playback and return the trace to step 0 (also when the
     * value is already chosen, so a scene starts from a known state). A value outside the control's choices, or a cell
     * coordinate that is not an integer from 0 to 63, is a lesson-content error and is never clamped or repaired. The other
     * operations are `HullTraceGraph`'s (`set-algorithm` stays chain-only) and the base class's.
     */
    override applyPointSetAction(action: Extract<LessonAction, {kind: "point-set"}>): void {
        if (action.operation === "set-mode") {
            const mode: unknown = action.mode;
            const parsed = parseRobustnessMode(mode);
            if (parsed === undefined) throw new Error(`point-set set-mode: this graph's mode must be "chain" or "kettner", got ${String(mode)}.`);
            this.setRobustnessMode(parsed);
        } else if (action.operation === "set-pop-rule") {
            const rule: unknown = action.rule;
            const parsed = parsePopRule(rule);
            if (parsed === undefined) throw new Error(`point-set set-pop-rule: rule must be "non-left" or "right", got ${String(rule)}.`);
            this.setPopRule(parsed);
        } else if (action.operation === "set-duplicates") {
            const duplicates: unknown = action.duplicates;
            const parsed = parseDuplicateRule(duplicates);
            if (parsed === undefined) throw new Error(`point-set set-duplicates: duplicates must be "merge" or "keep", got ${String(duplicates)}.`);
            this.setDuplicateRule(parsed);
        } else if (action.operation === "set-panel") {
            const panel: unknown = action.panel;
            const parsed = parseKettnerPanel(panel);
            if (parsed === undefined) throw new Error(`point-set set-panel: panel must be "inexact" or "exact", got ${String(panel)}.`);
            this.setKettnerPanel(parsed);
        } else if (action.operation === "select-cell") {
            const i = parseKettnerCoordinate(action.i);
            const j = parseKettnerCoordinate(action.j);
            if (i === undefined || j === undefined) {
                throw new Error(`point-set select-cell: i and j must be integers from 0 to ${String(KETTNER_SIZE - 1)}, got ${String(action.i)} and ${String(action.j)}.`);
            }
            this.selectKettnerCell(i, j);
        } else {
            super.applyPointSetAction(action);
            return;
        }
        this.resetTrace();
    }

    /** The Kettner view has no trace: Next step and Play do nothing there (no timer starts on the hidden chain). */
    override nextStep(): void {
        if (this.robustnessMode !== "chain") return;
        super.nextStep();
    }

    override play(): void {
        if (this.robustnessMode !== "chain") return;
        super.play();
    }

    /** Changes the pop rule: playback pauses and the trace returns to step 0. */
    setPopRule(pop: PopRule): void {
        if (parsePopRule(pop) === undefined || pop === this.popRule) return;
        this.writeRobust({pop, step: 0});
        this.requestRender();
    }

    /** Changes the duplicates choice: playback pauses and the trace returns to step 0. */
    setDuplicateRule(duplicates: DuplicateRule): void {
        if (parseDuplicateRule(duplicates) === undefined || duplicates === this.duplicateRule) return;
        this.writeRobust({duplicates, step: 0});
        this.requestRender();
    }

    /**
     * Switches the view. Playback pauses, add mode and the point selection end (nothing is draggable in the Kettner view), and the
     * board shows the other view: the chain's view is remembered and restored on return.
     */
    setRobustnessMode(mode: RobustnessMode): void {
        if (parseRobustnessMode(mode) === undefined || mode === this.robustnessMode) return;
        this.pause();
        this.setAddMode(false);
        this.select(undefined);
        this.writeRobust({mode});
        this.syncModeView();
        this.syncBoardLabel();
        this.requestRender();
    }

    /**
     * Shows the drawn mode's view when it differs from the view on the board: the chain's box is remembered on leaving and
     * restored on return, the Kettner map shows whole. Idempotent, so a mode change by `setRobustnessMode`, a replaced state, a
     * checkpoint or a Preset all land here. A scene replacement that carried a saved view (`boardState`, already on the board)
     * keeps that view.
     */
    private syncModeView(): void {
        if (!this.hasBoard) return;
        const mode = this.robustnessMode;
        const leaving = this.shownMode;
        this.shownMode = mode;
        if (leaving === undefined || leaving === mode || this.savedViewApplied) return;
        if (leaving === "chain") this.chainBox = this.board.getBoundingBox() as [number, number, number, number];
        // The saved chain box is already the shown view; fitting it again would add the margin and zoom out on every round trip.
        if (mode === "chain" && this.chainBox) this.board.setBoundingBox([...this.chainBox], true);
        else this.showBox(mode === "kettner" ? KETTNER_VIEW : CHAIN_VIEW);
    }

    setKettnerPanel(panel: KettnerPanel): void {
        if (parseKettnerPanel(panel) === undefined || panel === this.kettnerPanel) return;
        this.writeRobust({panel});
        this.requestRender();
    }

    /** Selects a cell (both coordinates cut to 0..63). */
    selectKettnerCell(i: number, j: number): void {
        const cell = {i: clampKettnerCoordinate(i), j: clampKettnerCoordinate(j)};
        const now = this.kettnerCell;
        if (cell.i === now.i && cell.j === now.j) return;
        this.writeRobust({cellI: cell.i, cellJ: cell.j});
        this.requestRender();
    }

    /** Add mode makes no sense without a point set on the board: it stays off in the Kettner view. */
    override setAddMode(on: boolean): void {
        super.setAddMode(on && this.robustnessMode === "chain");
    }

    /** The saved scene state names every robustness field, so a Preset or a checkpoint restores the view and the choices. */
    protected override sceneGraphState(): PointSetGraphState {
        const state: HullRobustnessGraphState = {
            ...super.sceneGraphState(), algorithm: this.algorithm, step: this.step, mode: this.robustnessMode, pop: this.popRule, duplicates: this.duplicateRule,
            panel: this.kettnerPanel, cellI: this.kettnerCell.i, cellJ: this.kettnerCell.j,
        };
        return state;
    }

    protected override persistenceExtension(): PointSetExtension {
        return HULL_ROBUSTNESS_EXTENSION;
    }

    // ---- View ----------------------------------------------------------------------------------------------------

    /** The starting and Reset-view box follows the mode: the point set's box, or the whole Kettner map. */
    protected override initialView(): [number, number, number, number] {
        return [...(this.robustnessMode === "kettner" ? KETTNER_VIEW : CHAIN_VIEW)];
    }

    /** Fit shows the whole map in the Kettner view (there are no point objects to fit). */
    protected override fitView(points: readonly [number, number][], width: number, height: number): [number, number, number, number] | undefined {
        if (this.robustnessMode !== "kettner") return super.fitView(points, width, height);
        return fitBoundingBox([[KETTNER_VIEW[0], KETTNER_VIEW[1]], [KETTNER_VIEW[2], KETTNER_VIEW[3]]], width, height);
    }

    /** Shows a region with equal axis units, widened to the canvas aspect around its centre (as a lesson view is applied). */
    private showBox(view: readonly [number, number, number, number]): void {
        const [left, top, right, bottom] = view;
        const {width, height} = JXG.getDimensions(this.board.container, document);
        const box = fitBoundingBox([[left, top], [right, bottom]], parseFloat(String(width)), parseFloat(String(height)));
        this.board.setBoundingBox(box ?? [...view], true);
    }

    // ---- Board ---------------------------------------------------------------------------------------------------

    protected override overlayInputs(): unknown {
        const step = this.step;
        const pop = this.popRule;
        const duplicates = this.duplicateRule;
        const memo = this.robustInputsMemo;
        if (memo?.step === step && memo.pop === pop && memo.duplicates === duplicates) return memo;
        this.robustInputsMemo = {step, pop, duplicates};
        return this.robustInputsMemo;
    }

    /**
     * Chain mode draws the hull trace scene; Kettner mode removes it and draws the map. Idempotent: it rebuilds only what the state
     * requires (the image on a panel change, the cell frame on a cell change).
     */
    protected override syncScene(): void {
        if (!this.graphSession?.isAlive || !this.hasBoard) return;
        this.syncModeView();
        if (this.robustnessMode === "chain") {
            this.removeKettner();
            super.syncScene();
            this.chainSceneDrawn = true;
        } else {
            if (this.chainSceneDrawn) {
                super.disposeFigureScene();
                this.chainSceneDrawn = false;
            }
            this.syncKettner();
        }
        this.syncBoardLabel();
    }

    /** A replaced scene (reset, Preset, checkpoint, lesson default) forgets the remembered chain view of the scene before it. */
    protected override syncReplacedScene(): void {
        this.chainBox = undefined;
        const before = this.boxBeforeImport;
        this.boxBeforeImport = undefined;
        const now = this.hasBoard ? this.board.getBoundingBox() : undefined;
        // A Preset or checkpoint that saved a view has set it already (before the state replacement): that view is kept.
        this.savedViewApplied = before !== undefined && now !== undefined && now.some((value, index) => Math.abs(value - before[index]) > 1e-9);
        try {
            super.syncReplacedScene();
        } finally {
            this.savedViewApplied = false;
        }
    }

    /** The robustness graph's own collection (`compgeo-hull-robustness`): it also checks the mode, rules, panel and cell fields. */
    override presetCollection(): PresetCollection<PointSetModel> {
        return hullRobustnessCollection;
    }

    override importPresetData(data: PointSetModel): void {
        if (this.hasBoard) this.boxBeforeImport = this.board.getBoundingBox();
        super.importPresetData(data);
    }

    private alive(element: JXG.GeometryElement | undefined): element is JXG.GeometryElement {
        return element !== undefined && (this.board.objectsList as unknown[]).includes(element);
    }

    private syncKettner(): void {
        const panel = this.kettnerPanel;
        const {i, j} = this.kettnerCell;
        if (!this.alive(this.kettnerImage?.element) || this.kettnerImage?.panel !== panel) {
            this.removeBoardObjects([this.kettnerImage?.element]);
            this.kettnerImage = {panel, element: drawKettnerImage(this.board, panel)};
        }
        if (!this.alive(this.kettnerTitle)) this.kettnerTitle = drawKettnerTitle(this.board, () => this.panelTitle());
        const frame = this.kettnerCellFrame;
        if (!this.alive(frame?.element) || frame?.i !== i || frame.j !== j) {
            this.removeBoardObjects([frame?.element]);
            this.kettnerCellFrame = {i, j, element: drawKettnerCell(this.board, i, j)};
        }
        this.board.update();
    }

    private panelTitle(): string {
        return this.kettnerPanel === "inexact" ? t("hullrobust_panel_inexact") : t("hullrobust_panel_exact");
    }

    /** Removes the Kettner objects and forgets them; the next Kettner sync rebuilds them. */
    private removeKettner(): void {
        if (!this.kettnerImage && !this.kettnerCellFrame && !this.kettnerTitle) return;
        this.removeBoardObjects([this.kettnerCellFrame?.element, this.kettnerTitle, this.kettnerImage?.element]);
        this.kettnerImage = undefined;
        this.kettnerCellFrame = undefined;
        this.kettnerTitle = undefined;
    }

    /** Removes board objects that are still on the board, with one board update at the end. */
    private removeBoardObjects(objects: readonly (JXG.GeometryElement | undefined)[]): void {
        if (!this.hasBoard) return;
        const present = objects.filter((object): object is JXG.GeometryElement => this.alive(object));
        if (!present.length) return;
        const board = this.board as JXG.Board & {isSuspendedUpdate?: boolean};
        const outerSuspension = board.isSuspendedUpdate === true;
        if (!outerSuspension) board.suspendUpdate();
        try {
            board.removeObject(present);
        } finally {
            if (!outerSuspension) board.unsuspendUpdate();
        }
    }

    protected override disposeFigureScene(): void {
        this.removeKettner();
        this.chainSceneDrawn = false;
        super.disposeFigureScene();
    }

    override unmount(): void {
        this.kettnerImage = undefined;
        this.kettnerCellFrame = undefined;
        this.kettnerTitle = undefined;
        this.chainSceneDrawn = false;
        this.shownMode = undefined;
        this.chainBox = undefined;
        super.unmount();
    }

    // ---- Interaction ---------------------------------------------------------------------------------------------

    protected override createMainView(session: GraphSession, container: HTMLElement): void {
        super.createMainView(session, container);
        container.addEventListener("keydown", this.onCellKey);
        session.on("down", event => this.onCellPress(event));
        let language = currentLanguage();
        const unsubscribeLanguage = onLanguageChange(() => {
            if (currentLanguage() === language) return;
            language = currentLanguage();
            this.syncBoardLabel();
            if (this.hasBoard && this.alive(this.kettnerTitle)) this.board.update();
        });
        session.registerCleanup(() => {
            unsubscribeLanguage();
            container.removeEventListener("keydown", this.onCellKey);
        });
        this.syncBoardLabel();
    }

    /**
     * The board's accessible name: the point set's label in the chain view; in the Kettner view the sign map's label naming the
     * shown panel and the selected cell. Called on every scene sync and language change, so it follows the panel and the cell.
     */
    private syncBoardLabel(): void {
        if (!this.hasBoard) return;
        const container = this.board.containerObj as HTMLElement | null;
        if (!container) return;
        const label = this.robustnessMode === "kettner"
            ? t("hullrobust_board_label", {value0: this.panelTitle(), value1: this.kettnerCell.i, value2: this.kettnerCell.j})
            : t("pointset_board_label");
        if (container.getAttribute("aria-label") !== label) container.setAttribute("aria-label", label);
    }

    /** Arrow keys move the selected cell by one in the Kettner view; the point set's own listener has no selected point there. */
    private readonly onCellKey = (event: KeyboardEvent): void => {
        if (this.robustnessMode !== "kettner" || event.altKey || event.ctrlKey || event.metaKey || this.graphInteractionLocked) return;
        const step = ARROW_CELLS[event.key];
        if (!step) return;
        event.preventDefault();
        const {i, j} = this.kettnerCell;
        this.selectKettnerCell(i + step[0], j + step[1]);
    };

    /** A press on a cell selects it; a press outside the map is ignored. */
    private onCellPress(event: unknown): void {
        if (this.robustnessMode !== "kettner" || this.graphInteractionLocked || !this.hasBoard) return;
        const [x, y] = this.board.getUsrCoordsOfMouse(event);
        const i = Math.floor(x);
        const j = Math.floor(y);
        if (i < 0 || j < 0 || i >= KETTNER_SIZE || j >= KETTNER_SIZE) return;
        this.selectKettnerCell(i, j);
    }

    // ---- Inspector -----------------------------------------------------------------------------------------------

    private readonly choiceActions: RobustnessChoiceActions = {
        setMode: mode => this.setRobustnessMode(mode),
        setPopRule: pop => this.setPopRule(pop),
        setDuplicateRule: duplicates => this.setDuplicateRule(duplicates),
        setPanel: panel => this.setKettnerPanel(panel),
        setCell: (i, j) => this.selectKettnerCell(i, j),
    };

    /** Chain view: the view choice, the rule choices, the playback controls without the algorithm choice, and the readout. */
    protected override hullControls(): React.ReactNode {
        const run = this.run();
        const step = this.step;
        const event = run.event(step);
        const hull = run.view(step).hull;
        return <>
            <RobustnessModeSelect mode="chain" actions={this.choiceActions}/>
            <ChainChoices pop={this.popRule} duplicates={this.duplicateRule} actions={this.choiceActions}/>
            <HullTraceControls algorithm="monotone-chain" step={step} length={run.length} playing={this.isPlaying} event={event}
                               points={this.model.points} gridStepExponent={this.model.gridStepExponent} totals={undefined}
                               actions={this.hullActions} fixedAlgorithm collinearKept={this.popRule === "right"}/>
            <ChainReadout pop={this.popRule} duplicates={this.duplicateRule} hull={hull} points={this.model.points}
                          gridStepExponent={this.model.gridStepExponent}/>
        </>;
    }

    protected override workspaceEdit(): React.ReactNode {
        if (this.robustnessMode === "chain") return super.workspaceEdit();
        const cell = kettnerCellReadout(this.kettnerCell.i, this.kettnerCell.j);
        return <>
            <RobustnessModeSelect mode="kettner" actions={this.choiceActions}/>
            {cell && <KettnerControls panel={this.kettnerPanel} cell={cell} actions={this.choiceActions}/>}
        </>;
    }
}
