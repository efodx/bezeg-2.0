import {useEffect, RefObject} from 'react';

type MathJaxApi = {startup?: {promise?: Promise<unknown>}; typesetClear?: (elements: Element[]) => void;
    typesetPromise?: (elements: Element[]) => Promise<void>};

/** Typeset dynamically mounted prose and retry when the shared renderer finishes loading. */
export function useTypesetMath(ref: RefObject<HTMLElement>, contentIdentity: string) {
    useEffect(() => {
        const element = ref.current;
        if (!element) return;
        let disposed = false;
        const typeset = () => {
            const api = (window as Window & {MathJax?: MathJaxApi}).MathJax;
            if (!api?.typesetPromise) return;
            void (api.startup?.promise ?? Promise.resolve()).then(() => {
                if (disposed) return;
                api.typesetClear?.([element]);
                return api.typesetPromise?.([element]);
            }).catch(() => undefined);
        };
        const script = document.getElementById('MathJax-script');
        script?.addEventListener('load', typeset);
        typeset();
        return () => { disposed = true; script?.removeEventListener('load', typeset); };
    }, [ref, contentIdentity]);
}
