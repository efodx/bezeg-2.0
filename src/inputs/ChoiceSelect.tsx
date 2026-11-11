import {useEffect, useId, useLayoutEffect, useRef, useState} from "react";
import Form from "react-bootstrap/Form";
import {useT} from "../localization";
import {joinIds} from "./describedBy";

interface ChoiceSelectProps {
    /** Visible label, also the accessible name of the native select. */
    label: string;
    value: string;
    options: readonly { value: string; text: string; disabled?: boolean; ariaLabel?: string }[];
    onChange: (value: string) => void;
    help?: string;
    /** Why no choice can be made now (decision 34): shown as a visible line, linked to the select, which is aria-disabled (never native `disabled`, which hides the reason) and ignores changes (a refused change announces the reason once in a polite status line). */
    reason?: string;
}

/** One canvas for every select's text measurement. */
let measuringContext: CanvasRenderingContext2D | undefined;

/** Whether the selected option text is wider than the closed select shows (same rule as the controls fixture's clipping check). */
function selectedTextClipped(select: HTMLSelectElement): string | null {
    const shown = select.selectedOptions[0]?.textContent ?? '';
    measuringContext ??= document.createElement('canvas').getContext('2d') ?? undefined;
    const canvas = measuringContext;
    if (!shown || typeof canvas?.measureText !== 'function') return null; // no canvas (JSDOM stubs)
    const style = getComputedStyle(select);
    canvas.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    const room = select.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight) - 24; // the dropdown arrow
    return canvas.measureText(shown).width > room + 1 ? shown : null;
}

/** A labelled native select for choosing one of a few named options (keyboard and touch work as for any select). */
export function ChoiceSelect(props: ChoiceSelectProps) {
    useT();
    const id = useId();
    const [refused, setRefused] = useState(0);
    const selectRef = useRef<HTMLSelectElement>(null);
    // A native select never wraps: when the selected text does not fit, the full text is also shown under it.
    const [full, setFull] = useState<string | null>(null);
    const measure = () => { if (selectRef.current) setFull(selectedTextClipped(selectRef.current)); };
    // Measured when the shown text can change (value, option text, which a language change also changes) and on resize, not on
    // every render: inspectors re-render while the board is dragged, and the measurement reads the computed style.
    const optionTexts = props.options.map(option => option.text).join('\u0000');
    useLayoutEffect(measure, [props.value, optionTexts]);
    useEffect(() => {
        const select = selectRef.current;
        if (!select || typeof ResizeObserver === 'undefined') return;
        const observer = new ResizeObserver(measure);
        observer.observe(select);
        return () => observer.disconnect();
    }, []);
    return <Form>
        <Form.Label htmlFor={id}>{props.label}</Form.Label>
        <Form.Select ref={selectRef} id={id} value={props.value} aria-describedby={joinIds(props.help ? `${id}-help` : undefined, props.reason ? `${id}-reason` : undefined)}
                     aria-disabled={props.reason ? true : undefined}
                     onChange={event => {
                         if (!props.reason) props.onChange(event.target.value);
                         else setRefused(count => count + 1);
                     }}>
            {props.options.map(option => <option key={option.value} value={option.value} disabled={option.disabled} aria-label={option.ariaLabel}>{option.text}</option>)}
        </Form.Select>
        {full && <p className="inspector-help" data-choice-full aria-hidden="true">{full}</p>}
        {props.reason && <p id={`${id}-reason`} className="inspector-help" data-choice-reason>{props.reason}</p>}
        <div role="status" aria-live="polite">{props.reason && refused > 0 && <p key={refused} className="inspector-help" data-choice-refused>{props.reason}</p>}</div>
        {props.help && <p id={`${id}-help`} className="inspector-help">{props.help}</p>}
    </Form>;
}
