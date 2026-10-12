import {createContext, ReactNode} from "react";

interface SiteContextValue {
    fullScreen: {
        fullScreen: boolean;
        setFullScreen: (fullScreen: boolean) => void;
    };
    workspace?: {
        title: ReactNode;
        description: string;
    };
}

export const SiteContext = createContext<SiteContextValue>({
    fullScreen: {
        fullScreen: false,
        setFullScreen: () => undefined
    },
    workspace: undefined
});
