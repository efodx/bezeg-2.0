import {useEffect} from 'react';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {ChevronDownIcon, HelpIcon} from '../dock/icons';

/**
 * Tools-card sections (owner, 2026-11-21): each `.inspector-group` with a heading folds (chevron, remembered per heading text)
 * and keeps its help paragraphs behind a "?" . The inspector markup belongs to React and to many graphs, so this only adds
 * attributes and two buttons inside the heading, idempotently, and re-applies after every re-render (MutationObserver).
 * Help is `p.inspector-help`, `.form-text` and plain group paragraphs; status lines (role=status/alert, aria-live, refusal
 * notices) are never help and stay visible.
 */
const FOLD_PREFIX = 'ux-tools-fold:';
const STATUS = '[role="status"], [role="alert"], [aria-live], [data-refusal-notice], .function-status, .preset-field-message, .visually-hidden';
const HELP = 'p, .inspector-help, .form-text';
const icon = (el: React.ReactElement) => renderToStaticMarkup(el);
const CHEVRON = icon(createElement(ChevronDownIcon));
const HELP_SVG = icon(createElement(HelpIcon));

const readFold = (name: string) => { try { return localStorage.getItem(FOLD_PREFIX + name) === '1'; } catch { return false; } };
const writeFold = (name: string, folded: boolean) => { try { if (folded) localStorage.setItem(FOLD_PREFIX + name, '1'); else localStorage.removeItem(FOLD_PREFIX + name); } catch { /* ignore */ } };

// Sections: inspector groups, plus a point-list fieldset (heading = its legend) and a card body (heading = its .card-title),
// e.g. "Koordinate točk" and "Konstrukcija". The heading is always a direct child of the section.
const SECTION = '.inspector-group, .inspector-reveals, fieldset.point-list, .card-body';
const HEADING = 'h3, legend, .card-title';
const headingOf = (group: Element): HTMLElement | null => {
    const h = Array.from(group.children).find(c => c.matches(HEADING));
    return (h as HTMLElement) ?? null;
};
const nameOf = (h: HTMLElement) => (h.dataset.uxSecName ??= (h.textContent ?? '').trim());

function apply(root: HTMLElement) {
    let n = 0;
    root.querySelectorAll<HTMLElement>(SECTION).forEach(group => {
        const h = headingOf(group);
        if (!h) return;
        const name = nameOf(h);
        if (!name) return;
        if (h.dataset.uxSec === undefined) h.dataset.uxSec = '';
        // Help: paragraphs whose nearest group is this one and that are not status lines.
        const helps = Array.from(group.querySelectorAll<HTMLElement>(HELP)).filter(el =>
            el.closest(SECTION) === group && !el.closest(STATUS) && !el.matches(STATUS) && !el.closest('h3, legend, .card-title, button, label, summary'));
        helps.forEach(el => { if (el.dataset.uxHelpText === undefined) el.dataset.uxHelpText = ''; });
        if (!h.querySelector(':scope > .ux-sec-fold')) {
            const b = document.createElement('button');
            b.type = 'button'; b.className = 'ux-sec-fold'; b.innerHTML = CHEVRON;
            h.insertBefore(b, h.firstChild);
        }
        const fold = h.querySelector<HTMLButtonElement>(':scope > .ux-sec-fold')!;
        const folded = readFold(name);
        group.toggleAttribute('data-ux-folded', folded);
        fold.setAttribute('aria-expanded', String(!folded));
        fold.setAttribute('aria-label', `${folded ? 'Pokaži' : 'Skrij'} razdelek: ${name}`);
        let help = h.querySelector<HTMLButtonElement>(':scope > .ux-sec-help');
        if (helps.length && !help) {
            help = document.createElement('button');
            help.type = 'button'; help.className = 'ux-sec-help'; help.innerHTML = HELP_SVG;
            help.setAttribute('aria-expanded', String(group.hasAttribute('data-ux-help-open')));
            h.appendChild(help);
        }
        if (help && !helps.length) help.remove();
        if (help) {
            help.setAttribute('aria-label', `Pomoč: ${name}`);
            help.title = `Pomoč: ${name}`;
            help.setAttribute('aria-expanded', String(group.hasAttribute('data-ux-help-open')));
        }
        n++;
    });
    return n;
}

/** Marks the tools body when more lies behind its cut edge (`data-overflow`: "start"/"end"), so the stylesheet can fade it. */
function markOverflow(root: HTMLElement) {
    const v = [root.scrollTop > 1 ? 'start' : '', root.scrollTop + root.clientHeight < root.scrollHeight - 1 ? 'end' : ''].filter(Boolean).join(' ');
    if (root.getAttribute('data-overflow') !== v) { if (v) root.setAttribute('data-overflow', v); else root.removeAttribute('data-overflow'); }
}

export function useToolsSections(root: HTMLElement | null) {
    useEffect(() => {
        if (!root) return;
        const mark = () => markOverflow(root);
        root.addEventListener('scroll', mark, {passive: true});
        const sizes = new ResizeObserver(mark);
        sizes.observe(root);
        if (root.firstElementChild) sizes.observe(root.firstElementChild);
        let frame = 0;
        const run = () => { frame = 0; obs.disconnect(); apply(root); obs.observe(root, {childList: true, subtree: true, characterData: true}); mark(); };
        const obs = new MutationObserver(() => { if (!frame) frame = requestAnimationFrame(run); });
        run();
        const onClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            const h = target.closest<HTMLElement>('[data-ux-sec]');
            const group = h?.closest<HTMLElement>(SECTION);
            if (!h || !group || !root.contains(h)) return;
            if (target.closest('.ux-sec-help')) {
                group.toggleAttribute('data-ux-help-open');
                apply(root);
                return;
            }
            const name = nameOf(h);
            writeFold(name, !readFold(name));
            apply(root);
        };
        root.addEventListener('click', onClick);
        return () => { root.removeEventListener('click', onClick); root.removeEventListener('scroll', mark); sizes.disconnect(); obs.disconnect(); if (frame) cancelAnimationFrame(frame); };
    }, [root]);
}
