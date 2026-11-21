/** Narrow, read-mostly view of the live JSXGraph board for lane-B prototypes. */
export interface UxElement {
    id: string;
    name?: string;
    elType: string;
    type?: number;
    rendNode?: SVGElement | HTMLElement;
    visPropCalc?: {visible?: unknown};
    visProp?: Record<string, unknown>;
    isDraggable?: boolean;
    X?: () => number;
    Y?: () => number;
    draggable?: () => boolean;
}

export interface UxBoard {
    id: string;
    containerObj: HTMLElement;
    objectsList: UxElement[];
    renderer: {svgRoot?: SVGSVGElement};
    on(event: string, handler: (...args: unknown[]) => void): void;
    off(event: string, handler: (...args: unknown[]) => void): void;
    getBoundingBox(): [number, number, number, number];
    canvasWidth: number;
    canvasHeight: number;
    update(): void;
}

interface JxgGlobal { boards?: Record<string, UxBoard> }

declare global {
    interface Window { JXG?: JxgGlobal }
}

/** The main graph board of the page (the visible one with the largest canvas). */
export function findMainBoard(root: ParentNode = document): UxBoard | undefined {
    const boards = Object.values(window.JXG?.boards ?? {});
    let best: UxBoard | undefined;
    let bestArea = 0;
    for (const board of boards) {
        const container = board.containerObj;
        if (!container?.isConnected || !root.contains(container)) continue;
        const rect = container.getBoundingClientRect();
        const area = rect.width * rect.height;
        if (area > bestArea) { best = board; bestArea = area; }
    }
    return best;
}

const SKIPPED_TYPES = new Set(['axis', 'ticks', 'grid', 'image', 'button', 'input', 'checkbox', 'slider', 'turtle']);

export function isVisible(element: UxElement): boolean {
    if (!element.rendNode || !element.rendNode.isConnected) return false;
    if (element.visPropCalc && element.visPropCalc.visible === false) return false;
    const style = element.rendNode.getAttribute('display') ?? (element.rendNode as HTMLElement).style?.display;
    if (style === 'none') return false;
    return (element.rendNode as HTMLElement).style?.visibility !== 'hidden';
}

/** Elements a learner perceives as content: not axes, ticks, grid or widgets. */
export function contentElements(board: UxBoard): UxElement[] {
    return board.objectsList.filter(element => !SKIPPED_TYPES.has(element.elType) && !/axis|ticks/i.test(element.id) && isVisible(element));
}

export function elementSignature(element: UxElement): string {
    const stroke = String(element.visProp?.strokecolor ?? '');
    const fill = String(element.visProp?.fillcolor ?? '');
    return `${element.elType}|${element.name ?? ''}|${stroke}|${fill}`;
}

export function svgRoot(board: UxBoard): SVGSVGElement | undefined {
    return board.renderer.svgRoot ?? board.containerObj.querySelector('svg') ?? undefined;
}
