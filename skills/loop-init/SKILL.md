---
allowed-tools: Read, Write, Glob, Grep, Bash
---

# /loop-init — Project Scaffolding

You are running the `/loop-init` skill. Your job is to set up a project for ai-loop by creating concrete agent files and the runtime artifacts directory.

## Procedure

### Step 1: Detect project type

Look at the project to understand what kind of codebase this is:
- Glob for build files: `pom.xml`, `build.gradle`, `package.json`, `Cargo.toml`, `go.mod`, `Makefile`, `CMakeLists.txt`, `pyproject.toml`, `setup.py`, etc.
- Glob for source files to understand the language(s)
- Check for existing test infrastructure

### Step 2: Ask about sensors

Based on the detected project type, suggest sensors to the user. Common sensors include:

- **compilation**: runs the build/compile command (e.g., `javac`, `go build`, `cargo build`, `tsc`)
- **tests**: runs the test suite (e.g., `mvn test`, `npm test`, `cargo test`, `pytest`)
- **lint**: runs a linter (e.g., `eslint`, `clippy`, `golangci-lint`)
- **typecheck**: runs type checking (e.g., `tsc --noEmit`, `mypy`)

Ask the user which sensors they want. For each sensor, confirm:
- The **name** (short identifier, e.g., `compilation`, `tests`)
- The **command** to run
- The **target condition** (what "success" means, e.g., "no errors", "all tests pass")

### Step 3: Read templates

Read the following template files from the plugin directory to understand the expected agent structures:
- `templates/sensor.md`
- `templates/actuator.md`

### Step 4: Create sensor agents

For each sensor the user requested, create `.claude/agents/loop-sensor-{name}.md`.

Each sensor agent file should:
- Be a complete, self-contained agent instruction file (not a template)
- Include the sensor's specific command and description
- Include the output file path (`.ai-loop/sensor-{name}-output.md`)
- Include the rules: read-only, no judgment, report what you see
- Follow the structure shown in `templates/sensor.md`

### Step 5: Create the actuator agent

Create `.claude/agents/loop-actuator.md` following the structure in `templates/actuator.md`. The actuator is project-agnostic — it follows controller instructions to modify code.

### Step 6: Generate the controller

Now run the `/loop-setup` logic: discover the sensors you just created, read each one, and generate `.claude/agents/loop-controller.md` using `templates/controller.md` as a structure reference. The controller must list all sensors with their output files, targets, and priorities.

### Step 7: Create the .ai-loop directory

Create the `.ai-loop/` directory by writing a `.ai-loop/.gitkeep` file.

### Step 8: Summary

Tell the user what was created:
- List of sensor agents
- Actuator agent
- Controller agent
- `.ai-loop/` directory

Suggest next steps:
- Review the generated agents in `.claude/agents/`
- Consider adding `.ai-loop/` to `.gitignore` or working on a dedicated branch
- Run `/loop` with a task to start the feedback loop
