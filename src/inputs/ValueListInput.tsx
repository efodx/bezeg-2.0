import React, {useState} from "react";
import {NumberInput} from "./NumberInput";
import "./ValueListInput.css";

interface ValueListInputProps {
    values: readonly number[];
    /**
     * Applies the new value of entry `index`. Return a localized message to refuse the edit (the values then stay as they are and
     * the message is shown at that field); return nothing when the edit was accepted.
     */
    onCommit: (index: number, value: number) => string | void;
    /** Caption of the whole list. */
    title: string;
    /** Visible and accessible name of entry `index` (0-based), for example "Vrednost 2". */
    valueLabel: (index: number) => string;
    /** Allowed range; a typed value outside it is explained by the field and never committed. */
    min?: number;
    max?: number;
    decimals?: number;
    /** When given, every row gets a remove button named `removeLabel(index)`; `canRemove` false marks it unavailable (aria-disabled) but a click still reaches `onRemove`, whose refusal explains why. */
    onRemove?: (index: number) => void;
    removeLabel?: (index: number) => string;
    removeText?: string;
    canRemove?: boolean;
}

/**
 * A typed list of numbers (one row per value), the keyboard alternative to dragging them. It holds no graph logic: the caller owns
 * the values and validates every edit in `onCommit`. A field commits on Enter and on blur, shows the model value again afterwards
 * (so a dragged or reset value is always current) and explains a refusal at its own field, like `PointListInput`.
 */
export function ValueListInput(props: ValueListInputProps) {
    const {values, onCommit, valueLabel, min, max, decimals = 1} = props;
    // The refusal of the last edit, shown at that one field; it belongs to the values it was refused for: any other list clears it.
    const [refusal, setRefusal] = useState<{index: number; message: string; list: typeof values} | undefined>(undefined);
    // Bumped when a refusal is cleared, so the fields drop their own explanation too.
    const [epoch, setEpoch] = useState(0);
    if (refusal && refusal.list !== values) {
        setRefusal(undefined);
        setEpoch(value => value + 1);
    }
    const edit = (index: number, value: number): boolean => {
        const message = onCommit(index, value);
        if (typeof message === "string" && message !== "") {
            setRefusal({index, message, list: values});
            return false;
        }
        setRefusal(undefined);
        return true;
    };
    return <fieldset className="value-list">
        <legend>{props.title}</legend>
        {values.map((value, index) => {
            const name = valueLabel(index);
            const refused = refusal && refusal.list === values && refusal.index === index ? refusal.message : undefined;
            return <div key={index} className="value-list-row" role="group" aria-label={name}>
                <span className="value-list-index" aria-hidden="true">{name}</span>
                <NumberInput key={epoch} label={name} hideLabel compact value={value} min={min} max={max}
                             decimals={decimals} step={1} rejectedHint={refused} onChange={next => edit(index, next)}/>
                {props.onRemove && <button type="button" data-action="remove-value" aria-label={props.removeLabel?.(index)}
                                           aria-disabled={props.canRemove === false}
                                           onClick={() => props.onRemove?.(index)}>{props.removeText ?? "−"}</button>}
            </div>;
        })}
    </fieldset>;
}

export default ValueListInput;
