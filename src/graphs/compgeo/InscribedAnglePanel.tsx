import React from "react";
import {useLanguage, useT} from "../../localization";
import {ChoiceSelect} from "../../inputs/ChoiceSelect";
import AngleSlider from "../../inputs/AngleSlider";
import {INSCRIBED_EXAMPLES, InscribedAnalysis, InscribedExampleId} from "../../compgeo/inscribedAngleModel";
import {inscribedTexts} from "./inscribedAngleText";

export interface InscribedAnglePanelProps {
    analysis: InscribedAnalysis;
    /** The example whose vertices are exactly the current ones; undefined for custom vertices. */
    exampleId: InscribedExampleId | undefined;
    onExample(id: InscribedExampleId): void;
    /** A new glider parameter in degrees (slider or typed) and the sign of the change, the direction of motion (0: none). */
    onT(value: number, direction: number): void;
}

/**
 * The readouts of the inscribed-angle graph: example choice, the status line, the three angles, the arc relation with the
 * "equal to the displayed precision" wording, the exact diameter statement, the glider controls (the angle slider with its degrees field) and the vertex list for non-pointer use. The status is words, never colour alone.
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
        {glider && <GliderControls t={glider.t} onT={props.onT}/>}
        {texts.vertices.length > 0 && <>
            <h3 className="inspector-reveals-title">{t("notable_coordinates_heading")}</h3>
            <ul className="pointset-list" data-inscribed-coordinates>
                {texts.vertices.map((text, i) => <li key={i}>{text}</li>)}
            </ul>
        </>}
    </div>;
}

function GliderControls(props: {t: number; onT(value: number, direction: number): void}) {
    const t = useT();
    return <div className="inscribed-glider" data-inscribed-t>
        <h3 className="inspector-reveals-title">{t("inscribed_glider_heading")}</h3>
        <AngleSlider customText={t("inscribed_t_label")} value={props.t}
                // A drag or key moves in its direction around the circle (the shorter way); a typed value goes to the nearer edge of a gap.
                onChange={value => props.onT(value, Math.sign(((value - props.t + 540) % 360) - 180))}
                onTypedChange={value => props.onT(value, 0)}/>
    </div>;
}

function ExampleSelect(props: InscribedAnglePanelProps) {
    const t = useT();
    const names: Readonly<Record<InscribedExampleId, string>> = {default: t("inscribed_example_default"), thales: t("inscribed_example_thales")};
    return <div data-inscribed-example>
        <ChoiceSelect label={t("inscribed_example_label")} value={props.exampleId ?? "custom"}
                      options={[...INSCRIBED_EXAMPLES.map(example => ({value: example.id, text: names[example.id]})),
                          ...(props.exampleId === undefined ? [{value: "custom", text: t("inscribed_example_custom")}] : [])]}
                      onChange={id => {
                          const found = INSCRIBED_EXAMPLES.find(example => example.id === id);
                          if (found) props.onExample(found.id);
                      }}/>
    </div>;
}
