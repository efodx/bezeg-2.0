import {useT} from "./localization";
import React, {useContext, useEffect} from "react";
import {SiteContext} from "./graphs/context/react/SiteContext";
import {Link} from 'react-router-dom';
import './WelcomePage.css';
import {HomeDemonstrationsCarousel} from './HomeDemonstrationsCarousel';

export function WelcomePage() {
    const t = useT();
    const {setFullScreen} = useContext(SiteContext).fullScreen;
    useEffect(() => {setFullScreen(false);}, [setFullScreen]);
    return <main className="welcome-page" data-content-column>
        <header className="welcome-intro">
            <h1>{t('home_headline')}</h1>
            <p>{t('home_introduction')}</p>
            <div className="welcome-actions">
                <Link className="welcome-primary" to="/bezeg-2.0/demonstrations">
                    {t('all_demonstrations')} <span aria-hidden="true">→</span>
                </Link>
                <Link className="welcome-secondary" to="/bezeg-2.0/learn">
                    {t('all_learning_content')} <span aria-hidden="true">→</span>
                </Link>
            </div>
        </header>
        <section className="welcome-showcase" aria-labelledby="starting-demonstrations">
            <h2 id="starting-demonstrations">{t('demonstration_selection')}</h2>
            <HomeDemonstrationsCarousel/>
        </section>
    </main>;
}
