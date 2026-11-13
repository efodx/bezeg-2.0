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
            <svg className="welcome-botanical" viewBox="0 0 420 290" aria-hidden="true" focusable="false">
            <g className="welcome-botanical-stems">
                <path d="M42 278C103 231 143 205 196 160S287 83 357 22"/>
                <path d="M357 22C347 22 337 30 331 43M357 22C367 22 378 27 386 37M357 22C355 34 349 46 341 54"/>
                <path d="M185 168C165 125 139 91 99 62M235 132C258 93 281 65 315 42M127 218C105 181 79 157 45 145"/>
            </g>
            <g className="welcome-botanical-leaves">
                <path d="M270 108C276 75 298 56 335 52C322 84 300 103 270 108Z"/>
                <path d="M230 140C203 119 196 91 208 59C232 81 240 109 230 140Z"/>
                <path d="M160 191C128 179 112 155 114 120C143 137 159 161 160 191Z"/>
                <path d="M113 228C83 217 68 196 67 167C94 181 109 202 113 228Z"/>
                <path d="M296 84C320 63 347 61 376 76C348 96 321 100 296 84Z"/>
                <path d="M143 211C136 181 147 157 178 139C178 171 165 195 143 211Z"/>
            </g>
            <g className="welcome-botanical-flowers">
                <g transform="translate(360 25)"><circle r="5"/><ellipse cy="-12" ry="6" rx="3"/><ellipse cy="12" ry="6" rx="3"/><ellipse cx="-12" rx="6" ry="3"/><ellipse cx="12" rx="6" ry="3"/><ellipse cx="-9" cy="-9" rx="5" ry="3" transform="rotate(-45 -9 -9)"/><ellipse cx="9" cy="9" rx="5" ry="3" transform="rotate(-45 9 9)"/><ellipse cx="9" cy="-9" rx="5" ry="3" transform="rotate(45 9 -9)"/><ellipse cx="-9" cy="9" rx="5" ry="3" transform="rotate(45 -9 9)"/></g>
                <g transform="translate(319 50) scale(.78)"><circle r="5"/><ellipse cy="-12" ry="6" rx="3"/><ellipse cy="12" ry="6" rx="3"/><ellipse cx="-12" rx="6" ry="3"/><ellipse cx="12" rx="6" ry="3"/><ellipse cx="-9" cy="-9" rx="5" ry="3"/><ellipse cx="9" cy="9" rx="5" ry="3"/><ellipse cx="9" cy="-9" rx="5" ry="3"/><ellipse cx="-9" cy="9" rx="5" ry="3"/></g>
                <g transform="translate(91 56) scale(.7)"><circle r="5"/><ellipse cy="-12" ry="6" rx="3"/><ellipse cy="12" ry="6" rx="3"/><ellipse cx="-12" rx="6" ry="3"/><ellipse cx="12" rx="6" ry="3"/><ellipse cx="-9" cy="-9" rx="5" ry="3"/><ellipse cx="9" cy="9" rx="5" ry="3"/><ellipse cx="9" cy="-9" rx="5" ry="3"/><ellipse cx="-9" cy="9" rx="5" ry="3"/></g>
                <g transform="translate(39 143) scale(.72)"><circle r="5"/><ellipse cy="-12" ry="6" rx="3"/><ellipse cy="12" ry="6" rx="3"/><ellipse cx="-12" rx="6" ry="3"/><ellipse cx="12" rx="6" ry="3"/><ellipse cx="-9" cy="-9" rx="5" ry="3"/><ellipse cx="9" cy="9" rx="5" ry="3"/><ellipse cx="9" cy="-9" rx="5" ry="3"/><ellipse cx="-9" cy="9" rx="5" ry="3"/></g>
                <g transform="translate(357 20)"><circle r="5"/><circle cx="-8" cy="-5" r="4.5"/><circle cx="8" cy="-5" r="4.5"/><circle cx="-8" cy="5" r="4.5"/><circle cx="8" cy="5" r="4.5"/><circle cy="-11" r="4.5"/><circle cy="11" r="4.5"/></g>
                <g transform="translate(331 43) scale(.88)"><circle r="5"/><circle cx="-8" cy="-5" r="4.5"/><circle cx="8" cy="-5" r="4.5"/><circle cx="-8" cy="5" r="4.5"/><circle cx="8" cy="5" r="4.5"/><circle cy="-11" r="4.5"/><circle cy="11" r="4.5"/></g>
                <g transform="translate(386 37) scale(.82)"><circle r="5"/><circle cx="-8" cy="-5" r="4.5"/><circle cx="8" cy="-5" r="4.5"/><circle cx="-8" cy="5" r="4.5"/><circle cx="8" cy="5" r="4.5"/><circle cy="-11" r="4.5"/><circle cy="11" r="4.5"/></g>
                <g transform="translate(341 54) scale(.72)"><circle r="5"/><circle cx="-8" cy="-5" r="4.5"/><circle cx="8" cy="-5" r="4.5"/><circle cx="-8" cy="5" r="4.5"/><circle cx="8" cy="5" r="4.5"/><circle cy="-11" r="4.5"/><circle cy="11" r="4.5"/></g>
            </g>
            </svg>
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
