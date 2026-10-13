import {useCallback, useEffect, useState} from 'react';
import {Link, useLocation, useNavigate} from 'react-router-dom';
import type {Demonstration} from './demonstrations';
import {isGuidedLessonAvailable} from './learning/runtime/lessonCatalog';
import {useT} from './localization';

type Catalog = ReturnType<typeof import('./demonstrations').getDemonstrationCatalog>;
type Family = Catalog['families'][number];
type OpeningEntry = {demonstration: Demonstration; family: Family};
type VariantKey = 'A' | 'B' | 'C';

const openingIds: readonly Demonstration['id'][] = [
    'bezier', 'bernstein', 'rational', 'spline-c1', 'ph-cubic', 'derivative',
];

const variants: readonly {key: VariantKey}[] = [
    {key: 'A'},
    {key: 'B'},
    {key: 'C'},
];

const curveModels = {
    atlas: {path: 'M 65 222 C 150 206 244 79 356 166 C 416 209 477 159 548 74',
        points: [{x: 65, y: 222}, {x: 150, y: 206}, {x: 244, y: 79}, {x: 356, y: 166}, {x: 416, y: 209}, {x: 477, y: 159}, {x: 548, y: 74}]},
    trail: {path: 'M 65 226 C 140 73 244 77 307 153 C 370 229 469 233 548 68',
        points: [{x: 65, y: 226}, {x: 140, y: 73}, {x: 244, y: 77}, {x: 307, y: 153}, {x: 370, y: 229}, {x: 469, y: 233}, {x: 548, y: 68}]},
    map: {path: 'M 65 226 C 142 250 202 49 298 102 C 378 146 416 246 548 68',
        points: [{x: 65, y: 226}, {x: 142, y: 250}, {x: 202, y: 49}, {x: 298, y: 102}, {x: 378, y: 146}, {x: 416, y: 246}, {x: 548, y: 68}]},
} as const;

function usePrefersReducedMotion() {
    const [reduced, setReduced] = useState(() => typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches);

    useEffect(() => {
        const media = window.matchMedia('(prefers-reduced-motion: reduce)');
        const update = () => setReduced(media.matches);
        update();
        media.addEventListener('change', update);
        return () => media.removeEventListener('change', update);
    }, []);

    return reduced;
}

function CurveSketch({kind, small = false, animate = true}: {
    kind: keyof typeof curveModels; small?: boolean; animate?: boolean;
}) {
    const prefersReducedMotion = usePrefersReducedMotion();
    const model = curveModels[kind];
    const path = model.path;

    return <svg className={'demonstrations-prototype-sketch' + (small ? ' is-small' : '')}
        viewBox="0 0 620 300" aria-hidden="true" focusable="false">
        <path className="demonstrations-prototype-grid" d="M60 35V265 M160 35V265 M260 35V265 M360 35V265 M460 35V265 M560 35V265 M60 70H560 M60 120H560 M60 170H560 M60 220H560"/>
        <path className="demonstrations-prototype-axis" d="M60 265H560 M60 265V35"/>
        <path className="demonstrations-prototype-control" d={`M ${model.points.map(point => `${point.x} ${point.y}`).join(' L ')}`}/>
        <path className="demonstrations-prototype-curve" d={path}/>
        {model.points.map((point, index) => <circle key={index} className={index === 0 || index === model.points.length - 1
            ? 'demonstrations-prototype-endpoint' : 'demonstrations-prototype-control-point'}
            cx={point.x} cy={point.y} r={index === 0 || index === model.points.length - 1 ? 5 : 4}/>)}
        {animate && !prefersReducedMotion
            ? <circle className="demonstrations-prototype-moving-point" r="6">
                <animateMotion path={path} dur={small ? '8s' : '11s'} repeatCount="indefinite"/>
            </circle>
            : <circle className="demonstrations-prototype-moving-point" cx={model.points[0].x} cy={model.points[0].y} r="6"/>}
    </svg>;
}

function DemonstrationActions({entry}: {entry: OpeningEntry}) {
    const t = useT();
    const title = entry.demonstration.catalogTitle;
    return <span className="demonstrations-prototype-actions">
        <Link className="demonstrations-prototype-open" to={entry.demonstration.path}
            aria-label={`${t('open_demonstration')}: ${title}`}>
            {t('open_demonstration')} <span aria-hidden="true">→</span>
        </Link>
        {isGuidedLessonAvailable(entry.demonstration.id) && <PrototypeLessonLink entry={entry}/>}
    </span>;
}

function PrototypeLessonLink({entry}: {entry: OpeningEntry}) {
    const t = useT();
    return <Link className="demonstrations-prototype-lesson" to={`${entry.demonstration.path}?learn=1`}
        aria-label={`${t('guided_lesson')}: ${entry.demonstration.catalogTitle}`}>
        {t('guided_lesson')}
    </Link>;
}

function RouteGlyph({kind}: {kind: keyof typeof curveModels}) {
    const glyph = kind === 'atlas'
        ? {control: 'M7 43 L27 35 L54 5 L93 6', curve: 'M7 43 C27 35 54 5 93 6'}
        : kind === 'trail'
            ? {control: 'M7 43 L25 4 L50 8 L93 6', curve: 'M7 43 C25 4 50 8 93 6'}
            : {control: 'M7 43 L25 46 L50 8 L93 6', curve: 'M7 43 C25 46 50 8 93 6'};
    return <svg className="demonstrations-prototype-route-glyph" viewBox="0 0 100 50"
        aria-hidden="true" focusable="false">
        <path d={glyph.control} className="demonstrations-prototype-glyph-control"/>
        <path d={glyph.curve} className="demonstrations-prototype-glyph-curve"/>
        <circle cx="7" cy="43" r="2.5"/><circle cx="93" cy="6" r="2.5"/>
    </svg>;
}

function VariantA({entries}: {entries: OpeningEntry[]}) {
    const t = useT();
    const [feature, ...routes] = entries;
    if (!feature) return null;

    return <div className="demonstrations-prototype-a">
        <article className="demonstrations-prototype-feature">
            <CurveSketch kind="atlas"/>
            <div className="demonstrations-prototype-feature-copy">
                <span className="demonstrations-prototype-family">{feature.family.title}</span>
                <h3><Link to={feature.demonstration.path}>{feature.demonstration.catalogTitle}</Link></h3>
                <p>{feature.demonstration.prompts[0]}</p>
                <DemonstrationActions entry={feature}/>
            </div>
        </article>
        <nav className="demonstrations-prototype-index" aria-label={t('starting_demonstrations')}>
            <h3>{t('explore_by_topic')}</h3>
            <ol>
                {routes.map((entry, index) => <li key={entry.demonstration.id}>
                    <span className="demonstrations-prototype-index-number">0{index + 2}</span>
                    <div className="demonstrations-prototype-index-copy">
                        <span className="demonstrations-prototype-family">{entry.family.title}</span>
                        <Link to={entry.demonstration.path}>{entry.demonstration.catalogTitle}</Link>
                        <DemonstrationActions entry={entry}/>
                    </div>
                    <RouteGlyph kind={index % 2 === 0 ? 'trail' : 'map'}/>
                </li>)}
            </ol>
        </nav>
    </div>;
}

function VariantB({entries}: {entries: OpeningEntry[]}) {
    const t = useT();
    return <div className="demonstrations-prototype-b">
        <div className="demonstrations-prototype-b-intro">
            <CurveSketch kind="trail"/>
            <p>{t('choose_demonstration')}</p>
        </div>
        <ol className="demonstrations-prototype-trail">
            {entries.map((entry, index) => <li key={entry.demonstration.id}>
                <span className="demonstrations-prototype-trail-step">{String(index + 1).padStart(2, '0')}</span>
                <div className="demonstrations-prototype-trail-copy">
                    <span className="demonstrations-prototype-family">{entry.family.title}</span>
                    <h3><Link to={entry.demonstration.path}>{entry.demonstration.catalogTitle}</Link></h3>
                    <p>{entry.demonstration.prompts[0]}</p>
                    <DemonstrationActions entry={entry}/>
                </div>
                <CurveSketch kind={index % 2 === 0 ? 'trail' : 'map'} small/>
            </li>)}
        </ol>
    </div>;
}

function VariantC({entries}: {entries: OpeningEntry[]}) {
    const t = useT();
    return <div className="demonstrations-prototype-c">
        <div className="demonstrations-prototype-c-board">
            <div className="demonstrations-prototype-c-heading">
                <span className="demonstrations-prototype-family">{t('bezeg_explore_curves')}</span>
                <p>{t('prompt_compare')}</p>
            </div>
            <CurveSketch kind="map"/>
        </div>
        <ol className="demonstrations-prototype-map">
            {entries.map((entry, index) => <li key={entry.demonstration.id}>
                <span className="demonstrations-prototype-map-node">{index + 1}</span>
                <span className="demonstrations-prototype-family">{entry.family.title}</span>
                <Link to={entry.demonstration.path}>{entry.demonstration.catalogTitle}</Link>
                <DemonstrationActions entry={entry}/>
            </li>)}
        </ol>
    </div>;
}

function PrototypeSwitcher({current}: {current: typeof variants[number]}) {
    const t = useT();
    const location = useLocation();
    const navigate = useNavigate();
    const currentIndex = variants.findIndex(variant => variant.key === current.key);

    const selectVariant = useCallback((index: number) => {
        const next = variants[(index + variants.length) % variants.length];
        const params = new URLSearchParams(location.search);
        params.set('variant', next.key);
        navigate({pathname: location.pathname, search: `?${params.toString()}`, hash: location.hash}, {replace: true});
    }, [location.hash, location.pathname, location.search, navigate]);

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            const target = event.target;
            if (target instanceof HTMLElement && (target.isContentEditable ||
                target.matches('input, textarea, [contenteditable="true"], [role="textbox"]'))) return;
            if (event.key === 'ArrowLeft') {
                event.preventDefault();
                selectVariant(currentIndex - 1);
            } else if (event.key === 'ArrowRight') {
                event.preventDefault();
                selectVariant(currentIndex + 1);
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [currentIndex, selectVariant]);

    return <aside className="demonstrations-prototype-switcher" aria-label="Development prototype variants">
        <button type="button" onClick={() => selectVariant(currentIndex - 1)}
            aria-label={`${t('back')} ${t('demonstrations')}`} title={t('back')}>
            <span aria-hidden="true">←</span>
        </button>
        <span className="demonstrations-prototype-switcher-current" aria-live="polite">
            <strong>{current.key}</strong>
        </span>
        <button type="button" onClick={() => selectVariant(currentIndex + 1)}
            aria-label={`${t('next')} ${t('demonstrations')}`} title={t('next')}>
            <span aria-hidden="true">→</span>
        </button>
        <span className="demonstrations-prototype-shortcut" aria-hidden="true">← / →</span>
    </aside>;
}

export function DemonstrationsOpeningPrototype({demonstrations, families}: {
    demonstrations: Catalog['demonstrations']; families: Catalog['families'];
}) {
    const t = useT();
    const location = useLocation();
    const requested = new URLSearchParams(location.search).get('variant');
    const current = variants.find(variant => variant.key === requested) ?? variants[0];
    const entries = openingIds.flatMap(id => {
        const demonstration = demonstrations.find(entry => entry.id === id);
        const family = demonstration && families.find(entry => entry.id === demonstration.family);
        return demonstration && family ? [{demonstration, family}] : [];
    });

    return <>
        <h2 id="starting-demonstrations">{t('starting_demonstrations')}</h2>
        {current.key === 'A' ? <VariantA entries={entries}/>
            : current.key === 'B' ? <VariantB entries={entries}/>
                : <VariantC entries={entries}/>}
        <PrototypeSwitcher current={current}/>
    </>;
}
