# Repository Guidelines

## Project Structure & Module Organization

This directory contains materials for a one-hour internal AI coding training. Treat it as a training-content workspace, not the parent npm CLI project.

The training exists because, in real business work, many non-technical colleagues are already trying to use AI coding and agents to solve business problems, but the shared understanding is still vague: what an agent is, how to use it, what problems it can solve, why outputs are often hard to maintain, and how teams should manage agent work. The training should build that shared language before teaching specific tools.

- `handoff.md`: current state, priorities, safety notes, and continuation context. Read this first before making changes.
- `大纲.md`: overall one-hour training outline and chapter allocation.
- `coding本质/`: chapter 1 materials explaining the essence of agents and AI coding.
- `coding本质/demo/`: runnable teaching demos, from single model call to loop, memory, shell execution, skills, MCP, and web UI.
- `coding本质/demo/step5_mcp/`: MCP weather demo implementation and notes.

## Build, Test, and Development Commands

Run demo commands from `coding本质/demo`:

```bash
.venv/bin/python step1_single.py
.venv/bin/python step2_multi_nomem.py
.venv/bin/python step3_multi_mem.py
.venv/bin/python step4_agent.py
.venv/bin/python step5_agent_skill.py
cd step5_mcp && ../.venv/bin/python step5_mcp_client.py
cd ../step6_web && ../.venv/bin/python server.py
```

For syntax checks:

```bash
find coding本质/demo -name '*.py' -not -path '*/.venv/*' -print0 | xargs -0 .venv/bin/python -m py_compile
```

## Training Spine

Preserve this four-part frame when expanding materials:

1. **Agent / AI coding essence**: demystify agents as model + loop + command execution + instructions.
2. **Tools and agent platforms**: explain what tools can be used and why Codex, Claude Code, WorkBuddy, AI IDEs, skills, MCP, and plugins matter.
3. **Managing agents through agentic engineering**: focus on communication, requirement alignment, file management, memory management, verification, maintainability, and compounding team assets.
4. **What to do next**: practical suggestions, small tips, next actions, and lightweight adoption paths for business, product, engineering, and management audiences.

The core teaching point is that AI coding is not only "humans writing code with AI"; for most attendees it means learning how to turn business problems into executable, inspectable, and reusable agent tasks.

## Content Style & Naming Conventions

Keep teaching materials concise, concrete, and demo-driven. Use Chinese for audience-facing notes unless a source, API term, or command is naturally English. Preserve the chapter spine: demystify agents first, then show how skills, MCP, plugins, and AI IDEs make the loop reusable and governed.

Python demo files should remain minimal and stepwise. Each step should add one visible capability only, so the audience can see the evolution.

## Testing Guidelines

Before changing demos, run `py_compile` and smoke-test the affected step. For MCP changes, verify handshake, `list_tools`, and `call_tool`. For web changes, check `/status`, `/events`, desktop display, and phone access when relevant.

## Security & Configuration

`coding本质/demo/.env` contains real secrets and must not be printed, copied into docs, or committed. Steps 4-6 can execute model-produced shell commands; run them only in low-risk working directories with explicit demo tasks, timeouts, and local-network awareness.

## Commit & PR Notes

This training directory may be untracked inside a dirty parent repository. Do not revert unrelated parent-repo changes. Keep commits scoped to training materials and mention any demo command or verification performed.
