/** Leaf module: the chapter-owned table reads this id while sweepChapterRegistry.ts may still be loading (it imports the lesson catalog, which imports the table). */
export const SWEEP_CHAPTER_ID = 'sweep-algorithms';
