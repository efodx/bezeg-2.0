import React from "react";
import {useLanguage, useT} from "../../localization";
import {EULER_EXAMPLES, EulerAnalysis, EulerExampleId} from "../../compgeo/eulerLineModel";
import {EulerPlaceId, eulerChip, eulerTexts, eulerVertexTexts} from "./eulerLineText";

export interface EulerLinePanelProps {
    analysis: EulerAnalysis;
    /** The example whose vertices are exactly the current ones; undefined for a custom triangle. */
    exampleId: EulerExampleId | undefined;
    outsideView: ReadonlySet<EulerPlaceId>;
    onExample(id: EulerExampleId): void;
    onShowAll(): void;
}

/**
 * The readouts of the Euler line graph: example choice, the line state in words, H, G, O, N as exact fractions, the
 * distances, the exact collinearity decision, the count of distinct nine points, the vertex list for non-pointer use and
 * the Show all control. State is words, never colour alone. The status paragraph keeps its element mounted (live region).
 */
export function EulerLinePanel(props: EulerLinePanelProps) {
    const t = useT();
    const {language} = useLanguage();
    const {analysis} = props;
    const button = "btn btn-outline-secondary btn-sm";
    if (analysis.kind === "missing") {
        return <div className="inspector-group" data-euler-state="missing">
            <p className="inspector-help pointset-status" role="status">{t("notable_missing", {value0: 3 - analysis.have})}</p>
            <ExampleSelect {...props}/>
        </div>;
    }
    if (analysis.kind === "degenerate") {
        return <div className="inspector-group euler-panel" data-euler-state="degenerate">
            <ExampleSelect {...props}/>
            <p className="inspector-help pointset-status" role="status" data-euler-chip>{eulerChip(analysis, t)}</p>
            <p className="inspector-help" data-euler-degenerate>{t("euler_degenerate_why")}</p>
            <h3 className="inspector-reveals-title">{t("notable_coordinates_heading")}</h3>
            <ul className="pointset-list" data-euler-coordinates>
                {eulerVertexTexts(analysis.vertices, t).map((text, i) => <li key={i}>{text}</li>)}
            </ul>
        </div>;
    }
    const texts = eulerTexts(analysis, t, language, props.outsideView);
    return <div className="inspector-group euler-panel" data-euler-state={analysis.line === undefined ? "equilateral" : "line"}>
        <ExampleSelect {...props}/>
        <p className="inspector-help pointset-status" role="status" data-euler-chip>{texts.chip}</p>
        {texts.equilateralNote && <p className="inspector-help" data-euler-equilateral>{texts.equilateralNote}</p>}
        <h3 className="inspector-reveals-title">{t("notable_readouts_heading")}</h3>
        <ul className="pointset-list euler-readouts">
            {texts.rows.map(row => <li key={row.id} data-euler-point={row.id} data-outside-view={row.outsideView}>{row.text}</li>)}
            <li data-euler-readout="r2-quarter">{texts.r2Quarter}</li>
            {texts.distances.map((text, i) => <li key={i} data-euler-readout={["hg", "go", "ho", "half-r"][i]}>{text}</li>)}
        </ul>
        <p className="inspector-help" data-euler-relation>{texts.relation}</p>
        <p className="inspector-help" data-euler-distinct>{texts.distinct}</p>
        {texts.tooFar.map(note => <p key={note} className="inspector-help" data-euler-too-far>{note}</p>)}
        <button type="button" className={button} data-euler-show-all onClick={props.onShowAll}>{t("notable_show_all")}</button>
        <h3 className="inspector-reveals-title">{t("notable_coordinates_heading")}</h3>
        <ul className="pointset-list" data-euler-coordinates>
            {texts.vertices.map((text, i) => <li key={i}>{text}</li>)}
        </ul>
    </div>;
}

function ExampleSelect(props: EulerLinePanelProps) {
    const t = useT();
    const names: Readonly<Record<EulerExampleId, string>> = {
        default: t("euler_example_default"), right: t("euler_example_right"), isosceles: t("euler_example_isosceles"),
        "near-equilateral": t("euler_example_near_equilateral"), degenerate: t("euler_example_degenerate"),
    };
    return <label className="pointset-check">{t("notable_example_label")}{" "}
        <select value={props.exampleId ?? "custom"} data-euler-example
                onChange={event => {
                    const found = EULER_EXAMPLES.find(example => example.id === event.target.value);
                    if (found) props.onExample(found.id);
                }}>
            {EULER_EXAMPLES.map(example => <option key={example.id} value={example.id}>{names[example.id]}</option>)}
            {props.exampleId === undefined && <option value="custom">{t("notable_example_custom")}</option>}
        </select>
    </label>;
}
