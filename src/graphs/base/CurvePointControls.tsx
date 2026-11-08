import React, {useEffect, useState} from "react";
import {useT} from "../../localization";
import {Point} from "../../bezeg/api/point/point";
import {PointCollection} from "../../inputs/PointCollection";
import {PointListInput} from "../../inputs/PointListInput";

const subscriptDigits = ["₀", "₁", "₂", "₃", "₄", "₅", "₆", "₇", "₈", "₉"];

/** The name of point `index` in the list: `p₀, p₁…` (`w₀…` on the PH hodograph). */
export function curvePointName(prefix: string | undefined, index: number): string {
    return `${prefix ?? "p"}${String(index).split("").map(digit => subscriptDigits[Number(digit)]).join("")}`;
}

/** The fewest points a curve keeps: a board Delete click and the list both stop at the last one. */
export const CURVE_POINTS_MIN = 1;
/** The most points the count control adds. A curve has no model maximum; this is the largest count an existing curve control allows (DeBoor). */
export const CURVE_POINTS_MAX = 12;

/**
 * A typed coordinate stays within this range; the curves have no model range, so it only keeps a typo (1e300) from reaching the board.
 * A drag is not limited by it.
 */
export const CURVE_COORDINATE_LIMIT = 1e6;

export interface CurvePointCollectionActions {
    /** Adds a point; without `at` the graph places it one unit right of the last (decision 1). */
    onAdd: (at?: readonly number[]) => void;
    /** Removes the last point. */
    onRemove: () => void;
    /** Removes point `index` (the list's per-row button). */
    onRemoveAt: (index: number) => void;
}

export interface CurvePointControlsProps {
    /** Resolved on every render, so a replaced curve or hodograph is always current. */
    points: () => readonly Point[];
    /** Boards whose "up" event means a dragged point: the list shows its coordinates again. */
    boards: () => readonly (JXG.Board | undefined)[];
    prefix?: string;
    /** Applies a typed coordinate pair to point `index` (the point is already set); the graph redraws. */
    onEdit: (index: number, to: readonly [number, number]) => void;
    /** Present when the number of points can change; the PH hodograph has none. */
    collection?: CurvePointCollectionActions & {label: string};
}

/**
 * The selected curve's points (C1, C2, C4, C18, C19): the shared count controls with a typed new point and the shared typed list. Each field
 * commits on Enter or blur; a board drag, add or delete shows in the list through the board's "up" event and the workspace revision key.
 */
export function CurvePointControls(props: CurvePointControlsProps) {
    const t = useT();
    const [, setRevision] = useState(0);
    const {boards} = props;
    useEffect(() => {
        const refresh = () => setRevision(value => value + 1);
        const watched = boards().filter((board): board is JXG.Board => board !== undefined);
        watched.forEach(board => board.on("up", refresh));
        return () => watched.forEach(board => board.off("up", refresh));
    }, [boards]);
    const points = props.points().map(point => [point.X(), point.Y()] as const);
    const {collection} = props;
    return <div className="inspector-group curve-point-controls">
        {collection && <PointCollection label={collection.label} count={points.length} min={CURVE_POINTS_MIN} max={CURVE_POINTS_MAX}
                                        onAdd={collection.onAdd} removal={{kind: "last", onRemove: collection.onRemove}}
                                        typedEntry={{axisLabels: ["x", "y"], min: -CURVE_COORDINATE_LIMIT, max: CURVE_COORDINATE_LIMIT}}/>}
        <PointListInput title={t("point_coordinates_keyboard_editing")} points={points} pointLabel={i => curvePointName(props.prefix, i)} min={-CURVE_COORDINATE_LIMIT} max={CURVE_COORDINATE_LIMIT}
                        onRemove={collection ? collection.onRemoveAt : undefined} minCount={CURVE_POINTS_MIN}
                        onCommit={(index, value) => { props.points()[index].setX(value[0]); props.points()[index].setY(value[1]); props.onEdit(index, value); }}/>
    </div>;
}
