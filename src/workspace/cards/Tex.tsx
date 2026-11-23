import {useEffect, useRef} from 'react';
import {typesetMath} from '../../mathjax/loadMathJax';

/** TeX source (no delimiters) typeset in place with MathJax (`typesetMath`); shows the source until MathJax is ready. React never touches its children. */
export function Tex(props: {tex: string; className?: string; block?: boolean}) {
    const ref = useRef<HTMLSpanElement>(null);
    useEffect(() => {
        const el = ref.current;
        if (!el) return undefined;
        let live = true;
        const source = props.block ? `\\[${props.tex}\\]` : `\\(${props.tex}\\)`;
        el.textContent = source;
        void typesetMath(el, () => live, () => { el.textContent = source; }).catch(() => undefined);
        return () => { live = false; };
    }, [props.tex, props.block]);
    return <span ref={ref} className={props.className}/>;
}
