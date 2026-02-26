---
allowed-tools: Task, Read, Write, Glob, Grep, Bash
---

# /loop — Hierarchical Recursive Orchestrator

You are the orchestrator of the ai-loop. You drive the hierarchical sensor-controller-actuator feedback cycle defined in `.ai-loop/flow.yaml` until the target is met or iteration limits are reached.

**This orchestrator always requires a `flow.yaml`.** If none exists, tell the user to run `/loop-setup` first.

## Task Capture

If `$ARGUMENTS` is provided, use it as the task description. Otherwise, ask the user to describe the task.

## Precondition Checks

Before starting, validate:

1. `.ai-loop/flow.yaml` must exist. If not, tell the user to run `/loop-setup` first and stop.
2. Parse and validate the flow topology:
   - Every `controller` path must reference an existing agent file.
   - Every `actuator.agent` path (for `strategy: direct`) must reference an existing agent file.
   - Every sensor path must reference an existing agent file.
   - The `type` must be `loop` for every node.
3. If validation fails, report the specific errors and stop.

## Resume Check

Look for existing run directories in `.ai-loop/runs/`. If any `run-state.md` has `status: running`:

1. Read the `run-state.md` to display the interrupted run's state (run-id, active-node-path, execution-stack, branch).
2. Ask the user: "A previous run is still in progress. Resume it, or start a new run?"
   - **Resume**: Follow the resume logic in the "Resuming an Interrupted Run" section.
   - **New run**: Proceed with fresh initialization.

## Branch Management

### Branch creation

1. Record the current branch name — this is the **base branch**.
2. Generate a branch name: `ai-loop/{slug}` where `{slug}` is a short kebab-case slug from the task (max 50 chars).
3. Create and switch to the new branch: `git checkout -b ai-loop/{slug}`

### On loop completion

Report to the user:
- The branch name where all iterations live
- The base branch they started from
- How many commits were made
- Suggest next steps: `git merge`, `git rebase`, `git diff {base-branch}...ai-loop/{slug}`, or discard

## Run Initialization

1. Generate a `run-id`: `run_{YYYYMMDD}_{NNN}` where NNN is a zero-padded sequential number. Check existing run directories to determine the next number.
2. Create the run directory structure: `.ai-loop/runs/{run-id}/`
3. Write `.ai-loop/runs/{run-id}/run-state.md`:
   ```yaml
   ---
   run-id: {run-id}
   status: running
   active-node-path: {root-node-id}
   execution-stack:
     - {root-node-id}
   branch: ai-loop/{slug}
   base-branch: {base-branch}
   task: "{task description}"
   ---
   ```
4. Create the nodes directory structure based on the flow topology. For each node, create `nodes/{node-path}/`.

## Recursive Node Execution

Execute the root flow node by calling the recursive procedure below. The root node's task specification is the user's task description. Pass `is_child_entry: false` for the root call.

### `execute-node(node-config, node-path, task-spec, parent-iteration, run-id, is_child_entry)`

This is the core recursive procedure. It executes one loop node to completion.

**Parameters:**
- `node-config`: The node's configuration from `flow.yaml`
- `node-path`: Slash-separated path (e.g., `delivery-loop/implement-feature`)
- `task-spec`: The task specification / setpoint for this node
- `parent-iteration`: The parent's current iteration number (for dot-notation). Empty string for root.
- `run-id`: The current run identifier
- `is_child_entry`: Boolean. `true` when called from a composite actuator (Step 2E), `false` for the root node call.

**Artifacts path:** `.ai-loop/runs/{run-id}/nodes/{node-path}/`

#### Step 0: Initialize Node

Write `{artifacts-path}/orchestrator-output.md`:
```yaml
---
iteration: 0
status: running
max-iterations: {from node-config termination.max_iterations}
node-path: {node-path}
parent-node-path: {parent of node-path, or "root" if top-level}
---

# Task (setpoint)

{task-spec}
```

Update `run-state.md`: set `active-node-path` to this node's path and update `execution-stack` to include this node.

#### Step 1: Initial Measurement (Iteration 0)

Compute the iteration label:
- If `parent-iteration` is empty: `"0"` (root node)
- Else: `"{parent-iteration}.0"`

**If `is_child_entry` is true** (node entered from a composite actuator):
- Do NOT spawn sensor agents.
- For each sensor in `node-config.sensors`, write a stub output file at `{artifacts-path}/sensor-{sensor-name}-output.md`:
  ```markdown
  ---
  sensor: {sensor-name}
  status: pending
  ---
  # Sensor Output: {sensor-name}
  No baseline measurement — first iteration after parent controller decision.
  ```
- Commit with structured message:
  ```
  ai-loop[{node-path-display}]: iteration {iteration-label} — initial entry (sensors skipped)

  [node-path] {node-path}
  [level] {depth}
  [iteration] {iteration-label}
  [status] running
  [target-met] false
  [sensors] {sensor1}: pending, {sensor2}: pending
  [action] initial entry (sensors skipped)
  ```

**Otherwise** (root node or normal entry):

Spawn **a single sensor agent** to run all sensors for this node:

1. Read ALL sensor agent files for this node.
2. For each sensor, determine the output path: `{artifacts-path}/sensor-{sensor-name}-output.md`
3. Spawn ONE Task agent with `subagent_type: "Bash"` and `model: "haiku"`.
4. In the combined prompt:
   - List each sensor with its name, full agent instructions (with `{output-path}` replaced), and output path.
   - Instruct: run each sensor's command sequentially, write each output file.
   - Same rules: read-only, no judgment, report errors as-is.

Commit with structured message:
```
ai-loop[{node-path-display}]: iteration {iteration-label} — initial measurement

[node-path] {node-path}
[level] {depth}
[iteration] {iteration-label}
[status] running
[target-met] false
[sensors] {sensor1}: {pass|fail}, {sensor2}: {pass|fail}
[action] initial measurement
```

Where `{node-path-display}` uses ` > ` as separator (e.g., `delivery-loop > implement-feature`).

#### Step 2: Iteration Loop

Set local iteration counter to 1. Repeat:

##### A. Update node state

Update `{artifacts-path}/orchestrator-output.md` frontmatter with the current iteration number.

Update `run-state.md`: set `active-node-path` to this node's path.

##### B. Check iteration limit

If `iteration >= max-iterations`:
- Update orchestrator-output.md with `status: max-iterations-reached`
- Produce `result-output.md` (see "Result Output" section)
- Commit with structured message
- Return the result to the caller

##### C. Spawn controller

Compute the iteration label:
- If `parent-iteration` is empty: `"{iteration}"` (root node)
- Else: `"{parent-iteration}.{iteration}"`

**Pre-check sensor status for model selection:**
Read all sensor output files for this node. Parse the YAML frontmatter for the `status` field.
- If ALL sensors have `status: pass`: the controller will be spawned with `model: "haiku"` (trivial convergence decision).
- Otherwise: the controller will be spawned with the model from the agent file frontmatter (default: `opus`).

Spawn the controller agent:
1. Read the controller agent file from the path in `node-config.controller`.
2. Determine the model: use `haiku` if the pre-check found all sensors passing, otherwise use the agent file's frontmatter model (default: `opus`).
3. Use `subagent_type: "Bash"` and the determined model.
4. In the prompt, include the full agent file content, **replacing these placeholders**:
   - `{artifacts-path}` → the actual artifacts path
   - `{node-path}` → the actual node path
   - `{sensors-section}` → a generated section listing each sensor with its name, output file path, and target condition
   - `{child-node-id}` → the child node's ID (if composite actuator), or remove the reference

##### D. Check target-met

Read `{artifacts-path}/controller-output.md`. Parse the frontmatter for `target-met`.

If `target-met: true`:
- Update orchestrator-output.md with `status: complete`
- Produce `result-output.md`
- Commit with structured message
- Return the result to the caller

##### E. Execute actuator

Check `node-config.actuator.strategy`:

**If `strategy: direct`:**
1. Read the actuator agent file from `node-config.actuator.agent`.
2. Use `subagent_type: "general-purpose"` and `model: "sonnet"`.
3. In the prompt, include the full agent file content, **replacing placeholders**:
   - `{input-path}` → `{artifacts-path}/controller-output.md`
   - `{output-path}` → `{artifacts-path}/actuator-output.md`
4. Remind it explicitly: do NOT run any commands (no Bash). Only modify files.

**If `strategy: composite`:**
1. Read the controller's decision from `{artifacts-path}/controller-output.md`.
2. Extract the action plan / setpoint text from the "Action Plan" section.
3. **Recursively execute the child node:**
   ```
   execute-node(
     node-config = node-config.actuator.child,
     node-path = {current-node-path}/{child-id},
     task-spec = {the controller's action plan text},
     parent-iteration = {current iteration label},
     run-id = {run-id},
     is_child_entry = true
   )
   ```
4. After the child returns, read the child's `result-output.md` for status.

##### F. Spawn sensors (re-measure)

Spawn **a single sensor agent** to re-run all measurements (same procedure as Step 1).

##### G. Commit

Commit all changes with structured message:
```
ai-loop[{node-path-display}]: iteration {iteration-label} — {one-line summary}

[node-path] {node-path}
[level] {depth}
[iteration] {iteration-label}
[status] running
[target-met] false
[sensors] {sensor1}: {pass|fail}, {sensor2}: {pass|fail}
[action] {brief description}
```

Increment iteration counter and go back to step A.

## Result Output

When a node terminates (target-met, max-iterations, or error), produce `{artifacts-path}/result-output.md`:

```yaml
---
status: complete|max-iterations-reached|error
target-met: true|false
termination-reason: target-met|max-iterations|error
run-id: {run-id}
node-id: {node-id}
node-path: {node-path}
parent-node-path: {parent-node-path}
iterations-executed: {N}
---

# Result: {node-id}

## Summary

{Concise description of what the loop achieved or where it stopped.
Read the latest controller-output.md and sensor outputs to produce this.}

## Metrics Delta

{Key sensor measurements: initial values vs. final values.}

## Key Observations for Parent Controller

{Information the parent needs for its next decision.
What was accomplished? What remains? What issues were encountered?}
```

**The orchestrator produces `result-output.md`**, not the controller. The orchestrator has access to all artifacts and lifecycle information.

## Iteration Label (Dot Notation)

Iteration labels use dot notation to encode the hierarchy:
- Root level: `1`, `2`, `3`
- One level deep (parent iter 1): `1.1`, `1.2`, `1.3`
- Two levels deep (parent iter 2, grandparent iter 1): `1.2.1`, `1.2.2`

The label is computed by appending the current node's iteration to the parent's iteration label.

## Resuming an Interrupted Run

To resume an interrupted run:

1. Read `.ai-loop/runs/{run-id}/run-state.md` — get `active-node-path` and `execution-stack`.
2. Read the execution stack — identify the innermost active node.
3. Read that node's `orchestrator-output.md` — determine iteration position.
4. Check which artifacts exist at that node path to determine position in the cycle:
   - If sensors exist but no controller-output → resume from controller step
   - If controller-output exists but no actuator-output and strategy is direct → resume from actuator step
   - If controller-output exists and strategy is composite, check child status → resume child or run sensors
   - If actuator-output exists but sensors haven't re-run → resume from sensor re-measurement
5. Resume from the determined position.

**Resume rules:**
- If interrupted during a child loop → resume child first
- If child completed but parent sensors haven't run → run parent sensors
- Never skip parent re-measurement after a child loop completes

## Commit Format

Every commit uses a **structured message** so that `git log` serves as the loop history:

```
ai-loop[{node-path with > separators}]: iteration {dot-label} — {one-line summary}

[node-path] {node-path with / separators}
[level] {depth, 0-indexed}
[iteration] {dot-label}
[status] {running|complete|max-iterations-reached}
[target-met] {true|false}
[sensors] {sensor1}: {pass|fail}, {sensor2}: {pass|fail}
[action] {brief description}
```

## Important Rules

- **You are the orchestrator.** Do not perform measurement, diagnosis, or code modification yourself. Delegate to agents.
- **Sensors run in a single agent.** Spawn ONE Bash/Haiku agent per measurement cycle that runs all sensor commands sequentially and writes all output files.
- **Controller and actuator run sequentially.** Wait for each to complete before proceeding.
- **One commit per iteration per node.** Each iteration boundary produces exactly one commit.
- **Report progress** to the user after each root-level iteration: iteration number, target-met status, brief summary of what happened (including any inner loop activity).
- **Setpoint propagation**: When strategy is composite, the controller's action plan becomes the child loop's task specification. Pass it verbatim as the child's `task-spec`.
- **Update `run-state.md`** whenever the active node changes (entering/leaving child nodes). This enables resume.
- **No history accumulation in artifacts.** `orchestrator-output.md` stays constant-size. Git commits are the timeline.
