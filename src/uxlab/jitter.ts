/**
 * Safe random perturbations of a graph checkpoint for the match challenge (b4). The checkpoint is plain JSON; the same
 * quantity is often stored twice (scene state and Preset data), so leaves are grouped by the tail of their path and
 * every copy of a group gets the same new value.
 */
const DISCRETE_KEY = /(-n$|-k$|count|degree|order|index|step|level|depth|iteration|round|harmonic|selected|mode|kind|type|^id$|version|revision|generation|size$|digits|seed|exponent|zoom|scale|width|opacity|fontsize)/i;
const SKIPPED_SECTIONS = new Set(['boardState', 'displayState', 'transientState']);

type Path = (string | number)[];

interface Leaf { path: Path; value: number }

export interface JitterGroup {
    key: string;
    /** Values of the group's leaves in the target, by leaf-tail key. */
    target: Map<string, number>;
    kind: 'point' | 'unit' | 'scalar';
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function collect(value: unknown, path: Path, out: Leaf[]) {
    if (typeof value === 'number') { out.push({path, value}); return; }
    if (Array.isArray(value)) { value.forEach((item, index) => collect(item, [...path, index], out)); return; }
    if (isRecord(value)) for (const [key, child] of Object.entries(value)) collect(child, [...path, key], out);
}

/** The last segments of a path that name the quantity (independent of whether it sits in data or in scene state). */
function tail(path: Path): string {
    const named = path.filter(segment => segment !== 'model');
    // Points: ...points.<i>.<x|0> → group by the point; scalars: the key itself.
    const pointsAt = named.lastIndexOf('points');
    if (pointsAt >= 0 && pointsAt >= named.length - 3) return named.slice(pointsAt).join('.');
    return named.slice(-1).join('.');
}

function groupKey(path: Path): {group: string; kind: JitterGroup['kind']} {
    const key = tail(path);
    const last = path[path.length - 1];
    const parent = path[path.length - 2];
    if (/(^|\.)points\.\d+\.(x|y|0|1)$/.test(key) || ((last === 0 || last === 1 || last === 'x' || last === 'y') && typeof parent === 'number')) {
        return {group: key.replace(/\.(x|y|0|1)$/, ''), kind: 'point'};
    }
    return {group: key, kind: 'scalar'};
}

/** Decided by the nearest named key ("model" or "points" above a coordinate say nothing about it). */
function discrete(path: Path): boolean {
    const named = [...path].reverse().find((segment): segment is string => typeof segment === 'string');
    return named !== undefined && named !== 'x' && named !== 'y' && DISCRETE_KEY.test(named);
}

function hasGrid(value: unknown): boolean {
    if (Array.isArray(value)) return value.some(hasGrid);
    if (!isRecord(value)) return false;
    return typeof value.gridStepExponent === 'number' || Object.values(value).some(hasGrid);
}

function gridExponent(value: unknown): number | undefined {
    if (Array.isArray(value)) { for (const item of value) { const found = gridExponent(item); if (found !== undefined) return found; } return undefined; }
    if (!isRecord(value)) return undefined;
    if (typeof value.gridStepExponent === 'number') return value.gridStepExponent;
    for (const child of Object.values(value)) { const found = gridExponent(child); if (found !== undefined) return found; }
    return undefined;
}

export interface Candidates {
    groups: Map<string, {kind: JitterGroup['kind']; leaves: Leaf[]}>;
    grid?: number;
}

export function jitterCandidates(checkpointValue: unknown): Candidates {
    const leaves: Leaf[] = [];
    if (isRecord(checkpointValue)) {
        for (const [section, value] of Object.entries(checkpointValue)) {
            if (SKIPPED_SECTIONS.has(section)) continue;
            collect(value, [section], leaves);
        }
    }
    const groups = new Map<string, {kind: JitterGroup['kind']; leaves: Leaf[]}>();
    for (const leaf of leaves) {
        if (discrete(leaf.path) || !Number.isFinite(leaf.value)) continue;
        const {group, kind} = groupKey(leaf.path);
        const entry = groups.get(group) ?? {kind, leaves: []};
        entry.leaves.push(leaf);
        groups.set(group, entry);
    }
    return {groups, grid: hasGrid(checkpointValue) ? gridExponent(checkpointValue) : undefined};
}

function setAt(root: unknown, path: Path, value: number) {
    let node = root as Record<string | number, unknown>;
    for (let i = 0; i < path.length - 1; i++) node = node[path[i]] as Record<string | number, unknown>;
    node[path[path.length - 1]] = value;
}

const random = (low: number, high: number) => low + Math.random() * (high - low);
const sign = () => Math.random() < 0.5 ? -1 : 1;

/**
 * Returns a jittered deep copy that moves `count` random groups. `view` is the board box [left, top, right, bottom] used
 * to size point moves and keep them visible.
 */
export function jitterCheckpoint(value: unknown, candidates: Candidates, count: number, view: readonly number[], exclude: ReadonlySet<string> = new Set()): {value: unknown; moved: string[]} {
    const copy = JSON.parse(JSON.stringify(value)) as unknown;
    const keys = [...candidates.groups.keys()].filter(key => !exclude.has(key));
    // Points first: they are what a learner can always grab.
    keys.sort((a, b) => (candidates.groups.get(a)!.kind === 'point' ? 0 : 1) - (candidates.groups.get(b)!.kind === 'point' ? 0 : 1) || (Math.random() - 0.5));
    const chosen = keys.slice(0, Math.max(1, count));
    const [left, top, right, bottom] = view;
    const width = Math.abs(right - left), height = Math.abs(top - bottom);
    const gridUnit = candidates.grid !== undefined ? 2 ** candidates.grid : undefined;
    for (const key of chosen) {
        const group = candidates.groups.get(key)!;
        if (group.kind === 'point') {
            // Move the point as a whole: the same offset to every copy of x and of y.
            const angle = random(0, Math.PI * 2);
            const distance = random(0.12, 0.26) * Math.min(width, height);
            const offset: Record<string, number> = {};
            for (const leaf of group.leaves) {
                const axis = String(leaf.path[leaf.path.length - 1]);
                const isX = axis === 'x' || axis === '0';
                if (!(axis in offset)) {
                    const unit = gridUnit ?? 1;
                    const low = isX ? Math.min(left, right) : Math.min(top, bottom);
                    const high = isX ? Math.max(left, right) : Math.max(top, bottom);
                    const margin = 0.1 * (high - low);
                    const current = leaf.value * unit;
                    // The challenge bar covers the top of the board, so a moved point stays below its upper quarter.
                    const ceiling = isX ? high - margin : high - 0.26 * (high - low);
                    const moved = Math.min(ceiling, Math.max(low + margin, current + (isX ? Math.cos(angle) : Math.sin(angle)) * distance));
                    let stored = moved / unit;
                    if (gridUnit) stored = Math.round(stored);
                    offset[axis] = stored - leaf.value;
                }
                setAt(copy, leaf.path, leaf.value + offset[axis]);
            }
            continue;
        }
        const original = group.leaves[0].value;
        let next: number;
        if (original >= 0 && original <= 1 && !Number.isInteger(original)) next = Math.min(0.95, Math.max(0.05, original + sign() * random(0.2, 0.4)));
        else if (original === 0) next = sign() * random(0.6, 2);
        else next = original * (Math.random() < 0.5 ? random(0.45, 0.72) : random(1.35, 1.9));
        if (Number.isInteger(original)) next = Math.round(next * 2) / 2 || original + 1;
        next = Number(next.toFixed(2));
        for (const leaf of group.leaves) setAt(copy, leaf.path, next);
    }
    return {value: copy, moved: chosen};
}

/** A copy of `current` with one group put back to its `target` values (the hint). */
export function restoreGroup(current: unknown, target: unknown, candidates: Candidates, key: string): unknown {
    const copy = JSON.parse(JSON.stringify(current)) as unknown;
    const group = candidates.groups.get(key);
    if (!group) return copy;
    for (const leaf of group.leaves) {
        let node = target as Record<string | number, unknown>;
        for (const segment of leaf.path) node = node?.[segment] as Record<string | number, unknown>;
        if (typeof node === 'number') setAt(copy, leaf.path, node);
    }
    return copy;
}

export function readLeaf(value: unknown, path: Path): unknown {
    let node = value as Record<string | number, unknown> | undefined;
    for (const segment of path) node = node?.[segment] as Record<string | number, unknown> | undefined;
    return node;
}
