import React, {useEffect, useRef, useState} from "react";
import {currentLanguage, useT} from "../localization";
import {formatNumber} from "../analysis/format";
import {NumberInput} from "./NumberInput";
import {UnavailableButton} from "./UnavailableButton";
import "./PointListInput.css";

/**
 * After a row's remove button: focus the remove button now at the same index, else the previous row's, else `fallback` (the collection's controls).
 * `root` holds the rows; `buttonSelector` finds their remove buttons. Returns the function the remove press calls with its row index.
 * Per instance: the list must stay mounted across the removal (a graph keys it only on a scene replacement).
 */
export function useRemoveFocus(root: React.RefObject<HTMLElement>, buttonSelector: string, fallback: () => HTMLElement | null | undefined): (index: number) => void {
    const requested = useRef<number>();
    useEffect(() => {
        const index = requested.current;
        requested.current = undefined;
        if (index === undefined || !root.current) return;
        const buttons = root.current.querySelectorAll<HTMLElement>(buttonSelector);
        (buttons[Math.min(index, buttons.length - 1)] ?? fallback())?.focus();
    });
    return index => { requested.current = index; };
}

export type PointRow = readonly [number, number];
/** A row of a 1D or a 3D list (`axisLabels` of length 1 or 3). */
export type PointRow1 = readonly [number];
export type PointRow3 = readonly [number, number, number];

/** The names of the axes of a row type: one string per coordinate. */
type AxisLabels<R extends readonly number[]> = {readonly [K in keyof R]: string};

interface PointListInputProps<R extends readonly number[]> {
    points: readonly R[];
    /**
     * Applies the new coordinates of point `index`. Return a localized message to refuse the edit (the points then stay as they
     * are and the message is shown at that field); return nothing when the edit was accepted.
     */
    onCommit: (index: number, value: R) => string | void;
    /** Caption of the whole list. */
    title: string;
    /** Visible and accessible name of point `index` (0-based), for example "Točka 2". */
    pointLabel: (index: number) => string;
    /** Axis names, one per coordinate (1, 2 or 3), for example "x" and "y"; the field names read "<point label>, <axis>". Defaults to x and y. */
    axisLabels?: AxisLabels<R>;
    /** Allowed coordinate range; a typed value outside it is explained by the field and never committed. */
    min?: number;
    max?: number;
    decimals?: number;
    /** Passed to every field: a typed value off the grid is snapped, with a notice (decision 16; the field does it). */
    grid?: number;
    /** Passed to every field: only whole numbers are accepted. */
    integer?: boolean;
    /** Adds a remove button to each row. At `minCount` it is unavailable and says why. */
    onRemove?: (index: number) => void;
    /** The fewest points the list may hold; only the remove buttons use it. */
    minCount?: number;
    /** The selected point, shown as a pressed name; with `onSelect` the name of each row is a toggle button. */
    selected?: number;
    /** Called with the index of the pressed row, or undefined when the selected row is pressed again. */
    onSelect?: (index: number | undefined) => void;
}

/** The name of a point as a pressed toggle (C14): `aria-pressed` tells whether it is the selected one. For lists that render rows themselves. */
export function SelectablePointButton(props: {label: string; pressed: boolean; onToggle: () => void; accessibleName?: string}) {
    const t = useT();
    // The name says what pressing does and still contains the visible label (a bare "A" or "s1" would not).
    return <button type="button" className="point-list-index point-list-select" aria-pressed={props.pressed} onClick={props.onToggle}
                   aria-label={props.accessibleName ?? t("point_controls_select_named", {value0: props.label})}>{props.label}</button>;
}

const isRow = <R extends readonly number[]>(value: readonly number[], length: number): value is R => value.length === length;

/**
 * A typed list of points (one row per point, one field per axis: 1, 2 or 3), the keyboard alternative to dragging them. It holds no
 * graph logic: the caller owns the points and validates every edit in `onCommit`. A field commits on Enter and on blur, shows
 * the model value again afterwards (so a dragged or reset point is always current), and explains a refusal at its own field.
 * Optional: a remove button per row, and a selectable row name. A tuple-typed list needs its `axisLabels` for the length; without them rows have two fields.
 */
export function PointListInput<R extends readonly number[] = PointRow>(props: PointListInputProps<R>) {
    const t = useT();
    const {points, onCommit, pointLabel, min, max, decimals = 3} = props;
    const axes: readonly string[] = props.axisLabels ?? ["x", "y"];
    // The refusal of the last edit: shown at that one field until another edit is applied.
    // It belongs to the points it was refused for: any other list (drag, reset, import, count change) clears it.
    const [refusal, setRefusal] = useState<{index: number; axis: number; message: string; list: typeof points} | undefined>(undefined);
    // The last blocked remove press (a counter makes a repeat announce again); any other list drops it.
    const [blocked, setBlocked] = useState<{count: number; list: typeof points} | undefined>(undefined);
    // Bumped when a refusal is cleared, so the fields drop their own explanation too.
    const [epoch, setEpoch] = useState(0);
    // Adjusted while rendering (React's pattern for state derived from a changed prop), not in an effect: the stale refusal
    // never reaches the screen, and the next render sees no refusal, so this runs once per list change.
    if (refusal && refusal.list !== points) {
        setRefusal(undefined);
        setEpoch(value => value + 1);
    }
    if (blocked && blocked.list !== points) setBlocked(undefined);
    const edit = (index: number, axis: number, value: number): boolean => {
        const next = points[index].map((coordinate, at) => at === axis ? value : coordinate);
        const message = isRow<R>(next, axes.length) ? onCommit(index, next) : undefined;
        if (typeof message === "string" && message !== "") {
            setRefusal({index, axis, message, list: points});
            return false;
        }
        setRefusal(undefined);
        return true;
    };
    // After a row's remove button: focus the remove button now at the same index, else the previous row's, else the collection's controls.
    const root = useRef<HTMLFieldSetElement>(null);
    const requestRemoveFocus = useRemoveFocus(root, ".point-list-remove", () => root.current?.parentElement?.querySelector<HTMLElement>(".point-collection button, .point-collection input"));
    const atMinimum = props.minCount !== undefined && points.length <= props.minCount;
    const removeReason = atMinimum ? t("count_at_minimum", {value0: formatNumber(props.minCount ?? 0, currentLanguage(), 0)}) : undefined;
    return <fieldset className="point-list" ref={root}>
        <legend>{props.title}</legend>
        {points.map((point, index) => {
            const name = pointLabel(index);
            const axisField = (axis: number, axisName: string) => {
                const refused = refusal && refusal.list === points && refusal.index === index && refusal.axis === axis ? refusal.message : undefined;
                return <div className="point-list-axis" key={axis}>
                    <span aria-hidden="true">{axisName}</span>
                    <NumberInput key={epoch} label={`${name}, ${axisName}`} hideLabel compact value={point[axis]} min={min} max={max}
                                 decimals={decimals} step={1} rejectedHint={refused} grid={props.grid} integer={props.integer}
                                 onChange={value => edit(index, axis, value)}/>
                </div>;
            };
            return <div key={index} className="point-list-row" role="group" aria-label={name}>
                {props.onSelect
                    ? <SelectablePointButton label={name} pressed={props.selected === index}
                                             onToggle={() => props.onSelect?.(props.selected === index ? undefined : index)}/>
                    : <span className="point-list-index" aria-hidden="true">{name}</span>}
                {axes.map((axisName, axis) => axisField(axis, axisName))}
                {props.onRemove && <UnavailableButton className="btn point-list-remove" aria-label={t("point_controls_remove_named", {value0: name})}
                                                      reason={removeReason} onPress={() => { requestRemoveFocus(index); props.onRemove?.(index); }}
                                                      onBlockedPress={() => setBlocked(current => ({count: (current?.count ?? 0) + 1, list: points}))}>×</UnavailableButton>}
            </div>;
        })}
        {props.onRemove && <div role="status" aria-live="polite">
            {blocked && removeReason && <p key={blocked.count} className="point-list-reason" data-point-reason>{removeReason}</p>}
        </div>}
    </fieldset>;
}

export default PointListInput;
