import {tensorPatchFromDto} from "./patchDto";
import {derivativesStartingPatches} from "./patchPresetCollections";
import {patchFromNet} from "./patchSceneBuilder";
import {buildDerivativesScene} from "./TensorDerivativesScene";
import {collapsedEdgeNet, drawDifferentials, parallelCornerNet, tensorDifferentials} from "./tensorDerivatives";
import type {Xyz} from "./surface-view/surfaceScene";

const ALL = {showTangentPlane: true, showNormal: true, showTwist: true};
const dot = (a: Xyz, b: Xyz) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Xyz, b: Xyz): Xyz => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const sub = (a: Xyz, b: Xyz): Xyz => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const unit = (a: Xyz): Xyz => { const l = Math.hypot(...a); return [a[0] / l, a[1] / l, a[2] / l]; };
const xyzOf = (p: {X(): number; Y(): number; Z?(): number}): Xyz => [p.X(), p.Y(), p.Z?.() ?? 0];
/** The bicubic dome Preset: a non-zero twist away from its symmetry lines. */
const dome = () => {
    const entry = derivativesStartingPatches[1].data()[0][1];
    if (!("m" in entry)) throw new Error("tensor expected");
    return tensorPatchFromDto(entry);
};
const expectClose = (a: readonly number[], b: readonly number[]) => a.forEach((x, k) => expect(x).toBeCloseTo(b[k], 9));

describe("derivative arrows", () => {
    const patch = dome();
    const [u, v] = [0.3, 0.65];
    const scene = buildDerivativesScene(patch, u, v, ALL);
    const line = (id: string) => scene.polylines.find(item => item.id === id)!;

    it("draws each arrow as its shaft and two head segments, equal to drawDifferentials", () => {
        const {arrows} = drawDifferentials(tensorDifferentials(patch, u, v), patch);
        expect(arrows.map(arrow => arrow.name)).toEqual(["su", "sv", "twist", "normal"]);
        for (const arrow of arrows) {
            const id = `deriv-${arrow.name}`;
            expect(line(`${id}-shaft`).points).toEqual(arrow.shaft);
            expect(line(`${id}-head-0`).points).toEqual(arrow.head[0]);
            expect(line(`${id}-head-1`).points).toEqual(arrow.head[1]);
        }
        expect(scene.polylines).toHaveLength(12);
    });

    it("points the shafts along the patch's own partial derivatives, twist and normal, from S(u, v)", () => {
        const point = xyzOf(patch.eval(u, v));
        const su = xyzOf(patch.partialU(u, v)), sv = xyzOf(patch.partialV(u, v)), twist = xyzOf(patch.twist(u, v));
        const expected: Record<string, Xyz> = {su, sv, twist, normal: cross(su, sv)};
        for (const [name, direction] of Object.entries(expected)) {
            const [from, tip] = line(`deriv-${name}-shaft`).points;
            expectClose(from, point);
            expectClose(unit(sub(tip, from)), unit(direction));
        }
    });

    it("gives the arrows their roles and labels at the tips", () => {
        const roles = (name: string) => [`${name}-shaft`, `${name}-head-0`, `${name}-head-1`].map(id => line(`deriv-${id}`).role);
        expect(roles("su")).toEqual(["vector-u", "vector-u", "vector-u"]);
        expect(roles("sv")).toEqual(["vector-v", "vector-v", "vector-v"]);
        expect(roles("twist")).toEqual(["twist", "twist", "twist"]);
        expect(roles("normal")).toEqual(["normal", "normal", "normal"]);
        expect(scene.labels.map(label => [label.id, label.text])).toEqual([
            ["deriv-su-label", "S_u"], ["deriv-sv-label", "S_v"], ["deriv-twist-label", "S_{uv}"], ["deriv-normal-label", "\\mathbf{n}"],
        ]);
        for (const label of scene.labels) expect(label.anchor).toEqual(line(label.id.replace("-label", "-shaft")).points[1]);
    });

    it("draws S_u, S_v and S_uv at one scale and the normal at the display length", () => {
        const drawing = drawDifferentials(tensorDifferentials(patch, u, v), patch);
        const length = (name: string) => { const [a, b] = line(`deriv-${name}-shaft`).points; return Math.hypot(...sub(b, a)); };
        const d = tensorDifferentials(patch, u, v);
        expect(length("su") / Math.hypot(...d.su)).toBeCloseTo(drawing.vectorScale, 9);
        expect(length("sv") / Math.hypot(...d.sv)).toBeCloseTo(drawing.vectorScale, 9);
        expect(length("twist") / Math.hypot(...d.twist)).toBeCloseTo(drawing.vectorScale, 9);
        expect(length("normal")).toBeCloseTo(drawing.displayLength, 9);
    });
});

describe("tangent plane", () => {
    it("is one quad whose corners lie in the plane through S(u, v) with the normal", () => {
        const patch = dome();
        const scene = buildDerivativesScene(patch, 0.3, 0.65, ALL);
        expect(scene.planes).toHaveLength(1);
        const point = xyzOf(patch.eval(0.3, 0.65));
        const normal = unit(cross(xyzOf(patch.partialU(0.3, 0.65)), xyzOf(patch.partialV(0.3, 0.65))));
        for (const corner of scene.planes[0].corners) expect(dot(sub(corner, point), normal)).toBeCloseTo(0, 9);
    });
    it("is spanned by S_u and S_v and centred at S(u, v)", () => {
        const patch = dome();
        const [c0, c1, c2, c3] = buildDerivativesScene(patch, 0.3, 0.65, ALL).planes[0].corners;
        const su = xyzOf(patch.partialU(0.3, 0.65));
        const sv = xyzOf(patch.partialV(0.3, 0.65));
        const along = sub(c1, c0);
        const across = sub(c3, c0);
        expect(Math.hypot(...along)).toBeGreaterThan(0);
        expect(Math.hypot(...across)).toBeGreaterThan(0);
        expectClose(cross(along, su), [0, 0, 0]);
        expect(dot(along, su)).toBeGreaterThan(0);
        expectClose(cross(across, sv), [0, 0, 0]);
        expect(dot(across, sv)).toBeGreaterThan(0);
        expectClose([0, 1, 2].map(k => (c0[k] + c1[k] + c2[k] + c3[k]) / 4), xyzOf(patch.eval(0.3, 0.65)));
    });
    it("draws no arrow for a tangent the classifier reports as zero, even if it is not exactly zero", () => {
        const net = collapsedEdgeNet();
        net[0] = net[0].map(([x, y, z], j): Xyz => [x + j * 1e-13, y, z]);
        const patch = patchFromNet(net);
        const scene = buildDerivativesScene(patch, 0, 0.5, ALL);
        expect(scene.differentials.normal).toEqual({kind: "degenerate", reason: "zero-sv"});
        expect(xyzOf(patch.partialV(0, 0.5))).not.toEqual([0, 0, 0]);
        expect(scene.polylines.some(line => line.id.startsWith("deriv-sv"))).toBe(false);
        expect(scene.labels.some(label => label.id === "deriv-sv-label")).toBe(false);
        expect(scene.polylines.some(line => line.id === "deriv-su-shaft")).toBe(true);
    });
    it("is omitted where the normal is undefined, and so is the normal arrow", () => {
        const parallel = buildDerivativesScene(patchFromNet(parallelCornerNet()), 0, 0, ALL);
        expect(parallel.differentials.normal).toEqual({kind: "degenerate", reason: "parallel"});
        expect(parallel.planes).toEqual([]);
        expect(parallel.polylines.some(item => item.role === "normal")).toBe(false);
        expect(parallel.labels.some(label => label.id === "deriv-normal-label")).toBe(false);
        const collapsed = buildDerivativesScene(patchFromNet(collapsedEdgeNet()), 0, 0.5, ALL);
        expect(collapsed.differentials.normal).toMatchObject({kind: "degenerate", reason: "zero-sv"});
        expect(collapsed.planes).toEqual([]);
        // S_v = 0 draws no S_v arrow and no label either.
        expect(collapsed.polylines.some(item => item.role === "vector-v")).toBe(false);
        expect(collapsed.labels.some(label => label.id === "deriv-sv-label")).toBe(false);
        expect(collapsed.polylines.some(item => item.role === "vector-u")).toBe(true);
    });
    it("is defined again next to the collapsed edge (the limit normal exists)", () => {
        const next = buildDerivativesScene(patchFromNet(collapsedEdgeNet()), 0.05, 0.5, ALL);
        expect(next.differentials.normal.kind).toBe("defined");
        expect(next.planes).toHaveLength(1);
    });
});

describe("switches", () => {
    const patch = dome();
    it.each([
        ["showTangentPlane", (s: ReturnType<typeof buildDerivativesScene>) => s.planes.length === 0],
        ["showNormal", (s: ReturnType<typeof buildDerivativesScene>) => !s.polylines.some(item => item.role === "normal") && !s.labels.some(l => l.id === "deriv-normal-label")],
        ["showTwist", (s: ReturnType<typeof buildDerivativesScene>) => !s.polylines.some(item => item.role === "twist") && !s.labels.some(l => l.id === "deriv-twist-label")],
    ] as const)("%s off removes only its own objects", (key, removed) => {
        const scene = buildDerivativesScene(patch, 0.3, 0.65, {...ALL, [key]: false});
        expect(removed(scene)).toBe(true);
        const full = buildDerivativesScene(patch, 0.3, 0.65, ALL);
        expect(scene.polylines.length + scene.planes.length + scene.labels.length).toBeLessThan(full.polylines.length + full.planes.length + full.labels.length);
        expect(scene.polylines.some(item => item.role === "vector-u")).toBe(true);
        expect(scene.polylines.some(item => item.role === "vector-v")).toBe(true);
    });
});
