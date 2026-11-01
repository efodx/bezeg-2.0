import React from "react";
import {useLanguage, useT} from "../../localization";
import {CentreId, NOTABLE_EXAMPLES, NotableAnalysis, NotableExampleId} from "../../compgeo/notablePointsModel";
import {notableTexts} from "./notablePointsText";

export interface NotablePointsPanelProps {
    analysis: NotableAnalysis;
    /** The example whose vertices are exactly the current ones; undefined for a custom triangle. */
    exampleId: NotableExampleId | undefined;
    outsideView: ReadonlySet<CentreId>;
    onExample(id: NotableExampleId): void;
    onShowAll(): void;
}

/**
 * The readouts of the notable-points graph: example choice, classification chip, S, R, r, the centres with exact
 * fractions where they exist, the vertex list for non-pointer use and the Show all control. The chip is words, never
 * colour alone. The live region keeps its element mounted so changes are announced.
 */
export function NotablePointsPanel(props: NotablePointsPanelProps) {
    const t = useT();
    const {language} = useLanguage();
    const {analysis} = props;
    const button = "btn btn-outline-secondary btn-sm";
    if (analysis.kind === "missing") {
        return <div className="inspector-group" data-notable-state="missing">
            <p className="inspector-help pointset-status" role="status">{t("notable_missing", {value0: 3 - analysis.have})}</p>
            <ExampleSelect {...props}/>
        </div>;
    }
    const texts = notableTexts(analysis, t, language, props.outsideView);
    return <div className="inspector-group notable-panel" data-notable-state={analysis.classification.kind === "degenerate" ? "degenerate" : analysis.classification.shape}>
        <ExampleSelect {...props}/>
        <p className="inspector-help pointset-status" role="status" data-notable-chip>{texts.chip}</p>
        {texts.degenerateWhy && <p className="inspector-help" data-notable-degenerate>{texts.degenerateWhy}</p>}
        <h3 className="inspector-reveals-title">{t("notable_readouts_heading")}</h3>
        <ul className="pointset-list notable-readouts">
            <li data-notable-readout="area">{texts.area}</li>
            {texts.circumradius && <li data-notable-readout="R">{texts.circumradius}</li>}
            {texts.inradius && <li data-notable-readout="r">{texts.inradius}</li>}
            {texts.rows.map(row => <li key={row.id} data-notable-centre={row.id} data-outside-view={row.outsideView}>{row.text}</li>)}
        </ul>
        {texts.tooFar.map(note => <p key={note} className="inspector-help" data-notable-too-far>{note}</p>)}
        <button type="button" className={button} data-notable-show-all onClick={props.onShowAll}>{t("notable_show_all")}</button>
        <h3 className="inspector-reveals-title">{t("notable_coordinates_heading")}</h3>
        <ul className="pointset-list" data-notable-coordinates>
            {texts.vertices.map((text, i) => <li key={i}>{text}</li>)}
        </ul>
    </div>;
}

function ExampleSelect(props: NotablePointsPanelProps) {
    const t = useT();
    const names: Readonly<Record<NotableExampleId, string>> = {
        default: t("notable_example_default"), obtuse: t("notable_example_obtuse"),
        right: t("notable_example_right"), degenerate: t("notable_example_degenerate"),
    };
    return <label className="pointset-check">{t("notable_example_label")}{" "}
        <select value={props.exampleId ?? "custom"} data-notable-example
                onChange={event => {
                    const found = NOTABLE_EXAMPLES.find(example => example.id === event.target.value);
                    if (found) props.onExample(found.id);
                }}>
            {NOTABLE_EXAMPLES.map(example => <option key={example.id} value={example.id}>{names[example.id]}</option>)}
            {props.exampleId === undefined && <option value="custom">{t("notable_example_custom")}</option>}
        </select>
    </label>;
}
