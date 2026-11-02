import {classify, determinantSign} from "../../projective/conic";
import {sampleConic} from "../../projective/conicSampler";
import {
    circlePoint, DEFAULT_THREE_VIEWS_MODEL, directionSegments, evaluateThreeViews, IMAGE_WINDOW, imageConic, imageOfPoint, imagePolyline, imageResidual,
    parseThreeViewsModel, THREE_VIEWS_LIMIT, ThreeViewsModel, windowExit,
} from "./threeViewsModel";
import {nudgeC, setAngle, setC, setPointOn} from "./threeViewsEdit";

const model = (c: number, extra: Partial<ThreeViewsModel> = {}): ThreeViewsModel => ({...DEFAULT_THREE_VIEWS_MODEL, c, ...extra});
const scene = (c: number, extra: Partial<ThreeViewsModel> = {}) => evaluateThreeViews(model(c, extra));

describe("the exact image equation and type", () => {
    test("c = 2, 1, 0: B^2 - 4AC is -12, 0, 4 for the reduced equation (the spec table)", () => {
        expect(scene(20).discriminant).toBe(-12n);
        expect(scene(10).discriminant).toBe(0n);
        expect(scene(0).discriminant).toBe(4n);
        expect([scene(20).type, scene(10).type, scene(0).type]).toEqual(["ellipse", "parabola", "hyperbola"]);
    });

    test("c = 1 and c = -1 are exactly the parabola (X^2 + 2Y + 1 = 0 and X^2 - 2Y + 1 = 0), never near", () => {
        expect(Array.from(imageConic(10))).toEqual([1n, 0n, 0n, 0n, 2n, 1n]);
        expect(Array.from(imageConic(-10))).toEqual([1n, 0n, 0n, 0n, -2n, 1n]);
        expect(scene(10).type).toBe("parabola");
        expect(scene(-10).type).toBe("parabola");
        // the neighbours on the grid are not
        expect(scene(9).type).toBe("hyperbola");
        expect(scene(11).type).toBe("ellipse");
        expect(scene(-9).type).toBe("hyperbola");
        expect(scene(-11).type).toBe("ellipse");
    });

    test("the type follows k^2 against 100 on the whole grid, and contact says misses, touches or cuts", () => {
        for (let k = -THREE_VIEWS_LIMIT; k <= THREE_VIEWS_LIMIT; k++) {
            const s = scene(k);
            const expected = k * k > 100 ? "ellipse" : k * k === 100 ? "parabola" : "hyperbola";
            expect(s.type).toBe(expected);
            expect(classify(s.conic)).toBe(expected);
            expect(s.contact).toBe(k * k > 100 ? "misses" : k * k === 100 ? "touches" : "cuts");
            expect(s.ideal).toHaveLength(k * k > 100 ? 0 : k * k === 100 ? 1 : 2);
        }
    });

    test("the 3x3 determinant is -1 for the unscaled equation (nondegenerate) on the whole grid", () => {
        for (let k = -THREE_VIEWS_LIMIT; k <= THREE_VIEWS_LIMIT; k++) {
            const s = scene(k);
            expect(s.determinantNormalised).toBe(-1);
            expect(determinantSign(s.conic)).toBe(-1);
            expect(s.fourDeterminant).toBe(-4n * s.scale ** 3n);
        }
        // the reduced scale is 1 for c = 2, 1, 0, so the determinants are -1 as printed in the spec
        expect([scene(20).scale, scene(10).scale, scene(0).scale]).toEqual([1n, 1n, 1n]);
        expect(scene(20).fourDeterminant).toBe(-4n);
    });
});

describe("where L meets the circle", () => {
    test("c = 0: two points (-1, 0) and (1, 0), asymptote directions (-1, 1) and (1, 1)", () => {
        const s = scene(0);
        expect(s.ideal.map(p => p.x)).toEqual([-1, 1]);
        expect(s.ideal.map(p => p.hundredXSquared)).toEqual([100, 100]);
        expect(s.ideal.map(p => [p.direction.x, p.direction.y])).toEqual([[-1, 1], [1, 1]]);
    });

    test("c = 1/2 gives x = +-sqrt(3)/2 and c = 6/10 gives +-0.8", () => {
        expect(scene(5).ideal.map(p => p.x)).toEqual([-Math.sqrt(75) / 10, Math.sqrt(75) / 10]);
        expect(scene(6).ideal.map(p => p.x)).toEqual([-0.8, 0.8]);
    });

    test("c = +-1 touches at (0, +-1): one point at infinity, the vertical direction of the parabola axis", () => {
        for (const k of [10, -10]) {
            const s = scene(k);
            expect(s.ideal).toHaveLength(1);
            expect(s.ideal[0].x).toBe(0);
            expect(s.ideal[0].direction).toEqual({x: 0, y: 1});
        }
    });

    test("c = 2: L misses the circle, so there is no point at infinity", () => {
        expect(scene(20).ideal).toEqual([]);
        expect(scene(20).contact).toBe("misses");
    });

    test("the intersection points of a cutting line lie on the circle", () => {
        for (const k of [-9, -5, 0, 3, 8]) {
            const s = scene(k);
            for (const p of s.ideal) expect(p.x * p.x + s.cValue * s.cValue).toBeCloseTo(1, 14);
        }
    });
});

describe("the image map (acceptance 2)", () => {
    test("200 random circle points satisfy the image equation for c = 2, 1, 0, 1/2", () => {
        let state = 12345;
        const random = () => (state = (state * 1103515245 + 12345) % 2147483648) / 2147483648;
        let worst = 0;
        for (const c of [2, 1, 0, 0.5]) {
            for (let i = 0; i < 200; i++) {
                const theta = random() * 2 * Math.PI;
                const x = Math.cos(theta);
                const y = Math.sin(theta);
                if (Math.abs(y - c) < 1e-3) continue;
                const {X, Y} = imageOfPoint(c, x, y);
                worst = Math.max(worst, imageResidual(c, X, Y));
            }
        }
        console.log(`worst relative residual over 800 points: ${worst}`);
        expect(worst).toBeLessThan(1e-12);
        expect(worst).toBeLessThan(1e-14);
    });

    test("a wrong map (Y not 1/(y - c)) breaks the equation", () => {
        const x = Math.cos(0.7);
        const y = Math.sin(0.7);
        const wrong = {X: x / (y - 2), Y: 1 / (y + 2)};
        expect(imageResidual(2, wrong.X, wrong.Y)).toBeGreaterThan(1e-3);
    });

    test("the optional point has a finite image on the conic, and a point on L maps to infinity", () => {
        const finite = scene(20, {pointOn: true, angle: 3});
        expect(finite.point?.image.kind).toBe("finite");
        const image = finite.point!.image as {X: number; Y: number};
        expect(imageResidual(2, image.X, image.Y)).toBeLessThan(1e-14);
        // c = 0.5 with the point at 30 degrees (step 2) lies on L
        expect(scene(5, {pointOn: true, angle: 2}).point?.image.kind).toBe("infinity");
        expect(scene(5, {pointOn: false, angle: 2}).point).toBeUndefined();
        // c = 1 and the top of the circle (step 6) touches at (0, 1)
        expect(scene(10, {pointOn: true, angle: 6}).point?.image).toEqual({kind: "infinity", direction: {x: 0, y: 1}});
    });

    test("circlePoint is exact on the axes and on the circle elsewhere", () => {
        expect([0, 6, 12, 18].map(a => circlePoint(a))).toEqual([{x: 1, y: 0}, {x: 0, y: 1}, {x: -1, y: 0}, {x: 0, y: -1}]);
        for (let a = 0; a < 24; a++) {
            const p = circlePoint(a);
            expect(Math.abs(p.x * p.x + p.y * p.y - 1)).toBeLessThan(1e-15);
        }
        expect(circlePoint(24)).toEqual(circlePoint(0));
        expect(circlePoint(-1)).toEqual(circlePoint(23));
    });
});

describe("the drawn image conic (acceptance 5)", () => {
    test("the hyperbola for c = 0 is two pieces, one above and one below, joined by nothing", () => {
        const pieces = sampleConic(imageConic(0), IMAGE_WINDOW).pieces;
        expect(pieces).toHaveLength(2);
        const sides = pieces.map(p => p.points.every(q => q.y > 0) ? "upper" : p.points.every(q => q.y < 0) ? "lower" : "mixed").sort();
        expect(sides).toEqual(["lower", "upper"]);
        const line = imagePolyline(imageConic(0));
        expect(line.x.filter(Number.isNaN)).toHaveLength(1);
        expect(line.y.filter(Number.isNaN)).toHaveLength(1);
        const gap = line.x.findIndex(Number.isNaN);
        const before = line.y.slice(0, gap);
        const after = line.y.slice(gap + 1);
        expect(before.every(y => y > 0) || before.every(y => y < 0)).toBe(true);
        expect(after.every(y => y > 0) || after.every(y => y < 0)).toBe(true);
        expect(before.every(y => y > 0)).not.toBe(after.every(y => y > 0));
    });

    test("every cutting c shows two branches with one break, except |c| = 0.9 whose far vertex (1/(1 - |c|) = 10) is outside the window; the ellipse and parabola are not broken", () => {
        for (let k = -THREE_VIEWS_LIMIT; k <= THREE_VIEWS_LIMIT; k++) {
            const line = imagePolyline(imageConic(k));
            const breaks = line.x.filter(Number.isNaN).length;
            expect(breaks).toBe(k * k < 100 && Math.abs(k) !== 9 ? 1 : 0);
            expect(line.x.length).toBeGreaterThan(5);
        }
    });

    test("the ellipse for c = 2 is a closed curve inside the window; the parabola for c = 1 opens downward", () => {
        const e = sampleConic(imageConic(20), IMAGE_WINDOW).pieces;
        expect(e).toHaveLength(1);
        expect(e[0].closed).toBe(true);
        expect(Math.max(...imagePolyline(imageConic(10)).y)).toBeCloseTo(-0.5, 6);
    });

    test("asymptote segments start at the centre (0, c/(1 - c^2)) and leave the window along (x, 1)", () => {
        const segments = directionSegments(scene(5));
        expect(segments).toHaveLength(2);
        for (const [from, to] of segments) {
            expect(from.x).toBe(0);
            expect(from.y).toBeCloseTo(0.5 / 0.75, 12);
            expect(Math.abs(Math.abs(to.x) - 5.5) < 1e-9 || Math.abs(Math.abs(to.y) - 7) < 1e-9).toBe(true);
        }
        expect(windowExit({x: 0, y: 0}, {x: 0, y: 1})).toEqual({x: 0, y: 7});
    });
});

describe("editing", () => {
    test("c is clamped and rounded, and an unchanged state keeps the object", () => {
        const m = model(20);
        expect(setC(m, 20)).toBe(m);
        expect(setC(m, 99).c).toBe(THREE_VIEWS_LIMIT);
        expect(setC(m, -99).c).toBe(-THREE_VIEWS_LIMIT);
        expect(setC(m, 3.4).c).toBe(3);
        expect(setC(m, NaN)).toBe(m);
        expect(nudgeC(m, -1).c).toBe(19);
        expect(setPointOn(m, false)).toBe(m);
        expect(setPointOn(m, true).pointOn).toBe(true);
        expect(setAngle(m, 25).angle).toBe(1);
        expect(setAngle(m, -1).angle).toBe(23);
        expect(setAngle(m, 3)).toBe(m);
    });
});

describe("Preset parser", () => {
    test("accepts the default and rejects wrong shapes", () => {
        expect(parseThreeViewsModel({c: 20, pointOn: false, angle: 3})).toEqual({ok: true, value: DEFAULT_THREE_VIEWS_MODEL});
        const refusals = [null, "x", {c: 1.5, pointOn: false, angle: 0}, {c: 26, pointOn: false, angle: 0}, {c: 0, pointOn: 1, angle: 0},
            {c: 0, pointOn: true, angle: 24}, {c: 0, pointOn: true, angle: -1}, {c: 0, pointOn: true}, {pointOn: true, angle: 0}];
        for (const bad of refusals) expect(parseThreeViewsModel(bad).ok).toBe(false);
    });
});
