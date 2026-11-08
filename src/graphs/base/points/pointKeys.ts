import {resolveBigStep} from "../../../inputs/stepKeys";

export interface PointKeyEvent {
    key: string;
    shiftKey: boolean;
    altKey?: boolean;
    ctrlKey?: boolean;
    metaKey?: boolean;
}

export interface PointKeyOptions {
    step: number;
    bigStep?: number;
    /** `'x'` for points that move along x only: Up and Down are then ignored. */
    axes?: "xy" | "x";
}

export type PointKeyCommand =
    | {kind: "move"; dx: number; dy: number}
    | {kind: "remove"}
    | {kind: "back"};

/** The command a key asks of a selected point; undefined for other keys and for any Alt/Ctrl/Meta chord. Up is +y. */
export function pointKeyCommand(event: PointKeyEvent, options: PointKeyOptions): PointKeyCommand | undefined {
    if (event.altKey || event.ctrlKey || event.metaKey) return undefined;
    const amount = event.shiftKey ? resolveBigStep(options.step, options.bigStep) : options.step;
    const xy = (options.axes ?? "xy") === "xy";
    switch (event.key) {
        case "ArrowLeft": return {kind: "move", dx: -amount, dy: 0};
        case "ArrowRight": return {kind: "move", dx: amount, dy: 0};
        case "ArrowUp": return xy ? {kind: "move", dx: 0, dy: amount} : undefined;
        case "ArrowDown": return xy ? {kind: "move", dx: 0, dy: -amount} : undefined;
        case "Delete":
        case "Backspace": return {kind: "remove"};
        case "Escape": return {kind: "back"};
        default: return undefined;
    }
}
