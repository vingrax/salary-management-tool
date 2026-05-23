# AI Tools — Prompts and Usage

## Overview

This project was built using **Claude Code** (Anthropic's CLI coding agent) running the **Superpowers** agentic framework. The entire implementation — from scaffolding to deployment — was driven through a structured prompt-driven workflow.

---

## Workflow

### 1. Design spec

A natural-language prompt was used to produce a full design spec before any code was written:

> "Design a full-stack HR salary management tool. Stack: Node.js + Express + PostgreSQL backend, Next.js + shadcn/ui frontend, deployed to Railway. Features: employee CRUD, salary insights (min/max/avg by country, avg by job title + country), currency converter, 10K employee seed. Auth is out of scope."

The agent produced `docs/superpowers/specs/2026-05-23-salary-management-tool-design.md` covering data model, API design, frontend layout, testing strategy, and deployment plan.

### 2. Implementation plan

The spec was handed to the agent to produce a step-by-step implementation plan:

> "Write a detailed implementation plan for this spec. Each task should have numbered steps with exact file contents, verification commands, and commit messages."

The agent produced `docs/superpowers/plans/2026-05-23-salary-management-tool.md` — an 18-task plan with explicit file contents and TDD steps for every task.

### 3. Execution

The plan was executed using the **subagent-driven-development** skill:

- A fresh subagent was dispatched per task with the full task text as context
- Each task was followed by a spec compliance review and a code quality review
- Subagents ran tests (Jest, Vitest) and committed after each task
- The controller agent coordinated task sequencing and resolved blockers

### 4. Deployment

Railway CLI was used interactively through the agent:
- `railway up ./backend --path-as-root --service backend`
- `railway up ./frontend --path-as-root --service frontend`
- Postgres public URL used for seeding from local machine

---

## AI Tool Constraints Applied

The following rules were enforced throughout to keep AI-generated code production-quality:

- **No placeholders** — all generated code was complete and runnable
- **No guessing imports** — packages were verified to exist before use
- **Rule of Three for abstraction** — no premature abstractions
- **Two-strike rule** — if a fix failed twice, the approach was changed rather than retried
- **TDD** — tests were written before implementation for all service and utility code
- **Spec compliance reviews** — a separate reviewer subagent verified each task matched requirements exactly before proceeding
