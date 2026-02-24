---
allowed-tools: Task, Read, Write, Glob, Grep, Bash
---

# /loop — Orchestrator

You are the orchestrator of the ai-loop. You drive the sensor-controller-actuator feedback cycle until the target is met or the iteration limit is reached.

## Task Capture

If `$ARGUMENTS` is provided, use it as the task description. Otherwise, ask the user to describe the task.

## Precondition Checks

Before starting, validate that the required agents exist:

1. Glob for `.claude/agents/loop-sensor-*.md` — at least one sensor must exist.
2. Check that `.claude/agents/loop-controller.md` exists.
3. Check that `.claude/agents/loop-actuator.md` exists.

If any are missing, tell the user to run `/loop-setup` first and stop.

## Resume Check

If `.ai-loop/orchestrator-output.md` exists, read it. If `status: running`, offer to resume from the current iteration. If the user declines, start fresh.

## Branch Management

Before starting any iteration, the orchestrator **creates a dedicated branch** for the loop run. This isolates the loop's work from the user's current branch, so all iterations live on their own branch and the user can decide what to do with the result (merge, squash, cherry-pick, discard).

### Branch creation

1. Record the current branch name (e.g., `main`, `feature-x`) — this is the **base branch**.
2. Generate a branch name from the task description: `ai-loop/{slug}` where `{slug}` is a short kebab-case slug derived from the task (e.g., `ai-loop/implement-factorial`, `ai-loop/fix-auth-bug`). Keep it under 50 chars.
3. Create and switch to the new branch: `git checkout -b ai-loop/{slug}`
4. Store the base branch name in `orchestrator-output.md` frontmatter as `base-branch`.

### On loop completion

When the loop finishes (target met or max iterations), report to the user:
- The branch name where all iterations live
- The base branch they started from
- How many commits were made
- Suggest next steps: `git merge`, `git rebase`, `git diff {base-branch}...ai-loop/{slug}`, or discard with `git branch -D`

## Iteration Lifecycle

### Initialization (Iteration 0)

1. Create the loop branch (see "Branch Management" above).

2. Write `.ai-loop/orchestrator-output.md` with:
   ```yaml
   ---
   iteration: 0
   status: running
   max-iterations: 10
   base-branch: {the branch we started from}
   branch: ai-loop/{slug}
   ---
   ```
   Include the task description in the body. **No history section** — Git is the history.

3. Spawn **all sensor agents in parallel** using the Task tool. For each sensor file found in `.claude/agents/loop-sensor-{name}.md`:
   - Use `subagent_type: "loop-sensor-{name}"` (matches the agent's `name` frontmatter field)
   - The agent file's frontmatter defines its `tools`, `model`, and constraints — no need to override
   - In the prompt, tell the agent to run its measurement and write its output file

   **All sensors must be spawned in the same message** so they run in parallel.

4. After all sensors complete, commit with structured message (see "Commit Format" below).

### Iteration Loop (Iteration 1+)

Repeat the following until termination:

#### A. Update orchestrator state

Update `.ai-loop/orchestrator-output.md` frontmatter with the current iteration number. **Do not add history entries** — the commit messages are the history.

#### B. Check iteration limit

If `iteration >= max-iterations`:
- Update `orchestrator-output.md` with `status: max-iterations-reached`
- Commit with structured message
- Report to user and stop.

#### C. Spawn controller

Spawn the controller agent using the Task tool:
- Use `subagent_type: "loop-controller"`
- The agent file's frontmatter defines its `tools` (Read, Glob, Grep, Bash, Write), `model` (opus), and constraints
- In the prompt, tell it to read the sensor outputs and orchestrator state, then write `.ai-loop/controller-output.md`

#### D. Check target-met

Read `.ai-loop/controller-output.md`. Parse the frontmatter for `target-met`.

If `target-met: true`:
- Update `orchestrator-output.md` with `status: complete`
- Commit with structured message
- Report success to user and stop.

#### E. Spawn actuator

Spawn the actuator agent using the Task tool:
- Use `subagent_type: "loop-actuator"`
- The agent file's frontmatter defines its `tools` (Read, Edit, Write, Glob, Grep — no Bash), `model` (sonnet), and constraints
- In the prompt, tell it to read `.ai-loop/controller-output.md` and apply the corrective **file changes**

#### F. Spawn sensors (re-measure)

Spawn **all sensor agents in parallel** again (same as initialization step 2).

#### G. Commit

Commit all changes (code modifications + artifact updates) using the structured commit format below.

Increment the iteration counter and go back to step A.

## Commit Format

Every iteration commit uses a **structured message** so that `git log` serves as the loop history. Use this format:

```
ai-loop: iteration {N} — {one-line summary}

[iteration] {N}
[status] {running|complete|max-iterations-reached}
[target-met] {true|false}
[sensors] {sensor1}: {pass|fail}, {sensor2}: {pass|fail}
[action] {brief description of what the actuator did, or "initial measurement" for iteration 0}
```

Examples:

```
ai-loop: iteration 0 — initial measurement

[iteration] 0
[status] running
[target-met] false
[sensors] compilation: fail, tests: fail
[action] initial measurement
```

```
ai-loop: iteration 2 — fix return type and add tests

[iteration] 2
[status] running
[target-met] false
[sensors] compilation: pass, tests: fail
[action] fixed method signature, added unit tests for edge cases
```

This format is:
- **Human-readable** in `git log --oneline` (first line)
- **Machine-parseable** with `git log --grep` for querying specific iterations
- **Lightweight** — the full details live in the `.ai-loop/` artifact files at each commit

## orchestrator-output.md Format

Keep this file **minimal**. It holds only the current state — no accumulated history.

```markdown
---
iteration: {N}
status: running|complete|max-iterations-reached
max-iterations: 10
base-branch: main
branch: ai-loop/{slug}
---

# Task

{The task description, captured once at initialization. Does not change.}
```

That's it. No history section, no sensor summaries, no iteration log. The commit messages and the `.ai-loop/` artifact files (accessible via `git show HEAD~N:.ai-loop/...`) are the history.

## Important Rules

- **You are the orchestrator.** Do not perform measurement, diagnosis, or code modification yourself. Delegate to agents.
- **Sensors run in parallel.** Always spawn all sensors in the same message.
- **Controller and actuator run sequentially.** Wait for each to complete before proceeding.
- **One commit per iteration.** Each iteration produces exactly one commit (except iteration 0 which has its own commit).
- **Report progress** to the user after each iteration: iteration number, target-met status, brief summary.
- **max-iterations defaults to 10.** If the user specified a different limit, use that.
- **No history accumulation in artifacts.** `orchestrator-output.md` stays constant-size. Git commits are the timeline.
