import React from "react";
import {useT} from "../../localization";
import {ChoiceSelect} from "../../inputs/ChoiceSelect";
import type {GridPoint} from "../../compgeo/grid";
import type {PointSetModel} from "../../compgeo/pointSetModel";

/** The example whose sites are exactly the model's (same grid and same points in the same order), or undefined for a custom set. */
export function matchingExample<Id extends string>(
    model: Pick<PointSetModel, "points" | "gridStepExponent">,
    examples: readonly {readonly id: Id; readonly points: readonly GridPoint[]; readonly gridStepExponent?: number}[],
): Id | undefined {
    return examples.find(example => (example.gridStepExponent ?? 0) === model.gridStepExponent && example.points.length === model.points.length
        && example.points.every((p, k) => p.x === model.points[k].x && p.y === model.points[k].y))?.id;
}

interface ExampleSelectProps<Id extends string> {
    /** Visible label and accessible name. */
    label: string;
    /** The example the scene shows now; undefined once the scene is custom (an entry that cannot be chosen is shown then). */
    current: Id | undefined;
    options: readonly {readonly id: Id; readonly text: string}[];
    onChoose: (id: Id) => void;
    help?: string;
}

/** The one example chooser of the compgeo trace graphs: a `ChoiceSelect` with a disabled "Custom" entry while the scene is not an example. */
export function ExampleSelect<Id extends string>({label, current, options, onChoose, help}: ExampleSelectProps<Id>) {
    const t = useT();
    const choices = [
        ...(current === undefined ? [{value: "custom", text: t("notable_example_custom"), disabled: true}] : []),
        ...options.map(option => ({value: option.id as string, text: option.text})),
    ];
    return <ChoiceSelect label={label} value={current ?? "custom"} options={choices} help={help}
                         onChange={value => { const found = options.find(option => option.id === value); if (found) onChoose(found.id); }}/>;
}
