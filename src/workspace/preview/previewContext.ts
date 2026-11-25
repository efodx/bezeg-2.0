import {createContext, useContext, useMemo} from 'react';
import type {FanValue} from './fan';
import type {PreviewController} from './previewController';

export const PreviewHoverContext = createContext<PreviewController | undefined>(undefined);

export interface ParameterHover {
    /** The pointer rests on `value` of the parameter. */
    show(value: number): void;
    /** The overview fan: these values at once, the near ones stronger. */
    showFan(values: readonly FanValue[]): void;
    hide(): void;
}

/** Hover handlers for a parameter's control; `undefined` outside a board or for a parameter that is not `previewable`. */
export function usePreviewHover(parameter: {readonly key: string; readonly previewable?: true}): ParameterHover | undefined {
    const controller = useContext(PreviewHoverContext);
    const {key, previewable} = parameter;
    return useMemo(() => controller && previewable === true
        ? {show: (value: number) => controller.show(key, value), showFan: (values: readonly FanValue[]) => controller.showFan(key, values), hide: () => controller.hide()} : undefined, [controller, key, previewable]);
}
