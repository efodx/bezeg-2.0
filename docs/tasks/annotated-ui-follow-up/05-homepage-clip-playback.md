# 05 Homepage clip playback

Source: [browser annotation 9](../../specs/annotated-ui-follow-up.md). A homepage exception to [hover-activated previews](../../specs/hover-motion-previews.md), using the existing [carousel](../../specs/homepage-carousel-and-demonstrations-catalogue.md).

The owner confirmed playback on every switch. A different featured demo plays one silent pass of its existing clip when selected with a tile, arrow or keyboard shortcut, or by timed rotation. When that pass ends, show the poster unless an existing trigger is active, such as hover, focus or visibility on touch. The first card keeps its current initial behavior. Selecting a demo still takes over from timed rotation.

Start the clip while its preview and document are visible and reduced motion is off. Release the previous clip immediately on a switch and cancel playback when the preview leaves view, the tab is hidden, or the route unmounts. Keep the poster and working actions if media is missing, blocked or fails to load. Keep the existing catalog and workspace picker activation rules.

Exercise desktop and 390px touch selection, keyboard and arrows, a timed switch without hover, rapid switching, a hidden or offscreen preview, reduced motion, and a failed clip. Observe that the selected clip actually plays and only the selected preview requests media. Check navigation and poster fallback, and rerun the existing catalog and picker playback checks for the shared player.
