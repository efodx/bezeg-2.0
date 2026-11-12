import React from "react";
import {t} from "../../../localization";
import {ChoiceSelect} from "../../../inputs/ChoiceSelect";
import {OnOffSwitch} from "../../../inputs/OnOffSwitch";
import {EVOLUTE_TRACE_MODES, EvoluteTraceMode} from "../../../learning/model";
import type {LessonActionRegistry} from "../../base/lesson/LessonActionRegistry";
import {evoluteCurvePresetCollection} from "../geometry/collections";
import {
    CurvatureGraphStates,
    CurvatureOverlayGraph,
} from "./CurvatureBezierCurveGraph";
import {EvoluteOverlay} from "./EvoluteOverlay";

export interface EvoluteGraphStates extends CurvatureGraphStates {
    /** How much of the evolute is traced; saved with Presets like the curvature flags. */
    evoluteTrace: EvoluteTraceMode;
    /** The normal line at the parameter is drawn. */
    evoluteNormalShown: boolean;
}

export function isEvoluteTraceMode(value: unknown): value is EvoluteTraceMode {
    return EVOLUTE_TRACE_MODES.some(mode => mode === value);
}

/**
 * Evolute Demonstration (lesson L4): the curvature Demonstration plus an owned {@link EvoluteOverlay}, created right after the
 * curvature overlay and removed before it. The parabola's evolute spans x in [-4, 4], y in [0.5, 3.5].
 */
/** The opening parameter. At t = 0.5 the evolute point is the cusp, where the labels of E, T and N fall on top of each other. */
export const EVOLUTE_T_DEFAULT = 0.75;

class CurveEvoluteGraph extends CurvatureOverlayGraph<EvoluteGraphStates> {
    private evolute?: EvoluteOverlay;
    /** What the evolute overlay last read; see the same guard in the curvature graph. */
    private evoluteDrawn?: { t: number, mode: EvoluteTraceMode, normal: boolean };

    override getInitialState(): EvoluteGraphStates {
        return {
            ...super.getInitialState(),
            curvatureT: EVOLUTE_T_DEFAULT,
            curvatureFrameShown: true,
            curvatureCircleShown: true,
            evoluteTrace: 'full',
            evoluteNormalShown: true,
        };
    }

    protected override writeCurvatureState(update: Partial<CurvatureGraphStates>): void {
        this.setState(update);
    }

    override presetCollection() {
        return evoluteCurvePresetCollection;
    }

    protected override initialView(): [number, number, number, number] {
        // Leaves room above the trace's ends at y = 3.5 for the four-line readout, and below for the control point at y = -1.
        return [-5.2, 5, 5.2, -1.2];
    }

    /** The evolute overlay's owned elements (empty when there is none). */
    evoluteElements() {
        return this.evolute?.ownedElements() ?? [];
    }

    protected override overlayExtraReadout() {
        return () => this.evolute?.readoutText() ?? "";
    }

    protected override createExtraOverlays(): void {
        if (!this.board || !this.graphSession?.isAlive) return;
        this.evolute = new EvoluteOverlay({
            board: this.board,
            controlPoints: () => this.getFirstCurve()?.getPoints().map(point => [point.X(), point.Y()]),
            parameter: () => this.state.curvatureT,
            traceMode: () => {
                this.evoluteDrawn = {t: this.state.curvatureT, mode: this.state.evoluteTrace, normal: this.state.evoluteNormalShown};
                return this.state.evoluteTrace;
            },
            normalShown: () => this.state.evoluteNormalShown,
            fontSize: () => this.displaySettings.fontSize,
        });
        // The readout was first computed before this overlay existed, and the trace's visibility is a function: without this
        // update a newly mounted graph shows neither until the next board update.
        this.boardUpdate();
    }

    protected override removeExtraOverlays(): void {
        this.evolute?.dispose();
        this.evolute = undefined;
    }

    protected override extraStateChanged(prevState: Readonly<EvoluteGraphStates>): boolean {
        const drawn = this.evoluteDrawn;
        const stale = drawn !== undefined && (drawn.t !== this.state.curvatureT || drawn.mode !== this.state.evoluteTrace
            || drawn.normal !== this.state.evoluteNormalShown);
        return stale || prevState.evoluteTrace !== this.state.evoluteTrace || prevState.evoluteNormalShown !== this.state.evoluteNormalShown;
    }

    protected override workspaceCurvatureExtras(): React.ReactNode {
        const labels: Record<EvoluteTraceMode, string> = {
            'hidden': t("evolute_trace_hidden"),
            'to-parameter': t("evolute_trace_to_parameter"),
            'full': t("evolute_trace_full"),
        };
        return <div className="inspector-group">
            <ChoiceSelect label={t("evolute_trace_label")} value={this.state.evoluteTrace}
                          options={EVOLUTE_TRACE_MODES.map(mode => ({value: mode, text: labels[mode]}))}
                          onChange={value => { if (isEvoluteTraceMode(value)) this.setEvoluteTrace(value); }}/>
            <OnOffSwitch checked={this.state.evoluteNormalShown} label={t("evolute_normal_label")}
                         onChange={checked => this.setEvoluteNormalShown(checked)}/>
        </div>;
    }

    protected override registerLessonActions(registry: LessonActionRegistry): void {
        super.registerLessonActions(registry);
        registry.onDiscriminated('curve-visibility', 'evolute-normal', action => {
            if (typeof action.visible !== 'boolean') throw new Error('The evolute normal visibility must be true or false.');
            this.setEvoluteNormalShown(action.visible);
        });
        registry.on('evolute-trace', action => {
            if (!isEvoluteTraceMode(action.mode)) throw new Error(`The evolute trace must be one of ${EVOLUTE_TRACE_MODES.join(', ')}.`);
            this.setEvoluteTrace(action.mode);
        });
    }

    setEvoluteTrace(mode: EvoluteTraceMode) {
        this.setState({evoluteTrace: mode});
    }

    setEvoluteNormalShown(shown: boolean) {
        this.setState({evoluteNormalShown: shown});
    }
}

export default CurveEvoluteGraph;
