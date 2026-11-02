import React, {useState} from "react";
import {useLanguage, useT} from "../../localization";
import {formatNumber} from "../../analysis/format";
import {GRID_COORD_LIMIT, GridPoint, isGridCoordinate} from "../../compgeo/grid";
import {normaliseDegrees} from "../../compgeo/inscribedAngleModel";
import {
    SIMSON_EXAMPLES, SIMSON_OFFSETS, SimsonAnalysis, SimsonExampleId, SimsonMode, SimsonSettings, isSimsonMode, resolveOffset,
} from "../../compgeo/simsonLineModel";
import {SimsonPlaceId, simsonChip, simsonTexts, simsonVertexTexts} from "./simsonLineText";

export interface SimsonLinePanelProps {
    analysis: SimsonAnalysis;
    settings: SimsonSettings;
    /** The example whose vertices, mode and exact point are exactly the current ones; undefined for a custom scene. */
    exampleId: SimsonExampleId | undefined;
    outsideView: ReadonlySet<SimsonPlaceId>;
    onExample(id: SimsonExampleId): void;
    onMode(mode: SimsonMode): void;
    /** A typed glider angle in degrees. */
    onT(value: number): void;
    /** An arrow key: the signed step in degrees (1, or 10 with Shift). */
    onStep(deltaDeg: number): void;
    onEpsilon(value: number): void;
    onPPrime(point: GridPoint): void;
}

/**
 * The readouts and controls of the Simson line graph: example and mode choice, the status in words, the circle, P (or P-prime)
 * and the three feet (exact fractions in exact mode, rounded decimals in glider mode), the power or the area ratio, the
 * glider controls (a degrees field, a focusable slider driven by arrow keys, the discrete offset slider with its value in
 * words), the exact point fields and the vertex list. State is words, never colour alone. The status paragraph keeps its
 * element mounted (live region).
 */
export function SimsonLinePanel(props: SimsonLinePanelProps) {
    const t = useT();
    const {language} = useLanguage();
    const {analysis, settings} = props;
    if (analysis.kind === "missing") {
        return <div className="inspector-group" data-simson-state="missing">
            <p className="inspector-help pointset-status" role="status">{t("notable_missing", {value0: 3 - analysis.have})}</p>
            <ExampleAndMode {...props}/>
        </div>;
    }
    if (analysis.kind === "degenerate") {
        return <div className="inspector-group simson-panel" data-simson-state="degenerate">
            <ExampleAndMode {...props}/>
            <p className="inspector-help pointset-status" role="status" data-simson-chip>{simsonChip(analysis, t)}</p>
            <p className="inspector-help" data-simson-degenerate>{t("simson_degenerate_why")}</p>
            <h3 className="inspector-reveals-title">{t("notable_coordinates_heading")}</h3>
            <ul className="pointset-list" data-simson-coordinates>
                {simsonVertexTexts(analysis.vertices, t).map((text, i) => <li key={i}>{text}</li>)}
            </ul>
        </div>;
    }
    const texts = simsonTexts(analysis, t, language, props.outsideView);
    return <div className="inspector-group simson-panel" data-simson-state={texts.state} data-simson-status={analysis.status}>
        <ExampleAndMode {...props}/>
        <p className="inspector-help pointset-status" role="status" data-simson-chip>{texts.chip}</p>
        {settings.mode === "glider"
            ? <GliderControls t={normaliseDegrees(settings.t)} epsilon={resolveOffset(settings.epsilon)} onT={props.onT} onStep={props.onStep} onEpsilon={props.onEpsilon}/>
            : <PPrimeFields point={settings.pPrime} onPPrime={props.onPPrime}/>}
        <h3 className="inspector-reveals-title">{t("notable_readouts_heading")}</h3>
        <ul className="pointset-list simson-readouts">
            <li data-simson-readout="circle">{texts.circle}</li>
            {texts.rows.map(row => <li key={row.id} data-simson-point={row.id} data-outside-view={row.outsideView}>{row.text}</li>)}
            {texts.power && <li data-simson-readout="power">{texts.power}</li>}
            <li data-simson-readout="area">{texts.area}</li>
        </ul>
        {texts.onCircle && <p className="inspector-help" data-simson-on-circle>{texts.onCircle}</p>}
        {texts.distinct && <p className="inspector-help" data-simson-distinct>{texts.distinct}</p>}
        {texts.tooFar.map(note => <p key={note} className="inspector-help" data-simson-too-far>{note}</p>)}
        <h3 className="inspector-reveals-title">{t("notable_coordinates_heading")}</h3>
        <ul className="pointset-list" data-simson-coordinates>
            {texts.vertices.map((text, i) => <li key={i}>{text}</li>)}
        </ul>
    </div>;
}

function ExampleAndMode(props: SimsonLinePanelProps) {
    const t = useT();
    const names: Readonly<Record<SimsonExampleId, string>> = {
        default: t("simson_example_default"), "grid-on-circle": t("simson_example_grid_on_circle"),
        "grid-off-circle": t("simson_example_grid_off_circle"), vertex: t("simson_example_vertex"),
    };
    return <>
        <label className="pointset-check">{t("simson_example_label")}{" "}
            <select value={props.exampleId ?? "custom"} data-simson-example
                    onChange={event => {
                        const found = SIMSON_EXAMPLES.find(example => example.id === event.target.value);
                        if (found) props.onExample(found.id);
                    }}>
                {SIMSON_EXAMPLES.map(example => <option key={example.id} value={example.id}>{names[example.id]}</option>)}
                {props.exampleId === undefined && <option value="custom">{t("notable_example_custom")}</option>}
            </select>
        </label>
        <label className="pointset-check">{t("simson_mode_label")}{" "}
            <select value={props.settings.mode} data-simson-mode
                    onChange={event => { if (isSimsonMode(event.target.value)) props.onMode(event.target.value); }}>
                <option value="glider">{t("simson_mode_glider")}</option>
                <option value="exact">{t("simson_mode_exact")}</option>
            </select>
        </label>
    </>;
}

interface GliderControlsProps {
    t: number;
    epsilon: number;
    onT(value: number): void;
    onStep(deltaDeg: number): void;
    onEpsilon(value: number): void;
}

function GliderControls(props: GliderControlsProps) {
    const t = useT();
    const {language} = useLanguage();
    const [draft, setDraft] = useState<string | undefined>(undefined);
    const shown = formatNumber(props.t, "en", 2);
    // The typed text stays only while it still names the effective t; unparsable intermediate text ("", "-") is kept while typing.
    const draftValue = draft === undefined || draft.trim() === "" ? NaN : Number(draft);
    const keepDraft = draft !== undefined && (!Number.isFinite(draftValue) || Math.abs(normaliseDegrees(draftValue) - props.t) < 1e-9);
    const valueText = t("simson_slider_value", {value0: formatNumber(props.t, language, 1)});
    const stop = Math.max(0, SIMSON_OFFSETS.findIndex(offset => offset === props.epsilon));
    const epsilonText = t("simson_epsilon_value", {value0: formatNumber(props.epsilon, language, 3)});
    return <div className="simson-glider">
        <label className="pointset-check">{t("simson_t_label")}{" "}
            <input type="number" step={1} value={keepDraft ? draft : shown} data-simson-t
                   onChange={event => {
                       setDraft(event.target.value);
                       const value = event.target.valueAsNumber;
                       if (Number.isFinite(value)) props.onT(value);
                   }}
                   onBlur={() => setDraft(undefined)}/>
        </label>
        <label className="pointset-check simson-slider-row">
            <input type="range" min={0} max={360} step="any" value={props.t} className="simson-slider" data-simson-slider
                   aria-label={t("simson_slider_label")} aria-valuenow={Math.round(props.t * 10) / 10} aria-valuetext={valueText}
                   onChange={event => {
                       const value = event.target.valueAsNumber;
                       if (Number.isFinite(value)) props.onT(value);
                   }}
                   onKeyDown={event => {
                       if (event.altKey || event.ctrlKey || event.metaKey) return;
                       const sign = event.key === "ArrowRight" || event.key === "ArrowUp" || event.key === "PageUp" ? 1
                           : event.key === "ArrowLeft" || event.key === "ArrowDown" || event.key === "PageDown" ? -1 : 0;
                       if (sign === 0) return;
                       event.preventDefault();
                       setDraft(undefined);
                       props.onStep(sign * (event.shiftKey || event.key.startsWith("Page") ? 10 : 1));
                   }}/>
            <span aria-hidden="true">{valueText}</span>
        </label>
        <label className="pointset-check simson-slider-row">{t("simson_epsilon_label")}{" "}
            <input type="range" min={0} max={SIMSON_OFFSETS.length - 1} step={1} value={stop} data-simson-epsilon
                   aria-valuetext={epsilonText}
                   onChange={event => {
                       const offset = SIMSON_OFFSETS[event.target.valueAsNumber];
                       if (offset !== undefined) props.onEpsilon(offset);
                   }}/>
            <span aria-hidden="true" data-simson-epsilon-value>{epsilonText}</span>
        </label>
        <p className="inspector-help" data-simson-epsilon-note>{t("simson_epsilon_note")}</p>
    </div>;
}

function PPrimeFields(props: {point: GridPoint; onPPrime(point: GridPoint): void}) {
    const t = useT();
    return <div className="simson-pprime">
        <h3 className="inspector-reveals-title">{t("simson_pprime_heading")}</h3>
        <IntField label={t("simson_pprime_x")} value={props.point.x} onValue={x => props.onPPrime({x, y: props.point.y})}/>
        <IntField label={t("simson_pprime_y")} value={props.point.y} onValue={y => props.onPPrime({x: props.point.x, y})}/>
    </div>;
}

/** An integer field within the grid range; text that is not such a number is kept while typing and never written. */
function IntField(props: {label: string; value: number; onValue(value: number): void}) {
    const [draft, setDraft] = useState<string | undefined>(undefined);
    const draftValue = draft === undefined || draft.trim() === "" ? NaN : Number(draft);
    const keepDraft = draft !== undefined && draftValue !== props.value;
    return <label className="pointset-check">{props.label}{" "}
        <input type="number" step={1} min={-GRID_COORD_LIMIT} max={GRID_COORD_LIMIT} value={keepDraft ? draft : String(props.value)}
               onChange={event => {
                   setDraft(event.target.value);
                   const value = event.target.valueAsNumber;
                   if (isGridCoordinate(value)) props.onValue(value);
               }}
               onBlur={() => setDraft(undefined)}/>
    </label>;
}
