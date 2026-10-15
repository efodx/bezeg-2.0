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
        <svg className="welcome-botanical" viewBox="0 0 420 360" aria-hidden="true" focusable="false">
            <g className="welcome-botanical-stems">
                <path d="M410 358C367 279 327 207 278 157S203 69 170 7"/>
                <path d="M278 157C313 120 350 96 402 83M326 207C364 193 391 170 416 137"/>
                <path d="M237 108C204 91 164 76 122 42M266 140C265 95 259 51 253 7"/>
                <path d="M356 271C386 250 402 226 414 198M205 74C174 68 145 69 111 77"/>
            </g>
            <g className="welcome-botanical-leaves">
                <path d="M331 204C327 164 346 137 387 119C384 162 366 190 331 204Z"/>
                <path d="M350 257C343 219 359 192 397 174C398 211 381 240 350 257Z"/>
                <path d="M273 151C284 111 312 94 355 96C337 131 309 150 273 151Z"/>
                <path d="M232 106C192 105 164 84 146 46C186 53 216 73 232 106Z"/>
                <path d="M265 129C239 101 234 68 250 30C273 63 280 96 265 129Z"/>
                <path d="M201 76C166 96 134 91 99 66C136 49 170 51 201 76Z"/>
                <path d="M380 293C388 263 408 245 437 239C430 269 411 289 380 293Z"/>
            </g>
            <g className="welcome-botanical-flowers">
                <g transform="translate(394 80)"><circle cx="0" cy="0" r="5"/><circle cx="-10" cy="-4" r="4"/><circle cx="9" cy="-7" r="4"/><circle cx="-7" cy="8" r="4"/><circle cx="8" cy="8" r="4"/><circle cx="-1" cy="-13" r="4"/><circle cx="14" cy="2" r="4"/><circle cx="-15" cy="4" r="4"/></g>
                <g transform="translate(416 131)"><circle cx="0" cy="0" r="5"/><circle cx="-10" cy="-5" r="4"/><circle cx="8" cy="-8" r="4"/><circle cx="-8" cy="8" r="4"/><circle cx="9" cy="8" r="4"/><circle cx="-1" cy="-14" r="4"/><circle cx="15" cy="2" r="4"/><circle cx="-15" cy="3" r="4"/></g>
                <g transform="translate(252 8)"><circle cx="0" cy="0" r="5"/><circle cx="-10" cy="-5" r="4"/><circle cx="9" cy="-8" r="4"/><circle cx="-7" cy="8" r="4"/><circle cx="8" cy="8" r="4"/><circle cx="-1" cy="-14" r="4"/><circle cx="15" cy="2" r="4"/><circle cx="-15" cy="3" r="4"/></g>
                <g transform="translate(168 8)"><circle cx="0" cy="0" r="5"/><circle cx="-10" cy="-5" r="4"/><circle cx="9" cy="-8" r="4"/><circle cx="-7" cy="8" r="4"/><circle cx="8" cy="8" r="4"/><circle cx="-1" cy="-14" r="4"/><circle cx="15" cy="2" r="4"/><circle cx="-15" cy="3" r="4"/></g>
                <g transform="translate(105 77)"><circle cx="0" cy="0" r="5"/><circle cx="-10" cy="-5" r="4"/><circle cx="9" cy="-8" r="4"/><circle cx="-7" cy="8" r="4"/><circle cx="8" cy="8" r="4"/><circle cx="-1" cy="-14" r="4"/><circle cx="15" cy="2" r="4"/><circle cx="-15" cy="3" r="4"/></g>
            </g>
        </svg>
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
