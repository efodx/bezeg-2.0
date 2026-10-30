import type {SceneMesh, SceneMeshOwner} from './surfaceScene';

export const RENDERED_OWNERS_ATTRIBUTE = 'data-rendered-surface-owners';

export interface RenderedOwner {
    id: string;
    kind: SceneMeshOwner['kind'];
    geometrySamples: number[][];
}

/**
 * Read-only evidence for the catalog preview validator, in the format the Three view publishes: per mesh owner, the
 * first vertex of the first, middle and last drawable (non-degenerate) triangle, after Float32 rounding as if uploaded
 * to a GPU. Invalid owners (bad ranges, duplicate ids, no drawable triangle) are left out.
 */
export function renderedOwnerEvidence(mesh: SceneMesh, owners: readonly SceneMeshOwner[]): RenderedOwner[] {
    const count = mesh.positions.length / 3;
    const pos = (v: number, axis: number): number => Math.fround(mesh.positions[3 * v + axis]);
    const seen = new Set<string>();
    const out: RenderedOwner[] = [];
    for (const owner of owners) {
        const {faceStart, faceCount} = owner;
        if (!owner.id || seen.has(owner.id) || !Number.isInteger(faceStart) || !Number.isInteger(faceCount)
            || faceStart < 0 || faceStart % 3 !== 0 || faceCount < 3 || faceCount % 3 !== 0
            || faceStart + faceCount > mesh.faces.length) continue;
        seen.add(owner.id);
        const drawable: number[][] = [];
        for (let offset = faceStart; offset < faceStart + faceCount; offset += 3) {
            const vs = [mesh.faces[offset], mesh.faces[offset + 1], mesh.faces[offset + 2]];
            if (!vs.every(v => Number.isInteger(v) && v >= 0 && v < count) || new Set(vs).size !== 3) continue;
            const xyz = vs.map(v => [pos(v, 0), pos(v, 1), pos(v, 2)]);
            if (!xyz.flat().every(Number.isFinite)) continue;
            const [a, b, c] = xyz;
            const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
            const ac = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
            const cross = [ab[1] * ac[2] - ab[2] * ac[1], ab[2] * ac[0] - ab[0] * ac[2], ab[0] * ac[1] - ab[1] * ac[0]];
            if (Math.hypot(cross[0], cross[1], cross[2]) > 0) drawable.push(a);
        }
        if (drawable.length === 0) continue;
        const picks = [...new Set([0, Math.floor(drawable.length / 2), drawable.length - 1])];
        out.push({id: owner.id, kind: owner.kind, geometrySamples: picks.map(i => drawable[i])});
    }
    return out;
}
