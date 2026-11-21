import {htmlToMarked, proseToHtml, toTeX} from './boardTextTex';

const math = (s: string) => `\\(${toTeX(s)}\\)`;

interface Line { text: string; big: boolean; warn: boolean; }

/** Top-level lines of the mirrored board texts (each board text may hold several `<div>` lines). */
function readLines(htmls: string[]): Line[] {
    const lines: Line[] = [];
    for (const html of htmls) {
        const box = document.createElement('div');
        box.innerHTML = html;
        const divs = [...box.children].filter(c => c.tagName === 'DIV');
        const nodes: Element[] = divs.length > 0 ? divs : [box];
        for (const d of nodes) {
            const style = d.getAttribute('style') ?? '';
            for (const part of htmlToMarked(d).split('\n')) {
                const text = part.trim();
                if (text !== '') lines.push({text, big: /font-size:\s*1\.2em/.test(style), warn: /#9c5d48/i.test(style)});
            }
        }
    }
    return lines;
}

/** Splits at commas followed by a space that are not inside brackets. */
function splitTop(s: string): string[] {
    const out: string[] = [];
    let depth = 0, start = 0;
    for (let i = 0; i < s.length; i++) {
        const c = s[i];
        if (c === '(' || c === '[') depth++;
        else if (c === ')' || c === ']') depth = Math.max(0, depth - 1);
        else if (c === ',' && s[i + 1] === ' ' && depth === 0) { out.push(s.slice(start, i)); start = i + 2; }
    }
    out.push(s.slice(start));
    return out.map(p => p.trim()).filter(p => p !== '');
}

function keyValue(piece: string, allowSuffix: boolean): [string, string] | undefined {
    const eq = piece.indexOf(' = ');
    if (eq > 0) return [piece.slice(0, eq), piece.slice(eq + 3)];
    if (!allowSuffix) return undefined;
    const m = /^(.*\p{L}\S*)\s+([−-]?[\d.,\u0005]+)$/u.exec(piece);
    return m ? [m[1], m[2]] : undefined;
}

function legendRow(text: string): string | undefined {
    const parts = text.split('; ');
    if (!/^(polna|črtkana|pikčasta) črta: /.test(parts[0])) return undefined;
    return '<div class="ux-btext-legend">' + parts.map(p => {
        const m = /^(polna|črtkana|pikčasta) črta: (.+)$/.exec(p);
        const swatch = m ? `<i class="ux-btext-sw ux-btext-sw-${m[1] === 'polna' ? 'solid' : 'dash'}"></i>` : '';
        return `<span class="ux-btext-leg">${swatch}${proseToHtml(m ? m[2] : p)}</span>`;
    }).join('') + '</div>';
}

/** The card body: formula on top, name = value readouts as a list, notes and legends muted last. */
export function buildCardHtml(htmls: string[]): string {
    const lines = readLines(htmls);
    let formula = '';
    const items: string[] = [];
    const notes: string[] = [];
    for (const l of lines) {
        if (l.big && formula === '') {
            formula = `<div class="ux-btext-formula">${l.text.includes('=') || !/\p{L}{2,}/u.test(l.text) ? math(l.text) : proseToHtml(l.text)}</div>`;
            continue;
        }
        const legend = legendRow(l.text);
        if (legend) { notes.push(legend); continue; }
        const pieces = splitTop(l.text);
        const hasEq = pieces.some(p => p.includes(' = '));
        const kv = pieces.map(p => keyValue(p, hasEq));
        if (kv.length > 0 && kv.every(Boolean)) {
            const cls = l.warn ? ' ux-btext-warn' : '';
            for (const [k, v] of kv as [string, string][]) {
                items.push(`<div class="ux-btext-k${cls}">${math(k)}</div><div class="ux-btext-v${cls}">${math(v)}</div>`);
            }
        } else notes.push(`<div class="ux-btext-note">${proseToHtml(l.text)}</div>`);
    }
    const list = items.length > 0 ? `<div class="ux-btext-list${items.length > 3 ? ' ux-btext-two' : ''}">${items.join('')}</div>` : '';
    return formula + list + notes.join('');
}
