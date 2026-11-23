// What the workspace hands the card layer (task 04, docs/reviews/ux-picks-app-wide/04-design.md section 2). The workspace keeps
// owning the panels, the lesson state and Presentation; the presenter only reads this and stays free of route knowledge.
import type {ReactNode} from 'react';

export type ToolsSection = 'edit' | 'display' | 'save';

export interface WorkspaceCardHost {
    tools: {
        /** The graph's panels. Fresh nodes every render: they are never memoised. */
        panels: Readonly<Record<ToolsSection, ReactNode>>;
        section: ToolsSection;
        setSection: (section: ToolsSection) => void;
        /** A lesson card is read: the tools are not operable (slice 3 removes this lock). */
        locked: boolean;
    };
    fullScreen: boolean;
    /** Presentation only: Orodja's fold decided by the header button. Overrides the stored fold, is never stored. Undefined outside Presentation. */
    toolsFolded: boolean | undefined;
    setToolsFolded: (folded: boolean) => void;
}
