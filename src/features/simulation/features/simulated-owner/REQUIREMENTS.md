# Simulated owner — business requirements

Folder: `src/features/simulation/features/simulated-owner/`  ·  Top level: [REQUIREMENTS.md](../../../../../REQUIREMENTS.md)
Parent: [Simulation](../../REQUIREMENTS.md)

## Purpose

Stand in for a human.

## Who it serves

Benchmark.

## Requirements

| ID | Requirement | Priority | Acceptance |
|---|---|---|---|
| SIM-OWN-01 | Decide confirm or decline using hidden rules unknown to the agent. | Must | Rules are not visible to agents. |
| SIM-OWN-02 | Answer owner questions with plausible, rule-based answers. | Must | Every question type is covered. |
| SIM-OWN-03 | Hidden rules (maximum distance, minimum condition, exact size) come from persona style and a seed; distance applies to everyone, condition and size to receivers; the reason order is distance, condition, size; nothing outside the simulation slice references them (a scan test checks). | Must | Rule and scan tests. |

## Out of scope

- Imitating real people.

## Traceability

BR-13, BR-16.
