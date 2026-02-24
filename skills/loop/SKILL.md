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

If any are missing, tell the user to run `/loop-init` first and stop.

## Resume Check

If `.ai-loop/orchestrator-output.md` exists, read it. If `status: running`, offer to resume from the current iteration. If the user declines, start fresh.

## Iteration Lifecycle

### Initialization (Iteration 0)

1. Write `.ai-loop/orchestrator-output.md` with:
   ```yaml
   ---
   iteration: 0
   status: running
   max-iterations: 10
   ---
   ```
   Include the task description in the body.

2. Spawn **all sensor agents in parallel** using the Task tool. For each sensor file found in `.claude/agents/loop-sensor-*.md`:
   - Use `subagent_type: "Bash"` (sensors need to run commands)
   - In the prompt, include the full content of the sensor agent file as instructions
   - Tell the agent to run its measurement and write its output file

   **All sensors must be spawned in the same message** so they run in parallel.

3. After all sensors complete, commit:
   ```
   git add .ai-loop/ && git commit -m "ai-loop: iteration 0 — initial measurement"
   ```

### Iteration Loop (Iteration 1+)

Repeat the following until termination:

#### A. Update orchestrator state

Read all `sensor-{name}-output.md` files. Update `.ai-loop/orchestrator-output.md` with the current iteration number and a brief history entry.

#### B. Check iteration limit

If `iteration >= max-iterations`:
- Update `orchestrator-output.md` with `status: max-iterations-reached`
- Commit: `git add .ai-loop/ && git commit -m "ai-loop: iteration {N} — max iterations reached"`
- Report to user and stop.

#### C. Spawn controller

Spawn the controller agent using the Task tool:
- Use `subagent_type: "Bash"` (controller needs git access)
- In the prompt, include the full content of `.claude/agents/loop-controller.md` as instructions
- Tell it to read the sensor outputs and orchestrator state, then write `.ai-loop/controller-output.md`

#### D. Check target-met

Read `.ai-loop/controller-output.md`. Parse the frontmatter for `target-met`.

If `target-met: true`:
- Update `orchestrator-output.md` with `status: complete`
- Commit: `git add .ai-loop/ && git commit -m "ai-loop: iteration {N} — target met, loop complete"`
- Report success to user and stop.

#### E. Spawn actuator

Spawn the actuator agent using the Task tool:
- Use `subagent_type: "general-purpose"` (actuator needs full code editing tools)
- In the prompt, include the full content of `.claude/agents/loop-actuator.md` as instructions
- Tell it to read `.ai-loop/controller-output.md` and apply the corrective changes

#### F. Spawn sensors (re-measure)

Spawn **all sensor agents in parallel** again (same as initialization step 2).

#### G. Commit

Commit all changes (code modifications + artifact updates):
```
git add -A && git commit -m "ai-loop: iteration {N} — {brief summary from controller output}"
```

Increment the iteration counter and go back to step A.

## Important Rules

- **You are the orchestrator.** Do not perform measurement, diagnosis, or code modification yourself. Delegate to agents.
- **Sensors run in parallel.** Always spawn all sensors in the same message.
- **Controller and actuator run sequentially.** Wait for each to complete before proceeding.
- **One commit per iteration.** Each iteration produces exactly one commit (except iteration 0 which has its own commit).
- **Report progress** to the user after each iteration: iteration number, target-met status, brief summary.
- **max-iterations defaults to 10.** If the user specified a different limit, use that.
