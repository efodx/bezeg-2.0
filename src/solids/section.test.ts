import {describe, expect, it} from "vitest";
import {clipSolid, sectionConvex, type Section} from "./section";
import {cube, isClosed, prism, pyramid, realCoords, type Solid, type Vec3} from "./solid";
import {meshVolume, newellVector, sectionAreaFromLoop} from "./volume";

/** Concave U-shaped base (cell size 4 grid units = 1), counter-clockwise; area 5. */
const U_BASE: Array<[number, number]> = [[0, 0], [12, 0], [12, 8], [8, 8], [8, 4], [4, 4], [4, 8], [0, 8]];
const SQUARE_BASE: Array<[number, number]> = [[-8, -8], [8, -8], [8, 8], [-8, 8]];

type Polygon = Extract<Section, {kind: "polygon"}>;

function polygon(s: Section): Polygon {
    if (s.kind !== "polygon") {
        throw new Error(`expected polygon, got ${s.kind}`);
    }
    return s;
}

function loopXyz(p: Polygon): Vec3[] {
    return p.loop.map(i => p.points[i].xyz);
}

function area(s: Section): number {
    return sectionAreaFromLoop(loopXyz(polygon(s)));
}

/** All nonzero integer normals with components in -4..4. */
const NORMALS: Vec3[] = [];
for (let x = -4; x <= 4; x++) {
    for (let y = -4; y <= 4; y++) {
        for (let z = -4; z <= 4; z++) {
            if (x !== 0 || y !== 0 || z !== 0) {
                NORMALS.push([x, y, z]);
            }
        }
    }
}

/**
 * Independent oracle for the unit cube, sharing no algorithm with the clipper. Volume of
 * {n.x <= t} by inclusion-exclusion over the corner simplices (flip negative components to make
 * them positive), and section area |n| dV/dt from the derivative of that piecewise polynomial.
 */
function oracle(n: Vec3, t: number): {volume: number; area: number} {
    const a = n.filter(c => c !== 0).map(Math.abs);
    const k = a.length;
    const shifted = t + n.filter(c => c < 0).reduce((s, c) => s - c, 0);
    const prod = a.reduce((p, c) => p * c, 1);
    const fact = (m: number): number => (m <= 1 ? 1 : m * fact(m - 1));
    let volume = 0;
    let slope = 0;
    for (let mask = 0; mask < 1 << k; mask++) {
        let sum = 0;
        let bits = 0;
        for (let i = 0; i < k; i++) {
            if (mask & (1 << i)) {
                sum += a[i];
                bits++;
            }
        }
        const r = Math.max(0, shifted - sum);
        const sgn = bits % 2 ? -1 : 1;
        volume += sgn * r ** k / (fact(k) * prod);
        if (k >= 2) {
            slope += sgn * r ** (k - 1) / (fact(k - 1) * prod);
        }
    }
    if (k === 1) {
        slope = shifted > 0 && shifted < a[0] ? 1 / a[0] : 0;
    }
    return {volume, area: Math.hypot(...n) * slope};
}

describe("oracle self-check", () => {
    it("matches closed forms of the SV1 family and the half-cube", () => {
        expect(oracle([1, 1, 1], 1).volume).toBeCloseTo(1 / 6, 12);
        expect(oracle([1, 1, 1], 1.25).volume).toBeCloseTo(61 / 192, 12);
        expect(oracle([1, 1, 1], 1.5).volume).toBeCloseTo(0.5, 12);
        expect(oracle([0, 0, 1], 0.25).volume).toBeCloseTo(0.25, 12);
        expect(oracle([-1, 0, 0], -0.75).volume).toBeCloseTo(0.25, 12);
        expect(oracle([1, 1, 1], 1.5).area).toBeCloseTo(1.29904, 5);
    });
});

describe("SV1 numbers (cube, d in grid units of 1/4)", () => {
    const cases: Array<[string, Vec3, number, number, number, number]> = [
        // name, n, d, side count, edge cuts, area
        ["x+y+z=0.5", [1, 1, 1], 2, 3, 3, 0.21651],
        ["x+y+z=1 through three vertices", [1, 1, 1], 4, 3, 0, Math.sqrt(3) / 2],
        ["x+y+z=1.25", [1, 1, 1], 5, 6, 6, 1.19078],
        ["x+y+z=1.5 regular hexagon", [1, 1, 1], 6, 6, 6, 1.29904],
        ["x+y+z=2.5", [1, 1, 1], 10, 3, 3, 0.21651],
        ["z=0.5", [0, 0, 1], 2, 4, 4, 1],
        ["x+y=1 through four vertices", [1, 1, 0], 4, 4, 0, Math.SQRT2],
        ["x+2y+2z=1.5", [1, 2, 2], 6, 4, 4, 0.75],
        ["2x+3y+4z=4 (4 edge cuts plus the vertex (0,0,1))", [2, 3, 4], 16, 5, 4, 1.2341],
    ];
    for (const [name, n, d, sides, cuts, expected] of cases) {
        it(`${name}: ${sides} sides, ${cuts} edge cuts, area ${expected.toFixed(5)}`, () => {
            const sec = polygon(sectionConvex(cube(), n, d));
            expect(sec.loop.length).toBe(sides);
            expect(sec.edgeCuts).toBe(cuts);
            expect(sec.coplanarFace).toBeUndefined();
            expect(area(sec)).toBeCloseTo(expected, 5);
            expect(oracle(n, d / 4).area).toBeCloseTo(expected, 5);
        });
    }

    it("2x+3y+4z=4.5 is a generic hexagon: oracle, Newell and cap areas agree; a component 5 is rejected", () => {
        const sec = polygon(sectionConvex(cube(), [2, 3, 4], 18));
        expect(sec.loop.length).toBe(6);
        expect(sec.edgeCuts).toBe(6);
        const expected = oracle([2, 3, 4], 4.5).area;
        expect(area(sec)).toBeCloseTo(expected, 9);
        const cap = clipSolid(cube(), [2, 3, 4], 18, "below");
        const capFace = cap.faces[cap.faces.length - 1].map(i => realCoords(cap, i));
        expect(sectionAreaFromLoop(capFace)).toBeCloseTo(expected, 9);
        expect(() => sectionConvex(cube(), [3, 4, 5], 24)).toThrow(RangeError);
    });

    it("x+y+z=3 is one point and x+y+z=0 is the origin", () => {
        const top = sectionConvex(cube(), [1, 1, 1], 12);
        expect(top.kind).toBe("point");
        expect(top.kind === "point" && top.v).toEqual([1, 1, 1]);
        expect(sectionConvex(cube(), [1, 1, 1], 0).kind).toBe("point");
        expect(sectionConvex(cube(), [1, 1, 1], 13).kind).toBe("empty");
        expect(sectionConvex(cube(), [1, 1, 1], -1).kind).toBe("empty");
    });

    it("touching an edge gives a segment", () => {
        const sec = sectionConvex(cube(), [1, 1, 0], 0);
        expect(sec.kind).toBe("segment");
        expect(sec.kind === "segment" && sec.points.map(p => p.kind)).toEqual(["vertex", "vertex"]);
    });

    it("a plane through three vertices keeps them as vertex points by index, with no edge cut", () => {
        const sec = polygon(sectionConvex(cube(), [1, 1, 1], 4));
        expect(sec.points.map(p => p.kind)).toEqual(["vertex", "vertex", "vertex"]);
        expect(sec.points.map(p => (p.kind === "vertex" ? p.vertex : -1))).toEqual([1, 2, 4]);
        expect(new Set(sec.loop).size).toBe(3);
    });

    it("the hexagon at d=1.25 has the hand-computed corners in boundary order", () => {
        const sec = polygon(sectionConvex(cube(), [1, 1, 1], 5));
        // Hand computed on the quarter grid: the plane meets the six edges one quarter from a vertex.
        const ring = [[4, 1, 0], [1, 4, 0], [0, 4, 1], [0, 1, 4], [1, 0, 4], [4, 0, 1]];
        const got = loopXyz(sec).map(p => p.map(c => Math.round(c * 4)));
        const start = got.findIndex(p => p.join() === ring[0].join());
        expect(start).toBeGreaterThanOrEqual(0);
        const forward = got.map((_, i) => got[(start + i) % 6]);
        const backward = got.map((_, i) => got[(start - i + 6) % 6]);
        const same = (seq: number[][]) => seq.every((p, i) => p.join() === ring[i].join());
        expect(same(forward) || same(backward)).toBe(true);
        for (const p of loopXyz(sec)) {
            expect(p[0] + p[1] + p[2]).toBeCloseTo(1.25, 12);
        }
    });

    it("the loop is oriented along the plane normal", () => {
        for (const [n, d] of [[[1, 1, 1], 2], [[-1, 2, 3], 2], [[0, 0, -1], -2]] as Array<[Vec3, number]>) {
            const sec = polygon(sectionConvex(cube(), n, d));
            const w = newellVector(loopXyz(sec));
            expect(w[0] * n[0] + w[1] * n[1] + w[2] * n[2]).toBeGreaterThan(0);
        }
    });
});

describe("coplanar face", () => {
    it("is reported and not an empty or degenerate polygon", () => {
        for (const [n, d, face] of [[[0, 0, 1], 0, 0], [[0, 0, 1], 4, 1], [[0, 3, 0], 12, 3], [[-2, 0, 0], 0, 4], [[-2, 0, 0], -8, 5]] as Array<[Vec3, number, number]>) {
            const sec = polygon(sectionConvex(cube(), n, d));
            expect(sec.kind).toBe("polygon");
            expect(sec.coplanarFace).toBe(face);
            expect(sec.loop.length).toBe(4);
            expect(area(sec)).toBeCloseTo(1, 12);
        }
    });

    it("only axis normals through a face plane report a coplanar face (all normals, all offsets)", () => {
        for (const n of NORMALS) {
            for (let d = -50; d <= 50; d++) {
                const sec = sectionConvex(cube(), n, d);
                // Face planes of an axis normal with component c are n.v = 0 and n.v = 4c on the grid.
                const c = n.find(x => x !== 0)!;
                const axis = n.filter(x => x !== 0).length === 1;
                const onFace = axis && (d === 0 || d === 4 * c);
                expect(sec.kind === "polygon" && sec.coplanarFace !== undefined).toBe(onFace);
            }
        }
    });
});

describe("every normal and offset on the cube", () => {
    it("has at most six sides, a simple closed chain, and the oracle area, volume and cap", () => {
        const solid = cube();
        let polygons = 0;
        for (const n of NORMALS) {
            const dots = [0, 4].flatMap(x => [0, 4].flatMap(y => [0, 4].map(z => n[0] * x + n[1] * y + n[2] * z)));
            const lo = Math.min(...dots);
            const hi = Math.max(...dots);
            for (let d = lo - 1; d <= hi + 1; d++) {
                const sec = sectionConvex(solid, n, d);
                const strictlyInside = lo < d && d < hi;
                if (!strictlyInside) {
                    expect(["empty", "point", "segment"].includes(sec.kind) || (sec.kind === "polygon" && sec.coplanarFace !== undefined)).toBe(true);
                    continue;
                }
                const p = polygon(sec);
                polygons++;
                expect(p.loop.length).toBeLessThanOrEqual(6);
                expect(p.loop.length).toBeGreaterThanOrEqual(3);
                // Simple closed chain: every point once in the loop, used by exactly two segments.
                expect(new Set(p.loop).size).toBe(p.points.length);
                const uses = new Array(p.points.length).fill(0);
                for (const [a, b] of p.segments) {
                    uses[a]++;
                    uses[b]++;
                }
                expect(uses.every(u => u === 2)).toBe(true);
                expect(p.segments.length).toBe(p.points.length);
                for (let i = 0; i < p.loop.length; i++) {
                    const a = p.loop[i];
                    const b = p.loop[(i + 1) % p.loop.length];
                    expect(p.segments.some(([x, y]) => (x === a && y === b) || (x === b && y === a))).toBe(true);
                }
                const expected = oracle(n, d / 4);
                expect(area(p)).toBeCloseTo(expected.area, 9);

                const below = clipSolid(solid, n, d, "below");
                const above = clipSolid(solid, n, d, "above");
                expect(isClosed(below) && isClosed(above)).toBe(true);
                expect(meshVolume(below)).toBeCloseTo(expected.volume, 12);
                expect(meshVolume(below) + meshVolume(above)).toBeCloseTo(1, 12);
                // The cap is the last face of each half; its area agrees with the oracle.
                for (const half of [below, above]) {
                    const cap = half.faces[half.faces.length - 1].map(i => realCoords(half, i));
                    expect(sectionAreaFromLoop(cap)).toBeCloseTo(expected.area, 9);
                }
            }
        }
        expect(polygons).toBeGreaterThan(10000);
    });

    it("never reaches a heptagon, and the side count attains 3, 4, 5 and 6", () => {
        const seen = new Set<number>();
        for (const n of NORMALS) {
            for (let d = -49; d <= 49; d++) {
                const sec = sectionConvex(cube(), n, d);
                if (sec.kind === "polygon" && sec.coplanarFace === undefined) {
                    seen.add(sec.loop.length);
                }
            }
        }
        expect([...seen].sort()).toEqual([3, 4, 5, 6]);
    });
});

describe("clipSolid on the cube", () => {
    it("matches the analytic half-space volumes and stays closed", () => {
        for (const [d, v] of [[4, 1 / 6], [5, 61 / 192], [6, 1 / 2]] as Array<[number, number]>) {
            const below = clipSolid(cube(), [1, 1, 1], d, "below");
            expect(isClosed(below)).toBe(true);
            expect(meshVolume(below)).toBeCloseTo(v, 12);
            expect(meshVolume(clipSolid(cube(), [1, 1, 1], d, "above"))).toBeCloseTo(1 - v, 12);
        }
        expect(meshVolume(clipSolid(cube(), [1, 1, 1], 5, "below"))).toBeCloseTo(0.3177083, 7);
    });

    it("returns the whole solid, or nothing, when the plane does not cut it", () => {
        expect(meshVolume(clipSolid(cube(), [1, 0, 0], 8, "below"))).toBeCloseTo(1, 12);
        expect(clipSolid(cube(), [1, 0, 0], 8, "above").faces.length).toBe(0);
        expect(clipSolid(cube(), [1, 0, 0], 4, "above").faces.length).toBe(0);
        expect(meshVolume(clipSolid(cube(), [1, 0, 0], 4, "below"))).toBeCloseTo(1, 12);
        expect(clipSolid(cube(), [1, 1, 1], 12, "below").faces.length).toBe(6);
        expect(clipSolid(cube(), [1, 1, 1], 12, "above").faces.length).toBe(0);
    });

    it("keeps sign-0 vertices once: the cap through three vertices is one triangle", () => {
        const below = clipSolid(cube(), [1, 1, 1], 4, "below");
        expect(below.vertices.length / 3).toBe(4);
        expect(below.faces.length).toBe(4);
    });
});

describe("SV2 prisms and pyramids", () => {
    // Pyramid: base side 4 (16 grid units), height 4, apex above the centre; base at grid z = -8.
    const pyr = () => pyramid(SQUARE_BASE, -8, [0, 0, 8]);

    it("reproduces the numbers 9, 4, 8 and 64/3", () => {
        expect(area(sectionConvex(pyr(), [0, 0, 1], -4))).toBeCloseTo(9, 12);
        expect(area(sectionConvex(pyr(), [0, 0, 1], 0))).toBeCloseTo(4, 12);
        const axial = polygon(sectionConvex(pyr(), [0, 1, 0], 0));
        expect(axial.loop.length).toBe(3);
        expect(area(axial)).toBeCloseTo(8, 12);
        expect(meshVolume(pyr())).toBeCloseTo(64 / 3, 12);
    });

    it("has area ratio (1 - z/4)^2 at every grid height", () => {
        for (let d = -7; d <= 7; d++) {
            const z = (d + 8) / 4;
            expect(area(sectionConvex(pyr(), [0, 0, 1], d))).toBeCloseTo(16 * (1 - z / 4) ** 2, 12);
        }
    });

    it("keeps a prism's parallel section congruent to its base", () => {
        const p = prism(U_BASE, 0, 8);
        for (let d = 1; d <= 7; d++) {
            expect(area(sectionConvex(p, [0, 0, 1], d))).toBeCloseTo(5, 12);
        }
    });

    it("has at most 5 sides for every normal and offset", () => {
        let maxSides = 0;
        for (const n of NORMALS) {
            for (let d = -100; d <= 100; d++) {
                const sec = sectionConvex(pyr(), n, d);
                if (sec.kind === "polygon") {
                    maxSides = Math.max(maxSides, sec.loop.length);
                }
            }
        }
        expect(maxSides).toBe(5);
    });

    it("clips the pyramid closed with the frustum volume", () => {
        // Below z = 1 (grid -4): frustum volume = V - (3/4 H)... apex part is a pyramid of height 3, base 3x3.
        const below = clipSolid(pyr(), [0, 0, 1], -4, "below");
        expect(isClosed(below)).toBe(true);
        expect(meshVolume(below)).toBeCloseTo(64 / 3 - 9 * 3 / 3, 12);
    });
});

describe("chaining through shared edges, not angles", () => {
    // Not a convex solid: sectionConvex also accepts welded solids whose faces each meet the plane in one segment.
    it("orders a concave section (U prism at half height) along the boundary", () => {
        const u: Solid = prism(U_BASE, 0, 8);
        const sec = polygon(sectionConvex(u, [0, 0, 1], 4));
        expect(sec.loop.length).toBe(8);
        // Each cut point lies on a vertical edge i (a = i, b = i + 8); consecutive points are base-neighbours.
        const baseIndex = (i: number) => {
            const p = sec.points[i];
            return p.kind === "edge" ? p.a : -1;
        };
        for (let i = 0; i < 8; i++) {
            const a = baseIndex(sec.loop[i]);
            const b = baseIndex(sec.loop[(i + 1) % 8]);
            expect([1, 7]).toContain((a - b + 8) % 8);
        }
        expect(area(sec)).toBeCloseTo(5, 12);
    });
});

describe("rejection", () => {
    it("rejects normals and offsets out of range, and non-grid solids", () => {
        const c = cube();
        for (const n of [[5, 0, 0], [0, 0, 0], [0.5, 1, 0], [1, 1, NaN]] as Vec3[]) {
            expect(() => sectionConvex(c, n, 0)).toThrow(RangeError);
            expect(() => clipSolid(c, n, 0, "below")).toThrow(RangeError);
        }
        expect(() => sectionConvex(c, [1, 0, 0], 1.5)).toThrow(RangeError);
        expect(() => sectionConvex(c, [1, 0, 0], 145)).toThrow(RangeError);
        expect(() => clipSolid(c, [1, 0, 0], 145, "above")).toThrow(RangeError);
        const floats: Solid = {vertices: Float64Array.from(c.vertices), faces: c.faces};
        expect(() => sectionConvex(floats, [1, 0, 0], 2)).toThrow(RangeError);
    });
});
