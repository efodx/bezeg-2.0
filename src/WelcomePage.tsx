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
    return <main className="welcome-page">
        <header className="welcome-intro">
            <span className="welcome-eyebrow">{t('bezeg_explore_curves')}</span>
            <h1>{t('home_headline')}</h1>
            <p>{t('home_introduction')}</p>
            <Link className="welcome-primary" to="/bezeg-2.0/demonstrations">
                {t('all_demonstrations')} <span aria-hidden="true">→</span>
            </Link>
        </header>
        <section className="welcome-showcase" aria-labelledby="starting-demonstrations">
            <h2 id="starting-demonstrations">{t('starting_demonstrations')}</h2>
            <HomeDemonstrationsCarousel/>
        </section>
        <footer>{t('bezeg_is_a_web_tool_for_exploring_the_properties_of_bezier_and_ph_curves_graphically')}<br/>
            {t('i_kevin_stampar_developed_bezeg_for_my_masters_thesis_with_guidance_from_my_supervisor_prof_dr_emil_zagar')}<br/>
            {t('send_suggestions_or_bug_reports_to_clovekkevingmailcom')}</footer>
    </main>;
}
