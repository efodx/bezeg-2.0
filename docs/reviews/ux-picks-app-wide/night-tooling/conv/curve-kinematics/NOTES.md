# curve-kinematics (partial: decomposition lesson only)
Files: src/graphs/curves/kinematics/KinematicsGraph.tsx, src/learning/content/kinematicsDecompositionGuidedLessons.ts.
- Not BaseFunctionGraph: readout lives in KinematicsReadout (React, host state). workspaceUx reuses readoutRows() (same strings), regrouped: values (time, position, velocity, speed, acceleration), parts (a-t, a-n, kappa, kappa-v2), motion (period/flight/range/height/gravity), scales. Vectors carry valueTex (vectorTex, same numbers).
- Legend (drawn only): point, path, trace, velocity, acceleration, at, an, axes, osculating, reference. Linked rows: position->point, velocity, acceleration, a-t, a-n, kappa->osculating.
- Notes: wording sentence, ended, sign hint, osculating-far, cusp. Board captions (captionStack rows) hide AND stop reserving frame room under the pick (row() helper). Gravity caption dropped (g row).
- Pucks: kinematics.t, and per motion kinematics.v0/alpha or radius/omega/b (paramKey on slider() helper and time slider). Helps: existing keys.
- ToolSection: kinematics-time (playback group). The motion/toggles come from shared getGraphCommands (not converted).
- Under the pick KinematicsReadout renders only the LiveReadout announcement region.
- advance() now calls requestRender() when the pick is on, so the card follows playback (gap: host-state time does not re-publish ux).
- Frames with ux: kn5 steps 1-7 (explanation+observation); predict frames highlight inputs only.
- Lesson routes: ?example=lesson.kinematics.<section>.curve-kinematics; plain ?learn=1 opens the kn1 (vectors) lesson in kinematicsGuidedLessons.ts (4 lessons, 26 steps): NOT converted (no frame ux; cards stay closed).
- Inline strings: group titles "Razcep pospeška", "Gibanje", "Merili".
- Checks: tsc clean; just unit (graph dir + both lesson tests) pass; KN5 walk 15 frames no page errors; shots compared.
