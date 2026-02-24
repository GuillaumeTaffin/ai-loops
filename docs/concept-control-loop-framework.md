# AI Loops — Conceptual Framework Exploration

## Goal

Explore and refine the conceptual parallels between **closed-loop control theory** and **agentic AI coding sessions**. Define the abstractions, responsibilities, data flows, and open questions — language-agnostic, no implementation yet.

**Reference**: [Control loop (Wikipedia)](https://en.wikipedia.org/wiki/Control_loop#Open-loop_and_closed-loop)

---

## 1. The Control Theory Mapping

### 1.1 Classical Closed-Loop Control

```
                    error = setpoint - measurement
                         |
  setpoint -->(+)-->[ Controller ]-->[ Actuator ]-->[ Plant ]--> output
               ^(-)                                      |
               |                                         |
               +------------[ Sensor ]<------------------+
```

- **Setpoint**: desired state
- **Plant**: the system being controlled
- **Sensor**: measures the plant's output
- **Controller**: computes corrective action from the error signal
- **Actuator**: applies the correction to the plant

### 1.2 Mapping to Agentic AI Sessions

| Control Theory | AI Loop | Notes |
|---|---|---|
| **Setpoint** | Target metrics (100% coverage, 0 lint errors, all tests green, all requirements met...) | Multiple setpoints = MIMO (multi-input multi-output) system |
| **Plant** | The codebase | The "thing" being shaped toward a desired state |
| **Actuator** | AI agent writing code | Transforms instructions into code changes |
| **Sensor** | Measurement tools (coverage, mutation, tests, lint, type checker...) | Each sensor produces one or more metric readings |
| **Error signal** | Gap: target - current measurement | Vector of errors across all metrics |
| **Controller** | Orchestration logic generating corrective instructions | The "brain" that decides what to tell the agent next |
| **Sampling time** | Discrete iteration boundary (git commit? test run?) | See section 3 |
| **Output** | The codebase state at each iteration | The thing we're trying to converge |

### 1.3 What Makes This More Than an Analogy

This isn't just a metaphor. The parallels are structural:
- **Feedback is essential**: without measuring, the agent blindly generates code (open-loop). With feedback, it corrects course.
- **Error history matters**: a controller that only sees current error (P) behaves differently from one that tracks accumulated error (PI) or rate of change (PID).
- **Stability is a real concern**: an overly aggressive controller can cause oscillation (agent rewrites code back and forth). An under-responsive one converges too slowly (wastes tokens/money).
- **Convergence speed is optimizable**: the whole point of control engineering is to reach the setpoint fast, without overshoot or oscillation.

---

## 2. The Abstractions and Their Responsibilities

### 2.1 Metric / MetricReading

**Responsibility**: Represent a single scalar measurement.

- Metric ID (e.g., `coverage:line`, `mutation:score`, `tests:pass-rate`)
- Current value (normalized 0-100%)
- Target value (the setpoint for this metric)
- Error = target - current
- Timestamp
- Optional structured details (surviving mutants, uncovered lines, failing tests...)

**Open question**: Not all quality dimensions are easily reducible to a scalar. Requirements satisfaction, for example — is it binary (met/not met) or gradual? Architectural fitness?

### 2.2 SystemState

**Responsibility**: Snapshot of ALL metrics at a point in time.

- All metric readings
- Aggregate error (some norm of the error vector — RMS? weighted sum?)
- Iteration number
- Reference to the code state (git commit hash)

### 2.3 Sensor

**Responsibility**: Run a measurement tool, produce MetricReadings.

Sensors are **passive observers**. They don't modify the codebase. They answer: "where are we right now?"

Examples:
- Coverage sensor — runs test suite with coverage, parses report
- Mutation sensor — runs mutation testing, parses killed/survived
- Test sensor — runs tests, reports pass/fail rate
- Lint sensor — runs static analysis, reports findings
- Type check sensor — runs type checker, reports errors
- Requirements sensor — checks acceptance criteria against test results
- Custom sensors — anything measurable

**Key property**: Sensors should be **idempotent** — running them twice on the same code state gives the same result (barring flaky tests, which is its own problem).

### 2.4 Controller

**Responsibility**: Given the error signal (current + history), produce corrective instructions.

This is where the control theory strategies map:

- **P (Proportional)**: "Coverage is 72%, focus on writing tests for uncovered code." Effort proportional to current gap.
- **PI (Proportional-Integral)**: "Coverage has been stuck at ~72% for 3 iterations — the current approach isn't working. Try a different testing strategy." Detects stagnation via accumulated error.
- **PID (Proportional-Integral-Derivative)**: "Coverage was improving (+5%/iter) but slowed to +1%/iter — you may be hitting diminishing returns on easy-to-test code. Consider refactoring to improve testability." Uses rate of change.
- **Adaptive**: Uses an AI model to reason about the full history and generate strategy. A meta-controller.

**Output**: Natural language instructions + structured hints (focus areas, priority ordering, suggested strategies).

**Key question**: Should the controller also decide **which agent** to deploy, or is that a separate concern? (See section 4 on multi-agent.)

### 2.5 Actuator

**Responsibility**: Translate controller instructions into actual code changes.

In practice: send a prompt to an AI coding agent (Claude, etc.) and collect the result.

**But**: the actuator could also be a human developer following the controller's suggestions. The framework doesn't need to assume AI — it's about the feedback loop structure.

### 2.6 The Loop (Orchestrator)

**Responsibility**: Drive the cycle. Measure -> Check convergence -> Control -> Actuate -> Repeat.

Manages:
- Iteration counting
- Convergence detection (aggregate error below threshold)
- Termination conditions (max iterations, budget, time)
- History recording
- Reporting

---

## 3. Sampling Time and Temporal Boundaries

### 3.1 The Problem

In continuous control systems, the sampling time is the interval between measurements. Too slow = sluggish response. Too fast = noise, instability.

In an agentic coding session, the "sampling time" is: **when do we stop the agent and measure?**

Options:
- **After each git commit** — the agent commits its changes, sensors measure
- **After a fixed number of agent turns** — stop every N turns
- **After the agent declares "done with this iteration"** — agent self-reports completion
- **After a timer** — fixed wall-clock interval

### 3.2 Git as the Clock

Using **git commits** (or jj changes) as the sampling boundary is very natural:
- A commit is an atomic, identifiable code state
- You can diff against the previous commit to see what changed
- You can revert if something went wrong (rollback = undo in control terms)
- The commit hash IS the timestamp/state identifier
- Branching gives you the ability to try parallel strategies

This maps beautifully:
- **Sampling instant** = git commit
- **State at time k** = code at commit k
- **Delta (what changed)** = `git diff commit_{k-1}..commit_k`
- **Rollback** = `git reset` / `git revert`
- **Parallel exploration** = git branches

### 3.3 jj (Jujutsu) as an Alternative

jj's model might be even better suited:
- Changes are first-class (not commits) — more natural "work in progress" states
- Automatic rebasing — less friction
- Better conflict handling
- Operation log gives undo/redo for free

### 3.4 What "Diff" Means Here

The controller needs to answer: "did the last actuator action improve things?"

For this, it needs:
- **State at k-1** (previous metrics after previous commit)
- **State at k** (current metrics after current commit)
- **Code diff** between k-1 and k (to understand what was changed)
- **Metric diff** = state(k) - state(k-1) (to understand if it helped)

This is the **derivative term** in PID: the rate of change of the error.

---

## 4. Multi-Agent Orchestration (Future Extension)

> **Scope note**: The first version focuses on a **single control loop** (one controller, one actuator). Multi-agent is documented here as a future direction to keep in mind during design, but is NOT in scope for v1.

### 4.1 Single Agent Model (v1 Target)

One AI agent does everything. The controller sends it instructions, it writes code, tests, fixes things. One loop. This is sufficient to prove the concept and is simpler to reason about.

### 4.2 Future: Multi-Agent Patterns

Possible decompositions for later:
- **By control role**: controller agent (strategist) + actuator agent (coder) + sensor agent (QA)
- **By metric domain**: coverage agent + mutation agent + lint agent (parallel on branches)
- **Cascaded loops**: outer loop (strategic) sets targets for inner loop (tactical)

---

## 5. Advanced Parallels

### 5.1 Stability and Coupled Metrics

A control system is **stable** if it converges to the setpoint without oscillating.

**Oscillation in AI loops**: This is a real risk with coupled metrics. Example:
1. Agent adds production code + tests -> coverage goes up to 85%
2. But the new tests are shallow -> mutation score drops to 50%
3. Controller says "fix mutation score" -> agent refactors tests to be more thorough
4. Refactored tests break -> test pass rate drops
5. Controller says "fix failing tests" -> agent simplifies tests -> mutation score drops again
6. -> oscillation between metrics

**MIMO coupling**: In control theory, MIMO (multi-input multi-output) systems have this exact problem — changing one input affects multiple outputs. The standard solution is **decoupling**: designing the controller so that each corrective action targets one metric without disturbing others.

In AI loops, decoupling might mean:
- **Additive-only iterations**: The agent should only ADD code/tests, never remove or refactor, unless explicitly instructed. This prevents one metric's improvement from breaking another.
- **Metric priority ordering**: Define a hierarchy (e.g., tests pass > coverage > mutation > lint). The controller never sacrifices a higher-priority metric for a lower one.
- **Constraint-based control**: Instead of "maximize coverage", frame it as "maximize coverage SUBJECT TO test pass rate >= current AND mutation score >= current." The agent can only improve, never regress.

### 5.2 Overshoot — Reinterpreted for Bounded Metrics

In classical control, overshoot means the output exceeds the setpoint before settling. With metrics like code coverage that are **bounded at 100%**, the output literally cannot exceed the target — you can't have 105% coverage.

But overshoot manifests differently in this domain. It's **qualitative, not quantitative**:

**Over-coverage (test redundancy)**: The agent writes 15 tests that all cover the same branch. The metric shows 100% coverage, but the test suite is bloated with redundant assertions. The "overshoot" is in **effort**, not in the metric value.

**How to detect it**: This is where **mutation testing** becomes a second-order sensor. If coverage is 100% but mutation score is low, it means the tests _execute_ the code but don't actually _verify_ its behavior. The agent "covered" the code superficially — a form of overshoot where the coverage metric is satisfied but the underlying intent (quality tests) is not.

**A coverage-specific overshoot sensor could measure**:
- **Test-to-code ratio**: How many test lines per production line? If this ratio spikes, the agent might be over-testing.
- **Per-branch test count**: How many tests exercise each branch? A branch covered by 10 tests might indicate redundancy.
- **Test uniqueness**: Do two tests kill the exact same set of mutants? If yes, one of them is redundant.

**The deeper insight**: In bounded metric systems, overshoot shifts from "exceeding the target value" to "wasting resources to reach the target." The control effort itself becomes excessive. In control theory terms, this relates to the concept of **control effort minimization** — reaching the setpoint with minimal energy/cost. The controller shouldn't just optimize for convergence speed, but also for **efficiency of convergence**.

This suggests a **dual objective**:
1. Minimize settling time (reach setpoints fast)
2. Minimize control effort (don't waste agent turns / tokens / money on redundant work)

These two objectives can conflict — faster convergence often requires more aggressive (costlier) actions. This is a classic trade-off in optimal control theory.

### 5.3 Settling Time

How many iterations to reach the setpoint within an acceptable tolerance? This is what we want to minimize. Different controller strategies will have different settling times.

### 5.4 Disturbances

External changes that perturb the system: new requirements arrive, dependencies change, a teammate pushes code. The feedback loop should handle these — measure the new state, adjust.

### 5.5 System Identification

Before you can control a system, you need to understand its dynamics. In AI loops: "how much does one iteration of agent work typically improve coverage?" This informs controller tuning.

### 5.6 Observability

Can we fully determine the system state from the sensor readings? If we only measure line coverage, we might miss that the code is architecturally unsound. More sensors = better observability.

### 5.7 Controllability

Can the actuator (AI agent) actually reach any desired state? Some targets might be unreachable (100% mutation score might be impossible if some mutants are equivalent). The controller should detect this (divergence / stagnation).

---

## 6. Summary of Responsibilities

```
+-----------------------------------------------------------+
|                    LOOP ORCHESTRATOR                       |
|                                                           |
|  Drives the cycle. Manages iterations, convergence,       |
|  termination, history, reporting.                         |
|                                                           |
|  +----------+   +------------+   +----------+             |
|  |  SENSOR  |-->| CONTROLLER |-->| ACTUATOR |             |
|  |          |   |            |   |          |             |
|  | Measures |   | Computes   |   | Applies  |             |
|  | metrics  |   | corrective |   | changes  |             |
|  | from code|   | instructions|  | to code  |             |
|  +----------+   +------------+   +----------+             |
|       ^                                |                  |
|       |          +----------+          |                  |
|       +----------|  PLANT   |<---------+                  |
|                  | (codebase)|                             |
|                  +----------+                              |
|                       |                                    |
|                  +----------+                              |
|                  |   GIT    | <- sampling clock            |
|                  | (state   |                              |
|                  |  history)|                              |
|                  +----------+                              |
+-----------------------------------------------------------+
```

---

## Open Questions

- How to handle **coupled metrics** (improving one hurts another)?
- What's the right **aggregate error** function? (Weighted? RMS? Min of all?)
- How should the controller handle **equivalent mutants** (unreachable setpoints)?
- Should the **loop orchestrator itself** be an AI agent, or deterministic code?
- How does **cost/budget** factor in? (Each iteration costs money — is there a "control effort" penalty?)
- What's the minimal set of **sensors** that gives good observability?
