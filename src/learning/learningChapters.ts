import {bezierChapter} from './content/bezierChapter';
import {familyChapters} from './content/familyChapters';
import type {FamilyChapter} from './content/familyChapters';

const bezier: FamilyChapter = {
    id: 'bezier-curves', family: '/bezeg-2.0/bezier',
    title: {sl: bezierChapter.sl.title, en: bezierChapter.en.title},
    purpose: {sl: bezierChapter.sl.purpose, en: bezierChapter.en.purpose},
    prerequisites: {sl: bezierChapter.sl.prerequisites, en: bezierChapter.en.prerequisites},
    sections: [], // The existing chapter owns its richer activities and reading restoration.
};

export const learningChapters: readonly FamilyChapter[] = [
    ...familyChapters.filter(chapter => chapter.id === 'foundations'),
    bezier,
    ...familyChapters.filter(chapter => chapter.id !== 'foundations'),
];
