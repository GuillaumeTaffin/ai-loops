---
allowed-tools: Read, Write, Glob, Grep, Bash
---

# /loop-setup — Set Up or Refresh the Hierarchical AI Loop

You are running the `/loop-setup` skill. This is the **single entry point** for setting up and maintaining a hierarchical ai-loop flow in a project. It is **idempotent** — safe to run at any time, whether from scratch or to refresh an existing setup.

It handles everything: first-time scaffolding of flow topology, sensors, controllers, actuator, `flow.yaml` generation, and refreshing all agents when the plugin has been updated.

**This skill always produces a `flow.yaml`-based hierarchical setup.** There is no flat mode.

## Agent Templates

These template files define the structure, rules, behavior contracts, **and frontmatter** for each agent type. Read them when generating or refreshing agent files:

- [outer-controller-template.md](outer-controller-template.md) — structure for root/composite-actuator level controllers
- [inner-controller-template.md](inner-controller-template.md) — structure for child/setpoint-consuming level controllers
- [sensor-template.md](sensor-template.md) — structure for sensor agents (one per sensor)
- [actuator-template.md](actuator-template.md) — structure for the actuator agent (direct strategy)

Each template includes a **YAML frontmatter** with `name`, `description`, `tools`, `disallowedTools`, and `model`. When generating the concrete agent files, preserve the frontmatter exactly — it controls tool access and model selection at the infrastructure level.

**Template placeholders:**
- `{name}`, `{id}`, `{description}`, `{command}` — project-specific values from user interaction
- `{output-path}`, `{input-path}`, `{artifacts-path}` — the orchestrator fills these at spawn time, not at setup time. In the generated agent files, leave these as literal placeholders. The `/loop` orchestrator replaces them when spawning agents with the correct run-specific paths.
- `{sensors-section}`, `{node-path}`, `{child-node-id}` — likewise filled by orchestrator at spawn time.

## Procedure

### Step 1: Assess current state

Check what already exists in the project:

1. Check if `.ai-loop/flow.yaml` exists — if so, read it to understand current topology.
2. Glob for `.claude/agents/loop-sensor-*.md` — list existing sensors.
3. Glob for `.claude/agents/loop-controller-*.md` — list existing controllers.
4. Check if `.claude/agents/loop-actuator.md` exists.
5. Check if `.ai-loop/` directory exists.

Report the current state to the user: "Found flow.yaml (N-level topology) / no flow.yaml, M sensors, K controllers, actuator exists/missing."

### Step 2: Design Flow Topology

#### If no `flow.yaml` exists (first-time setup):

Guide the user through designing their flow topology interactively:

1. **Detect project type**: Glob for build files (`pom.xml`, `build.gradle`, `package.json`, `Cargo.toml`, `go.mod`, `Makefile`, `CMakeLists.txt`, `pyproject.toml`, `setup.py`, etc.), source files, and test infrastructure.

2. **Ask about hierarchy depth**: Explain the 2 most common patterns:
   - **1-level flow** (simplest): One loop with direct actuator. Good for simple tasks — "fix this bug", "add this function". Fast inner sensors only.
   - **2-level flow** (recommended for non-trivial work): Outer loop sequences sub-tasks with comprehensive validation. Inner loop iterates quickly with fast sensors. Good for "implement this feature with TDD", "add this API endpoint".

   Ask: "How many levels does your flow need? (1 or 2 recommended)"

3. **For each level (outermost first)**, collect:
   After collecting all sensor definitions for a level, **review sensor commands for overlap before finalizing**. Common redundancies:
   - **Maven**: `mvn verify` already runs compile, test, spotless:check, jacoco. Separate sensors for these sub-goals are redundant — suggest a single sensor that runs `mvn verify` and extracts all metrics.
   - **npm/bun**: `npm test` with coverage flags already produces coverage data. A separate coverage sensor is redundant.
   - **Gradle**: `gradle check` typically includes test + lint. Separate sensors for these are redundant.
   - **Cargo**: `cargo test` compiles and runs tests. A separate `cargo build` sensor is redundant.

   If overlap is detected, suggest merging into a single composite sensor that runs one command and extracts multiple metrics. Explain the trade-off: fewer sensors = fewer agent spawns = faster iterations.

   - **Node ID**: A short, descriptive identifier (e.g., `delivery-loop`, `implement`, `tdd-cycle`).
   - **Sensors**: Which measurements to run at this level. Suggest based on project type:
     - **Fast sensors (inner level)**: compilation, typecheck, unit tests
     - **Slow sensors (outer level)**: full test suite, coverage, mutation testing, lint
   - For each sensor, confirm: **name**, **command**, **target condition** (what "success" means).
   - **Max iterations** for this level (default: 10 for inner, 5 for outer).

4. **Confirm the topology** before generating anything. Show the user a summary:
   ```
   Flow topology:
     {root-id} (outer, max {N} iterations)
       Sensors: {sensor1}, {sensor2}
       Controller: outer-controller ({root-id})
       Actuator: composite → {child-id}
         {child-id} (inner, max {M} iterations)
           Sensors: {sensor3}, {sensor4}
           Controller: inner-controller ({child-id})
           Actuator: direct
   ```

#### If `flow.yaml` exists (refresh mode):

1. Read the existing `flow.yaml` and display the current topology to the user.
2. Ask: "Do you want to modify the topology or just refresh agents from latest templates?"
   - **Refresh only**: Re-generate all agent files from current templates, preserving project-specific content (sensor names, commands, targets). Skip to Step 3.
   - **Modify**: Allow the user to add/remove sensors, change max iterations, or restructure levels. Then regenerate `flow.yaml` and agents.

### Step 3: Generate Sensor Agents

For each sensor defined in the topology:

1. Read [sensor-template.md](sensor-template.md) to get the template structure.
2. Create `.claude/agents/loop-sensor-{name}.md` by filling in the template with:
   - `{name}` → sensor name
   - `{description}` → what it measures
   - `{command}` → the measurement command
   - **Leave `{output-path}` as a literal placeholder** — the orchestrator fills it at spawn time with the correct run-specific path.

### Step 4: Generate Actuator

Create or regenerate `.claude/agents/loop-actuator.md` using [actuator-template.md](actuator-template.md).

**Leave `{input-path}` and `{output-path}` as literal placeholders** — the orchestrator fills them at spawn time.

The actuator is project-agnostic — it can always be fully regenerated from the template.

### Step 5: Generate Controllers

For each loop node in the topology:

- **Root node / composite-actuator node**: Generate from [outer-controller-template.md](outer-controller-template.md).
  - File name: `.claude/agents/loop-controller-{node-id}.md`
  - Fill in `{id}` with the node ID.
  - **Leave `{sensors-section}`, `{artifacts-path}`, `{node-path}`, `{child-node-id}` as literal placeholders** — the orchestrator fills them at spawn time.

- **Leaf node / direct-actuator node**: Generate from [inner-controller-template.md](inner-controller-template.md).
  - File name: `.claude/agents/loop-controller-{node-id}.md`
  - Fill in `{id}` with the node ID.
  - **Leave `{sensors-section}`, `{artifacts-path}`, `{node-path}` as literal placeholders** — the orchestrator fills them at spawn time.

- **1-level flows**: The single node uses the inner-controller-template (it has a direct actuator, no child loop to produce setpoints for).

### Step 6: Generate `flow.yaml`

Write `.ai-loop/flow.yaml` based on the confirmed topology. Follow this schema:

```yaml
version: 1

defaults:
  termination:
    on_error: fail-fast

flow:
  id: {root-node-id}
  type: loop
  controller: .claude/agents/loop-controller-{root-node-id}.md
  actuator:
    strategy: composite|direct
    # If composite:
    child:
      id: {child-node-id}
      type: loop
      controller: .claude/agents/loop-controller-{child-node-id}.md
      actuator:
        strategy: direct
        agent: .claude/agents/loop-actuator.md
      sensors:
        - .claude/agents/loop-sensor-{name1}.md
        - .claude/agents/loop-sensor-{name2}.md
      termination:
        max_iterations: {N}
    # If direct:
    agent: .claude/agents/loop-actuator.md
  sensors:
    - .claude/agents/loop-sensor-{name3}.md
    - .claude/agents/loop-sensor-{name4}.md
  termination:
    max_iterations: {M}
```

### Step 7: Runtime directory

Create `.ai-loop/` directory if it does not exist (the `flow.yaml` write in Step 6 implicitly creates it).

Ensure `.ai-loop/runs/` directory exists (write `.ai-loop/runs/.gitkeep`).

### Step 8: Summary

Tell the user what was done. Distinguish between what was created, updated, and left unchanged:

- **Created**: new files that did not exist before
- **Updated**: existing files regenerated with latest template rules
- **Unchanged**: files that were already up to date (if applicable)

Show the final topology and list all generated files. Suggest next steps:
- Review the generated agents in `.claude/agents/`
- Review `.ai-loop/flow.yaml` for the flow topology
- Run `/loop` with a task to start the feedback loop
