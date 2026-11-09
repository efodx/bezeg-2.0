import React, {useId, useRef, useState} from "react";
import {currentLanguage, useT} from "../localization";
import {formatNumber} from "../analysis/format";
import {CountSetter} from "./CountSetter";
import {NumberInput, parseDecimal} from "./NumberInput";
import {UnavailableButton} from "./UnavailableButton";
import "./PointCollection.css";

interface TypedEntry {
    /** One name per coordinate (1, 2 or 3), for example "x" and "y". */
    axisLabels: readonly string[];
    min?: number;
    max?: number;
    /** Passed to the fields: a value off the grid is snapped with a notice. */
    grid?: number;
    integer?: boolean;
}

type Removal =
    /** Count, add and remove-last in one stepper (−/+); the graph decides which point is removed. */
    | {kind: "last"; onRemove: () => void}
    /** An Add and a Remove-selected button, for graphs where the user picks the point to remove. */
    | {kind: "selected"; onRemove: () => void; hasSelection: boolean};

interface PointCollectionProps {
    /** Name of the group, for example "Kontrolne točke". */
    label: string;
    count: number;
    min: number;
    max: number;
    /**
     * Adds a point. Without coordinates the graph places it (decision 1); with `at` (from the typed entry) it is placed there. The caller
     * stays within `max`. It returns undefined when the point was added, or the localized reason when the graph refused it: the typed
     * values then stay in their fields and the reason is shown here (never a silent no-op).
     */
    onAdd: (at?: readonly number[]) => string | undefined | void;
    removal: Removal;
    /**
     * Clear all. Available only when `count > 0` and `min === 0`: clearing must be able to reach an empty collection, so a collection
     * with a lower bound never offers it as a possible action (the button says why instead).
     */
    onClear?: () => void;
    /** A row of fields for the coordinates of a new point and an Add-at button; Enter in a field adds as well. */
    typedEntry?: TypedEntry;
    /** The Add mode switch (decision 9): a pressed button, on while a click on the board adds a point. */
    addMode?: {on: boolean; onToggle: () => void};
}

/**
 * The point collection controls (C1 to C3): how many points there are and how to add and remove them. Placement is not computed here:
 * `onAdd()` without coordinates lets the graph place the point. Every unavailable part says why (decision 13) and the reason of a pressed
 * one is announced in a status region until the count changes.
 *
 * Real graphs mount it in P3 to P5; the bare control is covered by `sharedControls.behaviour.test.tsx`.
 */
type Reasons = Record<"add" | "clear" | "remove" | "addAt", () => string | undefined>;

export function PointCollection(props: PointCollectionProps) {
    const t = useT();
    const id = useId();
    const language = currentLanguage();
    const {count, min, max, removal} = props;
    const entry = props.typedEntry;
    const axisCount = entry?.axisLabels.length ?? 0;

    // The reason of the last blocked press (a counter makes a repeat announce again); a changed count drops it. It is kept as the
    // function that produces the text and called while rendering, so a language switch shows it in the new language.
    const [pressed, setPressed] = useState<{reason: (now: Reasons) => string; count: number}>();
    const [seenCount, setSeenCount] = useState(count);
    // The visible count line is not live, so a count change made by this panel's Add, Remove or Clear is announced in the status region
    // (a counter makes a repeat announce again). A change from elsewhere (a scene, an example, a restore) clears it: the announcement
    // belongs to the press, not to the state, so a restored graph and one that reached the same state otherwise look the same.
    const [changed, setChanged] = useState<number | null>(null);
    const pressedChange = useRef(false);
    const own = (action: () => void) => () => { pressedChange.current = true; action(); };
    const countText = t("pointset_point_count", {value0: formatNumber(count, language, 0), value1: formatNumber(max, language, 0)});
    if (seenCount !== count) {
        setSeenCount(count);
        setPressed(undefined);
        const byPress = pressedChange.current;
        pressedChange.current = false;
        setChanged(current => byPress ? (current ?? 0) + 1 : null);
    }
    const blocked = (reason: (now: Reasons) => string) => {
        pressedChange.current = false;
        setPressed(current => ({reason, count: (current?.count ?? 0) + 1}));
    };
    const add = (at?: readonly number[]): boolean => {
        const refusal = at ? props.onAdd(at) : props.onAdd();
        if (typeof refusal !== "string") return true;
        blocked(() => refusal);
        return false;
    };

    // The accepted coordinates of the new point. The ref mirrors the state so that Enter, which commits a field and adds in the same
    // keystroke, reads the value that very commit wrote.
    const [values, setValues] = useState<readonly (number | undefined)[]>(() => Array.from({length: axisCount}, () => undefined));
    const accepted = useRef<readonly (number | undefined)[]>(values);
    const committedByKey = useRef(false);
    const atMax = count >= max;
    const complete = (list: readonly (number | undefined)[]): list is readonly number[] => list.length === axisCount && list.every(value => value !== undefined);
    const addReasonOf = () => atMax ? t("pointset_limit_reached", {value0: formatNumber(max, language, 0)}) : undefined;
    const addAtReasonOf = () => addReasonOf() ?? (complete(values) ? undefined : t("point_controls_incomplete"));
    const addReason = addReasonOf();
    const addAtReason = addAtReasonOf();
    const addAt = () => {
        const at = accepted.current;
        if (atMax) return blocked(now => now.addAt() ?? "");
        if (!complete(at)) return blocked(now => now.addAt() ?? "");
        if (!add(at)) return;
        const empty = Array.from({length: axisCount}, () => undefined);
        accepted.current = empty;
        setValues(empty);
    };

    const clearReasonOf = () => props.onClear === undefined ? undefined
        : min > 0 ? t("count_at_minimum", {value0: formatNumber(min, language, 0)})
        : count === 0 ? t("pointset_no_points") : undefined;
    const removeSelectedReasonOf = () => removal.kind !== "selected" ? undefined
        : !removal.hasSelection ? t("pointset_no_selection")
        : count <= min ? t("count_at_minimum", {value0: formatNumber(min, language, 0)}) : undefined;
    const clearReason = clearReasonOf();
    const removeSelectedReason = removeSelectedReasonOf();
    const reasons: Reasons = {add: addReasonOf, clear: clearReasonOf, remove: removeSelectedReasonOf, addAt: addAtReasonOf};
    const stored = (which: keyof typeof reasons) => () => blocked(now => now[which]() ?? "");

    return <div className="point-collection" role="group" aria-labelledby={`${id}-label`}>
        <div className="point-collection-label" id={`${id}-label`}>{props.label}</div>
        {removal.kind === "last"
            ? <CountSetter n={count} min={min} max={max} onPlus={() => { add(); }} onMinus={removal.onRemove}
                           maxReason={addReason}/>
            : <>
                <p className="point-collection-count">{countText}</p>
                <div className="point-collection-buttons">
                    <UnavailableButton className="btn btn-primary" reason={addReason} onPress={own(() => { add(); })} onBlockedPress={stored("add")}>{t("pointset_add_point")}</UnavailableButton>
                    <UnavailableButton className="btn" reason={removeSelectedReason} onPress={own(removal.onRemove)} onBlockedPress={stored("remove")}>{t("point_controls_remove_selected")}</UnavailableButton>
                </div>
            </>}
        {(props.onClear || props.addMode) && <div className="point-collection-buttons">
            {props.onClear && <UnavailableButton className="btn" reason={clearReason} onPress={own(() => props.onClear?.())} onBlockedPress={stored("clear")}>{t("point_controls_clear_all")}</UnavailableButton>}
            {props.addMode && <button type="button" className="btn point-collection-mode" aria-pressed={props.addMode.on} onClick={props.addMode.onToggle}>{t("pointset_add_mode")}</button>}
        </div>}
        {entry && <div className="point-collection-entry" role="group" aria-label={t("new_point")}
                       onKeyDownCapture={() => { committedByKey.current = false; }}
                       onKeyDown={event => {
                           if (event.key !== "Enter" || !(event.target instanceof HTMLInputElement)) return;
                           // Added when this keystroke committed a field, or when the field already shows the accepted value.
                           // A refused or unparseable draft commits nothing and adds nothing; its field explains why.
                           const axis = Number(event.target.closest<HTMLElement>("[data-axis]")?.dataset.axis);
                           const typed = parseDecimal(event.target.value);
                           const shown = Number.isFinite(typed) && accepted.current[axis] !== undefined && Math.abs(typed - (accepted.current[axis] ?? NaN)) < 1e-3;
                           if (committedByKey.current || shown) addAt();
                       }}>
            {entry.axisLabels.map((axisName, axis) => <div className="point-collection-axis" key={axis} data-axis={axis}>
                <span aria-hidden="true">{axisName}</span>
                <NumberInput label={t("point_controls_new_axis", {value0: axisName})} hideLabel compact value={values[axis]} step={1}
                             min={entry.min} max={entry.max} grid={entry.grid} integer={entry.integer}
                             onChange={value => {
                                 const next = accepted.current.map((current, at) => at === axis ? value : current);
                                 accepted.current = next;
                                 committedByKey.current = true;
                                 setValues(next);
                             }}/>
            </div>)}
            <UnavailableButton className="btn" reason={addAtReason} onPress={own(addAt)} onBlockedPress={stored("addAt")}>{t("point_controls_add_at")}</UnavailableButton>
        </div>}
        <div role="status" aria-live="polite" data-point-collection-status>
            {pressed ? <p key={pressed.count} className="point-collection-reason" data-point-collection-reason>{pressed.reason(reasons)}</p>
                : changed !== null && removal.kind !== "last" && <p key={`count-${changed}`} className="visually-hidden" data-point-collection-announce>{countText}</p>}
        </div>
    </div>;
}

export default PointCollection;
