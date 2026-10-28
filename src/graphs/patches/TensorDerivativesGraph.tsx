import type React from "react";
import type {PresetCollection} from "../base/presets/PresetCollection";
import {DerivativesCornerButtons, DerivativesReadout, DerivativesVisibilityControls} from "./TensorDerivativesPanels";
import {buildDerivativesScene} from "./TensorDerivativesScene";
import TensorPatchGraph, {TensorPatchGraphState} from "./TensorPatchGraph";
import {TensorPatchDisplayPanel, TensorPatchEditPanel} from "./TensorPatchPanels";
import {PatchCollectionPresetData, PatchStateDto, Point3Dto, TensorPatchDto} from "./patchDto";
import {type DerivativesStartingPatch, derivativesStartingPatches, patchPresetCollections} from "./patchPresetCollections";
import {patchFromNet} from "./patchSceneBuilder";
import {tensorDifferentials} from "./tensorDerivatives";
import type {SurfaceScene} from "./surface-view/surfaceScene";

export type DerivativesSwitch = "showTangentPlane" | "showNormal" | "showTwist";

/** The bicubic dome at a non-symmetric interior (u, v), with the tangent plane, normal and twist on: the scene this Demonstration starts with. */
function defaultDto(): TensorPatchDto {
    const entry = derivativesStartingPatches[1].data()[0];
    if (entry[0] !== "TensorProductBezierPatch") throw new Error("The default patch Preset is not a tensor patch.");
    return {...entry[1], state: {...entry[1].state, u: 0.3, v: 0.65, showTangentPlane: true, showNormal: true, showTwist: true}};
}

/**
 * The tensor-product patch Demonstration with its first derivatives at (u, v): arrows for `S_u`, `S_v` and the twist
 * `S_uv`, the unit normal and the tangent plane, a numeric readout, and corner shortcuts. The switches live in the
 * scene store and in the Preset `state`; the drawing is derived from them and the net, so nothing is transient.
 */
export default class TensorDerivativesGraph extends TensorPatchGraph {
    override getInitialState(): TensorPatchGraphState {
        return {...super.getInitialState(), ...this.stateOf(defaultDto())};
    }

    override presetCollection(): PresetCollection<PatchCollectionPresetData> {
        return patchPresetCollections["patch-derivatives"];
    }

    override defaultPreset(): PatchCollectionPresetData {
        return [["TensorProductBezierPatch", defaultDto()]];
    }

    protected override stateDto(): PatchStateDto {
        return {
            ...super.stateDto(),
            showTangentPlane: this.state.showTangentPlane ?? true, showNormal: this.state.showNormal ?? true, showTwist: this.state.showTwist ?? true,
        };
    }

    /** A Preset without the switches shows the plane, the normal and the twist. */
    protected override stateOf(dto: {m: number; n: number; net: ReadonlyArray<Point3Dto>; state?: PatchStateDto}): Partial<TensorPatchGraphState> {
        return {
            ...super.stateOf(dto),
            showTangentPlane: dto.state?.showTangentPlane ?? true, showNormal: dto.state?.showNormal ?? true, showTwist: dto.state?.showTwist ?? true,
        };
    }

    protected override startingPatches(): ReadonlyArray<DerivativesStartingPatch> {
        return derivativesStartingPatches;
    }

    /** The starting patches replace the net, not the switches the student chose. */
    protected override startingPatchKept(): Partial<TensorPatchGraphState> {
        const {showTangentPlane, showNormal, showTwist} = this.state;
        return {showTangentPlane, showNormal, showTwist};
    }

    protected override lessonVisibilitySetters(): ReturnType<TensorPatchGraph["lessonVisibilitySetters"]> {
        return {
            ...super.lessonVisibilitySetters(),
            "tangent-plane": visible => this.setDerivativesSwitch("showTangentPlane", visible),
            "normal": visible => this.setDerivativesSwitch("showNormal", visible),
            "twist": visible => this.setDerivativesSwitch("showTwist", visible),
        };
    }

    setDerivativesSwitch(key: DerivativesSwitch, visible: boolean): void {
        this.setState({[key]: visible});
    }

    // ---- Surface contract --------------------------------------------------------------------------------------

    protected override buildScene(revision: number, selectedPointId: string | undefined): SurfaceScene {
        const scene = super.buildScene(revision, selectedPointId);
        const {net, u, v, showTangentPlane, showNormal, showTwist} = this.state;
        const derivatives = buildDerivativesScene(patchFromNet(net), u, v, {
            showTangentPlane: showTangentPlane ?? true, showNormal: showNormal ?? true, showTwist: showTwist ?? true,
        });
        return {...scene, polylines: [...scene.polylines, ...derivatives.polylines], labels: [...scene.labels, ...derivatives.labels], planes: derivatives.planes};
    }

    protected override geometryChanged(previous: Readonly<TensorPatchGraphState>): boolean {
        const s = this.state;
        // The arrows and the plane follow (u, v), so a parameter change is a geometry change here.
        return super.geometryChanged(previous) || s.u !== previous.u || s.v !== previous.v
            || s.showTangentPlane !== previous.showTangentPlane || s.showNormal !== previous.showNormal || s.showTwist !== previous.showTwist;
    }

    // ---- Panels ------------------------------------------------------------------------------------------------

    protected override workspaceEdit(): React.ReactNode {
        const {net, u, v} = this.state;
        return <>
            {this.unavailableNotice()}
            <TensorPatchEditPanel state={this.state} selection={this.selection()} actions={this.panelActions} startingPatches={this.startingPatches()}
                                  pointExtra={<>
                                      <DerivativesCornerButtons onCorner={(cornerU, cornerV) => this.setParameters(cornerU, cornerV)}/>
                                      {/* Next to the controls that change it, not after the Bernstein readout. */}
                                      <DerivativesReadout differentials={tensorDifferentials(patchFromNet(net), u, v)}/>
                                  </>}/>
        </>;
    }

    protected override workspaceDisplay(): React.ReactNode {
        return <TensorPatchDisplayPanel state={this.state} actions={this.panelActions}
            visibilityExtra={<DerivativesVisibilityControls showTangentPlane={this.state.showTangentPlane ?? true} showNormal={this.state.showNormal ?? true}
                                                            showTwist={this.state.showTwist ?? true} onChange={(key, visible) => this.setDerivativesSwitch(key, visible)}/>}/>;
    }
}
