import {createContext, ReactNode} from "react";

interface SiteContextValue {
    preset: {
        selected: string;
        setSelected: (selected: string) => void;
    };
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
    preset: {
        selected: "",
        setSelected: (selected: string) => console.debug(selected)
    },
    fullScreen: {
        fullScreen: false,
        setFullScreen: (fullScreen: boolean) => console.debug(fullScreen)
    },
    workspace: undefined
});
