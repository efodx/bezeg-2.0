import React, {useContext, useEffect, useState} from 'react';
import {Link} from 'react-router-dom';
import {getDemonstrationCatalog} from './demonstrations';
import type {FamilyId} from './demonstrations';
import {demonstrationPreviewAssets} from './demonstrationPreviewAssets';
import {isGuidedLessonAvailable} from './learning/runtime/lessonCatalog';
import {SiteContext} from './graphs/context/react/SiteContext';
import {t, useLanguage} from './localization';
import './DemonstrationsPage.css';
import startingBezier from './images/demonstrations/starting-bezier.svg';
import startingConstruction from './images/demonstrations/starting-construction.svg';
import startingPh from './images/demonstrations/starting-ph.svg';
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
const startingIllustrations: Record<string, string> = {
    bezier: startingBezier, decasteljau: startingConstruction, 'ph-cubic': startingPh,
};

function demonstrationCount(count: number) {
    const remainder = count % 100;
    const key = remainder === 1 ? 'demonstration_count_one' : remainder === 2 ? 'demonstration_count_two'
        : remainder === 3 || remainder === 4 ? 'demonstration_count_few' : 'demonstration_count_many';
    return t(key, {value0: count});
}

export function DemonstrationsPage() {
    useLanguage();
    const {setFullScreen} = useContext(SiteContext).fullScreen;
    useEffect(() => {setFullScreen(false);}, [setFullScreen]);
    const {demonstrations, families, starting} = getDemonstrationCatalog();
    const [expandedFamilies, setExpandedFamilies] = useState<Set<FamilyId>>(() =>
        new Set(families[0] ? [families[0].id] : []));
    const shortLessonLabel = t('guided_lesson');

    return <main className="demonstrations-page">
        <header><span className="demonstrations-eyebrow">{t('bezeg_explore_curves')}</span>
            <h1>{t('demonstrations')}</h1><p>{t('choose_demonstration')}</p></header>
        <section aria-labelledby="starting-demonstrations">
            <h2 id="starting-demonstrations">{t('starting_demonstrations')}</h2>
            <div className="demonstrations-starting">
                {starting.map((example, i) => <div className="demonstrations-starting-card" key={example.demonstration.id}>
                    <Link to={example.demonstration.path}>
                        <img className="demonstrations-preview" src={startingIllustrations[example.demonstration.id]} width="360" height="220" alt=""/>
                        <div className="demonstrations-card-copy"><span className="demonstrations-number">0{i + 1} · {example.caption}</span>
                            <h3>{example.title}</h3><p>{example.description}</p>
                            <span className="demonstrations-open">{t('open_demonstration')} →</span></div>
                    </Link>
                    {isGuidedLessonAvailable(example.demonstration.id) && <Link className="demonstrations-learn" to={`${example.demonstration.path}?learn=1`}>{t('learn_this_demonstration')} →</Link>}
                </div>)}
            </div>
        </section>
        <section aria-labelledby="all-demonstrations">
            <div className="demonstrations-catalog-heading"><div><h2 id="all-demonstrations">{t('all_demonstrations')}</h2>
                <p>{t('explore_by_topic')}</p></div>
                <span>{t('catalog_summary', {value0: families.length, value1: demonstrations.length})}</span></div>
            <div className="demonstrations-families">
                {families.map((family, i) => {
                    const expanded = expandedFamilies.has(family.id);
                    const headingId = 'demonstration-family-heading-' + i;
                    const panelId = 'demonstration-family-panel-' + i;
                    return <section className={'demonstrations-topic' + (expanded ? ' is-expanded' : '')} key={family.id}>
                        <header className="demonstrations-topic-heading">
                            <h3 id={headingId}>
                                <button className="demonstrations-topic-toggle" type="button" aria-expanded={expanded} aria-controls={panelId}
                                    onClick={() => setExpandedFamilies(current => {
                                        const next = new Set(current);
                                        if (next.has(family.id)) next.delete(family.id);
                                        else next.add(family.id);
                                        return next;
                                    })}>
                                    <span className="demonstrations-topic-title">
                                        <span className="demonstrations-number">{String(i + 1).padStart(2, '0')} · {demonstrationCount(family.demonstrations.length)}</span>
                                        <span>{family.title}</span>
                                    </span>
                                    {familyIllustrations[family.id] && <img src={familyIllustrations[family.id]} width="180" height="130" alt="" loading="lazy"/>}
                                    <span className="demonstrations-topic-mark" aria-hidden="true">{expanded ? '−' : '+'}</span>
                                </button>
                            </h3>
                        </header>
                        <div id={panelId} className="demonstrations-topic-panel" role="region" aria-labelledby={headingId} hidden={!expanded}>
                            <ul className="demonstrations-catalog-grid">
                                {family.demonstrations.map(demonstration => <li className="demonstrations-catalog-card" key={demonstration.id}>
                                    <Link className="demonstrations-catalog-main" to={demonstration.path}>
                                        <img className="demonstrations-catalog-preview" src={demonstrationPreviewAssets[demonstration.id]}
                                            width="794" height="562" alt="" loading="lazy"/>
                                        <span className="demonstrations-catalog-label"><span>{demonstration.catalogTitle}</span><span aria-hidden="true">→</span></span>
                                    </Link>
                                    {isGuidedLessonAvailable(demonstration.id) && <Link className="demonstrations-catalog-learn" to={demonstration.path + '?learn=1'}
                                        aria-label={shortLessonLabel + ': ' + demonstration.catalogTitle}
                                        title={t('learn_this_demonstration') + ': ' + demonstration.catalogTitle}>
                                        <span>{shortLessonLabel}</span>
                                    </Link>}
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
