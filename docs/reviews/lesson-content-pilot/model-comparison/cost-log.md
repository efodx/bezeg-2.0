# Model comparison: writer cost log

Subagent tokens and wall time from the task notifications. Reviewers must not read this file: config names map to models.

| Config | Model | Attempt | Tokens | Time | Outcome |
| --- | --- | --- | --- | --- | --- |
| w-c | Haiku max | all 4 | 102k | 345s | failed at budget, 0 lessons |
| w-c | Haiku max | bezier, with source | 115k | 405s | failed at budget, 0 lessons |
| w-c | Haiku max | bezier, no source | 156k | 735s | 1 lesson |
| w-b | Sonnet high | all 4 | 144k | 985s | 3 lessons |
| w-a | Opus high | all 4 | 144k | 1272s | failed at budget, plan only |
| w-a | Opus high | bezier, from plan | 49k | 276s | 1 lesson |
| w-b | Sonnet high | zeros | 57k | 885s | 1 lesson (7 steps) |
| w-c | Haiku max | subdivision, no source | 141k | 510s | 1 lesson (5 steps) |
| w-a | Opus high | subdivision, from plan | 43k | 226s | 1 lesson (5 steps) |
| w-a | Opus high | curvature, from plan | 49k | 218s | 1 lesson (5 steps) |
| w-d | Fable low | bezier | 45k | 514s | 1 lesson (6 steps) |
| w-c | Haiku max | curvature, no source | 159k | 559s | 1 lesson (5 steps) |
| w-d | Fable low | subdivision | 55k | 238s | 1 lesson (5 steps) |
| w-a | Opus high | zeros, plan without source | 79k | 495s | 1 lesson (7 steps) |
| w-c | Haiku max | zeros, no source | 121k | 420s | 1 lesson (5 steps) |
| w-d | Fable low | curvature | 42k | 313s | 1 lesson (7 steps) |
| w-e | Sonnet medium | bezier | 28k | 241s | 1 lesson (5 steps) |
| w-e | Sonnet medium | subdivision | 28k | 270s | 1 lesson (5 steps) |
| w-e | Sonnet medium | curvature | 33k | 153s | 1 lesson (5 steps) |
| w-e | Sonnet medium | zeros | 30k | 143s | 1 lesson (5 steps) |
| w-d | Fable low | zeros | 44k | 447s | 1 lesson (6 steps) |
