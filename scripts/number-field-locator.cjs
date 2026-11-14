'use strict';
// A Slider keeps its label on the range input and adds an exact field named "<label>, vrednost" (English "<label>, value").
// Recipes that type a number address that field; a plain NumberInput keeps its own label, so the label locator is the fallback.
const escapeRegExp = text => String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** The Slider's exact field when the label names a Slider, otherwise `fallback` (the recipe's former locator). */
async function numberFieldLocator(page, label, fallback) {
    const field = page.getByRole('spinbutton', {name: new RegExp(`^${escapeRegExp(label)}, (?:vrednost|value)$`), includeHidden: true});
    return await field.count() === 1 ? field : fallback;
}

module.exports = {numberFieldLocator};
