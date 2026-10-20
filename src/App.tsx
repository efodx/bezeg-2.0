import {useT} from "./localization";
import React, {useState, useSyncExternalStore} from 'react';
import {navigationFailureSnapshot, subscribeNavigationFailure, clearNavigationFailure} from './learning/chapter/navigationFailure';
import './App.css';
import {Outlet, useLocation} from "react-router-dom";
import {findDemonstration} from "./demonstrations";
import {SiteContext} from "./graphs/context/react/SiteContext";
import {AppHeader} from './AppHeader';

function App() {
    const t = useT();
    const navigationFailed = useSyncExternalStore(subscribeNavigationFailure, navigationFailureSnapshot);

    const [fullScreen, setFullScreen] = useState(false);
    const location = useLocation();
    const demonstration = findDemonstration(location.pathname);

    return (<SiteContext.Provider
            value={{
                fullScreen: {
                    fullScreen: fullScreen, setFullScreen: setFullScreen,
                }, workspace: demonstration ? {
                    title: demonstration.workspaceTitle,
                    description: t("change_the_settings_and_observe_their_effect_on_the_graph")
                } : undefined
            }}>
            <div className="App">
                <AppHeader/>
                {navigationFailed && <aside className="activity-notice" role="alert">
                    <p>{t('chapter_scene_error')}</p>
                    <a href="/bezeg-2.0/learn/bezier-curves">{t('chapter_return')}</a> · <button onClick={clearNavigationFailure}>{t('chapter_dismiss')}</button>
                </aside>}
                <Outlet/>
            </div>
        </SiteContext.Provider>
    );
}

export default App;
