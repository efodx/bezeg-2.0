import {gridToBoard, type PointSetModel} from "../../compgeo/pointSetModel";
import {GraphPalette} from "../styles/GraphPalette";

type Position = readonly [number, number];
type Stroke = readonly Position[];
type DataCurve = JXG.Curve & {updateDataArray: () => void; dataX: number[]; dataY: number[]};

/** Each stroke ends with a gap so JSXGraph can draw all the cues with one element. */
function createStrokes(
    board: JXG.Board, name: string, style: Partial<JXG.CurveAttributes>,
    draw: (stroke: (points: Stroke) => void) => void,
): JXG.Curve {
    const x: number[] = [];
    const y: number[] = [];
    const curve = board.create("curve", [[], []], {name, fixed: true, highlight: false, ...style}) as DataCurve;
    curve.hasPoint = () => false;
    curve.updateDataArray = () => {
        x.length = 0;
        y.length = 0;
        draw(points => {
            for (const [px, py] of points) {
                x.push(px);
                y.push(py);
            }
            x.push(NaN);
            y.push(NaN);
        });
        curve.dataX = x;
        curve.dataY = y;
    };
    return curve;
}

export function createQueryLinks(
    board: JXG.Board, query: JXG.Point, model: () => PointSetModel, nearest: () => readonly number[],
): JXG.Curve {
    return createStrokes(board, "voronoi-query-links",
        {strokeColor: GraphPalette.primaryCurve, strokeWidth: 1.75, strokeOpacity: 0.85, dash: 2, layer: 3},
        stroke => {
            const {points, gridStepExponent} = model();
            const start = [query.X(), query.Y()] as const;
            for (const site of nearest()) {
                const end = gridToBoard(points[site], gridStepExponent);
                stroke([start, [end.x, end.y]]);
            }
        });
}

/** Small line-art marks in screen pixels, offset from the draggable points and their labels. */
const SHOP: readonly Stroke[] = [
    [[-8, -17], [-6, -12], [6, -12], [8, -17], [-8, -17]],
    [[-6, -17], [-6, -23], [6, -23], [6, -17]],
    [[-2, -23], [-2, -19], [2, -19], [2, -23]],
    [[-3, -12], [-4, -17]],
    [[3, -12], [4, -17]],
];
const CUSTOMER: typeof SHOP = [
    [[-3, 21], [-3, 24], [-1, 26], [1, 26], [3, 24], [3, 21], [1, 19], [-1, 19], [-3, 21]],
    [[-6, 12], [-6, 14], [-3, 17], [3, 17], [6, 14], [6, 12]],
];

export function createPizzeriaMarks(board: JXG.Board, query: JXG.Point, model: () => PointSetModel): JXG.Curve {
    return createStrokes(board, "voronoi-pizzeria-marks",
        {strokeColor: GraphPalette.label, strokeWidth: 1.65, layer: 6},
        stroke => {
            const {points, gridStepExponent} = model();
            const mark = (x: number, y: number, symbol: typeof SHOP) => {
                for (const path of symbol) stroke(path.map(([dx, dy]) => [x + dx / board.unitX, y + dy / board.unitY] as const));
            };
            for (const site of points) {
                const {x, y} = gridToBoard(site, gridStepExponent);
                mark(x, y, SHOP);
            }
            mark(query.X(), query.Y(), CUSTOMER);
        });
}
