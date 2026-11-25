# 07 old-fit spot check (1440x900, free play, Vite 4483)
Script: 07-old-fit-spot.cjs; raw: 07-old-fit-spot.log
1. Taylor: pan 12x via "Premakni pogled" (box x -14.7..25.1 -> -86..-46.5); fit button -> [-39.5,20.7,20.5,-4.9], 1 glide. Samodejno off (aria-pressed true->false), pan to x 68..128, fit button -> [-32.1,20.7,27.8,-4.9], 1 glide. PASS.
2. De Casteljau: drag of a control point 150px: 0 box change, 0 glides during/after (box -11.67,5,18.76,-8.22 constant). Typed x=30 into point row: view DID refit (1 glide, box -> x -2.97..41.85, y +-9.74), so point is included. Caveat: drag target chosen from JXG list, point movement itself not asserted.
3. bezier/curve (after opening "Vnos tock s tipkovnico"): p0.x=30 -> 1 glide, box -> [-4.34,7.25,31.34,-8.25]. compgeo/convex-hull: P1.x=30 -> 1 glide, box -> [-2.26,9.78,31.26,-4.78]. PASS.
4. Page errors: none on any route.
