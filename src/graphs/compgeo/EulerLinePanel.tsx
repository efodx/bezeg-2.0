import React from "react";
import {ChoiceSelect} from "../../inputs/ChoiceSelect";
import {useLanguage, useT} from "../../localization";
import {EULER_EXAMPLES, EulerAnalysis, EulerExampleId} from "../../compgeo/eulerLineModel";
import {LiveReadout} from "../base/controls/LiveReadout";
import {ReadoutHeading} from "../base/controls/ReadoutParts";
import {useStatusReadout} from "../base/controls/useStatusReadout";
import {EulerPlaceId, eulerChip, eulerTexts, eulerVertexTexts} from "./eulerLineText";

export interface EulerLinePanelProps {
    analysis: EulerAnalysis;
    /** The example whose vertices are exactly the current ones; undefined for a custom triangle. */
    exampleId: EulerExampleId | undefined;
    outsideView: ReadonlySet<EulerPlaceId>;
    onExample(id: EulerExampleId): void;
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
    const texts = analysis.kind === "missing" || analysis.kind === "degenerate" ? undefined : eulerTexts(analysis, t, language, props.outsideView);
    // The one announcement of the graph: the state sentence the chip shows (decision 63).
    const stateText = analysis.kind === "missing" ? t("notable_missing", {value0: 3 - analysis.have})
        : analysis.kind === "degenerate" ? eulerChip(analysis, t) : texts?.chip ?? "";
    const liveReadout = useStatusReadout(stateText, true);
    if (analysis.kind === "missing") {
        return <div className="inspector-group" data-euler-state="missing">
            <p className="inspector-help pointset-status">{stateText}</p>
            <ExampleSelect {...props}/>
            <LiveReadout readout={liveReadout} dataAttribute="euler-live"/>
        </div>;
    }
    if (analysis.kind === "degenerate") {
        return <div className="inspector-group euler-panel" data-euler-state="degenerate">
            <ExampleSelect {...props}/>
            <p className="inspector-help pointset-status" data-euler-chip>{stateText}</p>
            <p className="inspector-help" data-euler-degenerate>{t("euler_degenerate_why")}</p>
            <ReadoutHeading>{t("notable_coordinates_heading")}</ReadoutHeading>
            <ul className="pointset-list" data-euler-coordinates>
                {eulerVertexTexts(analysis.vertices, t).map((text, i) => <li key={i}>{text}</li>)}
            </ul>
            <LiveReadout readout={liveReadout} dataAttribute="euler-live"/>
        </div>;
    }
    if (!texts) return null;
    return <div className="inspector-group euler-panel" data-euler-state={analysis.line === undefined ? "equilateral" : "line"}>
        <ExampleSelect {...props}/>
        <p className="inspector-help pointset-status" data-euler-chip>{texts.chip}</p>
        {texts.equilateralNote && <p className="inspector-help" data-euler-equilateral>{texts.equilateralNote}</p>}
        <ReadoutHeading>{t("notable_readouts_heading")}</ReadoutHeading>
        <ul className="pointset-list euler-readouts">
            {texts.rows.map(row => <li key={row.id} data-euler-point={row.id} data-outside-view={row.outsideView}>{row.text}</li>)}
            <li data-euler-readout="r2-quarter">{texts.r2Quarter}</li>
            {texts.distances.map((text, i) => <li key={i} data-euler-readout={["hg", "go", "ho", "half-r"][i]}>{text}</li>)}
        </ul>
        <p className="inspector-help" data-euler-relation>{texts.relation}</p>
        <p className="inspector-help" data-euler-distinct>{texts.distinct}</p>
        {texts.tooFar.map(note => <p key={note} className="inspector-help" data-euler-too-far>{note}</p>)}
        <ReadoutHeading>{t("notable_coordinates_heading")}</ReadoutHeading>
        <ul className="pointset-list" data-euler-coordinates>
            {texts.vertices.map((text, i) => <li key={i}>{text}</li>)}
        </ul>
        <LiveReadout readout={liveReadout} dataAttribute="euler-live"/>
    </div>;
}

function ExampleSelect(props: EulerLinePanelProps) {
    const t = useT();
    const names: Readonly<Record<EulerExampleId, string>> = {
        default: t("euler_example_default"), right: t("euler_example_right"), isosceles: t("euler_example_isosceles"),
        "near-equilateral": t("euler_example_near_equilateral"), degenerate: t("euler_example_degenerate"),
    };
    return <div data-euler-example>
        <ChoiceSelect label={t("notable_example_label")} value={props.exampleId ?? "custom"}
                      options={[...EULER_EXAMPLES.map(example => ({value: example.id, text: names[example.id]})),
                          ...(props.exampleId === undefined ? [{value: "custom", text: t("notable_example_custom")}] : [])]}
                      onChange={id => {
                          const found = EULER_EXAMPLES.find(example => example.id === id);
                          if (found) props.onExample(found.id);
                      }}/>
    </div>;
}
