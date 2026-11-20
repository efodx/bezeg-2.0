import {describe, expect, it} from "vitest";
import {sampleLine, type PxBox} from "../../legend/boardLabelPlacement";
import {estimatedSchemeLabelSize, placeSchemeLabels, type SchemeLabelPoint, type SchemeLabelRequest} from "./decasteljauLabels";

type Pt = readonly [number, number];
const MARKER_R = 6;

/** The De Casteljau scheme of the control points in px at t. */
function scheme(control: readonly Pt[], t: number): Pt[][] {
    const levels: Pt[][] = [control.slice()];
    while (levels[levels.length - 1].length > 1) {
        const last = levels[levels.length - 1];
        levels.push(last.slice(1).map((p, i) => [(1 - t) * last[i][0] + t * p[0], (1 - t) * last[i][1] + t * p[1]] as Pt));
    }
    return levels;
}

function request(control: readonly Pt[], t: number, previous?: SchemeLabelRequest["previous"], board = {width: 800, height: 500}): SchemeLabelRequest {
    const levels = scheme(control, t);
    const [w, h] = estimatedSchemeLabelSize(24);
    const points: SchemeLabelPoint[] = [];
    levels.forEach((level, r) => { if (r > 0) level.forEach((p, i) => points.push({id: `${r}-${i}`, level: r, index: i, x: p[0], y: p[1], w, h})); });
    const markers = levels.flat().map(p => [p[0], p[1], MARKER_R] as const);
    const identity = (x: number, y: number): Pt => [x, y];
    const samples: Pt[] = [];
    for (const level of levels) samples.push(...sampleLine(level.map(p => p[0]), level.map(p => p[1]), identity, board.width, board.height));
    const curveX: number[] = [], curveY: number[] = [];
    for (let k = 0; k <= 40; k++) { const top = scheme(control, k / 40).at(-1)![0]; curveX.push(top[0]); curveY.push(top[1]); }
    samples.push(...sampleLine(curveX, curveY, identity, board.width, board.height));
    // The control point labels (level 0) lie above their points, the way they are drawn.
    const occupied = control.map(p => ({x0: p[0] - 11, y0: p[1] - 40, x1: p[0] + 11, y1: p[1] - 14}));
    const strips: PxBox[] = [{x0: 380, y0: 440, x1: 396, y1: 454}, {x0: 396, y0: 250, x1: 410, y1: 264}];
    return {width: board.width, height: board.height, points, markers, samples, strips, occupied, previous};
}

const overlaps = (a: PxBox, b: PxBox) => a.x0 < b.x1 - 2 && a.x1 > b.x0 + 2 && a.y0 < b.y1 - 2 && a.y1 > b.y0 + 2;

function assertClear(req: SchemeLabelRequest) {
    const placed = placeSchemeLabels(req);
    expect(placed.size).toBe(req.points.length);
    const entries = [...placed.entries()];
    entries.forEach(([id, {box}], a) => {
        for (const [otherId, other] of entries.slice(a + 1)) expect(overlaps(box, other.box), `${id} on ${otherId}`).toBe(false);
        for (const [mx, my] of req.markers) {
            expect(mx > box.x0 && mx < box.x1 && my > box.y0 && my < box.y1, `${id} covers a marker`).toBe(false);
        }
        for (const occupied of req.occupied) expect(overlaps(box, occupied), `${id} on a control label`).toBe(false);
    });
    return placed;
}

const cubic: Pt[] = [[150, 380], [250, 120], [520, 120], [650, 380]];
const quintic: Pt[] = [[100, 400], [200, 150], [330, 330], [470, 110], [700, 380]];

describe("placeSchemeLabels", () => {
    it("keeps the labels of a cubic scheme apart and off the markers", () => {
        for (const t of [0.15, 0.5, 0.85]) assertClear(request(cubic, t));
    });

    it("keeps the labels of a degree four scheme apart and off the markers", () => {
        for (const t of [0.2, 0.5, 0.8]) assertClear(request(quintic, t));
    });

    it("gives the offset as the box centre minus the point, y up", () => {
        const req = request(cubic, 0.5);
        const placed = placeSchemeLabels(req);
        for (const p of req.points) {
            const {box, offset} = placed.get(p.id)!;
            expect(p.x + offset[0]).toBeCloseTo((box.x0 + box.x1) / 2);
            expect(p.y - offset[1]).toBeCloseTo((box.y0 + box.y1) / 2);
        }
    });

    it("does not move a label between nearby parameters while its spot stays free", () => {
        let previous = new Map<string, readonly [number, number]>();
        let moved = 0, total = 0;
        for (let k = 0; k <= 20; k++) {
            const placed = placeSchemeLabels(request(quintic, 0.4 + k * 0.004, previous));
            if (k > 0) for (const [id, {from}] of placed) { total++; if (Math.hypot(from[0] - previous.get(id)![0], from[1] - previous.get(id)![1]) > 0.5) moved++; }
            previous = new Map([...placed].map(([id, v]) => [id, v.from]));
        }
        expect(moved / total).toBeLessThan(0.05);
    });

    it("does not let the first scheme label cover a drawn line sample where a free spot exists", () => {
        const req = request(cubic, 0.5);
        const placed = placeSchemeLabels(req);
        const result = placed.get("3-0")!.box;
        const hits = req.samples.filter(([x, y]) => x >= result.x0 && x <= result.x1 && y >= result.y0 && y <= result.y1).length;
        expect(hits).toBeLessThanOrEqual(2);
    });

    it("keeps every label of the degree four lesson scene next to its own marker, also where a dashed line crosses the spot", () => {
        // The lesson board: 875 x 594 px, x from about -7.3 to 7.3, origin at (433, 300), equal units.
        const unit = 875 / 14.6;
        const control = ([[-4, -3], [-3, 2], [0, 3], [3, 2], [4, -3]] as const).map(([x, y]) => [433 + x * unit, 300 - y * unit] as Pt);
        const base = request(control, 0.5, undefined, {width: 875, height: 594});
        // The markers as the curve passes them: a drawn radius of 5 px less the 3 px the placement adds (see schemeLabelPlacement).
        const req = {...base, markers: base.markers.map(([x, y]) => [x, y, 2] as const), strips: [] as PxBox[], axisX: 433, axisY: 300};
        const placed = placeSchemeLabels(req);
        const gap = (b: PxBox, x: number, y: number) => Math.hypot(Math.max(b.x0 - x, 0, x - b.x1), Math.max(b.y0 - y, 0, y - b.y1));
        for (const p of req.points) {
            const own = gap(placed.get(p.id)!.box, p.x, p.y);
            expect(own - 5, `${p.id} is far from its marker`).toBeLessThanOrEqual(16);
            for (const q of req.points) if (q.id !== p.id) expect(own, `${p.id} is nearer to ${q.id}`).toBeLessThan(gap(placed.get(p.id)!.box, q.x, q.y));
        }
    });
});
