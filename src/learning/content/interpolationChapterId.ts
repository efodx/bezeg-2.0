/** Leaf module: the chapter-owned table reads this id while interpolationChapterRegistry.ts may still be loading (it imports the lesson catalog, which imports the table). */
export const INTERPOLATION_CHAPTER_ID = 'interpolation';
