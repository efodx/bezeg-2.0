import {useT} from "../../localization";
import React, {useEffect, useState} from "react";
import {Point} from "../../bezeg/api/point/point";

const subscriptDigits = ["₀", "₁", "₂", "₃", "₄", "₅", "₆", "₇", "₈", "₉"];

function pointName(prefix: string | undefined, index: number) {
    const subscript = String(index).split("").map(digit => subscriptDigits[Number(digit)]).join("");
    return `${prefix ?? "p"}${subscript}`;
}

export function PointCoordinateEditor(props: {
    points: () => Point[], board: JXG.Board, onChange: () => void,
    onAdd?: (x: number, y: number) => void, onDelete?: (index: number) => void, prefix?: string,
    observeBoard?: () => JXG.Board | undefined
}) {
    const t = useT();
    const [revision, setRevision] = useState(0);
    const [error, setError] = useState<"enter_finite_numeric_coordinates" | "">("");
    const {board, observeBoard} = props;
    useEffect(() => {
        const refresh = () => setRevision(value => value + 1);
        board.on("up", refresh);
        const auxiliary = observeBoard?.();
        auxiliary?.on("up", refresh);
        return () => {board.off("up", refresh); auxiliary?.off("up", refresh);};
    }, [board, observeBoard]);
    const values = props.points();
    return <details className="point-coordinate-editor"><summary><span>{t("point_coordinates_keyboard_editing")}</span></summary>
        <div className="point-coordinate-editor-body">
        <form className="point-coordinate-form" key={revision} onSubmit={event => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            const currentPoints = props.points();
            const next = currentPoints.map((_, i) => [Number(data.get(`x-${i}`)), Number(data.get(`y-${i}`))]);
            if (next.some(point => point.some(value => !Number.isFinite(value)))) {setError("enter_finite_numeric_coordinates"); return;}
            currentPoints.forEach((point, i) => {point.setX(next[i][0]); point.setY(next[i][1]);});
            props.onChange(); setError(""); setRevision(revision + 1);
        }}>
            <div className="point-coordinate-rows">
            {values.map((point, i) => <fieldset className={`point-coordinate-row${props.onDelete ? " has-delete" : ""}`} key={i}><legend><span className="point-coordinate-name" aria-hidden="true">{pointName(props.prefix, i)}</span><span className="visually-hidden">{props.prefix ?? "p"}{i}</span></legend>
                <div className="point-coordinate-values">
                    <label><span className="point-coordinate-axis" aria-hidden="true">x</span><input aria-label={`${props.prefix ?? "p"}${i} x`} name={`x-${i}`} type="number" step="any" required defaultValue={point.X()}/></label>
                    <label><span className="point-coordinate-axis" aria-hidden="true">y</span><input aria-label={`${props.prefix ?? "p"}${i} y`} name={`y-${i}`} type="number" step="any" required defaultValue={point.Y()}/></label>
                </div>
                {props.onDelete && <button className="point-coordinate-delete" type="button" disabled={values.length <= 1} aria-label={t("delete_point_p", {value0: i})} onClick={() => {
                    props.onDelete!(i); props.onChange(); setRevision(revision + 1);
                }}>{t("delete")}</button>}
            </fieldset>)}
            </div>
            <button className="point-coordinate-submit" type="submit">{t("apply_coordinates")}</button>
        </form>
        {props.onAdd && <form className="point-coordinate-add" onSubmit={event => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            const x = Number(data.get("new-x")), y = Number(data.get("new-y"));
            if (!Number.isFinite(x) || !Number.isFinite(y)) {setError("enter_finite_numeric_coordinates"); return;}
            props.onAdd!(x, y); props.onChange(); setRevision(revision + 1); setError("");
        }}><fieldset><legend>{t("new_point")}</legend>
            <div className="point-coordinate-values">
                <label><span className="point-coordinate-axis" aria-hidden="true">x</span><input aria-label={t("new_point_x")} name="new-x" type="number" step="any" required defaultValue={0}/></label>
                <label><span className="point-coordinate-axis" aria-hidden="true">y</span><input aria-label={t("new_point_y")} name="new-y" type="number" step="any" required defaultValue={0}/></label>
            </div>
        </fieldset><button className="point-coordinate-submit" type="submit">{t("add_point_by_coordinates")}</button></form>}
        {error && <p role="alert">{t(error)}</p>}
        </div>
    </details>;
}
