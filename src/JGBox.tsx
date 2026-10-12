import {forwardRef, useContext} from "react";
import {SiteContext} from "./graphs/context/react/SiteContext";

/**
 * The graph's board container. The host reaches it through the forwarded ref; the id is required by JSXGraph (it
 * derives its element ids from it) and by styles, and is never used to look the element up.
 */
export const JGBox = forwardRef<HTMLDivElement>(function JGBox(_props, ref) {
    const fullScreen = useContext(SiteContext).fullScreen.fullScreen;
    return <div ref={ref} id="jgbox" style={{
        width: "100%",
        height: fullScreen ? "100vh" : "85vh",
        background: "var(--workspace-panel, var(--bezeg-panel, #fffdf5))",
        borderRadius: fullScreen ? 0 : "5px"
    }}/>;
});
