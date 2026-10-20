import React, {useEffect, useRef, useState} from 'react';
import {Link, useLocation, useNavigate} from 'react-router-dom';
import {getDemonstrationCatalog} from '../demonstrations';
import {useLanguage} from '../localization';
import type {Language} from '../localization';
import {chapterActivityVisit} from './chapter/ChapterActivityVisit';
import {bezierActivityCopy, bezierChapter} from './content/bezierChapter';
import type {BezierActivityId, ChapterBlock, ChapterSection} from './content/bezierChapter';
import {findActivity} from './chapter/activities';
import './ChapterPage.css';

type MathJaxApi = {startup?: {promise?: Promise<unknown>}; typesetClear?: (elements?: Element[]) => void; typesetPromise?: (elements?: Element[]) => Promise<void>};
type SectionScrollAnchor = {sectionId: string; top: number};
function restoreSectionAnchor(anchor: SectionScrollAnchor) {
    const section = document.getElementById(anchor.sectionId);
    if (section) window.scrollTo(0, Math.max(0, window.scrollY + section.getBoundingClientRect().top - anchor.top));
}

type Point = readonly [number, number];
const ordinaryCubic: readonly Point[] = [[-4, -3], [-3, 2], [2, 2], [3, -2]];
const quartic: readonly Point[] = [[-4, -3], [-3, 2], [0, 3], [3, 2], [4, -3]];
const affineCubic: readonly Point[] = [[-3, 2], [0, -2], [1, 2], [3, -2]];
function choose(n: number, i: number): number {
    let result = 1;
    for (let step = 1; step <= i; step++) result = result * (n - step + 1) / step;
    return result;
}
function bezierAt(points: readonly Point[], t: number): Point {
    const degree = points.length - 1;
    return points.reduce<[number, number]>((sum, point, index) => {
        const weight = choose(degree, index) * (1 - t) ** (degree - index) * t ** index;
        return [sum[0] + point[0] * weight, sum[1] + point[1] * weight];
    }, [0, 0]);
}
function plot([x, y]: Point): Point { return [20 + (x + 4) * 18.5, 90 - (y + 3) * 11]; }
function pathFor(points: readonly Point[], transformX = 0): string {
    return Array.from({length: 33}, (_, index) => {
        const [x, y] = plot(bezierAt(points, index / 32));
        return `${index === 0 ? 'M' : 'L'}${(x + transformX).toFixed(1)} ${y.toFixed(1)}`;
    }).join(' ');
}
function polygonFor(points: readonly Point[], transformX = 0): string {
    return points.map(point => { const [x, y] = plot(point); return `${(x + transformX).toFixed(1)},${y.toFixed(1)}`; }).join(' ');
}
function dots(points: readonly Point[], transformX = 0) {
    return points.map((point, index) => { const [x, y] = plot(point); return <circle key={index} cx={x + transformX} cy={y} r="3.5"/>; });
}
function ActivityIllustration({activity, language}: {activity: BezierActivityId; language: Language}) {
    const labels: Record<BezierActivityId, Record<Language, string>> = {
        'shape-control': {sl: 'Kubična Bézierjeva krivulja, kontrolni poligon in štiri kontrolne točke', en: 'Cubic Bézier curve, its control polygon, and four control points'},
        'curve-parameter': {sl: 'Krivulja stopnje štiri z označeno točko pri sredinskem parametru', en: 'Degree-four curve with its point marked at the midpoint parameter'},
        'repeated-interpolation': {sl: 'Pet kontrolnih točk in zaporedne vrstice interpolacije pri sredinskem parametru', en: 'Five control points and successive interpolation rows at the midpoint parameter'},
        'blending-coefficients': {sl: 'Tri Bernsteinove bazne funkcije stopnje dve', en: 'The three degree-two Bernstein basis functions'},
        'geometric-bounds': {sl: 'Kubična Bézierjeva krivulja znotraj konveksne ovojnice kontrolnih točk', en: 'Cubic Bézier curve within the convex hull of its control points'},
        'transform-shape': {sl: 'Kubična Bézierjeva krivulja in ista krivulja po vodoravnem premiku', en: 'Cubic Bézier curve and the same curve after a horizontal translation'},
    };
    const mid = (points: readonly Point[]) => points.slice(0, -1).map((point, index) => [(point[0] + points[index + 1][0]) / 2, (point[1] + points[index + 1][1]) / 2] as Point);
    const [pointX, pointY] = plot(bezierAt(quartic, .5));
    const paths: Record<BezierActivityId, React.ReactNode> = {
        'shape-control': <><path d={pathFor(ordinaryCubic)}/><polyline className="chapter-preview-guide" points={polygonFor(ordinaryCubic)}/><g className="chapter-preview-points">{dots(ordinaryCubic)}</g></>,
        'curve-parameter': <><path d={pathFor(quartic)}/><path className="chapter-preview-track" d={pathFor(quartic)}/><circle className="chapter-preview-moving" cx={pointX} cy={pointY} r="5"/><path className="chapter-preview-guide" d={`M${pointX} ${pointY}V90`}/><text x={pointX + 6} y="105">t = 1/2</text></>,
        'repeated-interpolation': (() => {
            const rows: Point[][] = [Array.from(quartic)];
            while (rows[rows.length - 1].length > 1) rows.push(mid(rows[rows.length - 1]));
            return <>{rows.map((row, index) => <g key={index} className={index === rows.length - 1 ? 'chapter-preview-points' : 'chapter-preview-row'}><polyline points={polygonFor(row)}/>{dots(row)}</g>)}</>;
        })(),
        'blending-coefficients': <><path className="chapter-preview-axis" d="M20 90H168M20 90V20"/>{[0, 1, 2].map(index => {
            const points = Array.from({length: 33}, (_, sample) => { const t = sample / 32; return [t, choose(2, index) * (1 - t) ** (2 - index) * t ** index] as Point; });
            const d = points.map(([t, value], sample) => `${sample ? 'L' : 'M'}${(20 + 148 * t).toFixed(1)} ${(90 - 66 * value).toFixed(1)}`).join(' ');
            return <path key={index} className={`chapter-preview-basis chapter-preview-basis-${index}`} d={d}/>;
        })}<text x="171" y="94">t</text></>,
        'geometric-bounds': <><polygon className="chapter-preview-hull" points={polygonFor(ordinaryCubic)}/><path d={pathFor(ordinaryCubic)}/><polyline className="chapter-preview-guide" points={polygonFor(ordinaryCubic)}/></>,
        'transform-shape': <><path d={pathFor(affineCubic)}/><path className="chapter-preview-alt" d={pathFor(affineCubic, 9.25)}/><polyline className="chapter-preview-guide" points={polygonFor(affineCubic)}/><polyline className="chapter-preview-guide chapter-preview-guide-alt" points={polygonFor(affineCubic, 9.25)}/></>,
    };
    return <svg className="chapter-activity-art" viewBox="0 0 190 112" role="img" aria-label={labels[activity][language]} focusable="false">{paths[activity]}</svg>;
}

function renderParagraph(text: string, links?: readonly {label: string; href: string}[]) {
    if (!links?.length) return text;
    const result: React.ReactNode[] = [];
    let cursor = 0;
    const matches = links.map(link => ({...link, at: text.indexOf(link.label)})).filter(link => link.at >= 0).sort((a, b) => a.at - b.at);
    for (const match of matches) {
        if (match.at < cursor) continue;
        if (match.at > cursor) result.push(text.slice(cursor, match.at));
        result.push(<Link key={`${match.href}-${match.at}`} to={match.href}>{match.label}</Link>);
        cursor = match.at + match.label.length;
    }
    const remainder = text.slice(cursor);
    if (remainder) result.push(remainder);
    return result;
}

function ActivityCard({id, sectionId, language}: {id: BezierActivityId; sectionId: string; language: Language}) {
    const location = useLocation();
    const copy = bezierActivityCopy[id][language];
    const linkId = `activity-${id}`;
    return <aside className="chapter-activity-card" aria-label={language === 'sl' ? 'Dejavnost za raziskovanje' : 'Graph exploration activity'}>
        <ActivityIllustration activity={id} language={language}/>
        <div className="chapter-activity-copy">
            <p className="chapter-activity-eyebrow">{language === 'sl' ? 'RAZIŠČI' : 'EXPLORE'}</p>
            <h3>{copy.title}</h3>
            <p>{copy.prompt}</p>
            <p className="chapter-activity-return"><span>{language === 'sl' ? 'Vrni se k:' : 'Return to:'}</span> <a href={`#${sectionId}`}>{sectionId === 'control-points' ? (language === 'sl' ? 'razlagi kontrolnih točk' : 'the control-point explanation') : bezierChapter[language].sections.find(section => section.id === sectionId)?.title}</a></p>
            <Link id={linkId} className="chapter-open-activity" to={copy.demoHref} state={chapterActivityVisit.activityEntryState(location.state, id, location.key)} onClick={() => chapterActivityVisit.prepareActivityLaunch(id, sectionId, linkId, location.key)}>{language === 'sl' ? 'Odpri raziskovanje' : 'Open exploration'}<span aria-hidden="true"> →</span></Link>
        </div>
    </aside>;
}

function ChapterBlockView({block, section, language}: {block: ChapterBlock; section: ChapterSection; language: Language}) {
    if (block.kind === 'activity') return <ActivityCard key={block.id} id={block.id} sectionId={section.id} language={language}/>;
    if (block.kind === 'formula') return <div className="chapter-formula" role="region" aria-label={block.label} tabIndex={0}><span className="chapter-formula-label">{block.label}</span><div className="chapter-math">\[{block.latex}\]</div></div>;
    return <p className="chapter-paragraph">{renderParagraph(block.text, block.links)}</p>;
}

export function ChapterPage() {
    const {language} = useLanguage();
    const location = useLocation();
    const navigate = useNavigate();
    const copy = bezierChapter[language];
    const articleRef = useRef<HTMLElement>(null);
    const previousLanguage = useRef(language);
    const scrollAnchor = useRef<SectionScrollAnchor>({sectionId: 'motivation', top: 0});
    const [currentSection, setCurrentSection] = useState<string>(() => location.hash.slice(1) || 'motivation');
    const [contentsOpen, setContentsOpen] = useState(false);

    useEffect(() => {
        const restored = chapterActivityVisit.restoreReading('motivation');
        const hash = location.hash.slice(1);
        const invocation = location.state && typeof location.state === 'object' ? location.state.chapterReadingInvocation : undefined;
        const sourceActivity = invocation && typeof invocation === 'object' && invocation.v === 1
            && typeof invocation.activityId === 'string' && invocation.readingKey === location.key
            && copy.sections.some(section => section.id === invocation.sectionId) ? findActivity(invocation.activityId) : undefined;
        if (!restored && sourceActivity) {
            setCurrentSection(invocation.sectionId);
            requestAnimationFrame(() => {
                document.getElementById(invocation.sectionId)?.scrollIntoView();
                (document.getElementById(`activity-${sourceActivity.id}`)
                    ?? document.getElementById(`${invocation.sectionId}-heading`))?.focus({preventScroll: true});
            });
        } else if (!restored && hash && copy.sections.some(section => section.id === hash)) {
            setCurrentSection(hash);
            requestAnimationFrame(() => document.getElementById(hash)?.scrollIntoView());
        } else if (!restored && hash) {
            navigate(`${location.pathname}${location.search}`, {replace: true, state: location.state});
            requestAnimationFrame(() => document.getElementById('chapter-title')?.focus());
        }
    // Hash navigation remains directly addressable; language changes retain the stable section identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.hash]);

    useEffect(() => {
        const targets = copy.sections.map(section => document.getElementById(section.id)).filter((item): item is HTMLElement => Boolean(item));
        if (!targets.length || !('IntersectionObserver' in window)) return;
        const observer = new IntersectionObserver(entries => {
            const visible = entries.filter(entry => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
            if (visible) setCurrentSection(visible.target.id);
        }, {rootMargin: '-15% 0px -70% 0px', threshold: [0, .2, .5]});
        targets.forEach(target => observer.observe(target));
        return () => observer.disconnect();
    }, [copy]);

    useEffect(() => {
        let frame = 0;
        const captureAnchor = () => {
            if (frame) return;
            frame = window.requestAnimationFrame(() => {
                frame = 0;
                const candidates = copy.sections.map(section => document.getElementById(section.id)).filter((item): item is HTMLElement => Boolean(item));
                const eligible = candidates.filter(section => section.getBoundingClientRect().top <= window.innerHeight * .35);
                const visible = eligible[eligible.length - 1] ?? candidates[0];
                if (visible) scrollAnchor.current = {sectionId: visible.id, top: visible.getBoundingClientRect().top};
            });
        };
        window.addEventListener('scroll', captureAnchor, {passive: true});
        captureAnchor();
        return () => { window.removeEventListener('scroll', captureAnchor); if (frame) window.cancelAnimationFrame(frame); };
    }, [copy]);

    useEffect(() => {
        const article = articleRef.current;
        if (!article) return;
        const languageChanged = previousLanguage.current !== language;
        const savedAnchor = scrollAnchor.current;
        previousLanguage.current = language;
        let disposed = false;
        const typeset = () => {
            const api = (window as Window & {MathJax?: MathJaxApi}).MathJax;
            if (!api?.typesetPromise) {
                if (languageChanged && !document.getElementById('MathJax-script')) requestAnimationFrame(() => restoreSectionAnchor(savedAnchor));
                return;
            }
            void (api.startup?.promise ?? Promise.resolve()).then(() => {
                if (disposed) return;
                api.typesetClear?.([article]);
                return api.typesetPromise?.([article]);
            }).then(() => {
                if (!disposed && languageChanged) requestAnimationFrame(() => restoreSectionAnchor(savedAnchor));
            }).catch(() => { if (!disposed && languageChanged) requestAnimationFrame(() => restoreSectionAnchor(savedAnchor)); });
        };
        const script = document.getElementById('MathJax-script');
        script?.addEventListener('load', typeset);
        script?.addEventListener('error', typeset);
        typeset();
        return () => { disposed = true; script?.removeEventListener('load', typeset); script?.removeEventListener('error', typeset); };
    }, [language]);

    const nav = <nav className="chapter-toc" aria-label={language === 'sl' ? 'Vsebina poglavja' : 'Chapter contents'}>
        <p className="chapter-toc-title">{language === 'sl' ? 'V tem poglavju' : 'In this chapter'}</p>
        <ol>{copy.sections.map((section, index) => <li key={section.id}><a href={`#${section.id}`} aria-current={currentSection === section.id ? 'location' : undefined} onClick={() => { setCurrentSection(section.id); setContentsOpen(false); }}>{section.title}<span className="chapter-toc-number">{index + 1}</span></a></li>)}</ol>
    </nav>;

    const state = location.state && typeof location.state === 'object' ? location.state as Record<string, unknown> : {};
    const requestedGraphId = state.chapterGraphId;
    const supportedGraphIds = ['bezier', 'decasteljau', 'bernstein', 'affine'];
    const relatedDemo = typeof requestedGraphId === 'string' && supportedGraphIds.includes(requestedGraphId)
        ? getDemonstrationCatalog().demonstrations.find(demo => demo.id === requestedGraphId)
        : undefined;
    const graphReturnPath = chapterActivityVisit.ordinaryReturnPath() ?? relatedDemo?.path;
    const graphReturnIsMemory = Boolean(chapterActivityVisit.ordinaryReturnPath());

    return <main className="chapter-page">
        <div className="chapter-layout">
            <aside className="chapter-sidebar">{nav}</aside>
            <div className="chapter-contents-mobile"><button type="button" aria-expanded={contentsOpen} aria-controls="chapter-mobile-toc" onClick={() => setContentsOpen(open => !open)}>{language === 'sl' ? 'Vsebina poglavja' : 'Chapter contents'}<span aria-hidden="true">{contentsOpen ? '−' : '+'}</span></button>{contentsOpen && <div id="chapter-mobile-toc">{nav}</div>}</div>
            <article className="chapter-article" ref={articleRef}>
                <header className="chapter-heading">
                    {graphReturnPath && <div className="chapter-graph-return">
                        <Link to={graphReturnPath} state={{...state, chapterRestore: true}}>{language === 'sl' ? 'Nazaj na graf' : 'Back to your graph'}<span aria-hidden="true"> ←</span></Link>
                        {!graphReturnIsMemory && <p role="note">{language === 'sl' ? 'Po ponovnem nalaganju prejšnjega stanja grafa ni bilo mogoče obnoviti; prikaz se bo odprl z začetnimi nastavitvami.' : 'The earlier graph state could not be restored after reload; the demonstration will open with its default settings.'}</p>}
                    </div>}
                    <p className="chapter-family">{copy.family}</p>
                    <h1 id="chapter-title" tabIndex={-1}>{copy.title}</h1>
                    <p className="chapter-purpose">{copy.purpose}</p>
                    <div className="chapter-prerequisites"><strong>{language === 'sl' ? 'Predznanje' : 'Prerequisites'}</strong><p>{copy.prerequisites}</p></div>
                </header>
                {copy.sections.map((section, index) => <section className="chapter-section" id={section.id} key={section.id} aria-labelledby={`${section.id}-heading`}>
                    <div className="chapter-section-heading"><span>{String(index + 1).padStart(2, '0')}</span><h2 id={`${section.id}-heading`} tabIndex={-1}>{section.title}</h2><a className="chapter-section-link" href={`#${section.id}`} aria-label={`${language === 'sl' ? 'Povezava do razdelka' : 'Link to section'}: ${section.title}`} onClick={() => setCurrentSection(section.id)}>¶</a></div>
                    <div className="chapter-section-body">{section.blocks.map((block, blockIndex) => <ChapterBlockView block={block} key={`${section.id}-${block.kind}-${blockIndex}`} section={section} language={language}/>)}</div>
                    {index < copy.sections.length - 1 && <div className="chapter-next-row"><a href={`#${copy.sections[index + 1].id}`}>{language === 'sl' ? 'Naprej' : 'Next'}: {copy.sections[index + 1].title}<span aria-hidden="true"> ↓</span></a></div>}
                </section>)}
                <footer className="chapter-source"><h2>{language === 'sl' ? 'Vir' : 'Source'}</h2><p>{copy.source}</p></footer>
            </article>
        </div>
    </main>;
}

export default ChapterPage;
