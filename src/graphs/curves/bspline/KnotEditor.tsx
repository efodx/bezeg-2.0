import React, {useState} from "react";
import {Language, useLanguage, useT} from "../../../localization";
import {NumberGrid, type NumberGridCell} from "../../../inputs/NumberGrid";
import {KNOT_LIMIT, KNOT_SNAP} from "./bsplineBasisModel";

interface KnotEditorProps {
    knots: readonly number[];
    /**
     * Applies a typed value of knot `index`. Returns the localized reason when the vector would be invalid (the editor shows it at that
     * field and the owner keeps the previous vector), or undefined when accepted.
     */
    onEdit: (index: number, value: number) => string | undefined;
}

interface Refusal {
    index: number;
    text: string;
    /** The vector and language the refusal was shown for; it is dropped once either changes. */
    knots: string;
    language: Language;
}

/**
 * The typed side of the knot editor: one numeric field per knot, in order, named "Knot u_i". The arrow keys step by 0.01. A refused
 * value stays in its field with the reason beside it until the next accepted edit, an outside change of the vector (a marker drag,
 * degree, clamping, Reset or a Preset) or a language switch. Reused by the de Boor graph; the draggable markers on the t axis belong
 * to the graph's board scene and use the same clamping model.
 */
export function KnotEditor(props: KnotEditorProps) {
    const t = useT();
    const {language} = useLanguage();
    const knotsKey = props.knots.join(",");
    const [refusal, setRefusal] = useState<Refusal | undefined>(undefined);
    // Remounting the fields clears NumberInput's own rejected hint and the refused draft along with the reason.
    const [generation, setGeneration] = useState(0);
    if (refusal && (refusal.knots !== knotsKey || refusal.language !== language)) {
        setRefusal(undefined);
        setGeneration(generation + 1);
    }
    // The generation is part of the grid's key: remounting clears the cells' own rejected hints and refused drafts.
    return <div className="inspector-group">
        <NumberGrid key={generation} label={t("bsb_knots_title")} columns="wrap" help={t("bsb_knots_help")}
                    cells={props.knots.map((knot, index): NumberGridCell => ({
                        label: t("bsb_knot_name", {value0: index}), value: knot, step: KNOT_SNAP, decimals: 3, min: -KNOT_LIMIT, max: KNOT_LIMIT,
                        rejectedHint: refusal?.index === index ? refusal.text : undefined,
                        onChange: value => {
                            const text = props.onEdit(index, value);
                            setRefusal(text === undefined ? undefined : {index, text, knots: knotsKey, language});
                            return text === undefined;
                        },
                    }))}/>
    </div>;
}
