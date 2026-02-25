---
allowed-tools: Read, Glob, Grep, Bash
---

# /loop-status — Inspect Hierarchical Loop State

You are running the `/loop-status` skill. Your job is to show the user the current state of the ai-loop without running any iterations.

## Procedure

### Step 1: Check if a run exists

Glob for `.ai-loop/runs/*/run-state.md`. If no results, tell the user no loop run exists and suggest running `/loop-setup` then `/loop`.

If multiple runs exist, list them with their status and let the user pick one. Default to the most recent (highest run-id).

### Step 2: Read run state

Read `.ai-loop/runs/{run-id}/run-state.md` and display:
- **Run ID**: the run identifier
- **Status**: running, complete, max-iterations-reached, error
- **Branch**: `ai-loop/{slug}` (from base branch)
- **Task**: the task description
- **Active node**: the currently active node path (if running)
- **Execution stack**: the stack of active nodes

### Step 3: Render execution tree

Read `.ai-loop/flow.yaml` to understand the topology. Then, for each node in the flow, read its artifacts from `.ai-loop/runs/{run-id}/nodes/{node-path}/` to build a status tree.

For each node, read:
- `orchestrator-output.md` — iteration number, status
- `result-output.md` (if exists) — final status, target-met, iterations executed

Render a tree like this:

```
Run: {run-id} ({status})
Branch: {branch} (from {base-branch})
Task: {task description}

Execution Tree:
  {root-id} — iteration {N}/{max}, status: {status}
    {child-id} — iteration {N.M}/{max}, status: {status}
      target-met: {true|false}
      last action: {brief from actuator-output}
    target-met: {true|false}
    last action: {brief from controller decision}
```

### Step 4: Show active node details

For the active node (from `active-node-path` in run-state), read and display its latest artifacts:

- **Sensor outputs**: Glob for `{node-artifacts-path}/sensor-*-output.md` and read each. Show sensor name and a brief summary.
- **Controller decision**: Read `{node-artifacts-path}/controller-output.md` if it exists. Show `target-met` status and gap analysis summary.
- **Actuator report**: Read `{node-artifacts-path}/actuator-output.md` if it exists. Show what was last changed.
- **Result**: Read `{node-artifacts-path}/result-output.md` if it exists. Show final status.

### Step 5: Show git timeline

Run a git log filtered to the current run's activity:

```bash
git log --oneline --grep="\[node-path\]"
```

Optionally filter by node path if the user requests a specific node:

```bash
git log --oneline --grep="\[node-path\] {specific-node-path}"
```

Show the most recent 20 commits.

### Step 6: Summary

Present a clear, concise summary:

- **Run**: {run-id} — {status}
- **Branch**: `ai-loop/{slug}` (from `{base-branch}`)
- **Topology**: {N}-level flow
- **Root node**: iteration {N}/{max}, target-met: {true|false}
  - **Child node** (if applicable): iteration {M}/{max}, target-met: {true|false}
- **Active node**: {node-path} at iteration {N}
- **Last sensor readings**: brief per-sensor status for the active node
- **Last controller decision**: target-met? key findings
- **Last actuator action**: what was changed (or inner loop result if composite)
- **Timeline**: recent commits (with node-path annotations)

If the run is complete, show the total iterations executed and final result.
If the run hit max-iterations, highlight which level exhausted its limit.
