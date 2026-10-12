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
        setSelected: () => undefined
    },
    fullScreen: {
        fullScreen: false,
        setFullScreen: () => undefined
    },
    workspace: undefined
});
