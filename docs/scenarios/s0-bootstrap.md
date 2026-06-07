# S0 Bootstrap

> Framework index: [../framework.md](../framework.md)

S0 turns an empty or existing project into an Agentic Engineering project. It is intentionally platform-neutral: the terminal CLI performs initialization, then Claude Code, Codex, or another agent can consume the resulting files.

## Workflow

```bash
ae setup
ae init "one-line project goal"
```

`ae setup` does only asset installation:

- `skills/` -> `.claude/skills/`
- `skills/` -> `.codex/skills/`

`ae init` does only skeleton creation and entry rendering:

- creates standard directories
- renders entry files from `templates/entries/`

`ae init` fails if neither `.claude/skills/` nor `.codex/skills/` exists. Run `ae setup` first so agent assets are present before skeleton creation.

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
```

There is no `config/` directory and no `.claude/commands/` directory in v0.3. The old slash command model was removed so initialization works outside Claude Code.

## Entry Files

- `README.md`: human-facing project overview, setup, usage, and map.
- `AGENTS.md`: canonical project instructions file, including `## Project-Specific Rules`.
- `CLAUDE.md`: short pointer telling Claude Code to read `AGENTS.md`.
- `handoff.md`: latest handoff snapshot only; the handoff skill overwrites it later.
- `spec/README.md`: project map and relationship notes.
- `spec/INDEX.md`: needs and ADR index.

Existing entry files are never overwritten. If you want to regenerate one, remove it manually and run `ae init` again.

## Project Rules

Project-specific rules live directly in:

```text
AGENTS.md
```

Use the `## Project-Specific Rules` section for durable project habits, constraints, and collaboration preferences. `CLAUDE.md` is intentionally short and should not become a second rules file.

The old `config/ae-rules.md`, `--rules <path>`, and `AE:RULES` marker sync mechanism were removed in v0.3.

## Idempotence

Both S0 commands are idempotent:

- `ae setup` skips existing skills.
- `ae init` skips existing skeleton files and entry files.
- Neither command deletes, renames, or moves user files.

## Validation

Useful checks after setup and init:

```bash
test -f .claude/skills/diagnose/SKILL.md
test -f .codex/skills/diagnose/SKILL.md
test ! -d config
test -f AGENTS.md
test -f CLAUDE.md
test -f spec/INDEX.md
test ! -d .claude/commands
```
