---
allowed-tools: Read, Write, Glob, Grep, Bash
---

# /loop-setup — Set Up or Refresh the AI Loop

You are running the `/loop-setup` skill. This is the **single entry point** for setting up and maintaining the ai-loop agents in a project. It is **idempotent** — safe to run at any time, whether from scratch or to refresh an existing setup.

It handles everything: first-time scaffolding, adding/removing sensors, and refreshing all agents when the plugin has been updated.

## Agent Templates

These template files define the structure, rules, behavior contracts, **and frontmatter** for each agent type. Read them when generating or refreshing agent files:

- [sensor-template.md](sensor-template.md) — structure for sensor agents (one per sensor)
- [controller-template.md](controller-template.md) — structure for the controller agent
- [actuator-template.md](actuator-template.md) — structure for the actuator agent

Each template includes a **YAML frontmatter** with `name`, `description`, `tools`, `disallowedTools`, and `model`. When generating the concrete agent files, preserve the frontmatter exactly — it controls tool access and model selection at the infrastructure level.

## Procedure

### Step 1: Assess current state

Check what already exists in the project:

1. Glob for `.claude/agents/loop-sensor-*.md` — list existing sensors
2. Check if `.claude/agents/loop-actuator.md` exists
3. Check if `.claude/agents/loop-controller.md` exists
4. Check if `.ai-loop/` directory exists

Report the current state to the user: "Found N sensors, actuator exists/missing, controller exists/missing."

### Step 2: Detect project type (if no sensors exist)

If no sensors exist yet, this is a first-time setup. Detect the project type:
- Glob for build files: `pom.xml`, `build.gradle`, `package.json`, `Cargo.toml`, `go.mod`, `Makefile`, `CMakeLists.txt`, `pyproject.toml`, `setup.py`, etc.
- Glob for source files to understand the language(s)
- Check for existing test infrastructure

### Step 3: Sensors

#### If no sensors exist (first-time setup):

Based on the detected project type, suggest sensors to the user. Common sensors include:

- **compilation**: runs the build/compile command (e.g., `javac`, `go build`, `cargo build`, `tsc`)
- **tests**: runs the test suite (e.g., `mvn test`, `npm test`, `cargo test`, `pytest`)
- **lint**: runs a linter (e.g., `eslint`, `clippy`, `golangci-lint`)
- **typecheck**: runs type checking (e.g., `tsc --noEmit`, `mypy`)

Ask the user which sensors they want. For each sensor, confirm:
- The **name** (short identifier, e.g., `compilation`, `tests`)
- The **command** to run
- The **target condition** (what "success" means, e.g., "no errors", "all tests pass")

Create `.claude/agents/loop-sensor-{name}.md` for each sensor using [sensor-template.md](sensor-template.md).

#### If sensors already exist (refresh):

For each existing sensor:
1. Read the sensor file and extract the **project-specific parts**: name, command, target condition, description.
2. Read [sensor-template.md](sensor-template.md) to get the latest structure and rules.
3. Regenerate the sensor file: keep the project-specific content but update the structure, rules, and output format to match the current template.

Then ask the user:
- "Do you want to add any new sensors?" — if yes, go through the interactive flow for each new sensor.
- "Do you want to remove any existing sensors?" — if yes, delete the specified `.claude/agents/loop-sensor-{name}.md` files.

### Step 4: Actuator

Create or regenerate `.claude/agents/loop-actuator.md` using [actuator-template.md](actuator-template.md).

The actuator is project-agnostic — it can always be fully regenerated from the template.

### Step 5: Controller

Discover all sensors (including any just created or updated), read each one, and generate `.claude/agents/loop-controller.md` using [controller-template.md](controller-template.md).

For each sensor, extract:
- **Name**: from the filename and/or content
- **Command**: the measurement command
- **Target condition**: what "success" looks like
- **Priority**: if specified; otherwise assign based on order (first sensor = highest priority)

The generated controller must be a **complete, self-contained agent file** listing all sensors with their output file paths, targets, priorities, the decision protocol, and tool restrictions.

### Step 6: Runtime directory

Create `.ai-loop/` directory if it does not exist (write `.ai-loop/.gitkeep`).

### Step 7: Summary

Tell the user what was done. Distinguish between what was created, updated, and left unchanged:

- **Created**: new files that didn't exist before
- **Updated**: existing files regenerated with latest template rules
- **Unchanged**: files that were already up to date (if applicable)

If this was a first-time setup, suggest next steps:
- Review the generated agents in `.claude/agents/`
- Consider adding `.ai-loop/` to `.gitignore` or working on a dedicated branch
- Run `/loop` with a task to start the feedback loop
