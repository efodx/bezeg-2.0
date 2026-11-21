import React, {useMemo, useState} from 'react';
import {Link} from 'react-router-dom';
import {findDemonstration} from '../demonstrations';
import {framesForLessonStep} from '../learning/model';
import {getLessonForDemonstration} from '../learning/runtime/lessonCatalog';
import {cardId, clockOffsetDays, describeDue, dueCards, forgetAll, loadCards, now, plant, recallUrl, travel, type MemoryCard} from './memory';
import './UxLabPage.css';
import './uxlab.css';

/** Lesson titles carry inline TeX; the garden shows them as plain text. */
const plain = (text: string) => text.replace(/\\[()[\]]/g, '');

const SEED_PATHS = ['/bezeg-2.0/bezier/curve', '/bezeg-2.0/functions/transformations', '/bezeg-2.0/euler-line', '/bezeg-2.0/bezier/decasteljau', '/bezeg-2.0/compgeo/convex-hull'];

/** Plants up to two observation frames from each example lesson, ready for review now. */
function seedExamples(): number {
    let planted = 0;
    for (const path of SEED_PATHS) {
        const demonstration = findDemonstration(path);
        const lesson = demonstration && getLessonForDemonstration(demonstration.id);
        if (!lesson) continue;
        let fromLesson = 0;
        lesson.steps.forEach((step, stepIndex) => framesForLessonStep(step).forEach((frame, frameIndex) => {
            if (fromLesson >= 2 || frame.kind !== 'observation' || !(frame.prompt || frame.expectedObservations?.length)) return;
            if (plant({id: cardId(path, lesson.id, stepIndex, frameIndex), path, lessonId: lesson.id, lessonTitle: lesson.title.sl, step: stepIndex, frame: frameIndex,
                title: frame.title.sl, prompt: frame.prompt?.sl ?? '', answers: frame.expectedObservations?.map(text => text.sl)}, true)) planted++;
            fromLesson++;
        }));
    }
    return planted;
}

/** An elderflower umbel: five clusters that open one by one as the memory climbs the Leitner boxes. */
function Umbel(props: {box: number; due: boolean}) {
    const clusters = [-56, -28, 0, 28, 56];
    return <svg className={`ux-umbel${props.due ? ' is-due' : ''}`} viewBox="-60 -62 120 112" aria-hidden="true">
        {clusters.map((angle, index) => {
            const radians = (angle - 90) * Math.PI / 180;
            const x = Math.cos(radians) * 34, y = Math.sin(radians) * 34 + 8;
            const open = index < props.box;
            return <g key={angle}>
                <path d={`M0,44 Q${x * 0.3},${y * 0.2 + 30} ${x},${y}`} stroke="#6f8c5f" strokeWidth="1.6" fill="none"/>
                {[0, 1, 2, 3, 4, 5, 6].map(floret => {
                    const a = floret / 7 * Math.PI * 2 + index;
                    const fx = x + (floret ? Math.cos(a) * 9.5 : 0), fy = y + (floret ? Math.sin(a) * 9.5 : 0);
                    return open
                        ? <g key={floret} transform={`translate(${fx.toFixed(1)} ${fy.toFixed(1)})`} className="ux-floret">
                            {[0, 72, 144, 216, 288].map(p => <ellipse key={p} cx="0" cy="-3" rx="2.3" ry="3" transform={`rotate(${p})`} fill="#fffef6" stroke="#cfc396" strokeWidth=".5"/>)}
                            <circle r="1.5" fill="#e3bd35"/>
                        </g>
                        : <circle key={floret} cx={fx.toFixed(1)} cy={fy.toFixed(1)} r="2.4" fill="#c4d4a8" stroke="#94ab7c" strokeWidth=".6"/>;
                })}
            </g>;
        })}
        <path d="M0,44 L0,50" stroke="#6f8c5f" strokeWidth="2"/>
    </svg>;
}

export function MemoryGarden() {
    const [version, setVersion] = useState(0);
    const cards = useMemo(() => loadCards(), [version]);
    const due = useMemo(() => dueCards(), [version]);
    const refresh = () => setVersion(value => value + 1);
    const offset = clockOffsetDays();
    const today = new Date(now()).toLocaleDateString('sl-SI', {weekday: 'long', day: 'numeric', month: 'long'});
    const start = due[0] && recallUrl(due[0], due.slice(1).map(card => card.id));
    const byLesson = new Map<string, MemoryCard[]>();
    for (const card of cards) byLesson.set(card.lessonTitle, [...(byLesson.get(card.lessonTitle) ?? []), card]);
    return <main className="uxlab ux-garden">
        <header className="uxlab-head">
            <p className="uxlab-kicker"><Link to="/bezeg-2.0/ux-lab">UX laboratorij · pas B</Link> · b5</p>
            <h1>Vrt spomina</h1>
            <p className="uxlab-lede">Vsak okvir za opazovanje, ki ga obiščeš z vklopljenim <code>ux=b5</code>, posadi seme. Spomin se vrne jutri, nato čez 3, 7, 16 in 35 dni. Ko se spomniš, se odpre naslednji cvet kobula; ko pozabiš, začne znova. Priklic se zgodi na pravem grafu, v pravem prizoru lekcije.</p>
        </header>
        <section className="ux-garden-controls" aria-label="Ponavljanje">
            <div className="ux-garden-today">
                <span className="ux-garden-date">{today}</span>
                {offset !== 0 && <span className="ux-garden-travel">časovni stroj: +{offset} {offset === 1 ? 'dan' : offset === 2 ? 'dneva' : offset < 5 ? 'dnevi' : 'dni'}</span>}
            </div>
            <div className="ux-garden-buttons">
                {start ? <a className="ux-button ux-primary ux-garden-start" href={start}>Ponovi zdaj · {due.length}</a>
                    : <span className="ux-garden-empty">{cards.length ? 'Danes ni nič za ponoviti.' : 'Vrt je še prazen.'}</span>}
                <button type="button" className="ux-button" onClick={() => { travel(1); refresh(); }}>+1 dan</button>
                <button type="button" className="ux-button" onClick={() => { travel(7); refresh(); }}>+1 teden</button>
                {offset !== 0 && <button type="button" className="ux-button" onClick={() => { travel(0); refresh(); }}>Danes</button>}
            </div>
        </section>
        {cards.length === 0 && <section className="uxlab-card ux-garden-intro">
            <p>Za ogled brez učenja lahko takoj posadiš nekaj spominov iz lekcij o Bézierjevih krivuljah, funkcijah, trikotniku in konveksni ovojnici. Pripravljeni bodo za ponavljanje takoj.</p>
            <button type="button" className="ux-button ux-primary" onClick={() => { seedExamples(); refresh(); }}>Posadi primere</button>
            <p className="uxlab-why">Ali pa odpri lekcijo z <code>ux=b5</code>, na primer <a href="/bezeg-2.0/bezier/curve?learn=1&ux=b5">Bézierjeva krivulja</a>, in pojdi do okvirja za opazovanje.</p>
        </section>}
        {[...byLesson.entries()].map(([lessonTitle, lessonCards]) => <section key={lessonTitle} className="ux-garden-bed">
            <h2>{plain(lessonTitle)}</h2>
            <ul>
                {lessonCards.map(card => {
                    const isDue = card.due <= now();
                    return <li key={card.id}>
                        <a href={recallUrl(card)} className={`ux-garden-plant${isDue ? ' is-due' : ''}`}>
                            <Umbel box={card.box} due={isDue}/>
                            <strong>{plain(card.title)}</strong>
                            <span>{isDue ? 'pripravljen za priklic' : `naslednjič ${describeDue(card)}`}</span>
                            <small>stopnja {card.box}/5{card.reviews ? ` · ponovljeno ${card.reviews}×` : ''}</small>
                        </a>
                    </li>;
                })}
            </ul>
        </section>)}
        {cards.length > 0 && <p className="ux-garden-footer">
            <button type="button" className="ux-button" onClick={() => { seedExamples(); refresh(); }}>Posadi še primere</button>
            <button type="button" className="ux-button" onClick={() => { if (window.confirm('Izbrišem vse spomine na tej napravi?')) { forgetAll(); travel(0); refresh(); } }}>Izprazni vrt</button>
        </p>}
    </main>;
}
