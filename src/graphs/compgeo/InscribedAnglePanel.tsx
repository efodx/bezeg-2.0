import React, {useState} from "react";
import {useLanguage, useT} from "../../localization";
import {formatNumber} from "../../analysis/format";
import {INSCRIBED_EXAMPLES, InscribedAnalysis, InscribedExampleId, normaliseDegrees} from "../../compgeo/inscribedAngleModel";
import {inscribedTexts} from "./inscribedAngleText";

export interface InscribedAnglePanelProps {
    analysis: InscribedAnalysis;
    /** The example whose vertices are exactly the current ones; undefined for custom vertices. */
    exampleId: InscribedExampleId | undefined;
    onExample(id: InscribedExampleId): void;
    /** A typed glider parameter in degrees (no direction of motion). */
    onT(value: number): void;
    /** An arrow key: the signed step in degrees (1, or 10 with Shift). */
    onStep(deltaDeg: number): void;
}

/**
 * The readouts of the inscribed-angle graph: example choice, the status line, the three angles, the arc relation with the
 * "equal to the displayed precision" wording, the exact diameter statement, the glider controls (a degrees field and a
 * focusable slider driven by arrow keys) and the vertex list for non-pointer use. The status is words, never colour alone.
 */
export function InscribedAnglePanel(props: InscribedAnglePanelProps) {
    const t = useT();
    const {language} = useLanguage();
    const {analysis} = props;
    const texts = inscribedTexts(analysis, t, language);
    const glider = analysis.kind === "circle" ? analysis.glider : undefined;
    return <div className="inspector-group inscribed-panel" data-inscribed-state={texts.state}>
        <ExampleSelect {...props}/>
        <p className="inspector-help pointset-status" data-inscribed-chip>{texts.chip}</p>
        {texts.acb && <>
            <h3 className="inspector-reveals-title">{t("inscribed_readouts_heading")}</h3>
            <ul className="pointset-list inscribed-readouts">
                <li data-inscribed-readout="acb">{texts.acb}</li>
                {texts.apb && <li data-inscribed-readout="apb">{texts.apb}</li>}
                <li data-inscribed-readout="central">{texts.central}</li>
            </ul>
            {texts.relation && <p className="inspector-help" data-inscribed-relation={glider?.relation}>{texts.relation}</p>}
            {texts.diameter && <p className="inspector-help" data-inscribed-diameter>{texts.diameter}</p>}
            {texts.undefinedNote && <p className="inspector-help" data-inscribed-undefined>{texts.undefinedNote}</p>}
        </>}
        {glider && <GliderControls t={glider.t} onT={props.onT} onStep={props.onStep}/>}
        {texts.vertices.length > 0 && <>
            <h3 className="inspector-reveals-title">{t("notable_coordinates_heading")}</h3>
            <ul className="pointset-list" data-inscribed-coordinates>
                {texts.vertices.map((text, i) => <li key={i}>{text}</li>)}
            </ul>
        </>}
    </div>;
}

function GliderControls(props: {t: number; onT(value: number): void; onStep(deltaDeg: number): void}) {
    const t = useT();
    const {language} = useLanguage();
    const [draft, setDraft] = useState<string | undefined>(undefined);
    const shown = formatNumber(props.t, "en", 2);
    // The typed text stays only while it still names the effective t: a value moved out of a gap, a Reset or a restore
    // replaces it at once. Unparsable intermediate text ("", "-") is kept while typing.
    const draftValue = draft === undefined || draft.trim() === "" ? NaN : Number(draft);
    const keepDraft = draft !== undefined && (!Number.isFinite(draftValue) || Math.abs(normaliseDegrees(draftValue) - props.t) < 1e-9);
    const valueText = t("inscribed_slider_value", {value0: formatNumber(props.t, language, 1)});
    return <div className="inscribed-glider">
        <h3 className="inspector-reveals-title">{t("inscribed_glider_heading")}</h3>
        <label className="pointset-check">{t("inscribed_t_label")}{" "}
            <input type="number" step={1} value={keepDraft ? draft : shown} data-inscribed-t
                   onChange={event => {
                       setDraft(event.target.value);
                       const value = event.target.valueAsNumber;
                       if (Number.isFinite(value)) props.onT(value);
                   }}
                   onBlur={() => setDraft(undefined)}/>
        </label>
        <label className="pointset-check inscribed-slider-row">
            <input type="range" min={0} max={360} step="any" value={props.t} className="inscribed-slider" data-inscribed-slider
                   aria-label={t("inscribed_slider_label")} aria-valuenow={Math.round(props.t * 10) / 10} aria-valuetext={valueText}
                   onChange={event => {
                       // Pointer, touch, Home and End: the direction of motion is the sign of the change.
                       const value = event.target.valueAsNumber;
                       if (Number.isFinite(value)) props.onStep(value - props.t);
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
    </div>;
}

function ExampleSelect(props: InscribedAnglePanelProps) {
    const t = useT();
    const names: Readonly<Record<InscribedExampleId, string>> = {default: t("inscribed_example_default"), thales: t("inscribed_example_thales")};
    return <label className="pointset-check">{t("inscribed_example_label")}{" "}
        <select value={props.exampleId ?? "custom"} data-inscribed-example
                onChange={event => {
                    const found = INSCRIBED_EXAMPLES.find(example => example.id === event.target.value);
                    if (found) props.onExample(found.id);
                }}>
            {INSCRIBED_EXAMPLES.map(example => <option key={example.id} value={example.id}>{names[example.id]}</option>)}
            {props.exampleId === undefined && <option value="custom">{t("inscribed_example_custom")}</option>}
        </select>
    </label>;
}
