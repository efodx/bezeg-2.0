import {useT} from "../localization";
import {Button, ButtonGroup} from "react-bootstrap";
import React from "react";

/** A controlled counter: it shows `n`; the caller changes it in response to `onPlus`/`onMinus`. */
export function CountSetter(props: {
    onPlus: () => void,
    onCenter: () => number,
    n: number,
    onMinus: () => void,
    min?: number | (() => number),
    max?: number | (() => number)
}) {
    const t = useT();
    const {n} = props;
    const onPlus = () => {
        if (n === props.max) {
            return;
        }
        if (typeof props.max == 'function' && n === props.max()) {
            return;
        }
        props.onPlus();
    };

    const onMinus = () => {
        if (n === props.min) {
            return;
        }
        if (typeof props.min == 'function' && n === props.min()) {
            return;
        }
        props.onMinus();
    };

    return <ButtonGroup>
        <Button aria-label={t("increase_count")} className="btn-block"
                onClick={onPlus}>+</Button>
        <Button aria-label={t("current_count", {value0: n})} variant="light" onClick={props.onCenter}
                className="btn-block">{n}</Button>
        <Button aria-label={t("decrease_count")} onClick={onMinus}
                className="btn-block">-</Button>
    </ButtonGroup>;
}
