import React, {useEffect, useRef, useState} from 'react';
import {typesetMath} from '../mathjax/loadMathJax';
import {createPortal} from 'react-dom';
import type {LessonDefinition, LessonFrame} from '../learning/model';
import type {LessonSession, LessonSessionSnapshot} from '../learning/runtime/LessonSession';
import {uxEnabled} from './flags';
import {cardId, describeDue, dueCards, findCard, plant, rate, readRecall, recallUrl, type MemoryCard, type Rating} from './memory';
import './uxlab.css';

const sl = (text: {sl: string} | undefined) => (text?.sl ?? '').replace(/\\[()[\]]/g, '');

/** Moves a freshly started session to the remembered frame by playing the lesson forward (its scenes stay authored). */
export function jumpToRecall(session: LessonSession, lesson: LessonDefinition) {
    if (!uxEnabled('b5')) return;
    const recall = readRecall();
    const card = recall && findCard(recall.id);
    if (!card || card.lessonId !== lesson.id) return;
    for (let guard = 0; guard < 300; guard++) {
        const snapshot = session.getSnapshot();
        if (snapshot.stepIndex === card.step && snapshot.frameIndex === card.frame) return;
        if (snapshot.status === 'complete') return;
        session.next();
    }
}

function Seed() {
    return <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
        <path d="M12 21c0-5 0-8 0-11" stroke="#5b7a4b" strokeWidth="1.6" fill="none"/>
        <path d="M12 13c-3.5 0-5.5-2-6-5 3.2 0 5.5 1.6 6 5z" fill="#8fae7a"/>
        {[0, 72, 144, 216, 288].map(angle => <ellipse key={angle} cx="12" cy="5.2" rx="1.6" ry="2.1" transform={`rotate(${angle} 12 7.5)`} fill="#fffbea" stroke="#d9cf9f" strokeWidth=".5"/>)}
        <circle cx="12" cy="7.5" r="1.2" fill="#e9c84a"/>
    </svg>;
}

/**
 * Plants observation frames as memories while a lesson runs with `ux=b5`, and runs the recall of one memory when the
 * lesson was opened from the memory garden.
 */
export function useMemory(lesson: LessonDefinition, snapshot: LessonSessionSnapshot, frame: LessonFrame) {
    const enabled = uxEnabled('b5');
    const recall = enabled ? readRecall() : undefined;
    const recallCard = recall ? findCard(recall.id) : undefined;
    const recalling = !!recallCard && recallCard.lessonId === lesson.id && snapshot.stepIndex === recallCard.step && snapshot.frameIndex === recallCard.frame;
    const [planted, setPlanted] = useState<string>();
    const [rated, setRated] = useState<MemoryCard>();
    const [revealed, setRevealed] = useState(false);
    const barRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const bar = barRef.current;
        if (!bar) return;
        let current = true;
        void typesetMath(bar, () => current).catch(() => undefined);
        return () => { current = false; };
    }, [recalling, revealed, rated]);
    useEffect(() => {
        if (!recalling) return;
        // The bar sits over the bottom of the page; leave room to scroll the lesson card above it.
        const previous = document.body.style.paddingBottom;
        document.body.style.paddingBottom = '220px';
        return () => { document.body.style.paddingBottom = previous; };
    }, [recalling]);

    useEffect(() => {
        if (!enabled || recall || snapshot.status === 'closed') return;
        if (frame.kind !== 'observation' || !(frame.prompt || frame.expectedObservations?.length)) return;
        const path = window.location.pathname;
        const id = cardId(path, lesson.id, snapshot.stepIndex, snapshot.frameIndex);
        const added = plant({id, path, lessonId: lesson.id, lessonTitle: sl(lesson.title), step: snapshot.stepIndex, frame: snapshot.frameIndex,
            title: sl(frame.title), prompt: frame.prompt?.sl ?? '', answers: frame.expectedObservations?.map(text => text.sl)});
        if (!added) return;
        setPlanted(sl(frame.title));
        const timer = window.setTimeout(() => setPlanted(undefined), 3200);
        return () => window.clearTimeout(timer);
    }, [enabled, recall, lesson, snapshot.stepIndex, snapshot.frameIndex, snapshot.status, frame]);

    if (!enabled) return {overlay: null, recalling: false};
    const rateAndGo = (rating: Rating) => {
        if (!recallCard) return;
        setRated(rate(recallCard.id, rating));
    };
    const queue = recall?.queue ?? [];
    const nextCard = queue.map(findCard).find((card): card is MemoryCard => !!card && card.id !== recallCard?.id)
        ?? dueCards().find(card => card.id !== recallCard?.id);
    const nextHref = nextCard ? recallUrl(nextCard, queue.filter(id => id !== nextCard.id)) : undefined;
    const overlay = createPortal(<>
        {planted && <div className="ux-memory-toast" role="status"><Seed/><span><strong>Posajeno v spomin.</strong> »{planted}« se vrne jutri.</span></div>}
        {recalling && recallCard && <div ref={barRef} className="ux-recall-bar" role="region" aria-label="Priklic">
            {!rated ? <>
                <div className="ux-recall-copy">
                    <span className="ux-recall-kicker"><Seed/> Spomin · {sl({sl: recallCard.lessonTitle})}</span>
                    {recallCard.prompt && <span className="ux-recall-question">{recallCard.prompt}</span>}
                    {!revealed && <span className="ux-recall-hint">Najprej odgovori brez pomoči: na grafu, na glas ali v mislih.</span>}
                    {revealed && (recallCard.answers?.length
                        ? <ul className="ux-recall-answers">{recallCard.answers.map((answer, index) => <li key={index}>{answer}</li>)}</ul>
                        : <span className="ux-recall-hint">Primerjaj z razlago v kartici lekcije.</span>)}
                </div>
                <div className="ux-recall-actions">
                    {!revealed ? <button type="button" className="ux-primary" onClick={() => setRevealed(true)}>Odkrij</button> : <>
                        <button type="button" onClick={() => rateAndGo('again')}>Nisem vedel</button>
                        <button type="button" onClick={() => rateAndGo('hard')}>Težko</button>
                        <button type="button" className="ux-primary" onClick={() => rateAndGo('good')}>Vedel sem</button>
                    </>}
                </div>
            </> : <>
                <div className="ux-recall-copy">
                    <span className="ux-recall-kicker"><Seed/> {rated.lastRating === 'good' ? 'Cvet se odpira.' : rated.lastRating === 'hard' ? 'Še malo zalivanja.' : 'Nič hudega: kmalu spet.'}</span>
                    <span>Naslednjič: <strong>{describeDue(rated)}</strong> · stopnja {rated.box} od 5</span>
                </div>
                <div className="ux-recall-actions">
                    <a className="ux-button" href="/bezeg-2.0/ux-lab/spomin">Na vrt</a>
                    {nextHref && <a className="ux-button ux-primary" href={nextHref}>Naslednji spomin</a>}
                </div>
            </>}
        </div>}
    </>, document.body);
    return {overlay, recalling};
}
