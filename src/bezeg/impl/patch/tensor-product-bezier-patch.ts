import {BezierCurve} from "../../api/curve/bezier-curve";
import {BezierPatch, PatchMesh} from "../../api/patch/bezier-patch";
import {Point} from "../../api/point/point";
import {deCasteljauInPlace, elevate, subdivide} from "../kernels/bezier-kernels";
import {PointImpl} from "../point/point-impl";
import {nextVersion, VOLATILE, maxVersion} from "../versioning";
import {PolynomialBezierCurve} from "../curve/polynomial-bezier-curve";

export type PatchDirection = "u" | "v";

export interface TensorDeCasteljauScheme {
    /** One de Casteljau scheme per u-row, evaluating each row along v. */
    rowsAlongV: number[][][][];
    /** Scheme of the row results, evaluated along u. */
    rowResultsAlongU: number[][][];
    result: number[];
}

export interface TensorBilinearScheme {
    /** Initial control net followed by each simultaneous bilinear reduction net. */
    reducedNets: number[][][][];
    /** Remaining univariate de Casteljau levels after `min(m,n)` bilinear reductions. */
    remainderScheme: number[][][];
    result: number[];
}

// Point evaluations are cheap, but exact input pairs can arrive continuously during dragging.
const MAX_CACHED_EVALUATIONS = 128;
// Keep only a few densities: each cached mesh retains vertices, parameters, and faces.
const MAX_CACHED_MESHES = 4;
// 256 intervals per edge supports dense views while limiting one mesh to 66,049 vertices.
const MAX_MESH_INTERVALS = 256;

/**
 * Polynomial tensor-product patch with `net[i][j]`, where i is the u index and j is
 * the v index. Evaluation first traverses each row in v, then traverses those results in u.
 */
export class TensorProductBezierPatch implements BezierPatch {
    private net: Point[][];
    private structuralVersion = nextVersion();
    private lastVersion?: number;
    private pointCache = new Map<string, PointImpl>();
    private meshCache = new Map<string, PatchMesh>();
    private boundsCache?: [number, number, number, number, number, number];

    constructor(net: ReadonlyArray<ReadonlyArray<Point>>) {
        this.net = TensorProductBezierPatch.copyAndValidate(net);
    }

    get m(): number { return this.net.length - 1; }
    get n(): number { return this.net[0].length - 1; }

    /** A defensive grid copy; point objects remain the editable control points. */
    getControlNet(): Point[][] { return this.net.map(row => [...row]); }

    setControlNet(net: ReadonlyArray<ReadonlyArray<Point>>): void {
        this.net = TensorProductBezierPatch.copyAndValidate(net);
        this.structuralVersion = nextVersion();
        this.clearCaches();
    }

    version(): number {
        return maxVersion(this.net.flat(), this.structuralVersion);
    }

    private static copyAndValidate(net: ReadonlyArray<ReadonlyArray<Point>>): Point[][] {
        if (net.length < 2 || net.length > 5 || net.some(row => row.length !== net[0].length) ||
            net[0].length < 2 || net[0].length > 5) {
            throw new RangeError("A tensor patch needs a rectangular control net with both degrees from 1 to 4.");
        }
        const copy = net.map(row => [...row]);
        for (const point of copy.flat()) {
            if (!point || typeof point.X !== "function" || typeof point.Y !== "function") {
                throw new TypeError("Every control point must provide X() and Y().");
            }
            TensorProductBezierPatch.pointRow(point);
        }
        return copy;
    }

    private static pointRow(point: Point): number[] {
        const row = [point.X(), point.Y(), point.Z?.() ?? 0];
        if (!row.every(Number.isFinite)) throw new RangeError("Patch control coordinates must be finite.");
        return row;
    }

    private coordinateNet(): number[][][] { return this.net.map(row => row.map(p => TensorProductBezierPatch.pointRow(p))); }

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

    private static checkParameter(value: number, name: string): void {
        if (!Number.isFinite(value)) throw new RangeError(`${name} must be finite.`);
    }

    /** Direct recurrence: simultaneous 2×2 reductions, then the remaining univariate scheme. */
    static evaluateBilinear(net: ReadonlyArray<ReadonlyArray<Point>>, u: number, v: number): PointImpl {
        return TensorProductBezierPatch.asPoint(TensorProductBezierPatch.bilinearDeCasteljauScheme(net, u, v).result);
    }

    /**
     * Repeatedly reduce every 2×2 cell at (u,v), shrinking both degrees once per level.
     * A nonsquare residue is finished by the matching univariate de Casteljau recurrence.
     */
    static bilinearDeCasteljauScheme(net: ReadonlyArray<ReadonlyArray<Point>>, u: number, v: number): TensorBilinearScheme {
        TensorProductBezierPatch.checkParameter(u, "u");
        TensorProductBezierPatch.checkParameter(v, "v");
        let current = TensorProductBezierPatch.copyAndValidate(net).map(row => row.map(point => TensorProductBezierPatch.pointRow(point)));
        const reducedNets: number[][][][] = [current.map(row => row.map(point => [...point]))];
        const blend = (a: number[], b: number[], t: number) => a.map((x, d) => (1 - t) * x + t * b[d]);
        while (current.length > 1 && current[0].length > 1) {
            const next = Array.from({length: current.length - 1}, (_, i) =>
                Array.from({length: current[0].length - 1}, (_, j) => {
                    const alongU0 = blend(current[i][j], current[i + 1][j], u);
                    const alongU1 = blend(current[i][j + 1], current[i + 1][j + 1], u);
                    return blend(alongU0, alongU1, v);
                }));
            current = next;
            reducedNets.push(current.map(row => row.map(point => [...point])));
        }
        const remainder = current.length > 1 ? current.map(row => [...row[0]]) : current[0].map(point => [...point]);
        const remainderParameter = current.length > 1 ? u : v;
        const remainderScheme: number[][][] = [];
        deCasteljauInPlace(remainderParameter, remainder, undefined, remainderScheme);
        return {reducedNets, remainderScheme, result: [...remainderScheme[remainderScheme.length - 1][0]]};
    }

    eval(u: number, v: number): PointImpl {
        TensorProductBezierPatch.checkParameter(u, "u");
        TensorProductBezierPatch.checkParameter(v, "v");
        const cacheable = this.ensureVersion();
        const key = `${u},${v}`;
        if (cacheable) {
            const cached = this.pointCache.get(key);
            if (cached) {
                TensorProductBezierPatch.touch(this.pointCache, key, cached);
                return TensorProductBezierPatch.asPoint(TensorProductBezierPatch.pointRow(cached));
            }
        }
        const rows = this.coordinateNet().map(row => row.map(point => [...point]));
        const rowResults = rows.map(row => { deCasteljauInPlace(v, row); return row[0]; });
        deCasteljauInPlace(u, rowResults);
        const result = TensorProductBezierPatch.asPoint(rowResults[0]);
        if (cacheable) TensorProductBezierPatch.remember(this.pointCache, key, result, MAX_CACHED_EVALUATIONS);
        return TensorProductBezierPatch.asPoint(TensorProductBezierPatch.pointRow(result));
    }

    /** Explicit two-stage construction, preserving every row's intermediate levels. */
    decasteljauScheme(u: number, v: number): TensorDeCasteljauScheme {
        TensorProductBezierPatch.checkParameter(u, "u");
        TensorProductBezierPatch.checkParameter(v, "v");
        const rowsAlongV = this.coordinateNet().map(row => {
            const scheme: number[][][] = [];
            deCasteljauInPlace(v, row, undefined, scheme);
            return scheme;
        });
        const rowResults = rowsAlongV.map(scheme => [...scheme[scheme.length - 1][0]]);
        const rowResultsAlongU: number[][][] = [];
        deCasteljauInPlace(u, rowResults, undefined, rowResultsAlongU);
        return {rowsAlongV, rowResultsAlongU, result: [...rowResults[0]]};
    }

    /** Evaluate using columns first, an equivalent recurrence useful for numerical cross-checks. */
    evalByColumns(u: number, v: number): PointImpl {
        TensorProductBezierPatch.checkParameter(u, "u");
        TensorProductBezierPatch.checkParameter(v, "v");
        const net = this.coordinateNet();
        const columns = net[0].map((_, j) => net.map(row => [...row[j]]));
        const columnResults = columns.map(column => { deCasteljauInPlace(u, column); return column[0]; });
        deCasteljauInPlace(v, columnResults);
        return TensorProductBezierPatch.asPoint(columnResults[0]);
    }

    /** Fix u and return a live curve parameterized by v. */
    isoCurveU(u: number): BezierCurve {
        TensorProductBezierPatch.checkParameter(u, "u");
        const net = this.net;
        const dependencies = net.flat();
        const points = net[0].map((_, j) => PointImpl.derived(() => {
            const rows = net.map(row => TensorProductBezierPatch.pointRow(row[j]));
            deCasteljauInPlace(u, rows);
            return rows[0] as [number, number, number];
        }, dependencies));
        return new PolynomialBezierCurve(points);
    }

    /** Fix v and return a live curve parameterized by u. */
    isoCurveV(v: number): BezierCurve {
        TensorProductBezierPatch.checkParameter(v, "v");
        const net = this.net;
        const dependencies = net.flat();
        const points = net.map(row => PointImpl.derived(() => {
            const values = row.map(point => TensorProductBezierPatch.pointRow(point));
            deCasteljauInPlace(v, values);
            return values[0] as [number, number, number];
        }, dependencies));
        return new PolynomialBezierCurve(points);
    }

    boundaryCurves(): [BezierCurve, BezierCurve, BezierCurve, BezierCurve] {
        return [
            new PolynomialBezierCurve([...this.net[0]]),
            new PolynomialBezierCurve([...this.net[this.m]]),
            new PolynomialBezierCurve(this.net.map(row => row[0])),
            new PolynomialBezierCurve(this.net.map(row => row[this.n])),
        ];
    }

    partialU(u: number, v: number): PointImpl { return this.derivative(1, 0, u, v); }
    partialV(u: number, v: number): PointImpl { return this.derivative(0, 1, u, v); }
    partialUU(u: number, v: number): PointImpl { return this.derivative(2, 0, u, v); }
    partialUV(u: number, v: number): PointImpl { return this.derivative(1, 1, u, v); }
    partialVV(u: number, v: number): PointImpl { return this.derivative(0, 2, u, v); }
    twist(u: number, v: number): PointImpl { return this.partialUV(u, v); }

    private derivative(orderU: number, orderV: number, u: number, v: number): PointImpl {
        TensorProductBezierPatch.checkParameter(u, "u");
        TensorProductBezierPatch.checkParameter(v, "v");
        let rows = this.coordinateNet();
        for (let k = 0; k < orderU; k++) {
            if (rows.length < 2) return TensorProductBezierPatch.asPoint([0, 0, 0]);
            const degree = rows.length - 1;
            rows = rows.slice(0, -1).map((row, i) => row.map((p, j) =>
                p.map((coordinate, d) => degree * (rows[i + 1][j][d] - coordinate))));
        }
        for (let k = 0; k < orderV; k++) {
            if (rows[0].length < 2) return TensorProductBezierPatch.asPoint([0, 0, 0]);
            const degree = rows[0].length - 1;
            rows = rows.map(row => row.slice(0, -1).map((p, j) =>
                p.map((coordinate, d) => degree * (row[j + 1][d] - coordinate))));
        }
        const rowResults = rows.map(row => { deCasteljauInPlace(v, row); return row[0]; });
        deCasteljauInPlace(u, rowResults);
        return TensorProductBezierPatch.asPoint(rowResults[0]);
    }

    normal(u: number, v: number): PointImpl {
        const a = this.partialU(u, v), b = this.partialV(u, v);
        const ax = a.Y() * b.Z() - a.Z() * b.Y();
        const ay = a.Z() * b.X() - a.X() * b.Z();
        const az = a.X() * b.Y() - a.Y() * b.X();
        const length = Math.hypot(ax, ay, az);
        if (!(length > 0) || !Number.isFinite(length)) throw new RangeError("The patch normal is undefined where its tangent vectors are degenerate.");
        return TensorProductBezierPatch.asPoint([ax / length, ay / length, az / length]);
    }

    subdivide(direction: PatchDirection, value: number): [TensorProductBezierPatch, TensorProductBezierPatch] {
        TensorProductBezierPatch.checkParameter(value, "subdivision value");
        if (direction === "u") {
            const perColumn = Array.from({length: this.n + 1}, (_, j) => subdivide(value, this.net.map(row => TensorProductBezierPatch.pointRow(row[j]))));
            return [0, 1].map(side => new TensorProductBezierPatch(Array.from({length: this.m + 1}, (_, i) =>
                Array.from({length: this.n + 1}, (_, j) => TensorProductBezierPatch.asPoint(perColumn[j][side][i]))))) as [TensorProductBezierPatch, TensorProductBezierPatch];
        }
        if (direction === "v") {
            const perRow = this.net.map(row => subdivide(value, row.map(point => TensorProductBezierPatch.pointRow(point))));
            return [0, 1].map(side => new TensorProductBezierPatch(this.net.map((_, i) =>
                Array.from({length: this.n + 1}, (_, j) => TensorProductBezierPatch.asPoint(perRow[i][side][j]))))) as [TensorProductBezierPatch, TensorProductBezierPatch];
        }
        throw new RangeError("Subdivision direction must be 'u' or 'v'.");
    }

    elevate(direction: PatchDirection): TensorProductBezierPatch {
        if (direction === "u") {
            if (this.m === 4) throw new RangeError("Tensor patch degree cannot exceed 4.");
            const columns = Array.from({length: this.n + 1}, (_, j) => elevate(this.net.map(row => TensorProductBezierPatch.pointRow(row[j]))));
            return new TensorProductBezierPatch(Array.from({length: this.m + 2}, (_, i) =>
                Array.from({length: this.n + 1}, (_, j) => TensorProductBezierPatch.asPoint(columns[j][i]))));
        }
        if (direction === "v") {
            if (this.n === 4) throw new RangeError("Tensor patch degree cannot exceed 4.");
            return new TensorProductBezierPatch(this.net.map(row => elevate(row.map(point => TensorProductBezierPatch.pointRow(point)))
                .map(point => TensorProductBezierPatch.asPoint(point))));
        }
        throw new RangeError("Elevation direction must be 'u' or 'v'.");
    }

    sampleMesh(uIntervals: number, vIntervals = uIntervals): PatchMesh {
        TensorProductBezierPatch.checkIntervals(uIntervals, "uIntervals");
        TensorProductBezierPatch.checkIntervals(vIntervals, "vIntervals");
        const cacheable = this.ensureVersion();
        const key = `${uIntervals},${vIntervals}`;
        if (cacheable) {
            const cached = this.meshCache.get(key);
            if (cached) {
                TensorProductBezierPatch.touch(this.meshCache, key, cached);
                return TensorProductBezierPatch.copyMesh(cached);
            }
        }
        const vertices: PointImpl[] = [];
        const parameters: Array<readonly [number, number]> = [];
        for (let i = 0; i <= uIntervals; i++) for (let j = 0; j <= vIntervals; j++) {
            const u = i / uIntervals, v = j / vIntervals;
            parameters.push([u, v]);
            vertices.push(this.eval(u, v));
        }
        const faces: Array<readonly [number, number, number]> = [];
        const stride = vIntervals + 1;
        for (let i = 0; i < uIntervals; i++) for (let j = 0; j < vIntervals; j++) {
            const a = i * stride + j, b = a + stride, c = b + 1, d = a + 1;
            faces.push([a, b, d], [b, c, d]);
        }
        const mesh = {vertices, parameters, faces};
        if (cacheable) TensorProductBezierPatch.remember(this.meshCache, key, mesh, MAX_CACHED_MESHES);
        return TensorProductBezierPatch.copyMesh(mesh);
    }

    boundingBox(): [number, number, number, number, number, number] {
        const cacheable = this.ensureVersion();
        if (cacheable && this.boundsCache) return [...this.boundsCache];
        const points = this.coordinateNet().flat();
        const bounds: [number, number, number, number, number, number] = [
            Math.min(...points.map(p => p[0])), Math.max(...points.map(p => p[0])),
            Math.min(...points.map(p => p[1])), Math.max(...points.map(p => p[1])),
            Math.min(...points.map(p => p[2])), Math.max(...points.map(p => p[2])),
        ];
        if (cacheable) this.boundsCache = bounds;
        return [...bounds];
    }

    private static checkIntervals(value: number, name: string): void {
        if (!Number.isInteger(value) || value < 1) throw new RangeError(`${name} must be a positive integer.`);
        if (value > MAX_MESH_INTERVALS) throw new RangeError(`${name} cannot exceed ${MAX_MESH_INTERVALS}.`);
    }

    private static touch<K, V>(cache: Map<K, V>, key: K, value: V): void {
        cache.delete(key);
        cache.set(key, value);
    }

    private static remember<K, V>(cache: Map<K, V>, key: K, value: V, limit: number): void {
        TensorProductBezierPatch.touch(cache, key, value);
        if (cache.size > limit) {
            const oldest = cache.keys().next().value;
            if (oldest !== undefined) cache.delete(oldest);
        }
    }

    private static copyMesh(mesh: PatchMesh): PatchMesh {
        return {
            vertices: mesh.vertices.map(point => TensorProductBezierPatch.asPoint(TensorProductBezierPatch.pointRow(point))),
            parameters: mesh.parameters.map(([u, v]) => [u, v] as const),
            faces: mesh.faces.map(([a, b, c]) => [a, b, c] as const),
        };
    }

    private static asPoint(row: readonly number[]): PointImpl { return new PointImpl(row[0], row[1], undefined, row[2] ?? 0); }
}
