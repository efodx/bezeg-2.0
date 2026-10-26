import {BezierCurve} from "../curve/bezier-curve";
import {Point} from "../point/point";

/** A sampled triangular mesh. Faces index `vertices`; parameter coordinates use (u,v). */
export interface PatchMesh {
    vertices: Point[];
    parameters: Array<readonly [number, number]>;
    faces: Array<readonly [number, number, number]>;
}

/** Exact geometry shared by rectangular and triangular polynomial Bezier patches. */
export interface BezierPatch {
    eval(u: number, v: number): Point;
    partialU(u: number, v: number): Point;
    partialV(u: number, v: number): Point;
    normal(u: number, v: number): Point;
    boundaryCurves(): ReadonlyArray<BezierCurve>;
    /**
     * Tensor patches use independent u/v interval counts (v defaults to u).
     * Triangular patches use a uniform barycentric lattice: v must be omitted or equal u.
     * Implementations reject unsupported densities before allocating a mesh.
     */
    sampleMesh(uIntervals: number, vIntervals?: number): PatchMesh;
    /** [minX,maxX,minY,maxY,minZ,maxZ] from the control net. */
    boundingBox(): [number, number, number, number, number, number];
}
