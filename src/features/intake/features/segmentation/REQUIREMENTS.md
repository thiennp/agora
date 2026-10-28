# Segmentation — business requirements

Folder: `src/features/intake/features/segmentation/`  ·  Top level: [REQUIREMENTS.md](../../../../../REQUIREMENTS.md)
Parent: [Intake](../../REQUIREMENTS.md)

## Purpose

Separate individual items in a photo.

## Who it serves

Intake pipeline.

## Requirements

| ID | Requirement | Priority | Acceptance |
|---|---|---|---|
| INT-SEG-01 | Produce one mask per distinct item using SAM 3.1. | Must | Test photos separate into the expected number of items at least 85 percent of the time. |
| INT-SEG-02 | Cap items per photo and report when the cap is reached. | Should | Photos above the cap ask the owner to split the pile. |
| INT-SEG-03 | Fail gracefully when segmentation is unavailable. | Must | Owner sees a retry or manual option, never an error page. |

Status (Oct 28): built with SAM 3.1 boxes, not masks (INT-SEG-01 partly): one concept per request, in parallel, boxes de-duplicated and a pair kept as one item. INT-SEG-02: at most 8 items, and the page says when there were more. INT-SEG-03: a failing SAM call leaves the draft without a picture; the form always still works. A concept SAM does not find is retried as its last word; boxes far apart are not merged. Oct 28 eval: 10 of 75 pile items still had no outline.

## Out of scope

- Counting duplicates or reading text on items.

## Traceability

BR-02.
