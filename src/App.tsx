import {useT} from "./localization";
import React, {useState, useSyncExternalStore} from 'react';
import {navigationFailureSnapshot, subscribeNavigationFailure, clearNavigationFailure} from './learning/chapter/navigationFailure';
import './App.css';
import {Outlet, useLocation} from "react-router-dom";
import {SideBotanicals, showsSideBotanicals} from './sideBotanicals/SideBotanicals';
import {SiteContext} from "./graphs/context/react/SiteContext";
import {AppHeader} from './AppHeader';

function App() {
    const t = useT();
    const navigationFailed = useSyncExternalStore(subscribeNavigationFailure, navigationFailureSnapshot);

    const [fullScreen, setFullScreen] = useState(false);
    const {pathname} = useLocation();

    return (<SiteContext.Provider
            value={{
                fullScreen: {
                    fullScreen: fullScreen, setFullScreen: setFullScreen,
                }
            }}>
            <div className="App">
                <AppHeader/>
                {navigationFailed && <aside className="activity-notice" role="alert">
                    <p>{t('chapter_scene_error')}</p>
                    <a href="/bezeg-2.0/learn/bezier-curves">{t('chapter_return')}</a> · <button onClick={clearNavigationFailure}>{t('chapter_dismiss')}</button>
                </aside>}
                <Outlet/>
                {showsSideBotanicals(pathname) && <SideBotanicals route={pathname}/>}
            </div>
        </SiteContext.Provider>
    );
}

export default App;
