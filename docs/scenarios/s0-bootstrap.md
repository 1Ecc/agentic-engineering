# S0 Bootstrap

> Framework index: [../framework.md](../framework.md)

S0 turns an empty or existing project into an Agentic Engineering project. It is intentionally platform-neutral: the terminal CLI performs initialization, then Claude Code, Codex, or another agent can consume the resulting files.

## Workflow

```bash
ae setup
# optional: edit config/ae-rules.md
ae init "one-line project goal"
```

`ae setup` does only asset installation:

- `skills/` -> `.claude/skills/`
- `skills/` -> `.codex/skills/`
- `templates/ae-rules.md` -> `config/ae-rules.md`

`ae init` does only skeleton creation and rules sync:

- creates standard directories
- renders entry files from `templates/entries/`
- syncs `config/ae-rules.md` or `--rules <path>` into `AGENTS.md` and `CLAUDE.md`

`ae init` fails if neither `.claude/skills/` nor `.codex/skills/` exists. Run `ae setup` first so there is a clear editing window for `config/ae-rules.md`.

## Standard Skeleton

```text
<any-project>/
├── README.md
├── AGENTS.md
├── CLAUDE.md
├── handoff.md
│
├── reference/
│   └── .gitkeep
├── spec/
│   ├── README.md
│   ├── INDEX.md
│   ├── needs/
│   │   └── .gitkeep
│   └── ADR/
│       └── .gitkeep
├── data/
│   └── .gitkeep
└── scripts/
    └── .gitkeep
```

`ae setup` also creates:

```text
.claude/skills/
.codex/skills/
config/ae-rules.md
```

There is no `.claude/commands/` directory in v0.2. The old slash command model was removed so initialization works outside Claude Code.

## Entry Files

- `README.md`: human-facing project overview, setup, usage, and map.
- `AGENTS.md`: agent-facing project goal, progressive loading rule, spec landing rules, and project-specific section.
- `CLAUDE.md`: same starting content as `AGENTS.md`, using Claude Code's expected file name.
- `handoff.md`: latest handoff snapshot only; the handoff skill overwrites it later.
- `spec/README.md`: project map and relationship notes.
- `spec/INDEX.md`: needs and ADR index.

Existing entry files are never overwritten. If you want to regenerate one, remove it manually and run `ae init` again.

## Rules Sync

The default rules source is:

```text
config/ae-rules.md
```

You can override it:

```bash
ae init "goal" --rules /path/to/rules.md
```

Rules are injected into both `AGENTS.md` and `CLAUDE.md`:

```markdown
<!-- AE:RULES:BEGIN -->
<!-- 由 ae init 从 config/ae-rules.md 或 --rules 指定文件同步,勿手改 -->
<verbatim rules markdown>
<!-- AE:RULES:END -->
```

Behavior:

- no rules file: skip rules sync and create no block
- no existing block: append one block at the end
- one existing block: replace only the block
- mismatched markers or more than one block: stop and do not edit that file

`config/ae-rules.md` is plain markdown. It is meant for concise project rules that should be loaded by agents every session.

## Idempotence

Both S0 commands are idempotent:

- `ae setup` skips existing skills and preserves edited `config/ae-rules.md`.
- `ae init` skips existing skeleton files and rewrites only the managed `AE:RULES` block.
- Neither command deletes, renames, or moves user files.

## Validation

Useful checks after setup and init:

```bash
test -f .claude/skills/diagnose/SKILL.md
test -f .codex/skills/diagnose/SKILL.md
test -f config/ae-rules.md
test -f AGENTS.md
test -f CLAUDE.md
test -f spec/INDEX.md
test ! -d .claude/commands
```
