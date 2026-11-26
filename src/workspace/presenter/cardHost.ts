// What the workspace hands the card layer (task 04, docs/reviews/ux-picks-app-wide/04-design.md section 2). The workspace keeps
// owning the panels, the lesson state and Presentation; the presenter only reads this and stays free of route knowledge.
import type {ReactNode} from 'react';
import type {FrameDeclaration, ToolsTab} from '../../graphs/base/declare/graphDeclaration';
import type {ViewDirector} from '../view/viewDirector';

export type ToolsSection = ToolsTab;

export interface WorkspaceCardHost {
    tools: {
        /** The graph's panels. Fresh nodes every render: they are never memoised. */
        panels: Readonly<Record<ToolsSection, ReactNode>>;
        section: ToolsSection;
        setSection: (section: ToolsSection) => void;
        /** Always false now: reading frames no longer lock the tools (slice 3). The field stays until the card layer stops reading it. */
        locked: boolean;
    };
    lesson: {
        /** The persistent element `GuidedLesson` is portalled into. Append it into the lesson card body: moving it never remounts the lesson. */
        slot: HTMLElement | null;
        /** A lesson is open and its graph capabilities are ready. */
        active: boolean;
        mode: 'content' | 'explore' | 'complete' | 'closed';
        /** The lesson's latest request to fold (`true`) or open its card, from a task (explore) frame; `seq` changes on every request so the same value can repeat. Undefined until one is made. */
        foldRequest: {folded: boolean; seq: number} | undefined;
        /** The card layer reports whether the lesson card is folded to its chip: folded is explore (the graph is handed back). */
        reportCardFolded: (folded: boolean) => void;
    };
    /** The open lesson frame's declaration (highlight, used controls), undefined when the frame declares none or no lesson is open. */
    frame: FrameDeclaration | undefined;
    /** The view director (task 07): whether the demonstration's view is a surface (never fitted), and where the card layer hands its director, if it made one. Absent: no director. */
    view?: {surface: boolean; onDirector: (director: ViewDirector | undefined) => void; frameTick: number};
    fullScreen: boolean;
    /** Presentation only: Orodja's fold decided by the header button. Overrides the stored fold, is never stored. Undefined outside Presentation. */
    toolsFolded: boolean | undefined;
    setToolsFolded: (folded: boolean) => void;
}
