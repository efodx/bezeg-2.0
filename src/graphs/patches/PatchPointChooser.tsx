import {ChoiceSelect} from "../../inputs/ChoiceSelect";

/** One index axis of a control-point choice: its label and the values it offers (not including the "none" entry). */
export interface PatchPointAxis {
    label: string;
    options: readonly {value: string; text: string}[];
    /** A short explanation shown under this axis' select. */
    help?: string;
}

/** The empty option value; an axis option must not use it. */
const NONE = "";

/**
 * Chooses a control point by one or two index axes (C14, the listed exception "Patch control-point choice by index"): one select per
 * axis, each with a leading "none" entry, built on `ChoiceSelect`. `selection` holds the chosen value of each axis, or is undefined
 * while no point is selected. `onChange` gets undefined when "none" is chosen on any axis, otherwise the selection with the changed
 * axis replaced; an axis the student has not chosen yet is undefined in it, and the caller fills it (a graph takes the selected point's
 * index or 0). Call shapes: Tensor (two axes i and j), Coons (boundary name, index), Join's B net (i, j), Triangular (one axis of ids).
 */
export function PatchPointChooser({axes, noneText, selection, onChange}: {
    axes: readonly [PatchPointAxis] | readonly [PatchPointAxis, PatchPointAxis];
    noneText: string;
    selection: readonly string[] | undefined;
    onChange: (selection: ReadonlyArray<string | undefined> | undefined) => void;
}) {
    return <>{axes.map((axis, k) =>
        <ChoiceSelect key={k} label={axis.label} help={axis.help} value={selection?.[k] ?? NONE}
                      options={[{value: NONE, text: noneText}, ...axis.options]}
                      onChange={value => onChange(value === NONE ? undefined : axes.map((_, at) => at === k ? value : selection?.[at]))}/>)}</>;
}
