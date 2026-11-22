import React, {useEffect, useRef} from 'react';
import {typesetMath} from '../../mathjax/loadMathJax';

/** TeX source (no delimiters) typeset in place with MathJax; shows the source until MathJax is ready. React never touches its children. */
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

/** Prose with `\(...\)` math (a lesson title) typeset in place; plain text skips MathJax. React never touches its children. */
export function TexText(props: {text: string; className?: string; id?: string; title?: string}) {
    const ref = useRef<HTMLSpanElement>(null);
    useEffect(() => {
        const el = ref.current;
        if (!el) return undefined;
        let live = true;
        el.textContent = props.text;
        if (props.text.includes('\\(') || props.text.includes('\\['))
            void typesetMath(el, () => live, () => { el.textContent = props.text; }).catch(() => undefined);
        return () => { live = false; };
    }, [props.text]);
    return <span ref={ref} id={props.id} className={props.className} title={props.title}/>;
}

/** A plain-text reading of prose with `\(...\)` math, for tooltips and labels. */
export const texPlain = (text: string) => text.replace(/\\[()[\]]/g, '').replace(/\\prime/g, '′').replace(/[{}]/g, '').replace(/\^′/g, '′');
