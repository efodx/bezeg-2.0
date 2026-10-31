import {createContext} from "react";

interface SiteContextValue {
    fullScreen: {
        fullScreen: boolean;
        setFullScreen: (fullScreen: boolean) => void;
    };
}

export const SiteContext = createContext<SiteContextValue>({
    fullScreen: {
        fullScreen: false,
        setFullScreen: () => undefined
    }
});
