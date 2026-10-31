import React, {useEffect, useState} from "react";
import {NumberInput} from "./NumberInput";
import "./PointListInput.css";

export type PointRow = readonly [number, number];

interface PointListInputProps {
    points: readonly PointRow[];
    /**
     * Applies the new coordinates of point `index`. Return a localized message to refuse the edit (the points then stay as they
     * are and the message is shown at that field); return nothing when the edit was accepted.
     */
    onCommit: (index: number, value: PointRow) => string | void;
    /** Caption of the whole list. */
    title: string;
    /** Visible and accessible name of point `index` (0-based), for example "Točka 2". */
    pointLabel: (index: number) => string;
    /** Axis names, for example "x" and "y"; the field names read "<point label>, <axis>". */
    axisLabels?: readonly [string, string];
    /** Allowed coordinate range; a typed value outside it is explained by the field and never committed. */
    min?: number;
    max?: number;
    decimals?: number;
}

/**
 * A typed list of 2D points (one row per point, an x and a y field), the keyboard alternative to dragging them. It holds no
 * graph logic: the caller owns the points and validates every edit in `onCommit`. A field commits on Enter and on blur, shows
 * the model value again afterwards (so a dragged or reset point is always current), and explains a refusal at its own field.
 */
export function PointListInput(props: PointListInputProps) {
    const {points, onCommit, pointLabel, min, max, decimals = 3} = props;
    const [x, y] = props.axisLabels ?? ["x", "y"];
    // The refusal of the last edit: shown at that one field until another edit is applied.
    // It belongs to the points it was refused for: any other list (drag, reset, import, count change) clears it.
    const [refusal, setRefusal] = useState<{index: number; axis: 0 | 1; message: string; list: typeof points} | undefined>(undefined);
    // Bumped when a refusal is cleared, so the fields drop their own explanation too.
    const [epoch, setEpoch] = useState(0);
    useEffect(() => {
        if (refusal && refusal.list !== points) {
            setRefusal(undefined);
            setEpoch(value => value + 1);
        }
    }, [points, refusal]);
    const edit = (index: number, axis: 0 | 1, value: number): boolean => {
        const current = points[index];
        const next: PointRow = axis === 0 ? [value, current[1]] : [current[0], value];
        const message = onCommit(index, next);
        if (typeof message === "string" && message !== "") {
            setRefusal({index, axis, message, list: points});
            return false;
        }
        setRefusal(undefined);
        return true;
    };
    return <fieldset className="point-list">
        <legend>{props.title}</legend>
        {points.map((point, index) => {
            const name = pointLabel(index);
            const axisField = (axis: 0 | 1, axisName: string) => {
                const refused = refusal && refusal.list === points && refusal.index === index && refusal.axis === axis ? refusal.message : undefined;
                return <div className="point-list-axis">
                    <span aria-hidden="true">{axisName}</span>
                    <NumberInput key={epoch} label={`${name}, ${axisName}`} hideLabel compact applyOn="confirm" value={point[axis]} min={min} max={max}
                                 decimals={decimals} step={1} rejectedHint={refused}
                                 onChange={value => edit(index, axis, value)}/>
                </div>;
            };
            return <div key={index} className="point-list-row" role="group" aria-label={name}>
                <span className="point-list-index" aria-hidden="true">{name}</span>
                {axisField(0, x)}
                {axisField(1, y)}
            </div>;
        })}
    </fieldset>;
}

export default PointListInput;
