/**
 * Prototype c5 "Ujemi" (a matching game, after graph-matching puzzles, Desmos Marbleslides and arcade "hit the shape"
 * rounds). The current picture becomes a glowing target, a few sliders that really shape it are scrambled, and the
 * student finds the way back with any tool: sliders, typed values, c2 swings or c4 grabbing. A meter shows the match
 * live; a hit gives stars by time, and each next round scrambles one parameter more.
 */
import type {Board} from "jsxgraph";
import {boardShapes, sampleShape} from "./boardShapes";
import {RegisteredSlider, usableSliders} from "./sliderRegistry";
import "./ux.css";

type Vec = [number, number];
const SVG_NS = 'http://www.w3.org/2000/svg';
const LEVEL_KEY = 'bezeg-ux-c5-level';
const STREAK_KEY = 'bezeg-ux-c5-streak';

function frames(count: number): Promise<void> {
    return new Promise(resolve => {
        const step = (left: number) => requestAnimationFrame(() => (left <= 1 ? resolve() : step(left - 1)));
        step(count);
    });
}

function readNumber(key: string, fallback: number): number {
    try { const value = Number(sessionStorage.getItem(key)); return Number.isFinite(value) && value > 0 ? value : fallback; } catch { return fallback; }
}

function writeNumber(key: string, value: number) {
    try { sessionStorage.setItem(key, String(value)); } catch { /* storage may be unavailable */ }
}

function snap(slider: RegisteredSlider, value: number): number {
    const clamped = Math.min(slider.max, Math.max(slider.min, value));
    const snapped = slider.step > 0 ? slider.min + Math.round((clamped - slider.min) / slider.step) * slider.step : clamped;
    return Math.round(Math.min(slider.max, Math.max(slider.min, snapped)) * 1e9) / 1e9;
}

function strokes(board: Board) {
    return boardShapes(board).filter(shape => !shape.dot);
}

const kindOf = (shape: {element: any; node: Element}) => `${shape.element.elType}|${shape.node.getAttribute('stroke') ?? ''}`;

function viewKey(board: Board): string {
    return board.getBoundingBox().map(v => v.toFixed(5)).join(',');
}

function drawnGrid(board: Board) {
    const drawn = new Set<string>();
    for (const shape of strokes(board)) for (const [x, y] of sampleShape(shape, 1.5)) drawn.add(`${Math.round(x / 2)},${Math.round(y / 2)}`);
    return ([x, y]: Vec) => {
        const cx = Math.round(x / 2), cy = Math.round(y / 2);
        for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) if (drawn.has(`${cx + dx},${cy + dy}`)) return true;
        return false;
    };
}

/** Strokes of the snapshot that are no longer drawn where they were (a redraw in place does not count). */
function moved<T extends {points: Vec[]}>(board: Board, snapshot: T[]): T[] {
    const stillThere = drawnGrid(board);
    return snapshot.filter(shape => shape.points.length > 0 && shape.points.filter(stillThere).length / shape.points.length < 0.9);
}

export function attachMatchChallenge(board: Board): () => void {
    const container = board.containerObj as HTMLElement | undefined;
    const svg = (board.renderer as any)?.svgRoot as SVGSVGElement | undefined;
    if (!container || !svg) return () => undefined;

    const start = document.createElement('button');
    start.type = 'button';
    start.className = 'ux-match-start';
    start.innerHTML = '<svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true"><circle cx="10" cy="10" r="7.5" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="10" cy="10" r="3.6" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="10" cy="10" r="1" fill="currentColor"/></svg><span>Izziv</span>';
    start.title = 'Izziv: graf postane tarča, nekaj drsnikov se premeša, ti pa najdi pot nazaj';
    start.hidden = true;
    const hud = document.createElement('div');
    hud.className = 'ux-match-hud';
    hud.hidden = true;
    const target = document.createElementNS(SVG_NS, 'g');
    target.setAttribute('class', 'ux-match-target');
    container.append(start, hud);
    for (const element of [start, hud]) for (const type of ['pointerdown', 'mousedown', 'touchstart', 'wheel']) element.addEventListener(type, event => event.stopPropagation());

    let round: {stop: () => void} | undefined;
    const availability = window.setInterval(() => { start.hidden = !!round || usableSliders().length === 0; }, 700);

    const begin = async () => {
        const sliders = usableSliders();
        if (sliders.length === 0) return;
        start.hidden = true;
        const level = Math.min(3, readNumber(LEVEL_KEY, 1));
        // Snapshot now: shape nodes are live and will show the scrambled picture later.
        const before = strokes(board).map(shape => {
            const clone = shape.node.cloneNode(false) as SVGElement;
            clone.removeAttribute('id');
            clone.removeAttribute('style');
            clone.removeAttribute('marker-start');
            clone.removeAttribute('marker-end');
            return {key: shape.key, element: shape.element, clone, points: sampleShape(shape, 4), kind: kindOf(shape)};
        });
        const beforeKeys = new Set(before.map(shape => shape.key));
        const view = viewKey(board);
        // Scramble sliders that visibly reshape the picture; a slider whose change leaves every stroke in place is put back.
        const chosen: {slider: RegisteredSlider; answer: number}[] = [];
        for (const slider of [...sliders].sort(() => Math.random() - 0.5)) {
            if (chosen.length >= level) break;
            const answer = slider.value();
            const span = slider.max - slider.min;
            const width = svg.clientWidth, height = svg.clientHeight;
            const onScreen = () => {
                const points = strokes(board).filter(shape => !beforeKeys.has(shape.key)).flatMap(shape => sampleShape(shape, 8));
                return points.length > 0 && points.filter(([x, y]) => x > 8 && y > 8 && x < width - 8 && y < height - 8).length / points.length > 0.35;
            };
            let changed = false;
            // A fair scramble: 12-45 % of the range away, and the scrambled picture stays mostly on the board.
            for (let attempt = 0; attempt < 5 && !changed; attempt++) {
                const away = (0.12 + Math.random() * 0.33) * span * (Math.random() < 0.5 ? -1 : 1);
                let next = snap(slider, answer + away);
                if (Math.abs(next - answer) < span * 0.08) next = snap(slider, answer - away);
                if (Math.abs(next - answer) < span * 0.08) continue;
                slider.set(next);
                await frames(3);
                changed = moved(board, before).length > 0 && onScreen();
            }
            if (changed) chosen.push({slider, answer});
            else { slider.set(answer); await frames(2); }
        }
        if (chosen.length === 0) { start.hidden = false; return; }
        const goal = moved(board, before);
        const goalPoints: Vec[] = goal.flatMap(shape => shape.points);
        const goalKinds = new Set(goal.map(shape => shape.kind));
        if (goalPoints.length === 0) {
            for (const {slider, answer} of chosen) slider.set(answer);
            start.hidden = false;
            return;
        }
        target.replaceChildren(...goal.map(shape => shape.clone));
        const firstLayer = (board.renderer as any).layer?.[0] as Element | undefined;
        svg.insertBefore(target, firstLayer && firstLayer.parentNode === svg ? firstLayer.nextSibling : svg.firstChild);

        const began = performance.now();
        let stopped = false;
        let solved = false;
        let timer = 0;
        hud.hidden = false;
        hud.classList.toggle('ux-match-compact', svg.clientWidth < 560);
        hud.classList.remove('ux-match-won', 'ux-match-shown');
        hud.innerHTML = `<div class="ux-match-head"><strong>Ujemi tarčo</strong><span class="ux-match-level">${'●'.repeat(chosen.length)}${'○'.repeat(3 - chosen.length)}</span><button type="button" class="ux-match-close" aria-label="Končaj izziv">×</button></div>
            <p class="ux-match-task">${chosen.length === 1 ? 'Premešan je en drsnik' : chosen.length === 2 ? 'Premešana sta dva drsnika' : 'Premešani so trije drsniki'}. Spravi graf nazaj na zlato tarčo.</p>
            <div class="ux-match-meter" role="meter" aria-label="Ujemanje" aria-valuemin="0" aria-valuemax="100"><span></span></div>
            <p class="ux-match-status"><span class="ux-match-percent">0 %</span><span class="ux-match-time">0 s</span></p>
            <div class="ux-match-actions"><button type="button" class="ux-match-hint">Namig</button><button type="button" class="ux-match-give">Pokaži rešitev</button></div>`;
        const meter = hud.querySelector<HTMLElement>('.ux-match-meter')!;
        const bar = meter.querySelector<HTMLElement>('span')!;
        const percent = hud.querySelector<HTMLElement>('.ux-match-percent')!;
        const time = hud.querySelector<HTMLElement>('.ux-match-time')!;

        const stop = () => {
            if (stopped) return;
            stopped = true;
            window.clearInterval(timer);
            target.remove();
            hud.hidden = true;
            document.querySelectorAll('.ux-match-hinted').forEach(element => element.classList.remove('ux-match-hinted'));
            round = undefined;
            start.hidden = usableSliders().length === 0;
        };
        round = {stop};
        hud.querySelector('.ux-match-close')!.addEventListener('click', stop);
        hud.querySelector('.ux-match-hint')!.addEventListener('click', () => {
            for (const {slider} of chosen) slider.element()?.classList.add('ux-match-hinted');
            const first = chosen[0].slider.element();
            first?.scrollIntoView({block: 'nearest', behavior: 'smooth'});
        });
        hud.querySelector('.ux-match-give')!.addEventListener('click', async () => {
            const from = chosen.map(({slider}) => slider.value());
            const t0 = performance.now();
            while (!stopped) {
                const u = Math.min(1, (performance.now() - t0) / 900);
                const ease = u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2;
                chosen.forEach(({slider, answer}, index) => slider.set(snap(slider, from[index] + (answer - from[index]) * ease)));
                if (u >= 1) break;
                await frames(1);
            }
            finish(false);
        });

        const measure = (): number => {
            const current = strokes(board).filter(shape => goalKinds.has(kindOf(shape))).flatMap(shape => sampleShape(shape, 5));
            if (current.length === 0 || goalPoints.length === 0) return Infinity;
            let total = 0;
            for (const [x, y] of goalPoints) {
                let best = Infinity;
                for (const [cx, cy] of current) {
                    const d = (cx - x) ** 2 + (cy - y) ** 2;
                    if (d < best) best = d;
                }
                total += Math.sqrt(best);
            }
            return total / goalPoints.length;
        };

        const finish = (won: boolean) => {
            if (solved) return;
            solved = true;
            window.clearInterval(timer);
            const seconds = (performance.now() - began) / 1000;
            const stars = !won ? 0 : seconds < 15 * chosen.length ? 3 : seconds < 35 * chosen.length ? 2 : 1;
            const streak = won ? readNumber(STREAK_KEY, 0) + 1 : 0;
            writeNumber(STREAK_KEY, Math.max(streak, 0));
            if (won) writeNumber(LEVEL_KEY, Math.min(3, level + 1));
            bar.style.width = '100%';
            percent.textContent = '100 %';
            meter.classList.add('ux-match-full');
            hud.classList.add(won ? 'ux-match-won' : 'ux-match-shown');
            const task = hud.querySelector<HTMLElement>('.ux-match-task')!;
            task.innerHTML = won
                ? `<span class="ux-match-stars">${[0, 1, 2].map(i => `<span class="${i < stars ? 'on' : ''}">✦</span>`).join('')}</span> Zadetek v ${seconds.toFixed(1).replace('.', ',')} s${streak > 1 ? ` · ${streak} zapored` : ''}`
                : 'Rešitev: drsniki so na tarči. ' + chosen.map(({slider, answer}) => `${slider.label} = ${String(answer).replace('.', ',')}`).join(', ');
            hud.querySelector('.ux-match-actions')!.innerHTML = '<button type="button" class="ux-match-again">Nov izziv</button>';
            hud.querySelector('.ux-match-again')!.addEventListener('click', () => { stop(); void begin(); });
            if (won) burst();
        };

        const burst = () => {
            const rect = container.getBoundingClientRect();
            const centre: Vec = goalPoints.length ? goalPoints[Math.floor(goalPoints.length / 2)] : [rect.width / 2, rect.height / 2];
            for (let i = 0; i < 16; i++) {
                const floret = document.createElement('span');
                floret.className = 'ux-match-floret';
                floret.textContent = '✿';
                const angle = (i / 16) * Math.PI * 2 + Math.random() * 0.4;
                const reach = 60 + Math.random() * 70;
                floret.style.left = `${centre[0]}px`;
                floret.style.top = `${centre[1]}px`;
                floret.style.setProperty('--dx', `${Math.cos(angle) * reach}px`);
                floret.style.setProperty('--dy', `${Math.sin(angle) * reach}px`);
                floret.style.animationDelay = `${Math.random() * 120}ms`;
                container.appendChild(floret);
                window.setTimeout(() => floret.remove(), 1400);
            }
        };

        timer = window.setInterval(() => {
            if (stopped || solved) return;
            if (viewKey(board) !== view) { stop(); return; }
            const distance = measure();
            const exact = chosen.every(({slider, answer}) => Math.abs(slider.value() - answer) <= Math.max(1e-9, slider.step / 2));
            const score = Math.max(0, Math.min(1, 1 - distance / 70));
            bar.style.width = `${Math.round(score * 100)}%`;
            percent.textContent = `${Math.round(score * 100)} %`;
            meter.setAttribute('aria-valuenow', String(Math.round(score * 100)));
            meter.dataset.close = score > 0.85 ? 'hot' : score > 0.6 ? 'warm' : 'cold';
            time.textContent = `${Math.floor((performance.now() - began) / 1000)} s`;
            if (exact || distance < 1.2) finish(true);
        }, 140);
    };

    start.addEventListener('click', () => { void begin(); });
    return () => {
        window.clearInterval(availability);
        round?.stop();
        start.remove();
        hud.remove();
        target.remove();
    };
}
