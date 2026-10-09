# Local project context after the Bezeg 2.0 move

The existing local `bezeg` folder is now the active Bezeg 2.0 checkout. Its folder path was retained so existing Codex chats keep their recorded working directory. The Git `origin` remote is `https://github.com/efodx/bezeg-2.0.git`; local branch `codex/bezeg-2.0` tracks the new repository's `master` branch. Development, build, preview and deployment use `/bezeg-2.0/` as documented in the README.

Project documentation, task files, prototypes, `AGENTS.md`, `.codex/config.toml`, local attachments and the existing chats remain available. Existing chat transcripts are unchanged; use the current checkout and documents when continuing old work. The project may still display the friendly name **Bezeg** in Codex; that name does not select a Git repository.

## Preserved original state

The original repository is saved locally as remote `legacy-bezeg`, with pushing through that remote disabled. Original local branches remain intact. Before switching, all current app/document changes were compared with the 2.0 release baseline and confirmed already included there. Their original uncommitted state was additionally preserved in the stash labelled `Preserve original Bezeg checkout before switching local project to Bezeg 2.0`.

A complete Git bundle and `original-state.json` under the locally ignored `.migration-backups/` directory preserve original refs, commits, stash and migration metadata. Temporary release copies and local attachments are excluded through `.git/info/exclude`, without changing the repository's shared ignore rules. Do not apply the old stash over 2.0 automatically: its edits are already included in the release.

The original GitHub repository and its published `/bezeg/` site were not pushed or deployed during this local context move. Publication targets the explicit new remote in `package.json`.
