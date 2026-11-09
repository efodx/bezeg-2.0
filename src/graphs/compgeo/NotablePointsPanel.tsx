import React from "react";
import {ChoiceSelect} from "../../inputs/ChoiceSelect";
import {useLanguage, useT} from "../../localization";
import {CentreId, NOTABLE_EXAMPLES, NotableAnalysis, NotableExampleId} from "../../compgeo/notablePointsModel";
import {LiveReadout} from "../base/controls/LiveReadout";
import {ReadoutHeading} from "../base/controls/ReadoutParts";
import {useStatusReadout} from "../base/controls/useStatusReadout";
import {notableTexts} from "./notablePointsText";

export interface NotablePointsPanelProps {
    analysis: NotableAnalysis;
    /** The example whose vertices are exactly the current ones; undefined for a custom triangle. */
    exampleId: NotableExampleId | undefined;
    outsideView: ReadonlySet<CentreId>;
    onExample(id: NotableExampleId): void;
}

/**
 * The readouts of the notable-points graph: example choice, classification chip, S, R, r, the centres with exact
 * fractions where they exist, the vertex list for non-pointer use. The chip is words, never
 * colour alone. The live region keeps its element mounted so changes are announced.
 */
export function NotablePointsPanel(props: NotablePointsPanelProps) {
    const t = useT();
    const {language} = useLanguage();
    const {analysis} = props;
    const texts = analysis.kind === "missing" ? undefined : notableTexts(analysis, t, language, props.outsideView);
    // The one announcement of the graph: the state sentence the chip shows (decision 63).
    const stateText = analysis.kind === "missing" ? t("notable_missing", {value0: 3 - analysis.have}) : texts?.chip ?? "";
    const liveReadout = useStatusReadout(stateText, true);
    if (analysis.kind === "missing" || !texts) {
        return <div className="inspector-group" data-notable-state="missing">
            <p className="inspector-help pointset-status">{stateText}</p>
            <ExampleSelect {...props}/>
            <LiveReadout readout={liveReadout} dataAttribute="notable-live"/>
        </div>;
    }
    return <div className="inspector-group notable-panel" data-notable-state={analysis.classification.kind === "degenerate" ? "degenerate" : analysis.classification.shape}>
        <ExampleSelect {...props}/>
        <p className="inspector-help pointset-status" data-notable-chip>{texts.chip}</p>
        {texts.degenerateWhy && <p className="inspector-help" data-notable-degenerate>{texts.degenerateWhy}</p>}
        <ReadoutHeading>{t("notable_readouts_heading")}</ReadoutHeading>
        <ul className="pointset-list notable-readouts">
            <li data-notable-readout="area">{texts.area}</li>
            {texts.circumradius && <li data-notable-readout="R">{texts.circumradius}</li>}
            {texts.inradius && <li data-notable-readout="r">{texts.inradius}</li>}
            {texts.rows.map(row => <li key={row.id} data-notable-centre={row.id} data-outside-view={row.outsideView}>{row.text}</li>)}
        </ul>
        {texts.tooFar.map(note => <p key={note} className="inspector-help" data-notable-too-far>{note}</p>)}
        <ReadoutHeading>{t("notable_coordinates_heading")}</ReadoutHeading>
        <ul className="pointset-list" data-notable-coordinates>
            {texts.vertices.map((text, i) => <li key={i}>{text}</li>)}
        </ul>
        <LiveReadout readout={liveReadout} dataAttribute="notable-live"/>
    </div>;
}

function ExampleSelect(props: NotablePointsPanelProps) {
    const t = useT();
    const names: Readonly<Record<NotableExampleId, string>> = {
        default: t("notable_example_default"), obtuse: t("notable_example_obtuse"),
        right: t("notable_example_right"), degenerate: t("notable_example_degenerate"),
    };
    return <div data-notable-example>
        <ChoiceSelect label={t("notable_example_label")} value={props.exampleId ?? "custom"}
                      options={[...NOTABLE_EXAMPLES.map(example => ({value: example.id, text: names[example.id]})),
                          ...(props.exampleId === undefined ? [{value: "custom", text: t("notable_example_custom")}] : [])]}
                      onChange={id => {
                          const found = NOTABLE_EXAMPLES.find(example => example.id === id);
                          if (found) props.onExample(found.id);
                      }}/>
    </div>;
}
