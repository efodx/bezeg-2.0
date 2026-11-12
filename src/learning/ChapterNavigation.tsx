import React, {useEffect, useRef, useState} from 'react';
import {Link, useLocation, useNavigate} from 'react-router-dom';
import {useLanguage} from '../localization';
import {learningChapters} from './learningChapters';

type SectionLink = {id: string; title: string};

export function ChapterSectionPermalink({id, title, language}: SectionLink & {language: 'sl' | 'en'}) {
    return <a className="chapter-section-link" href={`#${id}`}
        aria-label={`${language === 'sl' ? 'Povezava do razdelka' : 'Link to section'}: ${title}`}
        onClick={event => {
            if (event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
                document.getElementById(`${id}-heading`)?.focus({preventScroll: true});
            }
        }}>
        <svg aria-hidden="true" viewBox="0 0 20 20" focusable="false">
            <path d="M8.25 11.75 11.75 8.25m-5.5 5.5-1.1 1.1a3.18 3.18 0 0 1-4.5-4.5l3.1-3.1a3.18 3.18 0 0 1 4.5 0m3.5-3.5 1.1-1.1a3.18 3.18 0 0 1 4.5 4.5l-3.1 3.1a3.18 3.18 0 0 1-4.5 0"/>
        </svg>
    </a>;
}

export function ChapterTrail({chapterId}: {chapterId: string}) {
    const {language} = useLanguage();
    const position = learningChapters.findIndex(chapter => chapter.id === chapterId) + 1;
    return <p className="chapter-trail">
        <Link className="learning-back" to={`/bezeg-2.0/learn#${chapterId}`}><svg aria-hidden="true" viewBox="0 0 20 20" focusable="false"><path d="M12.5 4.5 7 10l5.5 5.5M7.5 10h9"/></svg>{language === 'sl' ? 'Vsa učna vsebina' : 'All learning content'}</Link>
        <span className="chapter-trail-position">{language === 'sl' ? `Poglavje ${position} od ${learningChapters.length}` : `Chapter ${position} of ${learningChapters.length}`}</span>
    </p>;
}

function SidebarNeighbors({chapterId}: {chapterId: string}) {
    const {language} = useLanguage();
    const index = learningChapters.findIndex(chapter => chapter.id === chapterId);
    const neighbors = [
        {chapter: learningChapters[index - 1], label: language === 'sl' ? 'Prejšnje poglavje' : 'Previous chapter'},
        {chapter: learningChapters[index + 1], label: language === 'sl' ? 'Naslednje poglavje' : 'Next chapter'},
    ].filter(entry => entry.chapter);
    return <nav className="chapter-toc-neighbors" aria-label={language === 'sl' ? 'Sosednji poglavji' : 'Adjacent chapters'}>
        {neighbors.map(({chapter, label}) => <Link key={chapter.id} to={`/bezeg-2.0/learn/${chapter.id}`}><span>{label}</span>{chapter.title[language]}</Link>)}
    </nav>;
}

export function ChapterContents({sections, chapterId, showNumbers = false}: {sections: readonly SectionLink[]; chapterId: string; showNumbers?: boolean}) {
    const {language} = useLanguage();
    const location = useLocation();
    const navigate = useNavigate();
    const [currentSection, setCurrentSection] = useState(() => {
        const hash = location.hash.slice(1);
        return sections.some(section => section.id === hash) ? hash : sections[0]?.id ?? '';
    });
    const mobileContentsRef = useRef<HTMLDetailsElement>(null);

    useEffect(() => {
        let frame = 0;
        const updateCurrentSection = () => {
            if (frame) return;
            frame = window.requestAnimationFrame(() => {
                frame = 0;
                const sectionsOnPage = sections.map(section => document.getElementById(section.id)).filter((section): section is HTMLElement => Boolean(section));
                const passed = sectionsOnPage.filter(section => section.getBoundingClientRect().top <= window.innerHeight * .32);
                const active = passed[passed.length - 1] ?? sectionsOnPage[0];
                if (active) setCurrentSection(active.id);
            });
        };
        window.addEventListener('scroll', updateCurrentSection, {passive: true});
        window.addEventListener('resize', updateCurrentSection);
        updateCurrentSection();
        return () => {
            window.removeEventListener('scroll', updateCurrentSection);
            window.removeEventListener('resize', updateCurrentSection);
            if (frame) window.cancelAnimationFrame(frame);
        };
    }, [sections]);

    const goToSection = (event: React.MouseEvent<HTMLAnchorElement>, id: string) => {
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        setCurrentSection(id);
        if (mobileContentsRef.current) mobileContentsRef.current.open = false;
        navigate({pathname: location.pathname, search: location.search, hash: `#${id}`});
        document.getElementById(id)?.scrollIntoView();
        document.getElementById(`${id}-heading`)?.focus({preventScroll: true});
    };

    const contents = <nav className="chapter-toc" aria-label={language === 'sl' ? 'Vsebina poglavja' : 'Chapter contents'}>
        <p className="chapter-toc-title">{language === 'sl' ? 'V tem poglavju' : 'In this chapter'}</p>
        <ol>{sections.map((section, index) => <li key={section.id}><a href={`#${section.id}`} aria-current={currentSection === section.id ? 'location' : undefined} onClick={event => goToSection(event, section.id)}><span>{section.title}</span>{showNumbers && <span className="chapter-toc-number">{index + 1}</span>}</a></li>)}</ol>
    </nav>;

    const currentIndex = sections.findIndex(section => section.id === currentSection);
    return <>
        <aside className="chapter-sidebar">{contents}<SidebarNeighbors chapterId={chapterId}/></aside>
        <details ref={mobileContentsRef} className="chapter-contents-mobile learning-mobile-contents">
            <summary><span>{language === 'sl' ? 'Vsebina poglavja' : 'Chapter contents'}</span>{currentIndex >= 0 && <span className="chapter-contents-position">{language === 'sl' ? `razdelek ${currentIndex + 1} od ${sections.length}` : `section ${currentIndex + 1} of ${sections.length}`}</span>}</summary>
            <div id="chapter-mobile-toc">{contents}</div>
        </details>
    </>;
}

export function ChapterNeighbors({chapterId}: {chapterId: string}) {
    const {language} = useLanguage();
    const index = learningChapters.findIndex(chapter => chapter.id === chapterId);
    const previous = learningChapters[index - 1];
    const next = learningChapters[index + 1];
    return <nav className="learning-neighbors" aria-label={language === 'sl' ? 'Poglavja po vrsti' : 'Chapters in order'}>
        {previous && <Link className="learning-neighbor--previous" to={`/bezeg-2.0/learn/${previous.id}`}><span className="learning-neighbor-label">{language === 'sl' ? 'Prejšnje poglavje' : 'Previous chapter'}<span className="learning-neighbor-colon">:</span></span> <span className="learning-neighbor-title">{previous.title[language]}</span></Link>}
        {next && <Link className="learning-neighbor--next" to={`/bezeg-2.0/learn/${next.id}`}><span className="learning-neighbor-label">{language === 'sl' ? 'Naslednje poglavje' : 'Next chapter'}<span className="learning-neighbor-colon">:</span></span> <span className="learning-neighbor-title">{next.title[language]}</span></Link>}
    </nav>;
}
