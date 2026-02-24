---
allowed-tools: Read, Glob, Grep, Bash
---

# /loop-status — Inspect Current Loop State

You are running the `/loop-status` skill. Your job is to show the user the current state of the ai-loop without running any iterations.

## Procedure

### Step 1: Check if a loop exists

Check for `.ai-loop/orchestrator-output.md`. If it does not exist, tell the user no loop is currently active and suggest running `/loop-setup` then `/loop`.

### Step 2: Read loop state

Read `.ai-loop/orchestrator-output.md` and display:
- Current iteration number
- Loop status (running, complete, max-iterations-reached)
- Max iterations setting
- Branch name (`branch`) and base branch (`base-branch`)
- The task description

### Step 3: Read latest artifacts

Read the latest sensor outputs, controller decision, and actuator report if they exist:
- Glob for `.ai-loop/sensor-*-output.md` and read each
- Read `.ai-loop/controller-output.md` if it exists (show `target-met` status and summary)
- Read `.ai-loop/actuator-output.md` if it exists (show what was last changed)

### Step 4: Show git timeline

Run `git log --oneline .ai-loop/` to show the iteration commit history.

### Step 5: Summary

Present a clear, concise summary:
- **Status**: running / complete / max-iterations-reached / not started
- **Branch**: `ai-loop/{slug}` (from `base-branch`)
- **Iteration**: N of max
- **Last sensor readings**: brief summary of each sensor
- **Last controller decision**: target-met? key findings
- **Last actuator action**: what was changed
- **Timeline**: recent commits
