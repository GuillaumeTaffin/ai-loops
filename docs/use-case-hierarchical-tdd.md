# Use Case Analysis: Hierarchical TDD Delivery

This document validates the [Hierarchical Loops Design](hierarchical-loops-design.md) against a concrete use case: **delivering a use case defined by multiple acceptance scenarios using a TDD approach**. It maps the use case onto the conceptual model, identifies key design decisions, and surfaces minor gaps.

**Related documents:**

- [Hierarchical Loops Design](hierarchical-loops-design.md) — the conceptual model being validated
- [Loop Architecture](loop-architecture.md) — the base architecture

---

## 1. Use Case Description

A use case is defined by N high-level acceptance scenarios (S1, S2, ..., SN). The goal is to implement them incrementally using TDD, with progressive validation that the growing implementation remains correct.

- **Outer loop**: Sequences scenario implementation one by one. After each scenario is implemented, validates that the full suite (all scenarios implemented so far) still passes.
- **Inner loop (TDD)**: Receives a single scenario. Iterates rapidly through the red-green-refactor cycle with fast feedback (compilation, targeted tests, local coverage).

---

## 2. Mapping onto the Hierarchical Model

### 2.1 Outer Loop (Scenario Sequencing)

| Concept | Mapping |
|---------|---------|
| **Task specification** | "Implement use case X, defined by scenarios S1, S2, S3, S4" |
| **Controller** | Sequences scenarios one by one; produces a detailed action plan for each |
| **Actuator** | `composite` — launches the inner TDD loop |
| **Sensors** | Full test suite (all scenarios), global coverage, mutation testing |
| **target-met** | All scenarios pass + coverage/mutation thresholds reached |

### 2.2 Inner Loop (TDD Cycle)

| Concept | Mapping |
|---------|---------|
| **Task specification (setpoint)** | The specific scenario from the outer controller's decision |
| **Controller** | TDD strategy: write the test, implement, refactor |
| **Actuator** | `direct` — modifies the code |
| **Sensors** | Compilation, targeted unit tests / scenario test, fast local coverage |
| **target-met** | Scenario test passes, compilation OK, local coverage OK |

**Verdict: the mapping is direct and natural.** The 2-level structure with setpoint propagation corresponds exactly to the cascade control pattern described in [section 2.4](hierarchical-loops-design.md#24-setpoint-propagation-cascade-control) of the design.

---

## 3. Key Design Decision: Who Writes the Acceptance Test?

This is the most important design question. In classical TDD: red (write the test) -> green (implement) -> refactor.

### Option A: The inner loop writes the test AND the implementation (recommended)

- The outer controller says: "Implement scenario S1: given [context], when [action], then [expected result]"
- Inner iteration 1: the inner controller reads the setpoint, decides "first write the acceptance test" -> the actuator writes the test
- Inner iterations 2+: sensors show a red test -> the inner controller decides the implementation strategy -> the actuator implements
- Convergence when: test green + compilation OK + coverage OK

**Why this is the right option**: The inner loop owns the complete red-green-refactor cycle. The setpoint contains enough specification to write the test. This aligns with real TDD — the developer (inner loop) owns the entire cycle.

### Option B: The outer loop writes the test, then launches the inner loop

- Problem: the outer actuator is `composite` (launches a child loop). It cannot modify code directly AND launch a child loop in the same iteration.
- The current model says: actuator = `direct` OR `composite`, not both.

**Does not work in the current model.** Adding a "pre-actuator hook" mechanism would be possible but unnecessary given that option A works better.

### Option C: 3 levels to separate test writing from implementation

Same problem at the intermediate level — and increased complexity with no gain.

**Conclusion: Option A. The complete TDD cycle lives in the inner loop.**

---

## 4. Progressive Test Accumulation

This is a strength of the model. Across outer iterations:

```
Outer iteration 1 -> Inner loop writes test S1, implements S1
  Outer sensors: S1 passes
Outer iteration 2 -> Inner loop writes test S2, implements S2
  Outer sensors: S1+S2 pass
Outer iteration 3 -> Inner loop writes test S3, implements S3
  Outer sensors: S1+S2+S3 pass (or S1 broken -> outer controller corrects)
```

If implementing S3 breaks S1, the **outer sensors** (full suite) detect it. The outer controller can then course-correct — exactly what a standalone `sequence` primitive could not do ([section 2.5](hierarchical-loops-design.md#25-sequencing-emerges-from-controller-intelligence) of the design).

**The model handles this natively.**

---

## 5. Multi-Speed Sensor Distribution

| Sensor | Level | Cadence | Typical cost |
|--------|-------|---------|--------------|
| Compilation | Inner | Every inner iteration | ~2s |
| Targeted unit tests | Inner | Every inner iteration | ~5-10s |
| Full test suite | Outer | After each inner loop | ~1-5min |
| Full code coverage | Outer | After each inner loop | ~2-5min |
| Mutation testing | Outer | After each inner loop | ~10-30min |

This is exactly the multi-speed sensor pattern from [section 5.3](hierarchical-loops-design.md#53-sensor-cadence-across-levels) of the design. The inner loop iterates fast with lightweight sensors; the outer loop validates in depth after each inner convergence.

---

## 6. Depth Analysis: Are 2 Levels Sufficient?

### 2 levels suffice for this use case

- Outer: scenario sequencing + full validation
- Inner: TDD cycle per scenario

### 3 levels if scope increases

If the scope is "implement an entire feature" that decomposes into **multiple use cases**, each with multiple scenarios:

```
Level 0 (Feature): sequences use cases
  -> Sensors: end-to-end integration tests, deployment smoke tests
Level 1 (Use case): sequences scenarios
  -> Sensors: use case test suite, coverage, mutation
Level 2 (TDD): implements a single scenario
  -> Sensors: compilation, fast unit tests
```

The architecture supports this without modification ([section 9.3](hierarchical-loops-design.md#93-three-levels-deep) shows a 3-level example). This is a granularity choice, not an architectural change.

---

## 7. Identified Gaps

### Gap 1: No conditional sensor execution (minor)

**Problem**: Mutation testing is extremely expensive (~10-30min). All sensors at a given level run every iteration. Sometimes we would want to run mutation testing only during final validation (last iteration or when coverage is already satisfactory).

**Workaround**: The sensor can be made "intelligent" — it reads `controller-output.md` and decides to skip if not relevant (output: "skipped — not final validation"). This is not a first-class mechanism but it works.

**Proper solution (future)**: Add an optional `run_when` field in the sensor config, or a conditional sensor mechanism. Not blocking for V1.

**Severity: low.** The workaround is sufficient.

### Gap 2: Setpoint quality (prompt engineering, not architecture)

**Problem**: The inner loop's effectiveness depends on the quality of the setpoint that the outer controller produces. If the outer controller describes the scenario vaguely, the inner loop will struggle.

**The setpoint should include**:
- Precise description of expected behavior
- Success criteria (which tests must pass)
- Constraints (patterns to follow, modules to modify)

**This is not an architectural gap** — it is an agent design challenge (the outer controller template must guide the production of detailed setpoints).

**Severity: medium.** Requires a well-designed outer controller template.

### Gap 3: Progress tracking by the outer controller (not a real gap)

**Apparent problem**: The outer controller must know which scenarios have been completed and which remain. There is no explicit "checklist" mechanism.

**Why this is not a gap**: The controller has access to:
- All sensor outputs (which show which tests pass)
- Git history (which shows what has been done)
- The `result-output.md` from previous inner loops

Sequencing emerges from controller intelligence ([section 2.5](hierarchical-loops-design.md#25-sequencing-emerges-from-controller-intelligence)). This is by design.

**Severity: low.** Works if the controller template is well-designed.

### Gap 4: Hybrid actuator (direct + composite) does not exist (moot)

**Problem**: One cannot "modify code then launch a child loop" in a single iteration.

**Resolution**: As analyzed in [section 3](#3-key-design-decision-who-writes-the-acceptance-test), test writing is part of the inner TDD cycle. No hybrid actuator is needed.

**Severity: none.** Not relevant with option A.

---

## 8. Example YAML Configuration

```yaml
version: 1

defaults:
  termination:
    on_error: fail-fast

flow:
  id: use-case-delivery
  type: loop
  controller: .claude/agents/loop-controller-scenario-sequencer.md
  actuator:
    strategy: composite
    child:
      id: tdd-cycle
      type: loop
      controller: .claude/agents/loop-controller-tdd.md
      actuator:
        strategy: direct
        agent: .claude/agents/loop-actuator.md
      sensors:
        - .claude/agents/loop-sensor-compilation.md
        - .claude/agents/loop-sensor-unit-tests.md
      termination:
        max_iterations: 15
  sensors:
    - .claude/agents/loop-sensor-full-tests.md
    - .claude/agents/loop-sensor-coverage.md
    - .claude/agents/loop-sensor-mutation.md
  termination:
    max_iterations: 8  # N scenarios + margin for corrections
```

---

## 9. Verdict

| Question | Answer |
|----------|--------|
| Is the use case modelable? | **Yes, directly.** 2 levels suffice. |
| Are more than 2 loops needed? | **No for this use case.** 3 levels if scope = entire feature with multiple use cases. |
| Are there hard gaps? | **No.** Minor gap (conditional sensors); the rest is prompt engineering. |
| Critical design choice | **The complete TDD cycle (red-green-refactor) lives in the inner loop**, not split across levels. |
| Does the cascade control model work? | **Yes.** Setpoint = scenario specification, inner convergence = scenario implemented, outer convergence = all scenarios + quality metrics. |
