import React from "react";
import {useLanguage, useT} from "../../localization";
import {formatNumber} from "../../analysis/format";
import {GRID_COORD_LIMIT, GridPoint} from "../../compgeo/grid";
import {normaliseDegrees} from "../../compgeo/inscribedAngleModel";
import {ChoiceSelect} from "../../inputs/ChoiceSelect";
import {NumberInput} from "../../inputs/NumberInput";
import Slider from "../../inputs/Slider";
import AngleSlider from "../../inputs/AngleSlider";
import {
    SIMSON_EXAMPLES, SIMSON_OFFSETS, SimsonAnalysis, SimsonExampleId, SimsonMode, SimsonSettings, isSimsonMode, resolveOffset,
} from "../../compgeo/simsonLineModel";
import {LiveReadout} from "../base/controls/LiveReadout";
import {ReadoutHeading} from "../base/controls/ReadoutParts";
import {useStatusReadout} from "../base/controls/useStatusReadout";
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
    onEpsilon(value: number): void;
    onPPrime(point: GridPoint): void;
}

/**
 * The readouts and controls of the Simson line graph: example and mode choice, the status in words, the circle, P (or P-prime)
 * and the three feet (exact fractions in exact mode, rounded decimals in glider mode), the power or the area ratio, the
 * glider controls (the angle slider with its degrees field, the discrete offset slider), the exact point fields and the vertex list. State is words, never colour alone. The status paragraph keeps its
 * element mounted (live region).
 */
export function SimsonLinePanel(props: SimsonLinePanelProps) {
    const t = useT();
    const {language} = useLanguage();
    const {analysis, settings} = props;
    const texts = analysis.kind === "missing" || analysis.kind === "degenerate" ? undefined : simsonTexts(analysis, t, language, props.outsideView);
    // The one announcement of the graph: the state sentence the chip shows (decision 63); a drag settles before it is read.
    const stateText = analysis.kind === "missing" ? t("notable_missing", {value0: 3 - analysis.have})
        : analysis.kind === "degenerate" ? simsonChip(analysis, t) : texts?.chip ?? "";
    const liveReadout = useStatusReadout(stateText, true);
    if (analysis.kind === "missing") {
        return <div className="inspector-group" data-simson-state="missing">
            <p className="inspector-help pointset-status">{stateText}</p>
            <ExampleAndMode {...props}/>
            <LiveReadout readout={liveReadout} dataAttribute="simson-live"/>
        </div>;
    }
    if (analysis.kind === "degenerate") {
        return <div className="inspector-group simson-panel" data-simson-state="degenerate">
            <ExampleAndMode {...props}/>
            <p className="inspector-help pointset-status" data-simson-chip>{stateText}</p>
            <p className="inspector-help" data-simson-degenerate>{t("simson_degenerate_why")}</p>
            <ReadoutHeading>{t("notable_coordinates_heading")}</ReadoutHeading>
            <ul className="pointset-list" data-simson-coordinates>
                {simsonVertexTexts(analysis.vertices, t).map((text, i) => <li key={i}>{text}</li>)}
            </ul>
            <LiveReadout readout={liveReadout} dataAttribute="simson-live"/>
        </div>;
    }
    if (!texts) return null;
    return <div className="inspector-group simson-panel" data-simson-state={texts.state} data-simson-status={analysis.status}>
        <ExampleAndMode {...props}/>
        <p className="inspector-help pointset-status" data-simson-chip>{texts.chip}</p>
        {settings.mode === "glider"
            ? <GliderControls t={normaliseDegrees(settings.t)} epsilon={resolveOffset(settings.epsilon)} onT={props.onT} onEpsilon={props.onEpsilon}/>
            : <PPrimeFields point={settings.pPrime} onPPrime={props.onPPrime}/>}
        <ReadoutHeading>{t("notable_readouts_heading")}</ReadoutHeading>
        <ul className="pointset-list simson-readouts">
            <li data-simson-readout="circle">{texts.circle}</li>
            {texts.rows.map(row => <li key={row.id} data-simson-point={row.id} data-outside-view={row.outsideView}>{row.text}</li>)}
            {texts.power && <li data-simson-readout="power">{texts.power}</li>}
            <li data-simson-readout="area">{texts.area}</li>
        </ul>
        {texts.onCircle && <p className="inspector-help" data-simson-on-circle>{texts.onCircle}</p>}
        {texts.distinct && <p className="inspector-help" data-simson-distinct>{texts.distinct}</p>}
        {texts.tooFar.map(note => <p key={note} className="inspector-help" data-simson-too-far>{note}</p>)}
        <ReadoutHeading>{t("notable_coordinates_heading")}</ReadoutHeading>
        <ul className="pointset-list" data-simson-coordinates>
            {texts.vertices.map((text, i) => <li key={i}>{text}</li>)}
        </ul>
        <LiveReadout readout={liveReadout} dataAttribute="simson-live"/>
    </div>;
}

function ExampleAndMode(props: SimsonLinePanelProps) {
    const t = useT();
    const names: Readonly<Record<SimsonExampleId, string>> = {
        default: t("simson_example_default"), "grid-on-circle": t("simson_example_grid_on_circle"),
        "grid-off-circle": t("simson_example_grid_off_circle"), vertex: t("simson_example_vertex"),
    };
    return <>
        <div data-simson-example>
            <ChoiceSelect label={t("simson_example_label")} value={props.exampleId ?? "custom"}
                          options={[...SIMSON_EXAMPLES.map(example => ({value: example.id, text: names[example.id]})),
                              ...(props.exampleId === undefined ? [{value: "custom", text: t("notable_example_custom")}] : [])]}
                          onChange={id => {
                              const found = SIMSON_EXAMPLES.find(example => example.id === id);
                              if (found) props.onExample(found.id);
                          }}/>
        </div>
        <div data-simson-mode>
            <ChoiceSelect label={t("simson_mode_label")} value={props.settings.mode}
                          options={[{value: "glider", text: t("simson_mode_glider")}, {value: "exact", text: t("simson_mode_exact")}]}
                          onChange={mode => { if (isSimsonMode(mode)) props.onMode(mode); }}/>
        </div>
    </>;
}

interface GliderControlsProps {
    t: number;
    epsilon: number;
    onT(value: number): void;
    onEpsilon(value: number): void;
}

function GliderControls(props: GliderControlsProps) {
    const t = useT();
    const {language} = useLanguage();
    const stop = Math.max(0, SIMSON_OFFSETS.findIndex(offset => offset === props.epsilon));
    return <div className="simson-glider">
        <div data-simson-t>
            <AngleSlider customText={t("simson_t_label")} value={props.t} onChange={value => props.onT(value)}/>
        </div>
        <div data-simson-epsilon>
            <Slider customText={t("simson_epsilon_label")} min={0} max={SIMSON_OFFSETS.length - 1} step={1} value={stop}
                    formatValue={index => formatNumber(SIMSON_OFFSETS[index] ?? props.epsilon, language, 3)}
                    onChange={index => {
                        const offset = SIMSON_OFFSETS[index];
                        if (offset !== undefined) props.onEpsilon(offset);
                    }}/>
        </div>
        <p className="inspector-help" data-simson-epsilon-note>{t("simson_epsilon_note")}</p>
    </div>;
}

function PPrimeFields(props: {point: GridPoint; onPPrime(point: GridPoint): void}) {
    const t = useT();
    return <div className="simson-pprime">
        <ReadoutHeading>{t("simson_pprime_heading")}</ReadoutHeading>
        <NumberInput label={t("simson_pprime_x")} value={props.point.x} min={-GRID_COORD_LIMIT} max={GRID_COORD_LIMIT} step={1} integer
                     onChange={x => { props.onPPrime({x, y: props.point.y}); }}/>
        <NumberInput label={t("simson_pprime_y")} value={props.point.y} min={-GRID_COORD_LIMIT} max={GRID_COORD_LIMIT} step={1} integer
                     onChange={y => { props.onPPrime({x: props.point.x, y}); }}/>
    </div>;
}
