import type React from "react";
import {message} from "../../localization";
import type {ChoiceParameter, GraphDeclaration} from "../base/declare/graphDeclaration";
import type {PresetCollection} from "../base/presets/PresetCollection";
import type {ParameterBinding} from "../base/writes/parameterArbiter";
import {runAs} from "../base/writes/writeSource";
import {DomainError} from "../functions/BaseFunctionGraph";
import {DeCasteljauOrderControl, DeCasteljauVisibilityControl} from "./TensorDeCasteljauPanels";
import {buildDeCasteljauConstruction} from "./TensorDeCasteljauScene";
import TensorPatchGraph, {TensorPatchGraphState, TensorPatchIds} from "./TensorPatchGraph";
import {TensorPatchDisplayPanel, TensorPatchEditPanel} from "./TensorPatchPanels";
import {DecasteljauOrder, isDecasteljauOrder, PatchCollectionPresetData, PatchStateDto, Point3Dto, TensorPatchDto} from "./patchDto";
import {defaultPatchPresets, patchPresetCollections} from "./patchPresetCollections";
import {patchFromNet} from "./patchSceneBuilder";
import {polylineStyle} from "./surface-view/jsxStyles";
import type {SurfaceScene} from "./surface-view/surfaceScene";

const DEFAULT_ORDER: DecasteljauOrder = "rows";

/** The arbiter key of the construction order (a choice puck). */
export const DECASTELJAU_ORDER_KEY = "patch-decasteljau-order";

/** The tensor workspace's ids plus the construction order, its switch and its two stages. */
export type DeCasteljauIds = {
    param: TensorPatchIds["param"] | typeof DECASTELJAU_ORDER_KEY;
    row: never;
    note: never;
    legend: TensorPatchIds["legend"] | "construction" | "construction-2";
    section: never;
    action: TensorPatchIds["action"] | "construction";
};

/** The bicubic dome at a non-symmetric (u, v), with the construction on: the scene this Demonstration starts with. */
function defaultDto(): TensorPatchDto {
    const entry = defaultPatchPresets[1].data()[0];
    if (entry[0] !== "TensorProductBezierPatch") throw new Error("The default patch Preset is not a tensor patch.");
    return {...entry[1], state: {...entry[1].state, u: 0.35, v: 0.6, showDeCasteljau: true, decasteljauOrder: DEFAULT_ORDER}};
}

/**
 * The tensor-product patch Demonstration with the de Casteljau construction at (u, v): the tensor workspace plus a
 * construction in one of three orders (rows first, columns first, bilinear). The order and the switch live in the scene
 * store and in the Preset `state`; the drawing is derived from them, so nothing is transient.
 */
export default class TensorDeCasteljauGraph extends TensorPatchGraph {
    override getInitialState(): TensorPatchGraphState {
        return {...super.getInitialState(), ...this.stateOf(defaultDto())};
    }

    override presetCollection(): PresetCollection<PatchCollectionPresetData> {
        return patchPresetCollections["patch-decasteljau"];
    }

    override defaultPreset(): PatchCollectionPresetData {
        return [["TensorProductBezierPatch", defaultDto()]];
    }

    protected override stateDto(): PatchStateDto {
        return {...super.stateDto(), showDeCasteljau: this.state.showDeCasteljau ?? true, decasteljauOrder: this.state.decasteljauOrder ?? DEFAULT_ORDER};
    }

    /** A Preset without the construction fields shows it, in rows order. */
    protected override stateOf(dto: {m: number; n: number; net: ReadonlyArray<Point3Dto>; state?: PatchStateDto}): Partial<TensorPatchGraphState> {
        return {...super.stateOf(dto), showDeCasteljau: dto.state?.showDeCasteljau ?? true, decasteljauOrder: dto.state?.decasteljauOrder ?? DEFAULT_ORDER};
    }

    /** The starting patches replace the net, not the construction the student chose. */
    protected override startingPatchKept(): Partial<TensorPatchGraphState> {
        const {showDeCasteljau, decasteljauOrder} = this.state;
        return {showDeCasteljau, decasteljauOrder};
    }

    setDecasteljauOrder(order: DecasteljauOrder): void {
        this.setState({decasteljauOrder: order});
    }

    protected override lessonVisibilitySetters(): ReturnType<TensorPatchGraph["lessonVisibilitySetters"]> {
        return {...super.lessonVisibilitySetters(), "decasteljau-scheme": visible => this.setShowDeCasteljau(visible)};
    }

    setShowDeCasteljau(visible: boolean): void {
        this.setState({showDeCasteljau: visible});
    }

    // ---- Surface contract --------------------------------------------------------------------------------------

    protected override buildScene(revision: number, selectedPointId: string | undefined): SurfaceScene {
        const scene = super.buildScene(revision, selectedPointId);
        const {net, u, v, showDeCasteljau, decasteljauOrder} = this.state;
        if (showDeCasteljau === false) return scene;
        const construction = buildDeCasteljauConstruction(patchFromNet(net), u, v, decasteljauOrder ?? DEFAULT_ORDER);
        return {...scene, polylines: [...scene.polylines, ...construction.polylines], markers: [...scene.markers, ...construction.markers]};
    }

    protected override geometryChanged(previous: Readonly<TensorPatchGraphState>): boolean {
        const s = this.state;
        // The construction follows (u, v), so while it is drawn a parameter change is a geometry change too.
        return super.geometryChanged(previous) || s.showDeCasteljau !== previous.showDeCasteljau || s.decasteljauOrder !== previous.decasteljauOrder
            || (s.showDeCasteljau !== false && (s.u !== previous.u || s.v !== previous.v));
    }

    // ---- Declaration -------------------------------------------------------------------------------------------

    protected override declaresTensorWorkspace(): boolean {
        return true;
    }

    protected override parameterBindings(): Readonly<Record<string, ParameterBinding>> {
        return {
            ...super.parameterBindings(),
            [DECASTELJAU_ORDER_KEY]: {
                read: () => this.state.decasteljauOrder ?? DEFAULT_ORDER,
                apply: (value: unknown) => {
                    if (!isDecasteljauOrder(value)) throw new DomainError(message("invalid_patch_decasteljau_order"));
                    this.setDecasteljauOrder(value);
                },
            },
        };
    }

    /**
     * The tensor workspace plus the construction order as a choice puck (the lesson frame `order-columns` asks the learner to
     * switch between rows and columns and compare), the construction switch as an Orodja action, and the two construction
     * stages in the legend.
     */
    protected override declaration(): GraphDeclaration<DeCasteljauIds> {
        const base = this.tensorDeclaration();
        const shown = this.state.showDeCasteljau ?? true;
        const order: ChoiceParameter<DeCasteljauIds["param"]> = {
            key: DECASTELJAU_ORDER_KEY, kind: "choice", label: message("patch_decasteljau_order_puck"), placement: "board", puck: true,
            options: [
                {value: "rows", label: message("patch_decasteljau_order_rows"), short: message("patch_decasteljau_order_short_rows")},
                {value: "columns", label: message("patch_decasteljau_order_columns"), short: message("patch_decasteljau_order_short_columns")},
                {value: "bilinear", label: message("patch_decasteljau_order_bilinear")},
            ],
        };
        return {
            ...base,
            parameters: [...base.parameters ?? [], order],
            legend: [...base.legend ?? [],
                {id: "construction", label: message("patch_decasteljau_legend_stage_1"), kind: "line", object: "construction"},
                {id: "construction-2", label: message("patch_decasteljau_legend_stage_2"), kind: "line", object: "construction-2"}],
            actions: [...base.actions ?? [],
                {id: "construction", label: message("de_casteljau_construction"), placement: "tools", tab: "display", section: "display", enabled: true, pressed: shown}],
        };
    }

    override performAction(id: string): void {
        if (id !== "construction") return super.performAction(id);
        runAs("learner", () => this.setShowDeCasteljau(!(this.state.showDeCasteljau ?? true)));
    }

    /** A construction stage is drawn while the switch is on and the built construction holds lines of its role (bilinear has no second stage at degree 1). */
    override drawnObject(id: string): {color: string; visible: boolean} | undefined {
        if (id !== "construction" && id !== "construction-2") return super.drawnObject(id);
        const {net, u, v, showDeCasteljau, decasteljauOrder, surfaceUnavailable} = this.state;
        const built = showDeCasteljau === false ? undefined : buildDeCasteljauConstruction(patchFromNet(net), u, v, decasteljauOrder ?? DEFAULT_ORDER);
        const visible = !surfaceUnavailable && built !== undefined && built.polylines.some(line => line.role === id);
        return {color: polylineStyle(id).stroke, visible};
    }

    // ---- Panels ------------------------------------------------------------------------------------------------

    protected override workspaceEdit(): React.ReactNode {
        return <>{this.unavailableNotice()}<TensorPatchEditPanel state={this.state} selection={this.selection()} actions={this.panelActions} pointFirst puckKeys={this.puckKeys()}
            pointExtra={<DeCasteljauOrderControl order={this.state.decasteljauOrder ?? DEFAULT_ORDER} onChange={order => this.setDecasteljauOrder(order)} puckKey={DECASTELJAU_ORDER_KEY}/>}/></>;
    }

    protected override workspaceDisplay(): React.ReactNode {
        return <TensorPatchDisplayPanel state={this.state} actions={this.panelActions}
            visibilityExtra={<DeCasteljauVisibilityControl checked={this.state.showDeCasteljau ?? true} onChange={visible => this.setShowDeCasteljau(visible)}/>}/>;
    }
}
