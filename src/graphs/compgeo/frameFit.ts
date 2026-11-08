import type {RationalBox} from "../../compgeo/voronoi";
import {fitBoundingBox} from "../base/fitBoundingBox";

/** A board box as [left, top, right, bottom]. */
export type FrameBox = [number, number, number, number];

/** An exact box in grid units as a board box (grid step `2^gridStepExponent`). */
export function boardFrameOf(box: RationalBox, gridStepExponent: number): FrameBox {
    const scale = 2 ** gridStepExponent;
    return [box.minX.toNumber() * scale, box.maxY.toNumber() * scale, box.maxX.toNumber() * scale, box.minY.toNumber() * scale];
}

/**
 * The view the host Fit applies for a graph whose drawing has a frame (the diagram's frame, the sweep run's box): the frame at
 * equal axis units, widened to the canvas aspect. A canvas without size keeps the frame as it is.
 */
export function fitFrame(frame: FrameBox, width: number, height: number): FrameBox {
    return fitBoundingBox([[frame[0], frame[1]], [frame[2], frame[3]]], width, height) ?? [...frame];
}
