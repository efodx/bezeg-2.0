/**
 * Lane B b5: browser-local memory of observation moments, reviewed with Leitner spacing. A card points at one lesson
 * frame (demonstration path, lesson, step, frame); the lesson itself rebuilds the scene, so nothing graph-specific is
 * stored.
 */
export interface MemoryCard {
    id: string;
    path: string;
    lessonId: string;
    lessonTitle: string;
    step: number;
    frame: number;
    title: string;
    prompt: string;
    /** What the learner should have noticed (lesson text with inline TeX). */
    answers?: string[];
    box: number;
    due: number;
    created: number;
    reviews: number;
    lastRating?: Rating;
}

export type Rating = 'again' | 'hard' | 'good';

const CARDS_KEY = 'bezeg-ux-b5-cards';
const CLOCK_KEY = 'bezeg-ux-b5-clock-offset';
const DAY = 24 * 60 * 60 * 1000;
/** Days until the next review for each box (1 = new or forgotten). */
export const BOX_DAYS = [0, 1, 3, 7, 16, 35];

export function now(): number {
    let offset = 0;
    try { offset = Number(window.localStorage.getItem(CLOCK_KEY) ?? 0) || 0; } catch { offset = 0; }
    return Date.now() + offset;
}

export function clockOffsetDays(): number {
    try { return Math.round((Number(window.localStorage.getItem(CLOCK_KEY) ?? 0) || 0) / DAY); } catch { return 0; }
}

export function travel(days: number) {
    try {
        const offset = days === 0 ? 0 : (Number(window.localStorage.getItem(CLOCK_KEY) ?? 0) || 0) + days * DAY;
        window.localStorage.setItem(CLOCK_KEY, String(offset));
    } catch { /* storage off */ }
}

export function loadCards(): MemoryCard[] {
    try {
        const parsed: unknown = JSON.parse(window.localStorage.getItem(CARDS_KEY) ?? '[]');
        return Array.isArray(parsed) ? parsed.filter((card): card is MemoryCard => typeof card === 'object' && card !== null && typeof (card as MemoryCard).id === 'string') : [];
    } catch { return []; }
}

function saveCards(cards: MemoryCard[]) {
    try { window.localStorage.setItem(CARDS_KEY, JSON.stringify(cards)); } catch { /* storage off */ }
}

export function cardId(path: string, lessonId: string, step: number, frame: number) {
    return `${path}#${lessonId}#${step}.${frame}`;
}

/** Plants a card the first time a learner reaches an observation frame; it comes back tomorrow. */
export function plant(card: Omit<MemoryCard, 'box' | 'due' | 'created' | 'reviews'>, dueNow = false): boolean {
    const cards = loadCards();
    if (cards.some(existing => existing.id === card.id)) return false;
    const time = now();
    cards.push({...card, box: 1, due: dueNow ? time - 1 : time + BOX_DAYS[1] * DAY, created: time, reviews: 0});
    saveCards(cards);
    return true;
}

export function rate(id: string, rating: Rating): MemoryCard | undefined {
    const cards = loadCards();
    const card = cards.find(item => item.id === id);
    if (!card) return undefined;
    card.box = rating === 'again' ? 1 : rating === 'hard' ? Math.max(1, card.box) : Math.min(5, card.box + 1);
    const days = rating === 'again' ? 0.25 : BOX_DAYS[card.box] * (rating === 'hard' ? 0.6 : 1);
    card.due = now() + Math.max(0.25, days) * DAY;
    card.reviews++;
    card.lastRating = rating;
    saveCards(cards);
    return card;
}

export function dueCards(): MemoryCard[] {
    const time = now();
    return loadCards().filter(card => card.due <= time).sort((a, b) => a.due - b.due);
}

export function forgetAll() { saveCards([]); }

export function recallUrl(card: MemoryCard, queue: readonly string[] = []): string {
    const rest = queue.length ? `&queue=${encodeURIComponent(queue.join('|'))}` : '';
    return `${card.path}?learn=1&ux=b5&recall=${encodeURIComponent(card.id)}${rest}`;
}

export function readRecall(): {id: string; queue: string[]} | undefined {
    if (typeof window === 'undefined') return undefined;
    const query = new URLSearchParams(window.location.search);
    const id = query.get('recall');
    if (!id) return undefined;
    return {id, queue: (query.get('queue') ?? '').split('|').filter(Boolean)};
}

export function findCard(id: string): MemoryCard | undefined {
    return loadCards().find(card => card.id === id);
}

export function describeDue(card: MemoryCard): string {
    const days = (card.due - now()) / DAY;
    if (days <= 0) return 'zdaj';
    if (days < 1) return `čez ${Math.max(1, Math.round(days * 24))} h`;
    const rounded = Math.round(days);
    return rounded === 1 ? 'jutri' : rounded === 2 ? 'čez 2 dni' : rounded < 5 ? `čez ${rounded} dni` : `čez ${rounded} dni`;
}
