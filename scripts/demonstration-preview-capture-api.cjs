// Deliberate consumer interface for the offline preview generator.
// Route-specific formulas and evidence implementation stay behind this boundary.
const {capture} = require('./demonstration-preview-motion.cjs');

module.exports = Object.freeze({
    generateMotions: capture.generateMotions,
    motionIds: capture.motionIds,
    isRecipeAligned: capture.isRecipeAligned,
    recipeAlignedMotionIds: capture.recipeAlignedMotionIds,
    assertMotionEvidence: capture.assertMotionEvidence,
});
