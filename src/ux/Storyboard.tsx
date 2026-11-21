import React, {useEffect, useRef, useState} from 'react';
import {findBoard} from './boardAccess';
import {currentParams, splitLabel} from './paramRegistry';
import {PRESENTATION_LABEL} from './ParamPucks';
import './Storyboard.css';

/**
 * a12 — The lesson's storyboard. Under the board, every lesson frame the learner has seen leaves a small picture of the
 * board with what the step changed ("d 0 → 1"), like the panels of a comic. Point at a panel and that moment is laid
 * over the live board as a faint onion skin (how was it two steps ago?); tap it to go back there. At the end of the
 * lesson the strip is the recap. Generic: pictures are clones of the board's SVG, frames are read from the lesson
 * card's own progress line, changes from the shared slider registry, and jumps press the card's Back and Next.
 */

interface Panel {
    id: string; step: number; frame: number; svg: string; width: number; height: number;
    values: Map<string, {symbol: string; value: number; text: string}>;
}

function progress(): {step: number; frame: number} | undefined {
    const text = document.querySelector('.guided-lesson-progress')?.textContent ?? '';
    const numbers = text.match(/\d+/g)?.map(Number);
    return numbers && numbers.length >= 3 ? {step: numbers[0], frame: numbers[2]} : undefined;
}

const order = (p: {step: number; frame: number}) => p.step * 100 + p.frame;

function snapshotValues() {
    const out = new Map<string, {symbol: string; value: number; text: string}>();
    for (const entry of currentParams()) {
        if (entry.max <= entry.min || entry.display || PRESENTATION_LABEL.test(entry.label)) continue;
        out.set(entry.key, {symbol: splitLabel(entry.label).symbol ?? entry.label, value: entry.value, text: entry.format(entry.value)});
    }
    return out;
}

export function Storyboard(props: {frame: React.RefObject<HTMLDivElement>}) {
    const [panels, setPanels] = useState<Panel[]>([]);
    const [current, setCurrent] = useState<string>();
    const [skin, setSkin] = useState<Panel>();
    const [offset, setOffset] = useState({left: 0, top: 0});
    const strip = useRef<HTMLOListElement>(null);
    const jumping = useRef(false);

    useEffect(() => {
        let timer = 0;
        let last = '';
        const capture = () => {
            const where = progress();
            const board = findBoard(props.frame.current);
            const root = board && (board as unknown as {renderer: {svgRoot?: SVGSVGElement}}).renderer.svgRoot;
            if (!where || !root) return;
            const width = root.clientWidth, height = root.clientHeight;
            if (!width || !height) return;
            const clone = root.cloneNode(true) as SVGSVGElement;
            clone.querySelectorAll('.ux-ghosts, .ux-target-ghost').forEach(node => node.remove());
            clone.setAttribute('viewBox', `0 0 ${width} ${height}`);
            clone.setAttribute('width', '100%');
            clone.setAttribute('height', '100%');
            clone.removeAttribute('style');
            clone.removeAttribute('id');
            const id = `${where.step}.${where.frame}`;
            const panel: Panel = {id, ...where, svg: clone.outerHTML, width, height, values: snapshotValues()};
            setPanels(list => [...list.filter(p => p.id !== id), panel].sort((p, q) => order(p) - order(q)).slice(-40));
            setCurrent(id);
        };
        // A frame is pictured once it has settled (lesson tweens, a6, take under a second).
        const check = () => {
            const where = progress();
            const id = where ? `${where.step}.${where.frame}` : '';
            if (id === last) return;
            last = id;
            if (id) setCurrent(id);
            window.clearTimeout(timer);
            timer = window.setTimeout(capture, 1300);
        };
        const observer = new MutationObserver(check);
        observer.observe(document.body, {subtree: true, childList: true, characterData: true});
        check();
        return () => { observer.disconnect(); window.clearTimeout(timer); };
    }, [props.frame]);

    // Keep the current panel in view.
    useEffect(() => {
        const element = strip.current?.querySelector('[aria-current="step"]') as HTMLElement | null;
        element?.scrollIntoView({block: 'nearest', inline: 'center', behavior: 'smooth'});
    }, [current, panels.length]);

    const showSkin = (panel: Panel | undefined) => {
        if (panel) {
            const board = findBoard(props.frame.current);
            const root = board && (board as unknown as {renderer: {svgRoot?: SVGSVGElement}}).renderer.svgRoot;
            const frame = props.frame.current?.getBoundingClientRect();
            const rect = root?.getBoundingClientRect();
            if (frame && rect) setOffset({left: rect.left - frame.left, top: rect.top - frame.top});
        }
        setSkin(panel);
    };

    const jump = async (panel: Panel) => {
        if (jumping.current) return;
        jumping.current = true;
        setSkin(undefined);
        for (let i = 0; i < 60; i++) {
            const where = progress();
            if (!where || `${where.step}.${where.frame}` === panel.id) break;
            const back = order(panel) < order(where);
            const button = document.querySelector(back ? '.guided-lesson-nav-back' : '.guided-lesson-nav-next') as HTMLButtonElement | null;
            if (!button || button.disabled) break;
            button.click();
            await new Promise(resolve => window.setTimeout(resolve, 60));
        }
        jumping.current = false;
    };

    if (panels.length === 0) return null;
    return <>
        {skin && <div className="ux-story-skin" aria-hidden="true" style={{left: offset.left, top: offset.top, width: skin.width, height: skin.height}}
            dangerouslySetInnerHTML={{__html: skin.svg}}/>}
        <div className="ux-story" role="navigation" aria-label="Zgodba lekcije">
            <span className="ux-story-title">Zgodba</span>
            <ol ref={strip} className="ux-story-strip">
                {panels.map((panel, i) => {
                    const previous = panels[i - 1];
                    const changes = previous ? [...panel.values].filter(([key, v]) => previous.values.has(key) && previous.values.get(key)!.value !== v.value)
                        .map(([key, v]) => ({key, symbol: v.symbol, from: previous.values.get(key)!.text, to: v.text})) : [];
                    return <li key={panel.id}>
                        <button type="button" className="ux-story-panel" aria-current={panel.id === current ? 'step' : undefined}
                            aria-label={`Korak ${panel.step}, okvir ${panel.frame}${changes.length ? `: ${changes.map(c => `${c.symbol} iz ${c.from} v ${c.to}`).join(', ')}` : ''}`}
                            onPointerEnter={() => showSkin(panel)} onPointerLeave={() => showSkin(undefined)} onFocus={() => showSkin(panel)} onBlur={() => showSkin(undefined)}
                            onClick={() => void jump(panel)}>
                            <span className="ux-story-thumb" style={{aspectRatio: `${panel.width} / ${panel.height}`}} dangerouslySetInnerHTML={{__html: panel.svg}}/>
                            <span className="ux-story-caption">
                                <b>{panel.step}.{panel.frame}</b>
                                {changes.slice(0, 2).map(change => <span key={change.key} className="ux-story-change"><i>{change.symbol}</i> {change.from}→{change.to}</span>)}
                                {changes.length > 2 && <span className="ux-story-change">+{changes.length - 2}</span>}
                            </span>
                        </button>
                    </li>;
                })}
            </ol>
        </div>
    </>;
}
