# Retrospective Codex context measurements — 2026-10-16

Evidence for the [context follow-up](../specs/agent-workflow-evaluation.md#context-follow-up--2026-10-16). This historical snapshot does not change routing or task-size defaults.

## Source and method

Read local `.codex/sessions/2026/10/**/*.jsonl` under the user profile. Select session metadata whose working directory contains `bezeg` and whose source has `subagent.thread_spawn`; exclude root chats and guardian reviews. Worker IDs below identify the source rollouts. Dates use session metadata UTC dates; timing is wall-clock time from metadata start, including idle time, not active execution time.

Starting input is the first available positive `event_msg` / `token_count` value at `payload.info.last_token_usage.input_tokens`; peak is its maximum within the worker rollout. Window is the first reported `payload.info.model_context_window`. These are recorded request-input measurements, not exact live occupancy or cumulative/billed usage. They include runtime context and cannot establish task-brief overhead. Cached input remains input context.

Count top-level `compacted` events more than five seconds after metadata start as during-work compactions; report events at or before that boundary separately as startup records. This is a heuristic, not proof of event provenance. Some transcript content was encrypted and causal attribution is incomplete. Absence of a recorded compaction means none in this recovered rollout, not proof of complete session history. The sample excludes Claude and any unrecovered sessions.

## Summary

Recovered 142 workers; 17 compacted during work. Fifteen additional workers had startup-only records. October 13–15: 38 workers, 4 with during-work compaction. October 15: 19 workers, 3 with during-work compaction.

No correlation with forgotten requirements, repeated reading, or repair outcomes was established. Fewer compactions alone would not establish a better workflow. Handler context was outside this worker-only extraction.

## Per-worker measurements

Agent names unavailable in metadata are marked unnamed. A dash in timing means no during-work compaction was recorded. Earlier chat estimates of 191k/174k/161k used rounded request totals; this table consistently uses input tokens only.

| UTC date | Worker ID / agent | Starting input | Peak input | Reported window | Compactions during work | Startup records | Minutes to first compaction |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 2026-10-08 | 01a11c0e-970f-7002-973b-0a5ab4bffa95 / /root/mathematics_review | 30063 | 63476 | 258400 | 0 | 0 | — |
| 2026-10-08 | 01a11c0e-b74f-7180-a563-26b65221eec8 / /root/ui_accessibility_review | 30058 | 57509 | 258400 | 0 | 0 | — |
| 2026-10-08 | 01a11c13-b51e-7b33-90c3-2cca93c9fa6d / /root/feature_inventory | 29866 | 67495 | 258400 | 0 | 0 | — |
| 2026-10-08 | 01a11c1a-b08c-7ed2-a701-1fee904612a7 / /root/animation_facts | 29943 | 71749 | 258400 | 0 | 0 | — |
| 2026-10-08 | 01a11c3b-d73c-76d3-9af2-18346115ccf8 / /root/standards_review | 31581 | 83342 | 258400 | 0 | 0 | — |
| 2026-10-08 | 01a11c3b-fad8-77f3-880f-34979a684786 / /root/spec_review | 31467 | 73630 | 258400 | 0 | 0 | — |
| 2026-10-08 | 01a11c6f-169e-72e3-a905-f32421b610c9 / /root/ui_review | 34041 | 100947 | 258400 | 0 | 0 | — |
| 2026-10-08 | 01a11c6f-2bf2-7a81-b64d-a6f2dc7e324e / /root/math_review | 34019 | 88650 | 258400 | 0 | 0 | — |
| 2026-10-08 | 01a11ca1-60f9-76d0-aee4-03bae59cb18f / /root/localization_inventory | 29411 | 130777 | 258400 | 0 | 0 | — |
| 2026-10-08 | 01a11ca5-e78a-7422-bdea-d3902d183edd / /root/math_compat_review | 32664 | 67915 | 258400 | 0 | 1 | — |
| 2026-10-08 | 01a11ca5-f2fb-73c3-8a71-e7df88cd69d8 / /root/engineering_review | 32646 | 107715 | 258400 | 0 | 1 | — |
| 2026-10-08 | 01a11ca5-ff17-76a1-b288-859a0d95159c / /root/ui_accessibility_review | 32664 | 99536 | 258400 | 0 | 1 | — |
| 2026-10-08 | 01a11cb3-d61a-7443-a7c9-1a1653d66112 / /root/localization_math_review | 30780 | 78059 | 258400 | 0 | 0 | — |
| 2026-10-08 | 01a11ce6-e344-7d61-9e31-9567e1a4edff / /root/ui_constraints | 29376 | 55951 | 258400 | 0 | 0 | — |
| 2026-10-08 | 01a11d18-36ad-7643-9559-bd55390acf8b / /root/learning_math_review | 35099 | 66472 | 258400 | 0 | 1 | — |
| 2026-10-08 | 01a11d18-490f-7c90-a76f-c03519380a1d / /root/learning_ui_review | 35078 | 59014 | 258400 | 0 | 1 | — |
| 2026-10-08 | 01a11d5a-cb45-7d42-9ebb-7995d9284b57 / /root/architecture_scan | 29449 | 68688 | 258400 | 0 | 0 | — |
| 2026-10-08 | 01a11d60-7ff4-7ca2-bc41-073813699e16 / /root/minimal_metadata | 29816 | 41290 | 258400 | 0 | 0 | — |
| 2026-10-08 | 01a11d60-99cd-7832-b5b6-e4ed84c70985 / /root/flexible_metadata | 29788 | 41494 | 258400 | 0 | 0 | — |
| 2026-10-08 | 01a11d60-bc8c-73c1-91c8-e5ea63e2fb6a / /root/caller_metadata | 29801 | 39059 | 258400 | 0 | 0 | — |
| 2026-10-08 | 01a11d69-763b-77c1-8fa9-3ff969ed040e / /root/metadata_math_review | 30103 | 50491 | 258400 | 0 | 0 | — |
| 2026-10-08 | 01a11d69-8eb7-7691-866d-12ef4fff3384 / /root/metadata_engineering_review | 30101 | 61242 | 258400 | 0 | 0 | — |
| 2026-10-08 | 01a11d69-a6ad-7f13-ae13-10952f6e2b9d / /root/metadata_ui_review | 30086 | 59310 | 258400 | 0 | 0 | — |
| 2026-10-08 | 01a11d76-7403-7713-a4e6-9fab1eec3369 / unnamed | 29147 | 162450 | 258400 | 0 | 0 | — |
| 2026-10-08 | 01a11d76-75ed-7ce1-8c50-ba5ad76b89eb / unnamed | 29118 | 148264 | 258400 | 0 | 0 | — |
| 2026-10-08 | 01a11d76-7995-7c23-9649-5a0914cf6023 / unnamed | 29128 | 166899 | 258400 | 0 | 0 | — |
| 2026-10-08 | 01a11dac-755e-7531-8628-51db1d98f038 / unnamed | 28561 | 154159 | 258400 | 0 | 0 | — |
| 2026-10-08 | 01a11db8-4ffc-7f30-bdb3-3161ea170b77 / unnamed | 28576 | 223172 | 258400 | 0 | 0 | — |
| 2026-10-08 | 01a11db9-39af-7912-9eb1-11692f46fafa / unnamed | 31930 | 208832 | 258400 | 0 | 0 | — |
| 2026-10-08 | 01a11db9-3b17-7eb1-9851-ad4df0ea8cb2 / unnamed | 31932 | 125692 | 258400 | 0 | 0 | — |
| 2026-10-09 | 01a11df6-5f71-7973-9fde-17bd1b4c5979 / unnamed | 28550 | 64322 | 258400 | 0 | 0 | — |
| 2026-10-09 | 01a11df6-604f-7800-a84e-91555101b538 / unnamed | 28568 | 97575 | 258400 | 0 | 0 | — |
| 2026-10-09 | 01a11e1b-959e-7da0-957d-f6e85bf98ae6 / unnamed | 36910 | 132776 | 258400 | 0 | 1 | — |
| 2026-10-09 | 01a11e1b-96ff-7183-b89e-2a70915b3903 / unnamed | 36905 | 112210 | 258400 | 0 | 1 | — |
| 2026-10-09 | 01a120ab-8efb-7cc2-84ab-a8d9e4023dcf / unnamed | 41488 | 145643 | 258400 | 0 | 1 | — |
| 2026-10-09 | 01a120ab-926f-7210-bd32-d680ebfdd226 / unnamed | 51344 | 175336 | 258400 | 0 | 1 | — |
| 2026-10-09 | 01a120be-880e-7dc1-bdf3-9bfba298ad8e / unnamed | 29219 | 166952 | 258400 | 0 | 0 | — |
| 2026-10-09 | 01a120be-8ab9-7090-8464-57643a0c3934 / unnamed | 29214 | 160074 | 258400 | 0 | 0 | — |
| 2026-10-09 | 01a120be-90ac-7482-92e9-206b9ac0d58f / unnamed | 29211 | 142020 | 258400 | 0 | 0 | — |
| 2026-10-09 | 01a120d0-b146-7813-bc53-2081ae7c6289 / unnamed | 31793 | 119202 | 258400 | 0 | 1 | — |
| 2026-10-09 | 01a120d0-b3d4-78e3-ac2b-2ce85238278b / unnamed | 31758 | 145703 | 258400 | 0 | 1 | — |
| 2026-10-09 | 01a120d0-baf3-7293-a4d5-12de67dd1180 / unnamed | 31781 | 125949 | 258400 | 0 | 1 | — |
| 2026-10-09 | 01a120d9-4056-7a51-98a8-07296ea17953 / unnamed | 24974 | 102624 | 258400 | 0 | 1 | — |
| 2026-10-09 | 01a120d9-44cb-78d2-968b-8ce5b61b22e5 / unnamed | 34030 | 108977 | 258400 | 0 | 1 | — |
| 2026-10-09 | 01a120d9-5264-7891-81d5-cdaa558ab6f1 / unnamed | 34018 | 141320 | 258400 | 0 | 1 | — |
| 2026-10-09 | 01a12106-8a94-7821-b94d-22fa4a77bdd9 / unnamed | 18723 | 175514 | 258400 | 0 | 0 | — |
| 2026-10-09 | 01a12106-8c63-7383-88e7-26485b5791ec / unnamed | 28432 | 200859 | 258400 | 0 | 0 | — |
| 2026-10-09 | 01a12106-9fa1-7021-941b-cce4ee0b8568 / unnamed | 28425 | 180593 | 258400 | 0 | 0 | — |
| 2026-10-09 | 01a12115-d74b-7c42-9f06-9a844accd25b / unnamed | 28506 | 150804 | 258400 | 0 | 0 | — |
| 2026-10-09 | 01a12121-74d9-73c2-93d7-d3ad52b3cc2a / /root/renderer_research | 29427 | 80685 | 258400 | 0 | 0 | — |
| 2026-10-09 | 01a1212e-a9e3-7002-ab4a-0f6aeb4e4cae / /root/workflow_check | 32822 | 35458 | 258400 | 0 | 0 | — |
| 2026-10-09 | 01a12131-4a1d-7110-9f50-99e80e313fff / /root/delegation_research | 32899 | 109453 | 258400 | 0 | 0 | — |
| 2026-10-09 | 01a1213e-b16d-77d2-b8bf-fdaf16251779 / /root/smoke_skill_forward_test | 32928 | 41124 | 258400 | 0 | 0 | — |
| 2026-10-09 | 01a12140-ffc6-7b41-ad47-29d8e78d4bb3 / unnamed | 30980 | 50432 | 258400 | 0 | 0 | — |
| 2026-10-09 | 01a1214b-06ad-7612-9061-029d258bfa06 / unnamed | 30925 | 83557 | 258400 | 0 | 0 | — |
| 2026-10-09 | 01a1214c-29b1-7a22-84bf-66d2c41cf6b8 / /root/ci_smoke_discovery | 32941 | 80018 | 258400 | 0 | 0 | — |
| 2026-10-09 | 01a1214e-0987-7b31-9704-e412c2d4088f / /root/implement_playwright_smoke | 33325 | 192804 | 258400 | 1 | 0 | 22.9 |
| 2026-10-09 | 01a12154-1d71-7630-a308-b42f524b56c9 / /root/fix_inspector_spacing | 32973 | 52725 | 258400 | 0 | 0 | — |
| 2026-10-09 | 01a12154-9279-7c12-bcff-8bbc00c391b2 / /root/review_smoke_engineering | 32985 | 102306 | 258400 | 0 | 0 | — |
| 2026-10-09 | 01a12154-b10e-7672-9320-39453c841105 / /root/review_smoke_behavior | 32990 | 90136 | 258400 | 0 | 0 | — |
| 2026-10-09 | 01a12162-3284-7112-afe0-e3840f373a53 / /root/prepare_release | 33184 | 203461 | 258400 | 1 | 0 | 16.9 |
| 2026-10-09 | 01a1216d-5da5-79a0-873b-3ef9054b6342 / /root/release_smoke | 33238 | 122886 | 258400 | 0 | 0 | — |
| 2026-10-09 | 01a1218c-2bb5-79b2-affb-dad60f3d1087 / /root/geometry_ownership | 33169 | 187353 | 258400 | 1 | 0 | 14.3 |
| 2026-10-09 | 01a1218c-5575-70c3-acdc-a644a1d6655f / /root/runtime_ownership | 33106 | 183343 | 258400 | 3 | 0 | 15.2 |
| 2026-10-09 | 01a1218c-97ae-7810-ad27-15fbc22c93b3 / /root/figure_export | 33143 | 116517 | 258400 | 0 | 0 | — |
| 2026-10-09 | 01a12196-b0b8-75a0-89b3-96d34bf534cc / /root/math_review | 33062 | 215331 | 258400 | 1 | 0 | 50.4 |
| 2026-10-09 | 01a12199-aa1c-7582-94f3-ba56ab11b388 / /root/engineering_review | 33018 | 208258 | 258400 | 1 | 0 | 10.5 |
| 2026-10-09 | 01a121a3-4942-7852-ad02-a9959a94698b / /root/ownership_smoke | 33229 | 144442 | 258400 | 0 | 0 | — |
| 2026-10-09 | 01a121dd-f873-7562-8345-120d1896ff89 / /root/implement_cd | 33172 | 41189 | 258400 | 0 | 0 | — |
| 2026-10-09 | 01a121e5-a5d0-76c3-96e4-6410f784f717 / /root/hosted_smoke | 33261 | 113015 | 258400 | 0 | 0 | — |
| 2026-10-09 | 01a1224a-fb82-7883-9835-5980736a7c3a / /root/fix_export_panel | 33015 | 63522 | 258400 | 0 | 0 | — |
| 2026-10-09 | 01a1224b-706c-74d2-a0d9-d83f41fee26c / /root/verify_export_panel | 33136 | 127957 | 258400 | 0 | 0 | — |
| 2026-10-11 | 01a12b89-9b2e-7603-b610-fa6dc5194f01 / /root/catalog_prototype | 33866 | 85624 | 258400 | 0 | 0 | — |
| 2026-10-11 | 01a12b9b-95bf-72d0-a4d4-fc4f8951342d / /root/illustrated_c | 33958 | 155826 | 258400 | 0 | 0 | — |
| 2026-10-11 | 01a12b9f-b8bf-7790-88e4-9669cdaece3c / /root/motion_prototype | 33832 | 160107 | 258400 | 1 | 0 | 2675.1 |
| 2026-10-11 | 01a12ba0-bf42-72d0-8ff0-4a6c95d31418 / /root/preview_math_review | 33714 | 156045 | 258400 | 0 | 0 | — |
| 2026-10-11 | 01a12ba0-dfe7-7ac0-bede-38a9667cc5d5 / /root/preview_ui_review | 33679 | 93593 | 258400 | 0 | 0 | — |
| 2026-10-11 | 01a12ba2-ad5a-7422-8928-bd250f431e94 / /root/motion_math_review | 33648 | 148835 | 258400 | 0 | 0 | — |
| 2026-10-11 | 01a12ba2-cab4-70c1-9944-92a72a8465dc / /root/motion_ui_review | 33665 | 152241 | 258400 | 0 | 0 | — |
| 2026-10-11 | 01a12bb8-ccf1-7220-94b7-a74e2415aabd / /root/production_catalog | 33835 | 154296 | 258400 | 1 | 0 | 18.1 |
| 2026-10-11 | 01a12bb9-0801-7b83-a59d-f4f00727f36e / /root/faithful_previews | 33875 | 119952 | 258400 | 0 | 0 | — |
| 2026-10-11 | 01a12bbc-6580-7b93-a18d-a5195d9e4632 / /root/catalog_ui_review | 33690 | 105235 | 258400 | 0 | 0 | — |
| 2026-10-11 | 01a12bc6-1fbb-77f3-99ab-2d3dcea5a073 / /root/catalog_fidelity_review | 33719 | 77705 | 258400 | 0 | 0 | — |
| 2026-10-11 | 01a12bdd-ef1d-7553-a4b5-4836f16b76e7 / /root/graph_style | 33828 | 166404 | 258400 | 3 | 0 | 14 |
| 2026-10-11 | 01a12bde-a336-7e00-a8ec-ce61aabe2a48 / /root/visual_evidence | 33802 | 159671 | 258400 | 4 | 0 | 17.1 |
| 2026-10-11 | 01a12be3-a609-7781-83f8-987d54327867 / /root/math_review | 33697 | 175125 | 258400 | 1 | 0 | 40.3 |
| 2026-10-11 | 01a12bf9-77c5-78b1-8096-656f967d5a15 / /root/function_style | 33895 | 105142 | 258400 | 0 | 0 | — |
| 2026-10-11 | 01a12c03-093d-7a93-9463-a9422318f4cf / /root/engineering_review | 33823 | 144228 | 258400 | 0 | 0 | — |
| 2026-10-11 | 01a12c0f-b95f-7781-b9e9-3213f29f32a3 / /root/style_smoke | 34061 | 88922 | 258400 | 0 | 0 | — |
| 2026-10-11 | 01a12c3c-07dc-7f81-a220-a78136713f0b / /root/preview_framing | 33814 | 152774 | 258400 | 1 | 0 | 25.1 |
| 2026-10-11 | 01a12c45-2ee0-7273-a44b-934949f56af5 / /root/review_framing | 33666 | 101896 | 258400 | 0 | 0 | — |
| 2026-10-11 | 01a12c45-483e-72f3-b0cf-a54c2aa6581b / /root/review_preview_math | 33682 | 108466 | 258400 | 0 | 0 | — |
| 2026-10-12 | 01a12f8e-8817-7302-9502-f5008071c11d / /root/action_prototype | 30889 | 85711 | 258400 | 0 | 0 | — |
| 2026-10-12 | 01a12f9a-478b-7fd3-ad20-cec47f5724e2 / /root/restore_previews | 31613 | 89955 | 258400 | 0 | 0 | — |
| 2026-10-12 | 01a12fbf-7a27-7e70-a11f-089118cb9b1e / /root/compact_action_variants | 31800 | 66413 | 258400 | 0 | 0 | — |
| 2026-10-12 | 01a12fcb-9206-7993-b134-6e29abaaa5ef / /root/icon_only_actions | 32047 | 63879 | 258400 | 0 | 0 | — |
| 2026-10-12 | 01a12fd3-ac7c-7091-98be-0f191a0c29c2 / /root/compact_variant_a_buttons | 32212 | 50481 | 258400 | 0 | 0 | — |
| 2026-10-12 | 01a12fd7-8d56-7ac0-982f-740be94c2c1f / /root/reduce_catalog_whitespace | 34517 | 55795 | 258400 | 0 | 0 | — |
| 2026-10-12 | 01a13058-0906-7d00-8218-08387db87155 / /root/inline_right_actions | 34768 | 57692 | 258400 | 0 | 0 | — |
| 2026-10-12 | 01a1305c-53fd-7e82-92b5-7aff869766d5 / /root/button_shape_variants | 34986 | 100083 | 258400 | 0 | 0 | — |
| 2026-10-12 | 01a13066-73f4-7080-a60d-c9e2f24cc80c / /root/catalog_affordances | 29478 | 163656 | 258400 | 2 | 0 | 15.7 |
| 2026-10-12 | 01a1308d-5935-7ea2-bdbf-bb9b31f5351c / /root/catalog_ui_review | 29470 | 88623 | 258400 | 0 | 0 | — |
| 2026-10-12 | 01a1308d-66be-72c2-9d05-ee3bbbfaf378 / /root/catalog_engineering_review | 29433 | 111353 | 258400 | 0 | 0 | — |
| 2026-10-12 | 01a1308e-5e25-7813-9345-58c84f3fc85c / /root/catalog_smoke | 29568 | 41116 | 258400 | 0 | 0 | — |
| 2026-10-13 | 01a13550-7264-7be3-88c8-cbd9950ee887 / /root/opening_prototype | 33195 | 98745 | 258400 | 0 | 0 | — |
| 2026-10-13 | 01a1356c-f54b-7760-89bd-41383caf2f53 / /root/variant_c_carousel | 33220 | 92446 | 258400 | 0 | 0 | — |
| 2026-10-13 | 01a13581-2422-75f0-bb2a-4c4e49fee217 / /root/opening_carousel | 29538 | 162963 | 258400 | 1 | 0 | 9.9 |
| 2026-10-13 | 01a13595-d37a-7da1-9117-04253a51a5d3 / /root/carousel_spec_review | 29410 | 68007 | 258400 | 0 | 0 | — |
| 2026-10-13 | 01a13595-e25f-7e13-9977-f38109921e64 / /root/carousel_ui_review | 29449 | 74583 | 258400 | 0 | 0 | — |
| 2026-10-13 | 01a135fa-2fc6-7df0-8c78-bebb6eff8da5 / /root/demo_page_visual | 29681 | 114073 | 258400 | 0 | 0 | — |
| 2026-10-13 | 01a135fa-4c63-7501-b83c-ddcdaf185874 / /root/demo_preview_workflow | 29715 | 125701 | 258400 | 0 | 0 | — |
| 2026-10-13 | 01a13606-d98d-75e0-bdca-61d674610571 / /root/demonstrations_smoke | 29675 | 93634 | 258400 | 0 | 0 | — |
| 2026-10-13 | 01a13608-c70e-7cb2-bf18-fcb39ba3d5d7 / /root/review_standards_accessibility | 29721 | 155315 | 258400 | 0 | 0 | — |
| 2026-10-13 | 01a13608-dc04-7ce2-8f9d-8655b32a8137 / /root/review_spec_math | 29488 | 102939 | 258400 | 0 | 0 | — |
| 2026-10-13 | 01a1361f-4380-7bb0-9a4d-e23368e91820 / /root/demonstrations_prototype | 32714 | 138895 | 258400 | 0 | 0 | — |
| 2026-10-13 | 01a13627-306e-7283-b314-cecf2e52d143 / /root/prototype_engineering_review | 32213 | 107575 | 258400 | 0 | 0 | — |
| 2026-10-13 | 01a13627-3fd1-7882-9c0d-4795654bb5b8 / /root/prototype_ui_review | 32187 | 136979 | 258400 | 0 | 0 | — |
| 2026-10-13 | 01a1364d-a5ed-7880-a97e-a683f09bcd83 / unnamed | 31365 | 93293 | 258400 | 0 | 0 | — |
| 2026-10-13 | 01a1365e-3079-7b73-a467-d64ce6ba5665 / unnamed | 31466 | 97945 | 258400 | 0 | 0 | — |
| 2026-10-13 | 01a1365e-555b-7c53-84c9-1b8dea03b4fa / unnamed | 31309 | 111129 | 258400 | 0 | 0 | — |
| 2026-10-14 | 01a13a04-8022-7351-b866-16ee8a00db77 / /root/analysis_candidates | 33681 | 142846 | 258400 | 0 | 0 | — |
| 2026-10-14 | 01a13a11-565d-7001-aa74-ce4ccead63aa / /root/lesson_expansion_facts | 33653 | 79398 | 258400 | 0 | 0 | — |
| 2026-10-14 | 01a13a4c-1e82-7893-962d-82475caf0229 / /root/topic_header | 29624 | 62533 | 258400 | 0 | 0 | — |
| 2026-10-15 | 01a13fd1-b247-7393-be54-e7137a41710a / /root/homepage_catalogue_facts | 33765 | 81231 | 258400 | 0 | 0 | — |
| 2026-10-15 | 01a13fe0-c0bb-7950-8d86-f27ee251cf37 / /root/page_implementation | 33874 | 168509 | 258400 | 0 | 0 | — |
| 2026-10-15 | 01a13fe1-00b8-7c22-9dd6-006f316a831e / /root/page_tests | 33768 | 134041 | 258400 | 0 | 0 | — |
| 2026-10-15 | 01a13fe4-4995-7ad1-99ac-d27e272932ae / /root/engineering_review | 33689 | 116350 | 258400 | 0 | 0 | — |
| 2026-10-15 | 01a13fe6-9621-7cc2-be64-c698f8e8f47a / /root/browser_smoke | 34004 | 102657 | 258400 | 0 | 0 | — |
| 2026-10-15 | 01a1400c-cdb0-7e61-bafd-d4475a13a791 / /root/research_evidence | 33819 | 126959 | 258400 | 0 | 0 | — |
| 2026-10-15 | 01a14016-4fa6-7593-8e72-a36e777150a8 / /root/evaluation_loop | 34153 | 57057 | 258400 | 0 | 0 | — |
| 2026-10-15 | 01a14018-f9ed-7ab1-9e42-0ff64ca01ebd / /root/feedback_forward_test | 34014 | 37607 | 258400 | 0 | 0 | — |
| 2026-10-15 | 01a14022-9a22-7952-a019-a344021e4b27 / /root/homepage_flair | 33782 | 68275 | 258400 | 0 | 0 | — |
| 2026-10-15 | 01a14048-cd26-7e21-b4db-ac2d2438ccfb / /root/git_controls | 33733 | 119691 | 258400 | 0 | 0 | — |
| 2026-10-15 | 01a1405c-b5c2-7883-86ec-d32f6356ef16 / /root/ci_scoping | 33803 | 51881 | 258400 | 0 | 0 | — |
| 2026-10-15 | 01a1405e-4049-7eb2-9b7d-c475506a046c / /root/ci_review | 33699 | 43203 | 258400 | 0 | 0 | — |
| 2026-10-15 | 01a14073-50b1-72a0-a51d-0a71bf461c30 / /root/collection | 33782 | 160542 | 258400 | 0 | 0 | — |
| 2026-10-15 | 01a14073-a502-7953-8d71-63a0c5ebe063 / /root/playback | 33726 | 191189 | 258400 | 1 | 0 | 22.9 |
| 2026-10-15 | 01a14074-351b-74e0-9206-35400db72cc7 / /root/browser_tests | 33771 | 173698 | 258400 | 1 | 0 | 20.9 |
| 2026-10-15 | 01a1407b-438e-7063-9258-070cc942d337 / /root/smoke | 33922 | 160936 | 258400 | 1 | 0 | 14.5 |
| 2026-10-15 | 01a140de-e193-7f22-96e6-a5f306d8bb5e / /root/workspace_style | 33818 | 68419 | 258400 | 0 | 0 | — |
| 2026-10-15 | 01a140e1-9a6a-71d1-9e17-ab7761f445cb / /root/workspace_smoke | 33882 | 116789 | 258400 | 0 | 0 | — |
| 2026-10-15 | 01a140f7-7132-7292-a637-e8dd1995f371 / /root/header_smoke | 33784 | 152534 | 258400 | 0 | 0 | — |
