import type React from "react";
import type {PresetCollection} from "../base/presets/PresetCollection";
import {DeCasteljauOrderControl, DeCasteljauVisibilityControl} from "./TensorDeCasteljauPanels";
import {buildDeCasteljauConstruction} from "./TensorDeCasteljauScene";
import TensorPatchGraph, {TensorPatchGraphState} from "./TensorPatchGraph";
import {TensorPatchDisplayPanel, TensorPatchEditPanel} from "./TensorPatchPanels";
import {DecasteljauOrder, PatchCollectionPresetData, PatchStateDto, Point3Dto, TensorPatchDto} from "./patchDto";
import {defaultPatchPresets, patchPresetCollections} from "./patchPresetCollections";
import {patchFromNet} from "./patchSceneBuilder";
import type {SurfaceScene} from "./surface-view/surfaceScene";

const DEFAULT_ORDER: DecasteljauOrder = "rows";

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

    // ---- Panels ------------------------------------------------------------------------------------------------

    protected override workspaceEdit(): React.ReactNode {
        return <>{this.unavailableNotice()}<TensorPatchEditPanel state={this.state} selection={this.selection()} actions={this.panelActions}
            pointExtra={<DeCasteljauOrderControl order={this.state.decasteljauOrder ?? DEFAULT_ORDER} onChange={order => this.setDecasteljauOrder(order)}/>}/></>;
    }

    protected override workspaceDisplay(): React.ReactNode {
        return <TensorPatchDisplayPanel state={this.state} actions={this.panelActions}
            visibilityExtra={<DeCasteljauVisibilityControl checked={this.state.showDeCasteljau ?? true} onChange={visible => this.setShowDeCasteljau(visible)}/>}/>;
    }
}
