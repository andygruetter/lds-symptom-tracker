# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **BMAD Framework** (v6.0.3) installation for the **lds-symptome-tracker** project. It is not a traditional software codebase — it is an AI agent orchestration and workflow management system. There are no build, lint, or test commands. Development is driven through BMAD agents and workflows invoked via slash commands.

## Configuration

- **User:** Andy
- **Communication language:** Deutsch (German) — all interactions and generated documents must be in German
- **Document output language:** Deutsch
- **Skill level:** intermediate
- **IDE:** Claude Code

## Installed Modules

| Module | Version | Purpose |
|--------|---------|---------|
| **core** | 6.0.3 | Master orchestrator, brainstorming, party-mode |
| **bmm** | 6.0.3 | Project management — analysis, planning, solutioning, implementation |
| **cis** | 0.1.8 | Creative Intelligence Suite — design thinking, innovation, storytelling |
| **tea** | 1.3.1 | Test Architecture Enterprise — test design, automation, CI/CD, ATDD |
| **bmb** | 0.1.6 | Builder — create/edit/validate agents, workflows, modules |

## Output Locations

All generated artifacts go to `_bmad-output/`:
- `planning-artifacts/` — PRDs, UX designs, architecture docs, product briefs, research
- `implementation-artifacts/` — stories, sprint plans, code review reports
- `test-artifacts/` — test designs, reviews, traceability matrices
- `bmb-creations/` — newly built agents, workflows, modules

Project documentation goes to `docs/`.

## Architecture

### Directory Structure

- `_bmad/core/` — Core framework: master agent, brainstorming & party-mode workflows
- `_bmad/bmm/` — BMM module: 11 agents, 20+ workflows across analysis → implementation phases
- `_bmad/cis/` — CIS module: 6 creative agents, 4 creative workflows
- `_bmad/tea/` — TEA module: test architect agent, 9 testing workflows
- `_bmad/bmb/` — BMB module: 3 builder agents, 11 builder workflows
- `_bmad/_config/` — Manifests (agents, workflows, tasks, files, tools) in CSV/YAML
- `_bmad/_memory/` — Persistent memory and documentation standards
- `.claude/commands/` — 76 pre-configured slash commands mapping to agents/workflows/tasks

### Key Patterns

- **Agent activation:** Agents load their module's `config.yaml` on startup. Never pre-load resources — load on-demand.
- **Workflow execution:** Sequential step files under `steps/` directories. No skipping; follow strict step order.
- **State tracking:** Workflow documents use frontmatter to track completion progress.
- **Append-only building:** Documents are built incrementally across workflow steps.
- **Variable syntax:** `{variable-name}` for substitution, `{project-root}` resolves to the repo root.
- **Menu handling:** Case-insensitive, fuzzy match, substring detection for agent menus.

### Development Flow (BMM Phases)

1. **Analysis** — product brief, domain/market/technical research
2. **Planning** — PRD (create/edit/validate), UX design
3. **Solutioning** — architecture, epics & stories, implementation readiness check
4. **Implementation** — story development, code review, sprint planning/status
5. **Quality** — test design, automation, CI/CD, ATDD, NFR assessment
6. **Iteration** — retrospectives, course correction

### Quick Flow (Lean Path)

For small changes: `/bmad-bmm-quick-spec` to create a quick tech spec, then `/bmad-bmm-quick-dev` to implement it.
