import type React from "react";
import {currentLanguage, message} from "../../localization";
import type {ActionDeclaration, GraphDeclaration, LegendEntry, ReadoutRow} from "../base/declare/graphDeclaration";
import type {PresetCollection} from "../base/presets/PresetCollection";
import {runAs} from "../base/writes/writeSource";
import {DerivativesCornerSelect, DerivativesReadout, DerivativesVisibilityControls, REASON_KEYS, vectorText} from "./TensorDerivativesPanels";
import {buildDerivativesScene} from "./TensorDerivativesScene";
import TensorPatchGraph, {TensorPatchGraphState, TensorPatchIds} from "./TensorPatchGraph";
import {PLANE_STYLE, polylineStyle} from "./surface-view/jsxStyles";
import {TensorPatchDisplayPanel, TensorPatchEditPanel} from "./TensorPatchPanels";
import {PatchCollectionPresetData, PatchStateDto, Point3Dto, TensorPatchDto} from "./patchDto";
import {type DerivativesStartingPatch, derivativesStartingPatches, patchPresetCollections} from "./patchPresetCollections";
import {patchFromNet} from "./patchSceneBuilder";
import {tensorDifferentials} from "./tensorDerivatives";
import type {SurfaceScene, Xyz} from "./surface-view/surfaceScene";

export type DerivativesSwitch = "showTangentPlane" | "showNormal" | "showTwist";

/** The Orodja actions of the three switches: id, state key, label. */
const DERIVATIVES_SWITCHES = [
    ["show-tangent-plane", "showTangentPlane", "patch_show_tangent_plane"],
    ["show-normal", "showNormal", "patch_show_normal"],
    ["show-twist", "showTwist", "patch_show_twist"],
] as const;

/** The legend entries of the derivative scene (id, which is also the drawn object's id) and the scene role each one names (`plane` is the tangent plane). */
const DERIVATIVES_LEGEND = [
    ["su", "vector-u", "line", "patch_derivatives_legend_su"],
    ["sv", "vector-v", "line", "patch_derivatives_legend_sv"],
    ["twist", "twist", "dashed", "patch_derivatives_legend_twist"],
    ["normal", "normal", "dashed", "patch_derivatives_legend_normal"],
    ["plane", "plane", "area", "patch_derivatives_legend_plane"],
] as const;

/** The tensor workspace's ids plus the derivative rows (named as the recorded readout labels them), their legend and switches. */
export type DerivativesIds = {
    param: TensorPatchIds["param"];
    row: "Su" | "Sv" | "Suv" | "normal";
    note: "legend";
    legend: TensorPatchIds["legend"] | typeof DERIVATIVES_LEGEND[number][0];
    section: never;
    action: TensorPatchIds["action"] | typeof DERIVATIVES_SWITCHES[number][0];
};

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
        const derivatives = this.derivativesScene();
        return {...scene, polylines: [...scene.polylines, ...derivatives.polylines], labels: [...scene.labels, ...derivatives.labels], planes: derivatives.planes};
    }

    private derivativesScene() {
        const {net, u, v, showTangentPlane, showNormal, showTwist} = this.state;
        return buildDerivativesScene(patchFromNet(net), u, v, {
            showTangentPlane: showTangentPlane ?? true, showNormal: showNormal ?? true, showTwist: showTwist ?? true,
        });
    }

    protected override geometryChanged(previous: Readonly<TensorPatchGraphState>): boolean {
        const s = this.state;
        // The arrows and the plane follow (u, v), so a parameter change is a geometry change here.
        return super.geometryChanged(previous) || s.u !== previous.u || s.v !== previous.v
            || s.showTangentPlane !== previous.showTangentPlane || s.showNormal !== previous.showNormal || s.showTwist !== previous.showTwist;
    }

    // ---- Declaration -------------------------------------------------------------------------------------------

    protected override declaresTensorWorkspace(): boolean {
        return true;
    }

    /**
     * The tensor workspace (u, v pucks: the chapter prompt and the lesson ask the learner to move (u, v) and watch the arrows) plus the
     * readout of `S_u`, `S_v`, `S_uv` and the unit normal, each row with its arrow's swatch; the arrow legend as a note; the reason
     * the normal is undefined as a status line; the plane, normal and twist switches as Orodja actions. The corner shortcuts stay in Orodja.
     */
    protected override declaration(): GraphDeclaration<DerivativesIds> {
        const base = this.tensorDeclaration();
        const s = this.state;
        const language = currentLanguage();
        const {su, sv, twist, normal} = tensorDifferentials(patchFromNet(s.net), s.u, s.v);
        const vector = (value: Xyz) => ({kind: "formatted" as const, text: vectorText(value, language)});
        const rows: ReadoutRow<DerivativesIds>[] = [
            {id: "Su", symbol: "S_u", value: vector(su), legend: "su"},
            {id: "Sv", symbol: "S_v", value: vector(sv), legend: "sv"},
            {id: "Suv", symbol: "S_{uv}", value: vector(twist), legend: "twist"},
            {id: "normal", name: message("patch_derivatives_normal_name"), symbol: "n", legend: "normal",
                ...(normal.kind === "defined" ? {value: vector(normal.unit)} : {value: message("patch_derivatives_normal_undefined"), muted: true})},
        ];
        const legend: LegendEntry<DerivativesIds>[] = [...base.legend ?? [],
            ...DERIVATIVES_LEGEND.map(([id, , kind, label]) => ({id, label: message(label), kind, object: id}))];
        const actions: ActionDeclaration<DerivativesIds>[] = [...base.actions ?? [],
            ...DERIVATIVES_SWITCHES.map(([id, key, label]) => ({
                id, label: message(label), placement: "tools" as const, tab: "display" as const, section: "display", enabled: true, pressed: s[key] ?? true,
            }))];
        return {
            ...base,
            readouts: [{id: "derivatives", title: message("patch_derivatives_readout_heading"), rows}],
            notes: [{id: "legend", text: message("patch_derivatives_legend"), tone: "muted"}],
            legend,
            actions,
            ...(normal.kind === "degenerate" ? {status: [{id: "normal", text: message(REASON_KEYS[normal.reason]), tone: "warning" as const}]} : {}),
        };
    }

    override performAction(id: string): void {
        const derivativesSwitch = DERIVATIVES_SWITCHES.find(([candidate]) => candidate === id);
        if (derivativesSwitch === undefined) return super.performAction(id);
        const key = derivativesSwitch[1];
        runAs("learner", () => this.setDerivativesSwitch(key, !(this.state[key] ?? true)));
    }

    /** An arrow or the tangent plane is drawn while the scene holds it: its switch is on, it has length, and (normal, plane) the normal is defined. */
    override drawnObject(id: string): {color: string; visible: boolean} | undefined {
        const entry = DERIVATIVES_LEGEND.find(([candidate]) => candidate === id);
        if (entry === undefined) return super.drawnObject(id);
        const role = entry[1];
        const scene = this.derivativesScene();
        const held = role === "plane" ? scene.planes.length > 0 : scene.polylines.some(line => line.role === role);
        const color = role === "plane" ? PLANE_STYLE.fill ?? PLANE_STYLE.stroke : polylineStyle(role).stroke;
        return {color, visible: held && !this.state.surfaceUnavailable};
    }

    // ---- Panels ------------------------------------------------------------------------------------------------

    protected override workspaceEdit(): React.ReactNode {
        const {net, u, v} = this.state;
        return <>
            {this.unavailableNotice()}
            <TensorPatchEditPanel state={this.state} selection={this.selection()} actions={this.panelActions} startingPatches={this.startingPatches()} pointFirst
                                  puckKeys={this.puckKeys()}
                                  pointExtra={<>
                                      <DerivativesCornerSelect u={u} v={v} onCorner={(cornerU, cornerV) => this.setParameters(cornerU, cornerV)}/>
                                      {/* Next to the controls that change it, not after the Bernstein readout; the declared readout replaces it on the board. */}
                                      <div data-declared-panel=""><DerivativesReadout differentials={tensorDifferentials(patchFromNet(net), u, v)}/></div>
                                  </>}/>
        </>;
    }

    protected override workspaceDisplay(): React.ReactNode {
        return <TensorPatchDisplayPanel state={this.state} actions={this.panelActions}
            visibilityExtra={<DerivativesVisibilityControls showTangentPlane={this.state.showTangentPlane ?? true} showNormal={this.state.showNormal ?? true}
                                                            showTwist={this.state.showTwist ?? true} onChange={(key, visible) => this.setDerivativesSwitch(key, visible)}/>}/>;
    }
}
