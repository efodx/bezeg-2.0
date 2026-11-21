import React, {useEffect, useRef, useState} from 'react';
import {findBoard} from './boardAccess';
import {currentParams, getParam, splitLabel, useParams, type ParamEntry} from './paramRegistry';
import {uxEnabled} from './flags';
import {Bloom, meaningful} from './YourTurn';
import {captureStates, gridValues, svgRootOf} from './family';
import './Recap.css';

/**
 * a15 — Recall. Retrieval practice made from the lesson itself: Bezeg keeps a picture of every settled frame with its
 * parameter values, and on "Ponovi" asks short questions about them. "This step turned the left picture into the right
 * one — which parameter did it change? Up or down?" and, on the live graph, "now d = 1; which picture is the graph at
 * d = 3?" with distractors that change the same parameter the other way or a different parameter. Wrong answers lead
 * back to the frame. Generic: frames come from the lesson card's progress line, values from the shared slider
 * registry, and pictures are clones of the real board, so no lesson needs questions written for it.
 */

interface Frame { id: string; order: number; svg: string; values: Map<string, number> }
interface Picture { svg: string; correct: boolean; label: string }
type Question =
    | {kind: 'which'; before: Frame; after: Frame; changed: {key: string; from: number; to: number}[]; options: string[]}
    | {kind: 'picture'; key: string; from: number; to: number; now: string; pictures: Picture[]};
interface Answer { picked: string | number; correct: boolean; direction?: 'up' | 'down'; directionCorrect?: boolean }

const symbolOf = (entry: ParamEntry) => splitLabel(entry.label).symbol ?? entry.label;
const progressNow = () => {
    const numbers = document.querySelector('.guided-lesson-progress')?.textContent?.match(/\d+/g)?.map(Number);
    return numbers && numbers.length >= 3 ? {step: numbers[0], frame: numbers[2]} : undefined;
};
const shuffle = <T,>(list: T[]) => {
    const out = [...list];
    for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
    return out;
};

function cleanClone(root: SVGSVGElement): string {
    const clone = root.cloneNode(true) as SVGSVGElement;
    clone.querySelectorAll('.ux-ghosts, .ux-target-ghost, .ux-fit-layer').forEach(node => node.remove());
    clone.setAttribute('viewBox', `0 0 ${root.clientWidth} ${root.clientHeight}`);
    clone.setAttribute('width', '100%');
    clone.setAttribute('height', '100%');
    clone.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    clone.removeAttribute('style');
    return clone.outerHTML;
}

export function Recap(props: {frame: React.RefObject<HTMLDivElement>}) {
    const params = useParams();
    const usable = params.filter(entry => meaningful(entry) && !entry.inert && entry.unavailable === undefined);
    const [frames, setFrames] = useState<Frame[]>([]);
    const [phase, setPhase] = useState<'idle' | 'building' | 'asking' | 'done'>('idle');
    const [questions, setQuestions] = useState<Question[]>([]);
    const [index, setIndex] = useState(0);
    const [answers, setAnswers] = useState<Answer[]>([]);
    const touched = useRef<Set<string>>(new Set());

    // Record every settled frame (the same moment a12 pictures it).
    useEffect(() => {
        let timer = 0;
        let last = '';
        const capture = () => {
            const where = progressNow();
            const board = findBoard(props.frame.current);
            const root = board && svgRootOf(board);
            if (!where || !root || !root.clientWidth) return;
            const values = new Map<string, number>();
            for (const entry of currentParams()) if (meaningful(entry)) values.set(entry.key, entry.value);
            const id = `${where.step}.${where.frame}`;
            const frame: Frame = {id, order: where.step * 100 + where.frame, svg: cleanClone(root), values};
            setFrames(list => [...list.filter(f => f.id !== id), frame].sort((a, b) => a.order - b.order));
        };
        const check = () => {
            const where = progressNow();
            const id = where ? `${where.step}.${where.frame}` : '';
            if (id === last) return;
            last = id;
            window.clearTimeout(timer);
            timer = window.setTimeout(capture, 1300);
        };
        const observer = new MutationObserver(check);
        observer.observe(document.body, {subtree: true, childList: true, characterData: true});
        check();
        return () => { observer.disconnect(); window.clearTimeout(timer); };
    }, [props.frame]);

    // While the quiz is open the lesson card steps aside (on phones it would cover the quiz).
    useEffect(() => {
        if (phase === 'idle') return;
        document.body.classList.add('ux-recap-open');
        return () => document.body.classList.remove('ux-recap-open');
    }, [phase]);

    // Steps whose parameter changes can be asked about.
    const steps = frames.slice(1).map((after, i) => {
        const before = frames[i];
        const changed = [...after.values].filter(([key, value]) => before.values.has(key) && before.values.get(key) !== value)
            .map(([key, to]) => ({key, from: before.values.get(key)!, to}));
        return {before, after, changed};
    }).filter(step => step.changed.length > 0 && step.after.order > step.before.order);
    for (const step of steps) for (const change of step.changed) touched.current.add(change.key);

    const pictureQuestion = async (key: string): Promise<Question | undefined> => {
        const b = findBoard(props.frame.current);
        const entry = getParam(key);
        if (!b || !meaningful(entry)) return undefined;
        const others = usable.filter(other => other.key !== key);
        const near = (e: ParamEntry) => {
            if (e.cyclic !== undefined) {
                // An angle: an eighth of a turn either way, wrapped into the slider's range.
                const span = e.max - e.min;
                const wrap = (x: number) => Number((((x - e.min) % span + span) % span + e.min).toPrecision(12));
                return {list: [-2, -1, 0, 1, 2].map(k => wrap(e.value + k * span / 8)), at: 2};
            }
            const list = gridValues(e, e.value, (e.max - e.min) / 8, 5);
            const at = list.findIndex(v => Math.abs(v - e.value) < 1e-9);
            return {list, at};
        };
        const {list, at} = near(entry);
        if (list.length < 3 || at < 0) return undefined;
        const up = at + 1 < list.length && (at === 0 || Math.random() < 0.5);
        const target = list[up ? at + 1 : at - 1];
        const mirror = list[up ? at - 1 : at + 1];
        const far = list[up ? at + 2 : at - 2];
        const keys = [entry.key, ...others.map(o => o.key)];
        const base = keys.map(k => getParam(k)!.value);
        const with_ = (k: string, v: number) => keys.map((kk, i) => kk === k ? v : base[i]);
        const candidates: {values: number[]; correct: boolean; label: string}[] = [{values: with_(key, target), correct: true, label: `${symbolOf(entry)} = ${entry.format(target)}`}];
        if (mirror !== undefined) candidates.push({values: with_(key, mirror), correct: false, label: `${symbolOf(entry)} = ${entry.format(mirror)}`});
        for (const other of shuffle(others).slice(0, 2)) {
            const n = near(other);
            const v = n.list[n.at + 1] ?? n.list[n.at - 1];
            if (v !== undefined && n.at >= 0) candidates.push({values: with_(other.key, v), correct: false, label: `${symbolOf(other)} = ${other.format(v)}`});
        }
        if (far !== undefined) candidates.push({values: with_(key, far), correct: false, label: `${symbolOf(entry)} = ${entry.format(far)}`});
        const shots = await captureStates(b, keys, [base, ...candidates.map(c => c.values)]);
        if (!shots) return undefined;
        const [now, ...rest] = shots;
        // Distinct pictures only, none equal to the graph as it is now; the right one must be among them.
        const seen = new Set([now.look]);
        const pictures: Picture[] = [];
        rest.forEach((shot, i) => {
            if (seen.has(shot.look) || pictures.length >= 4) return;
            seen.add(shot.look);
            pictures.push({svg: shot.svg, correct: candidates[i].correct, label: candidates[i].label});
        });
        if (!pictures.some(p => p.correct) || pictures.length < 3) return undefined;
        return {kind: 'picture', key, from: entry.value, to: target, now: now.svg, pictures: shuffle(pictures)};
    };

    const build = async () => {
        setPhase('building');
        const out: Question[] = [];
        for (const step of shuffle(steps).slice(0, 3)) {
            const keys = [...step.before.values.keys()].filter(key => step.after.values.has(key) && meaningful(getParam(key)));
            // The changed parameters are always offered; the rest fill up to six chips, in the inspector's order.
            const chosen = new Set([...step.changed.map(c => c.key), ...keys].slice(0, Math.max(6, step.changed.length)));
            const options = keys.filter(key => chosen.has(key));
            if (options.length >= 1) out.push({kind: 'which', ...step, options});
        }
        const pool = shuffle([...touched.current].filter(key => usable.some(e => e.key === key)));
        for (const entry of shuffle(usable)) if (!pool.includes(entry.key)) pool.push(entry.key);
        for (const key of pool) {
            if (out.length >= 5 || out.filter(q => q.kind === 'picture').length >= (out.length >= 3 ? 2 : 4)) break;
            const question = await pictureQuestion(key);
            if (question) out.push(question);
        }
        if (out.length === 0) { setPhase('idle'); return; }
        // Steps of the lesson first, in lesson order, then the live questions.
        out.sort((a, b) => (a.kind === 'which' ? a.after.order : 1e6) - (b.kind === 'which' ? b.after.order : 1e6));
        setQuestions(out);
        setAnswers([]);
        setIndex(0);
        setPhase('asking');
    };

    const jump = async (frame: Frame) => {
        setPhase('idle');
        for (let i = 0; i < 60; i++) {
            const where = progressNow();
            if (!where || `${where.step}.${where.frame}` === frame.id) break;
            const back = frame.order < where.step * 100 + where.frame;
            const button = document.querySelector(back ? '.guided-lesson-nav-back' : '.guided-lesson-nav-next') as HTMLButtonElement | null;
            if (!button || button.disabled) break;
            button.click();
            await new Promise(resolve => window.setTimeout(resolve, 60));
        }
    };

    const question = questions[index];
    // With a single parameter on the graph, which one changed is obvious: ask only for the direction.
    const answer = answers[index] ?? (question?.kind === 'which' && question.options.length === 1 ? {picked: question.options[0], correct: true} : undefined);
    const answerWith = (next: Answer) => setAnswers(list => { const out = [...list]; out[index] = next; return out; });
    const score = answers.reduce((sum, a, i) => sum + (a?.correct ? (questions[i]?.kind === 'which' && a.directionCorrect === false ? 0.5 : 1) : 0), 0);

    if (phase === 'idle') {
        if (usable.length === 0 && steps.length === 0) return null;
        const bottom = 64 + ['a10', 'a11', 'a13', 'a14'].filter(flag => uxEnabled(flag as 'a10')).length * 48;
        return <button type="button" className="ux-recap-start" style={{bottom}} onClick={() => void build()} title="Kratka ponovitev iz te lekcije">
            <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10a6 6 0 1 0 2-4.5"/><path d="M3.5 3.5v3h3"/><path d="M10 7v3.2l2.2 1.4" className="hand"/></svg>
            Ponovi{steps.length > 0 && <span className="ux-recap-badge">{steps.length}</span>}
        </button>;
    }

    const format = (key: string, value: number) => { const e = getParam(key); return e ? e.format(Number(value.toPrecision(4))) : String(value); };
    const symbol = (key: string) => { const e = getParam(key); return e ? symbolOf(e) : key; };

    return <div className="ux-recap" role="dialog" aria-label="Ponovitev">
        <div className="ux-recap-head">
            <span className="ux-recap-title">Ponovi</span>
            {phase !== 'building' && <span className="ux-recap-dots" aria-label={`Vprašanje ${index + 1} od ${questions.length}`}>
                {questions.map((_, i) => <span key={i} className={`ux-recap-dot${i === index && phase === 'asking' ? ' is-now' : ''}${answers[i] ? answers[i].correct ? ' is-right' : ' is-wrong' : ''}`}/>)}
            </span>}
            <button type="button" className="ux-recap-close" onClick={() => setPhase('idle')} aria-label="Zapri ponovitev">×</button>
        </div>
        {phase === 'building' && <p className="ux-recap-busy"><span className="ux-recap-spinner" aria-hidden="true"/>Sestavljam vprašanja iz lekcije …</p>}
        {phase === 'asking' && question?.kind === 'which' && <div className="ux-recap-body">
            <p className="ux-recap-q">Korak lekcije je levo sliko spremenil v desno. <strong>{question.options.length > 1 ? 'Kateri parameter je spremenil?' : 'Kako?'}</strong></p>
            <div className="ux-recap-pair">
                <figure><span className="ux-recap-thumb" dangerouslySetInnerHTML={{__html: question.before.svg}}/><figcaption>prej</figcaption></figure>
                <span className="ux-recap-arrow" aria-hidden="true">→</span>
                <figure><span className="ux-recap-thumb" dangerouslySetInnerHTML={{__html: question.after.svg}}/><figcaption>potem</figcaption></figure>
            </div>
            <div className="ux-recap-options" role="group" aria-label="Parametri">
                {question.options.map(key => {
                    const right = question.changed.some(c => c.key === key);
                    const state = answer ? right ? ' is-right' : answer.picked === key ? ' is-wrong' : '' : '';
                    return <button key={key} type="button" className={`ux-recap-chip${state}`} disabled={!!answer} title={getParam(key)?.label}
                        onClick={() => answerWith({picked: key, correct: right})}><i>{symbol(key)}</i></button>;
                })}
            </div>
            {answer?.correct && answer.direction === undefined && (() => {
                const change = question.changed.find(c => c.key === answer.picked)!;
                return <div className="ux-recap-follow">
                    <p>{question.options.length > 1 ? 'Pravilno. ' : ''}Se je <i>{symbol(change.key)}</i> povečal ali zmanjšal?</p>
                    <div className="ux-recap-options">
                        {(['up', 'down'] as const).map(direction => <button key={direction} type="button" className="ux-recap-chip is-wide"
                            onClick={() => answerWith({...answer, direction, directionCorrect: (direction === 'up') === (change.to > change.from)})}>{direction === 'up' ? '↑ povečal' : '↓ zmanjšal'}</button>)}
                    </div>
                </div>;
            })()}
            {answer && (!answer.correct || answer.direction !== undefined) && <div className={`ux-recap-feedback${answer.correct && answer.directionCorrect ? ' is-right' : ''}`}>
                <p>{answer.correct && answer.directionCorrect ? 'Tako je: ' : answer.correct ? 'Parameter drži, smer ne: ' : 'Ta korak je spremenil '}
                    {question.changed.map(c => <span key={c.key} className="ux-recap-change"><i>{symbol(c.key)}</i> {format(c.key, c.from)} → {format(c.key, c.to)}</span>)}</p>
                <div className="ux-recap-actions">
                    {!(answer.correct && answer.directionCorrect) && <button type="button" onClick={() => void jump(question.after)}>Poglej ta korak</button>}
                    <button type="button" className="is-primary" onClick={() => index + 1 < questions.length ? setIndex(index + 1) : setPhase('done')}>{index + 1 < questions.length ? 'Naprej' : 'Konec'}</button>
                </div>
            </div>}
        </div>}
        {phase === 'asking' && question?.kind === 'picture' && <div className="ux-recap-body">
            <div className="ux-recap-now">
                <span className="ux-recap-thumb is-small" dangerouslySetInnerHTML={{__html: question.now}}/>
                <p className="ux-recap-q">Zdaj je <span className="ux-recap-change"><i>{symbol(question.key)}</i> = {format(question.key, question.from)}</span>. <strong>Kateri graf dobiš pri <i>{symbol(question.key)}</i> = {format(question.key, question.to)}?</strong></p>
            </div>
            <div className="ux-recap-grid">
                {question.pictures.map((picture, i) => {
                    const state = answer ? picture.correct ? ' is-right' : answer.picked === i ? ' is-wrong' : ' is-faded' : '';
                    return <button key={i} type="button" className={`ux-recap-pick${state}`} disabled={!!answer} aria-label={`Slika ${i + 1}`}
                        onClick={() => answerWith({picked: i, correct: picture.correct})}>
                        <span className="ux-recap-thumb" dangerouslySetInnerHTML={{__html: picture.svg}}/>
                        {answer && <span className="ux-recap-tag">{picture.label}</span>}
                    </button>;
                })}
            </div>
            {answer && <div className={`ux-recap-feedback${answer.correct ? ' is-right' : ''}`}>
                <p>{answer.correct ? 'Pravilno.' : 'Ne še — pravilna slika je obrobljena zeleno; pod vsako je vrednost, ki jo nariše.'}</p>
                <div className="ux-recap-actions"><button type="button" className="is-primary" onClick={() => index + 1 < questions.length ? setIndex(index + 1) : setPhase('done')}>{index + 1 < questions.length ? 'Naprej' : 'Konec'}</button></div>
            </div>}
        </div>}
        {phase === 'done' && <div className="ux-recap-body ux-recap-end">
            {score >= questions.length * 0.8 && <Bloom/>}
            <p className="ux-recap-score">{Number(score.toFixed(1)).toLocaleString('sl-SI')} / {questions.length}</p>
            <p>{score >= questions.length * 0.8 ? 'Odlično — to lekcijo imaš v rokah.' : score >= questions.length * 0.5 ? 'Dobro. Kar je bilo narobe, si oglej še enkrat.' : 'Vrni se h koraku, ki te je zmotil, in poskusi znova.'}</p>
            <div className="ux-recap-actions"><button type="button" onClick={() => setPhase('idle')}>Zapri</button><button type="button" className="is-primary" onClick={() => void build()}>Še enkrat</button></div>
        </div>}
    </div>;
}
