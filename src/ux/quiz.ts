/**
 * Prototype c9 "Preveri se" (retrieval practice from Duolingo and Brilliant, and the museum quiz panel that asks
 * before it tells). Each lesson frame's own text becomes a short self-check on the graph, with no authoring: a
 * coordinate in the prose becomes "tap this point", a graph formula becomes "tap the curve that this is". The board
 * then shows where the answer is, how far off the tap was, and stars.
 */
import type {Board} from "jsxgraph";
import {boardShapes, sampleShape, type Shape} from "./boardShapes";
import {matchGraphShapes, pairText, texCoordinates, texGraphFunction} from "./liveProse";
import "./ux.css";

const SVG_NS = 'http://www.w3.org/2000/svg';

interface Question {
    kind: 'point' | 'curve';
    tex: string;
    source: HTMLElement;
    point?: [number, number];
    curves?: Shape[];
}

interface MathItem { math: string; typesetRoot: HTMLElement | null }

function proseItems(): MathItem[] {
    const root = document.querySelector('.guided-lesson-frame');
    if (!root) return [];
    try {
        return ((window as any).MathJax?.startup?.document?.getMathItemsWithin?.(root) ?? []) as MathItem[];
    } catch {
        return [];
    }
}

/**
 * The sentence around a formula, copied with the formula replaced by a blank, so a point question asks for the idea
 * ("Teme je v ▢") rather than for coordinates. A definition such as \(G=(3,5/3)\) keeps its name: "G = ▢".
 */
export function clozeSentence(source: HTMLElement): HTMLElement | undefined {
    const block = source.closest('p, li, td, .guided-lesson-reading, .guided-lesson-notation') as HTMLElement | null;
    if (!block) return undefined;
    const containers = Array.from(block.querySelectorAll('mjx-container'));
    const at = containers.indexOf(source);
    if (at < 0) return undefined;
    const copy = block.cloneNode(true) as HTMLElement;
    const target = copy.querySelectorAll('mjx-container')[at];
    const blank = document.createElement('span');
    blank.className = 'ux-quiz-blank-wrap';
    const spoken = source.querySelector('mjx-assistive-mml')?.textContent ?? '';
    const name = /^\s*([^=()]{1,12}?)\s*=\s*\(/.exec(spoken)?.[1];
    blank.innerHTML = `${name ? `<i>${name}</i> = ` : ''}<span class="ux-quiz-blank">?</span>`;
    target.replaceWith(blank);
    // Keep only the sentence around the blank: trim text before the last full stop before it and after the next one.
    let node: Node | null = blank;
    while (node && node.parentNode !== copy) node = node.parentNode;
    if (!node) return undefined;
    let cursor: Node | null = node.previousSibling;
    while (cursor) {
        const previous: Node | null = cursor.previousSibling;
        if (cursor.nodeType === Node.TEXT_NODE) {
            const text = cursor.textContent ?? '';
            const stop = Math.max(text.lastIndexOf('. '), text.lastIndexOf(': '));
            if (stop >= 0) {
                cursor.textContent = text.slice(stop + 2);
                while (cursor.previousSibling) copy.removeChild(cursor.previousSibling);
                break;
            }
        }
        cursor = previous;
    }
    cursor = node.nextSibling;
    while (cursor) {
        const following: Node | null = cursor.nextSibling;
        if (cursor.nodeType === Node.TEXT_NODE) {
            const text = cursor.textContent ?? '';
            const stop = text.search(/[.;](\s|$)/);
            if (stop >= 0) {
                cursor.textContent = text.slice(0, stop + 1);
                while (cursor.nextSibling) copy.removeChild(cursor.nextSibling);
                break;
            }
        }
        cursor = following;
    }
    copy.removeAttribute('id');
    copy.className = 'ux-quiz-sentence';
    copy.querySelectorAll('.ux-lp').forEach(element => element.classList.remove('ux-lp', 'ux-lp-coord', 'ux-lp-symbol', 'ux-lp-graph', 'ux-lp-lit', 'ux-lp-assign', 'ux-lp-live'));
    copy.querySelectorAll('[tabindex]').forEach(element => element.removeAttribute('tabindex'));
    return (copy.textContent ?? '').length > 260 ? undefined : copy;
}

function format(value: number): string {
    return String(Math.round(value * 1000) / 1000).replace('-', '−').replace('.', ',');
}

export function attachQuiz(board: Board): () => void {
    const container = board.containerObj as HTMLElement | undefined;
    const svg = (board.renderer as any)?.svgRoot as SVGSVGElement | undefined;
    if (!container || !svg) return () => undefined;

    const start = document.createElement('button');
    start.type = 'button';
    start.className = 'ux-quiz-start';
    start.hidden = true;
    const capture = document.createElement('div');
    capture.className = 'ux-quiz-capture';
    capture.hidden = true;
    const layer = document.createElementNS(SVG_NS, 'svg');
    layer.setAttribute('class', 'ux-quiz-layer');
    layer.setAttribute('aria-hidden', 'true');
    const card = document.createElement('div');
    card.className = 'ux-predict-card ux-quiz-card';
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-label', 'Preveri se');
    card.hidden = true;
    container.append(layer, capture, card, start);
    for (const element of [start, card, capture]) {
        for (const type of ['pointerdown', 'mousedown', 'touchstart', 'wheel']) element.addEventListener(type, event => event.stopPropagation());
    }

    let questions: Question[] = [];
    let index = 0;
    let stars = 0;
    let answered = false;

    const toScreen = (x: number, y: number): [number, number] => {
        const origin = (board as any).origin.scrCoords as number[];
        return [origin[1] + x * (board as any).unitX, origin[2] - y * (board as any).unitY];
    };
    const inView = ([sx, sy]: [number, number]) => sx > 12 && sy > 12 && sx < svg.clientWidth - 12 && sy < svg.clientHeight - 12;

    /** Questions this frame's text can ask about the board as it is drawn now. */
    const collect = (): Question[] => {
        const found: Question[] = [];
        const seen = new Set<string>();
        const curvesOnBoard = boardShapes(board).filter(shape => !shape.dot && sampleShape(shape, 12).some(inView));
        for (const item of proseItems()) {
            const source = item.typesetRoot;
            if (!source || seen.has(item.math)) continue;
            const f = texGraphFunction(item.math);
            if (f && curvesOnBoard.length >= 2) {
                const curves = matchGraphShapes(board, f);
                // A useful question has one answer and at least one other curve to confuse it with.
                if (curves.length >= 1 && curves.length < curvesOnBoard.length) {
                    seen.add(item.math);
                    found.push({kind: 'curve', tex: item.math, source, curves});
                    continue;
                }
            }
            const coordinates = texCoordinates(item.math);
            if (coordinates.length === 1 && inView(toScreen(...coordinates[0]))) {
                const key = coordinates[0].join(',');
                if (seen.has(key)) continue;
                seen.add(key);
                found.push({kind: 'point', tex: item.math, source, point: coordinates[0]});
            }
        }
        // Curves first (they ask more), then at most three points.
        const curves = found.filter(q => q.kind === 'curve');
        // Points that are not on the grid (a centroid, a midpoint) ask more than reading off integers.
        const offGrid = (q: Question) => q.point!.some(v => Math.abs(v - Math.round(v)) > 1e-9) ? 0 : 1;
        const points = found.filter(q => q.kind === 'point').sort((a, b) => offGrid(a) - offGrid(b));
        return [...curves.slice(0, 2), ...points.slice(0, 4 - Math.min(2, curves.length))];
    };

    const refreshStart = () => {
        if (!card.hidden) return;
        const available = collect();
        start.hidden = available.length === 0;
        start.innerHTML = `<span aria-hidden="true">✓</span> Preveri se <span class="ux-quiz-count">${available.length}</span>`;
        start.setAttribute('aria-label', `Preveri se: ${available.length} vprašanj o grafu`);
    };

    const clearLayer = () => {
        layer.replaceChildren();
        layer.setAttribute('width', String(svg.clientWidth));
        layer.setAttribute('height', String(svg.clientHeight));
        layer.setAttribute('viewBox', `0 0 ${svg.clientWidth} ${svg.clientHeight}`);
    };
    const add = (tag: string, attrs: Record<string, string | number>) => {
        const node = document.createElementNS(SVG_NS, tag);
        for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, String(value));
        layer.appendChild(node);
        return node;
    };
    const outline = (shape: Shape, className: string) => {
        const copy = shape.node.cloneNode(false) as SVGElement;
        copy.removeAttribute('id');
        copy.removeAttribute('style');
        copy.setAttribute('class', className);
        copy.setAttribute('fill', 'none');
        layer.appendChild(copy);
    };

    /** Moves the card to the corner farthest from the marks it must not hide (the tap and the answer). */
    const placeCard = (marks: [number, number][]) => {
        const compact = svg.clientWidth < 560;
        card.classList.toggle('ux-quiz-compact', compact);
        const width = svg.clientWidth, height = svg.clientHeight;
        const corners: {top: boolean; right: boolean}[] = [{top: true, right: true}, {top: false, right: true}, {top: true, right: false}, {top: false, right: false}];
        const score = (corner: {top: boolean; right: boolean}) => {
            const cx = corner.right ? width * 0.78 : width * 0.22, cy = corner.top ? height * 0.2 : height * 0.8;
            return Math.min(...marks.map(([x, y]) => Math.hypot((x - cx) / width, (y - cy) / height)), 9);
        };
        const best = compact
            ? (marks.some(([, y]) => y > height * 0.5) && !marks.some(([, y]) => y < height * 0.45) ? {top: true, right: true} : marks.length ? {top: false, right: true} : {top: true, right: true})
            : corners.reduce((a, b) => (score(b) > score(a) ? b : a));
        card.style.top = best.top ? (compact ? '6px' : '12px') : 'auto';
        card.style.bottom = best.top ? 'auto' : (compact ? '6px' : '12px');
        if (compact) { card.style.left = '6px'; card.style.right = '6px'; }
        else { card.style.left = best.right ? 'auto' : '12px'; card.style.right = best.right ? '12px' : 'auto'; }
    };

    const starRow = (earned: number) =>
        `<p class="ux-predict-stars" aria-label="${earned} od 3 zvezdic">${[0, 1, 2].map(i => `<span class="${i < earned ? 'on' : ''}">★</span>`).join('')}</p>`;

    const formula = (question: Question) => {
        const copy = question.source.cloneNode(true) as HTMLElement;
        copy.classList.remove('ux-lp', 'ux-lp-coord', 'ux-lp-symbol', 'ux-lp-graph', 'ux-lp-lit', 'ux-lp-assign', 'ux-lp-live');
        copy.removeAttribute('tabindex');
        copy.style.removeProperty('--ux-lp-color');
        return copy;
    };

    // While a question is open, the answer in the lesson text is blurred.
    const hideAnswer = (question: Question | undefined, hidden: boolean) => {
        if (!question) return;
        for (const item of proseItems()) {
            if (item.typesetRoot && (item.math === question.tex || item.typesetRoot === question.source)) item.typesetRoot.classList.toggle('ux-quiz-hidden', hidden);
        }
    };

    const ask = () => {
        const question = questions[index];
        answered = false;
        hideAnswer(question, true);
        clearLayer();
        capture.hidden = false;
        container.classList.add('ux-quizzing');
        const sentence = question.kind === 'point' ? clozeSentence(question.source) : undefined;
        const task = question.kind === 'curve' ? 'Tapni krivuljo' : sentence ? 'Dopolni s tapom na grafu' : 'Tapni točko';
        const help = question.kind === 'curve' ? 'Katera od narisanih krivulj je to? Tapni nanjo.'
            : sentence ? 'Kje na grafu je točka, ki manjka? Tapni tja.' : 'Kje na grafu je ta točka? Tapni tja, kjer misliš, da je.';
        card.innerHTML = `<p class="ux-predict-kicker">Preveri se · ${index + 1}/${questions.length}</p>
            <p class="ux-quiz-task">${task} <span class="ux-quiz-formula"></span></p>
            <div class="ux-quiz-cloze"></div>
            <p class="ux-predict-text">${help}</p>
            <div class="ux-predict-actions"><button type="button" class="ux-quiz-skip">Preskoči</button><button type="button" class="ux-quiz-close">Zapri</button></div>`;
        // The card never covers the answer (on a phone it takes half the board).
        placeCard(question.point ? [toScreen(...question.point)] : []);
        if (sentence) card.querySelector('.ux-quiz-cloze')!.appendChild(sentence);
        else card.querySelector('.ux-quiz-formula')!.appendChild(formula(question));
        card.querySelector('.ux-quiz-skip')!.addEventListener('click', next);
        card.querySelector('.ux-quiz-close')!.addEventListener('click', close);
        card.hidden = false;
    };

    const answer = (sx: number, sy: number) => {
        const question = questions[index];
        if (answered) return;
        answered = true;
        hideAnswer(question, false);
        capture.hidden = true;
        clearLayer();
        let earned = 0;
        let verdict = '';
        const marks: [number, number][] = [[sx, sy]];
        if (question.kind === 'point' && question.point) {
            const [tx, ty] = toScreen(...question.point);
            const miss = Math.hypot(tx - sx, ty - sy);
            marks.push([tx, ty]);
            earned = miss <= 14 ? 3 : miss <= 30 ? 2 : miss <= 60 ? 1 : 0;
            const unit = (board as any).unitX as number;
            add('line', {x1: sx, y1: sy, x2: tx, y2: ty, class: 'ux-quiz-miss'});
            add('circle', {cx: tx, cy: ty, r: 16, class: 'ux-quiz-truth-pulse'});
            add('circle', {cx: tx, cy: ty, r: 6, class: 'ux-quiz-truth'});
            add('path', {d: `M${sx - 6} ${sy - 6}L${sx + 6} ${sy + 6}M${sx + 6} ${sy - 6}L${sx - 6} ${sy + 6}`, class: 'ux-quiz-tap'});
            const off = miss / unit;
            verdict = earned === 3 ? 'Natančno.' : `Zgrešeno za približno ${format(off)} enot.`;
            verdict += ` Točka ${pairText(question.point[0], question.point[1])} je označena z zelenim krogom.`;
        } else if (question.curves) {
            let best: Shape | undefined;
            let bestDistance = 18;
            for (const shape of boardShapes(board)) {
                if (shape.dot) continue;
                for (const [px, py] of sampleShape(shape, 4)) {
                    const distance = Math.hypot(px - sx, py - sy);
                    if (distance < bestDistance) { bestDistance = distance; best = shape; }
                }
            }
            const right = best !== undefined && question.curves.some(shape => shape.node === best!.node);
            for (const shape of question.curves) outline(shape, 'ux-quiz-curve-right');
            if (best && !right) outline(best, 'ux-quiz-curve-wrong');
            add('path', {d: `M${sx - 6} ${sy - 6}L${sx + 6} ${sy + 6}M${sx + 6} ${sy - 6}L${sx - 6} ${sy + 6}`, class: 'ux-quiz-tap'});
            earned = right ? 3 : 0;
            verdict = right ? 'Prava krivulja.' : best ? 'To je druga krivulja; prava je obarvana zeleno.' : 'Tap ni zadel nobene krivulje; prava je obarvana zeleno.';
        }
        stars += earned;
        const last = index === questions.length - 1;
        card.innerHTML = `<p class="ux-predict-kicker">Preveri se · ${index + 1}/${questions.length}</p>${starRow(earned)}
            <p class="ux-predict-text">${verdict}</p>
            <div class="ux-predict-actions"><button type="button" class="ux-predict-done ux-quiz-next">${last ? 'Rezultat' : 'Naslednje'}</button></div>`;
        placeCard(marks);
        card.querySelector('.ux-quiz-next')!.addEventListener('click', next);
        (card.querySelector('.ux-quiz-next') as HTMLButtonElement).focus({preventScroll: true});
    };

    const next = () => {
        hideAnswer(questions[index], false);
        if (index < questions.length - 1) { index++; ask(); return; }
        clearLayer();
        capture.hidden = true;
        const total = questions.length * 3;
        const praise = stars === total ? 'Vse zadeto. Graf bereš tekoče.' : stars >= total * 0.6 ? 'Dobro. Poglej še označene odgovore.' : 'Preberi okvir še enkrat in poskusi znova.';
        card.innerHTML = `<p class="ux-predict-kicker">Preveri se · rezultat</p>
            <p class="ux-quiz-score">${stars} / ${total} <span aria-hidden="true">★</span></p>
            <p class="ux-predict-text">${praise}</p>
            <div class="ux-predict-actions"><button type="button" class="ux-quiz-again">Znova</button><button type="button" class="ux-predict-done ux-quiz-close">Zapri</button></div>`;
        card.querySelector('.ux-quiz-again')!.addEventListener('click', begin);
        card.querySelector('.ux-quiz-close')!.addEventListener('click', close);
    };

    const close = () => {
        hideAnswer(questions[index], false);
        card.hidden = true;
        capture.hidden = true;
        clearLayer();
        container.classList.remove('ux-quizzing');
        refreshStart();
    };

    const begin = () => {
        questions = collect();
        if (!questions.length) { close(); return; }
        index = 0;
        stars = 0;
        start.hidden = true;
        ask();
    };

    start.addEventListener('click', begin);
    capture.addEventListener('pointerup', event => {
        const box = capture.getBoundingClientRect();
        answer(event.clientX - box.left, event.clientY - box.top);
    });

    // The available questions follow the frame: a new frame typesets new prose, and the board may change.
    let timer = 0;
    const schedule = () => { window.clearTimeout(timer); timer = window.setTimeout(refreshStart, 400); };
    const root = document.querySelector('.guided-lesson-layer') ?? document.body;
    const observer = new MutationObserver(schedule);
    observer.observe(root, {childList: true, subtree: true});
    const onFrame = () => { if (!card.hidden && !document.body.contains(questions[index]?.source ?? null)) close(); };
    const interval = window.setInterval(() => { onFrame(); if (card.hidden) refreshStart(); }, 1500);
    schedule();

    return () => {
        observer.disconnect();
        window.clearTimeout(timer);
        window.clearInterval(interval);
        container.classList.remove('ux-quizzing');
        for (const element of [start, capture, card, layer]) element.remove();
    };
}
