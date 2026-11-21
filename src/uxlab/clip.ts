/**
 * Clips for b8: a recorded manipulation of a scene, stored as the first checkpoint plus the numbers that change over
 * time. Frames whose structure differs from the first (a switched mode) are kept whole. Encoded with deflate into the URL
 * hash, so a clip travels as a link with no server.
 */
type Path = (string | number)[];

export interface ClipFrame {
    /** Milliseconds from the start. */
    t: number;
    value: unknown;
    /** Pointer position on the board in user coordinates, when the pointer was over it. */
    pointer?: [number, number];
    down?: boolean;
}

export interface Clip {
    route: string;
    caption: string;
    frames: ClipFrame[];
}

interface Encoded {
    v: 1;
    r: string;
    c: string;
    b: unknown;
    /** Paths of the leaves that change. */
    p: Path[];
    /** Frames: [t, pointerX|null, pointerY|null, down(0/1), ...values] or [t, px, py, down, {full: value}]. */
    f: unknown[][];
}

function leaves(value: unknown, path: Path = [], out: {path: Path; value: number}[] = []): {path: Path; value: number}[] {
    if (typeof value === 'number') out.push({path, value});
    else if (Array.isArray(value)) value.forEach((item, index) => leaves(item, [...path, index], out));
    else if (typeof value === 'object' && value !== null) for (const [key, child] of Object.entries(value)) leaves(child, [...path, key], out);
    return out;
}

/** The JSON with every number blanked: two values with the same shape differ only in numbers. */
function shape(value: unknown): string {
    return JSON.stringify(value, (_, item) => typeof item === 'number' ? 0 : item);
}

function setAt(root: unknown, path: Path, value: number) {
    let node = root as Record<string | number, unknown>;
    for (let i = 0; i < path.length - 1; i++) node = node[path[i]] as Record<string | number, unknown>;
    node[path[path.length - 1]] = value;
}

const round = (value: number) => Number(value.toPrecision(6));

export function encodeClip(clip: Clip): Encoded {
    const base = clip.frames[0].value;
    const baseShape = shape(base);
    const baseLeaves = leaves(base);
    const changing = new Set<number>();
    for (const frame of clip.frames) {
        if (shape(frame.value) !== baseShape) continue;
        leaves(frame.value).forEach((leaf, index) => { if (leaf.value !== baseLeaves[index].value) changing.add(index); });
    }
    const indices = [...changing].sort((a, b) => a - b);
    return {
        v: 1, r: clip.route, c: clip.caption, b: base, p: indices.map(index => baseLeaves[index].path),
        f: clip.frames.map(frame => {
            const head = [Math.round(frame.t), frame.pointer ? round(frame.pointer[0]) : null, frame.pointer ? round(frame.pointer[1]) : null, frame.down ? 1 : 0];
            if (shape(frame.value) !== baseShape) return [...head, {full: frame.value}];
            const all = leaves(frame.value);
            return [...head, ...indices.map(index => round(all[index].value))];
        }),
    };
}

export function decodeClip(encoded: Encoded): Clip {
    const frames: ClipFrame[] = encoded.f.map(row => {
        const [t, px, py, down, ...rest] = row as [number, number | null, number | null, number, ...unknown[]];
        let value: unknown;
        if (rest.length === 1 && typeof rest[0] === 'object' && rest[0] !== null && 'full' in (rest[0] as object)) value = (rest[0] as {full: unknown}).full;
        else {
            value = JSON.parse(JSON.stringify(encoded.b));
            encoded.p.forEach((path, index) => setAt(value, path, rest[index] as number));
        }
        return {t, value, pointer: px !== null && py !== null ? [px, py] : undefined, down: down === 1};
    });
    return {route: encoded.r, caption: encoded.c, frames};
}

async function pipe(bytes: Uint8Array<ArrayBuffer>, stream: CompressionStream | DecompressionStream): Promise<Uint8Array<ArrayBuffer>> {
    const response = new Response(new Blob([bytes]).stream().pipeThrough(stream));
    return new Uint8Array(await response.arrayBuffer()) as Uint8Array<ArrayBuffer>;
}

function toBase64Url(bytes: Uint8Array): string {
    let binary = '';
    bytes.forEach(byte => { binary += String.fromCharCode(byte); });
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text: string): Uint8Array<ArrayBuffer> {
    const binary = atob(text.replace(/-/g, '+').replace(/_/g, '/'));
    return Uint8Array.from(binary, char => char.charCodeAt(0));
}

export async function clipToHash(clip: Clip): Promise<string> {
    const json = new TextEncoder().encode(JSON.stringify(encodeClip(clip))) as Uint8Array<ArrayBuffer>;
    return toBase64Url(await pipe(json, new CompressionStream('deflate-raw')));
}

export async function clipFromHash(text: string): Promise<Clip> {
    const json = new TextDecoder().decode(await pipe(fromBase64Url(text), new DecompressionStream('deflate-raw')));
    const encoded = JSON.parse(json) as Encoded;
    if (encoded.v !== 1 || !Array.isArray(encoded.f) || encoded.f.length === 0) throw new Error('Posnetek ni veljaven.');
    return decodeClip(encoded);
}

/** Interpolated scene at time t (numbers slide between neighbouring frames when their shapes agree). */
export function sceneAt(clip: Clip, t: number): {value: unknown; pointer?: [number, number]; down?: boolean} {
    const frames = clip.frames;
    if (t <= frames[0].t) return frames[0];
    const last = frames[frames.length - 1];
    if (t >= last.t) return last;
    let index = 0;
    while (index < frames.length - 2 && frames[index + 1].t <= t) index++;
    const a = frames[index], b = frames[index + 1];
    const k = b.t === a.t ? 1 : (t - a.t) / (b.t - a.t);
    let value: unknown = k < 0.5 ? a.value : b.value;
    if (shape(a.value) === shape(b.value)) {
        value = JSON.parse(JSON.stringify(a.value));
        const from = leaves(a.value), to = leaves(b.value);
        // Whole numbers stay whole (half-degrees, steps): frames are dense, so rounding does not show.
        from.forEach((leaf, i) => {
            if (leaf.value === to[i].value) return;
            const mixed = leaf.value + (to[i].value - leaf.value) * k;
            setAt(value, leaf.path, Number.isInteger(leaf.value) && Number.isInteger(to[i].value) ? Math.round(mixed) : mixed);
        });
    }
    const pointer = a.pointer && b.pointer ? [a.pointer[0] + (b.pointer[0] - a.pointer[0]) * k, a.pointer[1] + (b.pointer[1] - a.pointer[1]) * k] as [number, number] : (k < 0.5 ? a.pointer : b.pointer);
    return {value, pointer, down: k < 0.5 ? a.down : b.down};
}
