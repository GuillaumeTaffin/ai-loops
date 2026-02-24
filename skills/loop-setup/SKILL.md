---
allowed-tools: Read, Write, Glob, Grep
---

# /loop-setup — Regenerate Controller

You are running the `/loop-setup` skill. Your job is to regenerate the controller agent file so it is in sync with the current set of sensors.

This skill is **idempotent** — safe to run at any time. It overwrites `.claude/agents/loop-controller.md`.

## Procedure

### Step 1: Discover sensors

Glob for `.claude/agents/loop-sensor-*.md`. If no sensor agents are found, tell the user they need to create sensors first (either manually or via `/loop-init`) and stop.

### Step 2: Read each sensor

For each sensor agent file, read it and extract:
- **Name**: from the filename (`loop-sensor-{name}.md`) and/or the file content
- **Command**: the measurement command the sensor runs
- **Target condition**: what "success" looks like for this sensor (e.g., "no compilation errors", "all tests pass")
- **Priority**: if specified in the sensor file; otherwise assign based on order (first sensor = highest priority)

### Step 3: Read the controller template

Read `templates/controller.md` from the plugin directory to understand the expected structure for the controller agent.

### Step 4: Generate the controller

Write `.claude/agents/loop-controller.md` with:
- A sensors section listing each sensor with its output file path, target condition, and priority
- The decision protocol (from the template)
- Tool restrictions: allowed `Read`, `Glob`, `Grep`, `Bash` (git commands only); denied `Edit`, `Write` (except output file), `NotebookEdit`
- Output format instructions

The generated controller must be a **complete, self-contained agent file** — not a template. It should reference the actual sensor names and output file paths discovered in Step 1-2.

### Step 5: Confirm

Tell the user:
- How many sensors were found
- The list of sensors and their priorities
- That `.claude/agents/loop-controller.md` has been regenerated
