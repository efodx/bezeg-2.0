import {useEffect, RefObject} from 'react';
import {typesetMath} from '../mathjax/loadMathJax';

/** Typeset dynamically mounted prose and retry when the shared renderer finishes loading. */
export function useTypesetMath(ref: RefObject<HTMLElement>, contentIdentity: string) {
    useEffect(() => {
        const element = ref.current;
        if (!element) return;
        let disposed = false;
        void typesetMath(element, () => !disposed).catch(() => undefined);
        return () => { disposed = true; };
    }, [ref, contentIdentity]);
}
