# Lessons — business requirements

Folder: `src/features/learning/features/lessons/`  ·  Top level: [REQUIREMENTS.md](../../../../../REQUIREMENTS.md)
Parent: [Learning](../../REQUIREMENTS.md)

## Purpose

Record and summarise what was learned.

## Who it serves

Learning.

## Requirements

| ID | Requirement | Priority | Acceptance |
|---|---|---|---|
| LRN-LES-01 | Write a lesson from an accept or decline with its reason. | Must | Lessons are stored through the memory interface. |
| LRN-LES-02 | Merge repeated lessons and raise confidence. | Should | Repeats do not create duplicates. |
| LRN-LES-03 | Allow deletion at any time. | Must | Deleted lessons stop affecting behaviour. |
| LRN-LES-04 | A lesson is built only from structured facts (reason code and category), never from free text the owner typed, so it can hold no names, places or contact details; the same deal never counts twice. | Must | Lesson schema tests. |
| LRN-LES-05 | Decline reasons are used as follows: too far tightens distance, condition raises the floor one step, wrong size makes sizes exact for that category; price, timing and other are recorded but change nothing automatically. | Must | Adjustment tests. |
| LRN-LES-06 | `stretch` is a third lesson kind, built from a reason code and category only, listed in "what I learned" in plain words, deletable (deleting one tightens the limit again at once). | Must | Lesson and view tests. |

## Out of scope

- Cross-family lessons.

## Traceability

BR-13, BR-14.
