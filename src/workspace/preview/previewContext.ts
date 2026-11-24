import {createContext, useContext, useMemo} from 'react';
import type {PreviewController} from './previewController';

export const PreviewHoverContext = createContext<PreviewController | undefined>(undefined);

export interface ParameterHover {
    /** The pointer rests on `value` of the parameter. */
    show(value: number): void;
    hide(): void;
}

/** Hover handlers for a parameter's control; `undefined` outside a board or for a parameter that is not `previewable`. */
export function usePreviewHover(parameter: {readonly key: string; readonly previewable?: true}): ParameterHover | undefined {
    const controller = useContext(PreviewHoverContext);
    const {key, previewable} = parameter;
    return useMemo(() => controller && previewable === true
        ? {show: (value: number) => controller.show(key, value), hide: () => controller.hide()} : undefined, [controller, key, previewable]);
}
