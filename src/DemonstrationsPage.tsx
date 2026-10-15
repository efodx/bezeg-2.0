import React, {useContext, useEffect, useState} from 'react';
import {Link} from 'react-router-dom';
import {getDemonstrationCatalog} from './demonstrations';
import type {DemonstrationId, FamilyId} from './demonstrations';
import {demonstrationPreviewAssets} from './demonstrationPreviewAssets';
import {isGuidedLessonAvailable} from './learning/runtime/lessonCatalog';
import {SiteContext} from './graphs/context/react/SiteContext';
import {t, useT} from './localization';
import './DemonstrationsPage.css';
import familyBasics from './images/demonstrations/family-basics.svg';
import familyBezier from './images/demonstrations/family-bezier.svg';
import familyRational from './images/demonstrations/family-rational.svg';
import familySpline from './images/demonstrations/family-spline.svg';
import familyPh from './images/demonstrations/family-ph.svg';
import familyParam from './images/demonstrations/family-param.svg';
import familyFunctions from './images/demonstrations/family-functions.svg';

const familyIllustrations: Record<FamilyId, string> = {
    basics: familyBasics,
    '/bezeg-2.0/bezier': familyBezier,
    '/bezeg-2.0/rational': familyRational,
    '/bezeg-2.0/spline': familySpline,
    '/bezeg-2.0/ph': familyPh,
    '/bezeg-2.0/param': familyParam,
    '/bezeg-2.0/functions': familyFunctions,
};
function demonstrationCount(count: number) {
    const remainder = count % 100;
    const key = remainder === 1 ? 'demonstration_count_one' : remainder === 2 ? 'demonstration_count_two'
        : remainder === 3 || remainder === 4 ? 'demonstration_count_few' : 'demonstration_count_many';
    return t(key, {value0: count});
}

function CatalogRoutePreview({id}: {id: DemonstrationId}) {
    return <img className="demonstrations-catalog-preview" src={demonstrationPreviewAssets[id]}
        width="360" height="220" alt="" loading="lazy"/>;
}

export function DemonstrationsPage() {
    const t = useT();
    const {setFullScreen} = useContext(SiteContext).fullScreen;
    useEffect(() => {setFullScreen(false);}, [setFullScreen]);
    const {demonstrations, families} = getDemonstrationCatalog();
    const [expandedFamilies, setExpandedFamilies] = useState<Set<FamilyId>>(() =>
        new Set(families[0] ? [families[0].id] : []));
    const openGraphLabel = t('open_demonstration');
    const graphTooltipLabel = t('try_and_observe');
    const lessonLabel = t('guided_lesson');
    const lessonTooltipLabel = t('learn_this_demonstration');
    const openActionLabel = t('open');
    const guidedPathLabel = t('guided_path_short');

    return <main className="demonstrations-page">
        <svg className="demonstrations-botanical" viewBox="0 0 420 360" aria-hidden="true" focusable="false">
            <g className="demonstrations-botanical-stems">
                <path d="M410 358C367 279 327 207 278 157S203 69 170 7"/>
                <path d="M278 157C313 120 350 96 402 83M326 207C364 193 391 170 416 137"/>
                <path d="M237 108C204 91 164 76 122 42M266 140C265 95 259 51 253 7"/>
                <path d="M356 271C386 250 402 226 414 198M205 74C174 68 145 69 111 77"/>
            </g>
            <g className="demonstrations-botanical-leaves">
                <path d="M331 204C327 164 346 137 387 119C384 162 366 190 331 204Z"/>
                <path d="M350 257C343 219 359 192 397 174C398 211 381 240 350 257Z"/>
                <path d="M273 151C284 111 312 94 355 96C337 131 309 150 273 151Z"/>
                <path d="M232 106C192 105 164 84 146 46C186 53 216 73 232 106Z"/>
                <path d="M265 129C239 101 234 68 250 30C273 63 280 96 265 129Z"/>
                <path d="M201 76C166 96 134 91 99 66C136 49 170 51 201 76Z"/>
                <path d="M380 293C388 263 408 245 437 239C430 269 411 289 380 293Z"/>
            </g>
            <g className="demonstrations-botanical-flowers">
                <g transform="translate(394 80)"><circle cx="0" cy="0" r="5"/><circle cx="-10" cy="-4" r="4"/><circle cx="9" cy="-7" r="4"/><circle cx="-7" cy="8" r="4"/><circle cx="8" cy="8" r="4"/><circle cx="-1" cy="-13" r="4"/><circle cx="14" cy="2" r="4"/><circle cx="-15" cy="4" r="4"/></g>
                <g transform="translate(416 131)"><circle cx="0" cy="0" r="5"/><circle cx="-10" cy="-5" r="4"/><circle cx="8" cy="-8" r="4"/><circle cx="-8" cy="8" r="4"/><circle cx="9" cy="8" r="4"/><circle cx="-1" cy="-14" r="4"/><circle cx="15" cy="2" r="4"/><circle cx="-15" cy="3" r="4"/></g>
                <g transform="translate(252 8)"><circle cx="0" cy="0" r="5"/><circle cx="-10" cy="-5" r="4"/><circle cx="9" cy="-8" r="4"/><circle cx="-7" cy="8" r="4"/><circle cx="8" cy="8" r="4"/><circle cx="-1" cy="-14" r="4"/><circle cx="15" cy="2" r="4"/><circle cx="-15" cy="3" r="4"/></g>
                <g transform="translate(168 8)"><circle cx="0" cy="0" r="5"/><circle cx="-10" cy="-5" r="4"/><circle cx="9" cy="-8" r="4"/><circle cx="-7" cy="8" r="4"/><circle cx="8" cy="8" r="4"/><circle cx="-1" cy="-14" r="4"/><circle cx="15" cy="2" r="4"/><circle cx="-15" cy="3" r="4"/></g>
                <g transform="translate(105 77)"><circle cx="0" cy="0" r="5"/><circle cx="-10" cy="-5" r="4"/><circle cx="9" cy="-8" r="4"/><circle cx="-7" cy="8" r="4"/><circle cx="8" cy="8" r="4"/><circle cx="-1" cy="-14" r="4"/><circle cx="15" cy="2" r="4"/><circle cx="-15" cy="3" r="4"/></g>
            </g>
        </svg>
        <header>
            <span className="demonstrations-eyebrow">{t('bezeg_explore_curves')}</span>
            <h1>{t('demonstrations')}</h1>
            <div className="demonstrations-catalog-intro">
                <p>{t('explore_by_topic')}</p>
                <span>{t('catalog_summary', {value0: families.length, value1: demonstrations.length})}</span>
            </div>
        </header>
        <section className="demonstrations-catalogue" aria-label={t('all_demonstrations')}>
            <div className="demonstrations-families">
                {families.map((family, i) => {
                    const expanded = expandedFamilies.has(family.id);
                    const headingId = 'demonstration-family-heading-' + i;
                    const panelId = 'demonstration-family-panel-' + i;
                    return <section className={'demonstrations-topic' + (expanded ? ' is-expanded' : '')} key={family.id}>
                        <header className="demonstrations-topic-heading">
                            <h2 id={headingId}>
                                <button className="demonstrations-topic-toggle" type="button" aria-expanded={expanded} aria-controls={panelId}
                                    onClick={() => setExpandedFamilies(current => {
                                        const next = new Set(current);
                                        if (next.has(family.id)) next.delete(family.id);
                                        else next.add(family.id);
                                        return next;
                                    })}>
                                    {familyIllustrations[family.id] && <img src={familyIllustrations[family.id]} width="180" height="130" alt="" loading="lazy"/>}
                                    <span className="demonstrations-topic-title">
                                        <span className="demonstrations-topic-family">{family.title}</span>
                                        <span className="demonstrations-number">{String(i + 1).padStart(2, '0')} · {demonstrationCount(family.demonstrations.length)}</span>
                                    </span>
                                    <span className="demonstrations-topic-mark" aria-hidden="true">{expanded ? '−' : '+'}</span>
                                </button>
                            </h2>
                        </header>
                        <div id={panelId} className="demonstrations-topic-panel" role="region" aria-labelledby={headingId} hidden={!expanded}>
                            <ul className="demonstrations-catalog-grid">
                                {family.demonstrations.map(demonstration => <li className="demonstrations-catalog-card" key={demonstration.id}>
                                    <CatalogRoutePreview id={demonstration.id}/>
                                    <div className="demonstrations-catalog-entry-row">
                                        <span className="demonstrations-catalog-title">{demonstration.catalogTitle}</span>
                                        <span className="demonstrations-catalog-actions">
                                            <Link className="demonstrations-catalog-action demonstrations-catalog-graph" to={demonstration.path}
                                                aria-label={openGraphLabel + ': ' + demonstration.catalogTitle}
                                                data-tooltip={graphTooltipLabel + ': ' + demonstration.catalogTitle}>
                                                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                                                    <path d="M4 19.5h16M5 18V5.5M7 15l4-4 3 2 5-6"/>
                                                    <path d="M16 7h3v3"/>
                                                </svg>
                                                <span className="demonstrations-catalog-action-label">{openActionLabel}</span>
                                            </Link>
                                            {isGuidedLessonAvailable(demonstration.id) && <Link className="demonstrations-catalog-action demonstrations-catalog-lesson"
                                                to={demonstration.path + '?learn=1'}
                                                aria-label={lessonLabel + ': ' + demonstration.catalogTitle}
                                                data-tooltip={lessonTooltipLabel + ': ' + demonstration.catalogTitle}>
                                                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                                                    <path d="M12 6.2c-2.1-1.7-4.7-2-8-1.1v13c3.2-.9 5.9-.6 8 1.1m0-13c2.1-1.7 4.7-2 8-1.1v13c-3.2-.9-5.9-.6-8 1.1m0-13v13"/>
                                                    <path d="M7 9h2.5M7 12h2.5m5-3H17m-2.5 3H17"/>
                                                </svg>
                                                <span className="demonstrations-catalog-action-label">{guidedPathLabel}</span>
                                            </Link>}
                                        </span>
                                    </div>
                                </li>)}
                            </ul>
                        </div>
                    </section>;
                })}
            </div>
            <p className="demonstrations-art-note">{t('topic_illustrations_note')}</p>
        </section>
    </main>;
}
