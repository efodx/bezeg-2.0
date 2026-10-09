import React, {useContext, useEffect} from 'react';
import {Link} from 'react-router-dom';
import {getDemonstrationCatalog} from './demonstrations';
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

const familyIllustrations: Record<string, string> = {
    basics: familyBasics, '/bezeg/bezier': familyBezier, '/bezeg/rational': familyRational,
    '/bezeg/spline': familySpline, '/bezeg/ph': familyPh, '/bezeg/param': familyParam
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
                    const entries = family.demonstrations;
                    return <section key={family.id} aria-labelledby={`demonstration-family-${i}`}>
                        <header><div><span className="demonstrations-number">0{i + 1} · {demonstrationCount(entries.length)}</span>
                            <h3 id={`demonstration-family-${i}`}>{family.title}</h3></div>
                            {familyIllustrations[family.id] && <img src={familyIllustrations[family.id]} width="180" height="130" alt="" loading="lazy"/>}</header>
                        <ul>{entries.map(demonstration => <li key={demonstration.id}>
                            <div className="demonstrations-catalog-entry">
                                <Link to={demonstration.path}>{demonstration.catalogTitle}<span aria-hidden="true"> →</span></Link>
                                {isGuidedLessonAvailable(demonstration.id) && <Link className="demonstrations-catalog-learn" to={`${demonstration.path}?learn=1`}>{t('learn_this_demonstration')}<span aria-hidden="true"> →</span></Link>}
                            </div>
                        </li>)}</ul>
                    </section>;
                })}
            </div>
            <p className="demonstrations-art-note">{t('topic_illustrations_note')}</p>
        </section>
    </main>;
}
