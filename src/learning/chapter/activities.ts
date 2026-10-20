import type {DemonstrationId} from '../../demonstrations';
import type {LessonAction} from '../model';

export const activities = [
    {
        id: 'shape-control',
        demonstrationId: 'bezier',
        sectionId: 'control-points',
        actions: [
            {kind: 'prepared-scene', sceneId: 'bezier-default', source: 'demonstration-default'},
            {kind: 'curve-visibility', target: 'control-polygon', visible: true},
            {kind: 'curve-visibility', target: 'convex-hull', visible: false},
        ],
    },
    {
        id: 'curve-parameter',
        demonstrationId: 'decasteljau',
        sectionId: 'parameter',
        actions: [
            {kind: 'prepared-scene', sceneId: 'decasteljau-quartic', source: 'demonstration-default'},
            {kind: 'curve-visibility', target: 'decasteljau-scheme', visible: true},
            {kind: 'curve-visibility', target: 'decasteljau-full-curve', visible: true},
            {kind: 'parameter', name: 't', value: 0.5},
            {kind: 'animation', animationId: 'decasteljau', command: 'pause'},
        ],
    },
    {
        id: 'repeated-interpolation',
        demonstrationId: 'decasteljau',
        sectionId: 'interpolation',
        actions: [
            {kind: 'prepared-scene', sceneId: 'decasteljau-quartic', source: 'demonstration-default'},
            {kind: 'curve-visibility', target: 'decasteljau-scheme', visible: true},
            {kind: 'curve-visibility', target: 'decasteljau-full-curve', visible: true},
            {kind: 'parameter', name: 't', value: 0.5},
            {kind: 'animation', animationId: 'decasteljau', command: 'pause'},
        ],
    },
    {
        id: 'blending-coefficients',
        demonstrationId: 'bernstein',
        sectionId: 'bernstein-form',
        actions: [
            {kind: 'prepared-scene', sceneId: 'bernstein-default', source: 'demonstration-default'},
            {kind: 'bernstein-degree', degree: 2},
            {kind: 'bernstein-stacked-area', visible: false},
        ],
    },
    {
        id: 'geometric-bounds',
        demonstrationId: 'bezier',
        sectionId: 'geometric-properties',
        actions: [
            {kind: 'prepared-scene', sceneId: 'bezier-default', source: 'demonstration-default'},
            {kind: 'curve-visibility', target: 'control-polygon', visible: true},
            {kind: 'curve-visibility', target: 'convex-hull', visible: true},
            {kind: 'curve-visibility', target: 'decasteljau-scheme', visible: false},
        ],
    },
    {
        id: 'transform-shape',
        demonstrationId: 'affine',
        sectionId: 'affine-transformations',
        actions: [
            {kind: 'prepared-scene', sceneId: 'affine-default', source: 'demonstration-default'},
            {kind: 'curve-visibility', target: 'control-polygon', visible: true},
        ],
    },
] as const satisfies readonly {
    id: string;
    demonstrationId: DemonstrationId;
    sectionId: string;
    actions: readonly LessonAction[];
}[];

export type ActivityId = typeof activities[number]['id'];
export type ActivityDefinition = typeof activities[number];

const byId: ReadonlyMap<string, ActivityDefinition> = new Map(activities.map(activity => [activity.id, activity]));

export function findActivity(id: string): ActivityDefinition | undefined {
    return byId.get(id);
}
