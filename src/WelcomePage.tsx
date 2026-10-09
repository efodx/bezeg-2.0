import {t, useLanguage} from "./localization";
import React, {useContext, useEffect} from "react";
import {SiteContext} from "./graphs/context/react/SiteContext";
import {Link} from 'react-router-dom';
import './WelcomePage.css';

export function WelcomePage() {
    useLanguage();
    const {setFullScreen} = useContext(SiteContext).fullScreen;
    useEffect(() => {setFullScreen(false);}, [setFullScreen]);
    return <main className="welcome-page">
        <header><span className="welcome-eyebrow">{t('bezeg_explore_curves')}</span>
            <h1>{t('home_headline')}</h1><p>{t('home_introduction')}</p>
            <Link className="welcome-primary" to="/bezeg-2.0/demonstrations">{t('start_exploring')} →</Link></header>
        <figure className="welcome-illustration">
            <svg viewBox="0 0 420 240" role="img" aria-label={t('curve_illustration')}>
                <path d="M25 190 C85 25 305 25 395 180" fill="none" stroke="#4f61bd" strokeWidth="4"/>
                <path d="M25 190 L85 25 L305 25 L395 180" fill="none" stroke="#8b9f78" strokeWidth="2" strokeDasharray="6 6"/>
                {[[25,190],[85,25],[305,25],[395,180]].map(([x,y],i) => <g key={i}>
                    <circle cx={x} cy={y} r="6" fill="#ba6108"/><text x={x-8} y={y-14} fill="#243b2b" fontSize="16">p{i}</text>
                </g>)}
            </svg><figcaption>{t('control_points_shape')}</figcaption>
        </figure>
        <footer>{t('bezeg_is_a_web_tool_for_exploring_the_properties_of_bezier_and_ph_curves_graphically')}<br/>
            {t('i_kevin_stampar_developed_bezeg_for_my_masters_thesis_with_guidance_from_my_supervisor_prof_dr_emil_zagar')}<br/>
            {t('send_suggestions_or_bug_reports_to_clovekkevingmailcom')}</footer>
    </main>;
}
