import React from 'react';
import {Link} from 'react-router-dom';
import {useLanguage} from '../localization';
import {bezierChapter} from './content/bezierChapter';
import {getDemonstrationCatalog} from '../demonstrations';
import './LearningPage.css';

export function LearningPage() {
    const {language} = useLanguage();
    const chapter = bezierChapter[language];
    const family = getDemonstrationCatalog().families.find(entry => entry.id === '/bezeg-2.0/bezier');
    return <main className="learning-page">
        <div className="learning-page-inner">
            <header className="learning-heading">
                <p className="learning-kicker">{language === 'sl' ? 'BEZEG · UČENJE' : 'BEZEG · LEARNING'}</p>
                <h1>{language === 'sl' ? 'Uči se z branjem in raziskovanjem' : 'Learn through reading and exploration'}</h1>
                <p>{language === 'sl' ? 'Poglobljena poglavja povezujejo razlago matematičnih zamisli z raziskovanjem obstoječih prikazov.' : 'Study chapters connect clear mathematical explanations with exploration in the existing demonstrations.'}</p>
            </header>
            <section className="learning-family" aria-labelledby="learning-curves-heading">
                <div className="learning-family-heading"><span aria-hidden="true">⌒</span><h2 id="learning-curves-heading">{family?.title ?? chapter.family}</h2></div>
                <article className="learning-chapter-card">
                    <div className="learning-card-art" aria-hidden="true"><svg viewBox="0 0 210 132"><path d="M16 103 C63 22 123 21 194 91"/><polyline points="16,103 57,25 129,27 194,91"/><g><circle cx="16" cy="103" r="4"/><circle cx="57" cy="25" r="4"/><circle cx="129" cy="27" r="4"/><circle cx="194" cy="91" r="4"/></g></svg></div>
                    <div className="learning-card-copy">
                        <p className="learning-card-eyebrow">{language === 'sl' ? 'POGLAVJE' : 'STUDY CHAPTER'}</p>
                        <h3><Link to="/bezeg-2.0/learn/bezier-curves">{chapter.title}</Link></h3>
                        <p>{chapter.purpose}</p>
                        <p className="learning-prerequisite"><strong>{language === 'sl' ? 'Predznanje:' : 'Prerequisites:'}</strong> {chapter.prerequisites}</p>
                        <Link className="learning-open" to="/bezeg-2.0/learn/bezier-curves">{language === 'sl' ? 'Odpri poglavje' : 'Read the chapter'}<span aria-hidden="true"> →</span></Link>
                    </div>
                </article>
            </section>
        </div>
    </main>;
}

export default LearningPage;
