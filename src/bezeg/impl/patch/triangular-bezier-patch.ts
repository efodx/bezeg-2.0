import {BezierCurve} from "../../api/curve/bezier-curve";
import {BezierPatch, PatchMesh} from "../../api/patch/bezier-patch";
import {Point} from "../../api/point/point";
import {PolynomialBezierCurve} from "../curve/polynomial-bezier-curve";
import {PointImpl} from "../point/point-impl";
import {maxVersion, nextVersion, VOLATILE} from "../versioning";

export type Barycentric = readonly [number, number, number];

const MAX_CACHED_EVALUATIONS = 128;
const MAX_CACHED_MESHES = 4;
const MAX_MESH_INTERVALS = 256;

/** Polynomial triangular Bézier patch. The flat net uses canonical descending i, then j order. */
export class TriangularBezierPatch implements BezierPatch {
    private net: Point[];
    private structuralVersion = nextVersion();
    private lastVersion?: number;
    private pointCache = new Map<string, PointImpl>();
    private meshCache = new Map<number, PatchMesh>();
    private boundsCache?: [number, number, number, number, number, number];

    constructor(net: ReadonlyArray<Point>) {
        this.net = TriangularBezierPatch.copyAndValidate(net);
    }

    get degree(): number { return (Math.sqrt(8 * this.net.length + 1) - 3) / 2; }
    getControlNet(): Point[] { return [...this.net]; }

    setControlNet(net: ReadonlyArray<Point>): void {
        this.net = TriangularBezierPatch.copyAndValidate(net);
        this.structuralVersion = nextVersion();
        this.clearCaches();
    }

    version(): number { return maxVersion(this.net, this.structuralVersion); }

    private static copyAndValidate(net: ReadonlyArray<Point>): Point[] {
        const degree = (Math.sqrt(8 * net.length + 1) - 3) / 2;
        if (!Number.isInteger(degree) || degree < 1 || degree > 4) {
            throw new RangeError("A triangular patch needs a complete control net with degree from 1 to 4.");
        }
        const copy = [...net];
        for (const point of copy) TriangularBezierPatch.pointRow(point);
        return copy;
    }

    private static pointRow(point: Point): number[] {
        if (!point || typeof point.X !== "function" || typeof point.Y !== "function") {
            throw new TypeError("Every control point must provide X() and Y().");
        }
        const row = [point.X(), point.Y(), point.Z?.() ?? 0];
        if (!row.every(Number.isFinite)) throw new RangeError("Patch control coordinates must be finite.");
        return row;
    }

    private coordinateNet(): number[][] { return this.net.map(point => TriangularBezierPatch.pointRow(point)); }

    private ensureVersion(): boolean {
        const version = this.version();
        if (version === VOLATILE) return false;
        if (version !== this.lastVersion) {
            this.clearCaches();
            this.lastVersion = version;
        }
        return true;
    }

    private clearCaches(): void {
        this.pointCache.clear();
        this.meshCache.clear();
        this.boundsCache = undefined;
    }

    private static barycentric(u: number, v: number): Barycentric {
        if (!Number.isFinite(u) || !Number.isFinite(v)) throw new RangeError("Barycentric parameters must be finite.");
        const sum = u + v;
        const tolerance = 8 * Number.EPSILON;
        if (u < 0 || v < 0 || sum > 1 + tolerance) {
            throw new RangeError("Barycentric parameters must lie inside the reference triangle (u + v ≤ 1).");
        }
        if (sum > 1) return [u / sum, v / sum, 0];
        return [u, v, 1 - sum];
    }

    private static index(degree: number, i: number, j: number, _k: number): number {
        const rowLength = degree - i;
        return rowLength * (rowLength + 1) / 2 + (degree - i - j);
    }

    /** Full triangular de Casteljau scheme: canonical flat control rows at every reduced degree. */
    decasteljauScheme(u: number, v: number): number[][][] {
        const bary = TriangularBezierPatch.barycentric(u, v);
        let level = this.coordinateNet();
        const levels: number[][][] = [level.map(row => [...row])];
        let degree = this.degree;
        while (degree > 0) {
            const next: number[][] = [];
            for (const [i, j, k] of TriangularBezierPatch.indices(degree - 1)) {
                const pi = level[TriangularBezierPatch.index(degree, i + 1, j, k)];
                const pj = level[TriangularBezierPatch.index(degree, i, j + 1, k)];
                const pk = level[TriangularBezierPatch.index(degree, i, j, k + 1)];
                next.push(pi.map((coordinate, d) => bary[0] * coordinate + bary[1] * pj[d] + bary[2] * pk[d]));
            }
            level = next;
            levels.push(level.map(row => [...row]));
            degree--;
        }
        return levels;
    }

    eval(u: number, v: number): PointImpl {
        TriangularBezierPatch.barycentric(u, v);
        const cacheable = this.ensureVersion();
        const key = `${u},${v}`;
        if (cacheable) {
            const cached = this.pointCache.get(key);
            if (cached) {
                TriangularBezierPatch.touch(this.pointCache, key, cached);
                return TriangularBezierPatch.asPoint(TriangularBezierPatch.pointRow(cached));
            }
        }
        const levels = this.decasteljauScheme(u, v);
        const result = TriangularBezierPatch.asPoint(levels[levels.length - 1][0]);
        if (cacheable) TriangularBezierPatch.remember(this.pointCache, key, result, MAX_CACHED_EVALUATIONS);
        return TriangularBezierPatch.asPoint(TriangularBezierPatch.pointRow(result));
    }

    partialU(u: number, v: number): PointImpl { return this.derivative(0, u, v); }
    partialV(u: number, v: number): PointImpl { return this.derivative(1, u, v); }

    private derivative(axis: 0 | 1, u: number, v: number): PointImpl {
        const bary = TriangularBezierPatch.barycentric(u, v);
        const degree = this.degree;
        const controls = this.coordinateNet();
        const differences = TriangularBezierPatch.indices(degree - 1).map(([i, j, k]) => {
            const plus = controls[TriangularBezierPatch.index(degree, i + (axis === 0 ? 1 : 0), j + (axis === 1 ? 1 : 0), k)];
            const minus = controls[TriangularBezierPatch.index(degree, i, j, k + 1)];
            return plus.map((coordinate, d) => degree * (coordinate - minus[d]));
        });
        return TriangularBezierPatch.asPoint(TriangularBezierPatch.evaluateRows(differences, degree - 1, bary));
    }

    normal(u: number, v: number): PointImpl {
        const a = this.partialU(u, v), b = this.partialV(u, v);
        const x = a.Y() * b.Z() - a.Z() * b.Y();
        const y = a.Z() * b.X() - a.X() * b.Z();
        const z = a.X() * b.Y() - a.Y() * b.X();
        const length = Math.hypot(x, y, z);
        if (!(length > 0) || !Number.isFinite(length)) throw new RangeError("The patch normal is undefined where its tangent vectors are degenerate.");
        return TriangularBezierPatch.asPoint([x / length, y / length, z / length]);
    }

    boundaryCurves(): [BezierCurve, BezierCurve, BezierCurve] {
        const n = this.degree;
        const edgeAB = Array.from({length: n + 1}, (_, a) => this.net[TriangularBezierPatch.index(n, n - a, a, 0)]);
        const edgeBC = Array.from({length: n + 1}, (_, b) => this.net[TriangularBezierPatch.index(n, 0, n - b, b)]);
        const edgeCA = Array.from({length: n + 1}, (_, c) => this.net[TriangularBezierPatch.index(n, c, 0, n - c)]);
        return [new PolynomialBezierCurve(edgeAB), new PolynomialBezierCurve(edgeBC), new PolynomialBezierCurve(edgeCA)];
    }

    elevate(): TriangularBezierPatch {
        if (this.degree === 4) throw new RangeError("Triangular patch degree cannot exceed 4.");
        const n = this.degree;
        const source = this.coordinateNet();
        const elevated = TriangularBezierPatch.indices(n + 1).map(([i, j, k]) => {
            const terms: number[][] = [];
            if (i) terms.push(source[TriangularBezierPatch.index(n, i - 1, j, k)].map(x => x * i));
            if (j) terms.push(source[TriangularBezierPatch.index(n, i, j - 1, k)].map(x => x * j));
            if (k) terms.push(source[TriangularBezierPatch.index(n, i, j, k - 1)].map(x => x * k));
            return terms[0].map((_, d) => terms.reduce((sum, term) => sum + term[d], 0) / (n + 1));
        });
        return new TriangularBezierPatch(elevated.map(row => TriangularBezierPatch.asPoint(row)));
    }

    /** Split into (A,B,P), (B,C,P), (C,A,P); P must be strictly inside the simplex. */
    subdivide(u: number, v: number): [TriangularBezierPatch, TriangularBezierPatch, TriangularBezierPatch] {
        const p = TriangularBezierPatch.barycentric(u, v);
        if (p.some(value => value <= 0)) throw new RangeError("Triangular subdivision requires a strictly interior point; edge and vertex splits are not supported.");
        const scheme = this.decasteljauScheme(u, v);
        const children = TriangularBezierPatch.indices(this.degree).map(([i, j, k]) => [
            scheme[k][TriangularBezierPatch.index(this.degree - k, i, j, 0)],
            scheme[k][TriangularBezierPatch.index(this.degree - k, 0, i, j)],
            scheme[k][TriangularBezierPatch.index(this.degree - k, j, 0, i)],
        ]);
        return [0, 1, 2].map(piece => new TriangularBezierPatch(
            children.map(rows => TriangularBezierPatch.asPoint(rows[piece]))
        )) as [TriangularBezierPatch, TriangularBezierPatch, TriangularBezierPatch];
    }

    sampleMesh(intervals: number, secondIntervals = intervals): PatchMesh {
        TriangularBezierPatch.checkIntervals(intervals);
        if (secondIntervals !== intervals) throw new RangeError("A triangular mesh uses one uniform interval count.");
        const cacheable = this.ensureVersion();
        if (cacheable) {
            const cached = this.meshCache.get(intervals);
            if (cached) {
                TriangularBezierPatch.touch(this.meshCache, intervals, cached);
                return TriangularBezierPatch.copyMesh(cached);
            }
        }
        const parameters: Array<readonly [number, number]> = [];
        const lookup = new Map<string, number>();
        for (let i = 0; i <= intervals; i++) for (let j = 0; j <= intervals - i; j++) {
            lookup.set(`${i},${j}`, parameters.length);
            parameters.push([i / intervals, j / intervals]);
        }
        const vertices = parameters.map(([u, v]) => this.eval(u, v));
        const faces: Array<readonly [number, number, number]> = [];
        for (let i = 0; i < intervals; i++) for (let j = 0; j < intervals - i; j++) {
            const a = lookup.get(`${i},${j}`)!;
            const b = lookup.get(`${i + 1},${j}`)!;
            const c = lookup.get(`${i},${j + 1}`)!;
            faces.push([a, b, c]);
            if (i + j <= intervals - 2) {
                const d = lookup.get(`${i + 1},${j + 1}`)!;
                faces.push([b, d, c]);
            }
        }
        const mesh = {vertices, parameters, faces};
        if (cacheable) TriangularBezierPatch.remember(this.meshCache, intervals, mesh, MAX_CACHED_MESHES);
        return TriangularBezierPatch.copyMesh(mesh);
    }

    boundingBox(): [number, number, number, number, number, number] {
        const cacheable = this.ensureVersion();
        if (cacheable && this.boundsCache) return [...this.boundsCache];
        const points = this.coordinateNet();
        const bounds: [number, number, number, number, number, number] = [
            Math.min(...points.map(p => p[0])), Math.max(...points.map(p => p[0])),
            Math.min(...points.map(p => p[1])), Math.max(...points.map(p => p[1])),
            Math.min(...points.map(p => p[2])), Math.max(...points.map(p => p[2])),
        ];
        if (cacheable) this.boundsCache = bounds;
        return [...bounds];
    }

    private static indices(degree: number): Array<[number, number, number]> {
        const result: Array<[number, number, number]> = [];
        for (let i = degree; i >= 0; i--) for (let j = degree - i; j >= 0; j--) result.push([i, j, degree - i - j]);
        return result;
    }

    private static evaluateRows(rows: number[][], degree: number, bary: Barycentric): number[] {
        let current = rows.map(row => [...row]);
        let n = degree;
        while (n > 0) {
            current = TriangularBezierPatch.indices(n - 1).map(([i, j, k]) => {
                const a = current[TriangularBezierPatch.index(n, i + 1, j, k)];
                const b = current[TriangularBezierPatch.index(n, i, j + 1, k)];
                const c = current[TriangularBezierPatch.index(n, i, j, k + 1)];
                return a.map((x, d) => bary[0] * x + bary[1] * b[d] + bary[2] * c[d]);
            });
            n--;
        }
        return current[0];
    }

    private static checkIntervals(value: number): void {
        if (!Number.isInteger(value) || value < 1) throw new RangeError("intervals must be a positive integer.");
        if (value > MAX_MESH_INTERVALS) throw new RangeError(`intervals cannot exceed ${MAX_MESH_INTERVALS}.`);
    }

    private static touch<K, V>(cache: Map<K, V>, key: K, value: V): void { cache.delete(key); cache.set(key, value); }

    private static remember<K, V>(cache: Map<K, V>, key: K, value: V, limit: number): void {
        TriangularBezierPatch.touch(cache, key, value);
        if (cache.size > limit) {
            const oldest = cache.keys().next().value;
            if (oldest !== undefined) cache.delete(oldest);
        }
    }

    private static copyMesh(mesh: PatchMesh): PatchMesh {
        return {
            vertices: mesh.vertices.map(point => TriangularBezierPatch.asPoint(TriangularBezierPatch.pointRow(point))),
            parameters: mesh.parameters.map(([u, v]) => [u, v] as const),
            faces: mesh.faces.map(([a, b, c]) => [a, b, c] as const),
        };
    }

    private static asPoint(row: readonly number[]): PointImpl { return new PointImpl(row[0], row[1], undefined, row[2] ?? 0); }
}
